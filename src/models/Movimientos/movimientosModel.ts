// src/models/Movimientos/MovimientoModel.ts

/**
 * @file MovimientoModel.ts
 * @author Isaac
 * @version 1.5.0 2025-08-18
 *
 * Modelo/dominio para gestionar Movimientos + notificaciones FCM bien segmentadas.
 * - No ocupa/libera vías; solo estados y coordinación con RondaModel.
 * - Notifica a MAQUINISTA/OPERADOR por LOCALIDAD (sin filtrar por empresa) cuando se crea.
 * - Staff (SUPERVISOR/COORDINADOR/ADMIN) sí puede filtrarse por empresa.
 */

import { PrismaClient, Rol } from '@prisma/client';
import { RondaModel } from './Ronda/RondaModel';
import { movimientoError } from './movimiento.logger';
import admin from 'firebase-admin';
import { NotificadorFCM } from '../../services/NotificadorFCM';

// ----------------------------------------------------------------------------
// Prisma singleton (evita múltiples conexiones en hot-reload)
// ----------------------------------------------------------------------------
const prisma: PrismaClient =
  (global as any).__PRISMA__ ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  (global as any).__PRISMA__ = prisma;
}

// ----------------------------------------------------------------------------
/** Devuelve el id del maquinista/operador desde alias permitidos. */
const getMaquinistaId = (o?: { maquinistaId?: number; operadorId?: number }) =>
  o?.maquinistaId ?? o?.operadorId;

/** Inicializa admin SDK usando credenciales por variable GOOGLE_APPLICATION_CREDENTIALS / ADC. */
function ensureAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
}

const ESTADOS_EDITABLES = new Set(['SOLICITADO','DETENIDO','ESPERA','MODIFICADO']);
const EDITABLE_KEYS = new Set([
  'instrucciones',
  'locomotiveNumber',
  'viaOrigenId',
  'viaDestinoId',
  'tipoMovimiento',
  'posicionCabina',
  'posicionChimenea',
  'direccionEmpuje',
]);
type EditableMovimientoInput = Partial<Record<
  | 'instrucciones'
  | 'locomotiveNumber'
  | 'viaOrigenId'
  | 'viaDestinoId'
  | 'tipoMovimiento'
  | 'posicionCabina'
  | 'posicionChimenea'
  | 'direccionEmpuje',
  string | number
>>;

function pickEditable(data: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const k of Object.keys(data || {})) {
    if (EDITABLE_KEYS.has(k) && data[k] !== undefined) out[k] = data[k];
  }
  return out;
}

function diff(oldObj: any, newObj: any) {
  const d: Record<string, { old: any; new: any }> = {};
  for (const k of Object.keys(newObj)) {
    // solo reporta cambios reales
    if (oldObj[k] !== newObj[k]) d[k] = { old: oldObj[k] ?? null, new: newObj[k] };
  }
  return d;
}
/** Chunk helper para FCM multicast. */
function chunk<T>(arr: T[], size = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function uniqueTokensFromUsers(
  users: Array<{ fcmTokens?: Array<{ token: string | null }> }>
) {
  return [
    ...new Set(
      users.flatMap(u => (u.fcmTokens ?? []).map(t => t.token).filter(Boolean) as string[])
    ),
  ];
}

/** Obtiene usuarios activos por localidad y (opcional) empresa y roles. */
async function usuariosPorRolesLocalidadEmpresa(
  localidadId: number,
  empresaId?: number,
  roles?: Rol[]
) {
  const rolesBase: Rol[] = roles?.length
    ? roles
    : [Rol.SUPERVISOR, Rol.COORDINADOR, Rol.OPERADOR, Rol.CLIENTE];

  const where: any = { activo: true, localidadId, rol: { in: rolesBase } };
  if (empresaId) where.empresaId = empresaId;

  return prisma.usuario.findMany({ where, include: { fcmTokens: true } });
}

/** Envío FCM con logs/seguridad. */
async function enviarMulticastMovimiento(
  tokens: string[],
  payload: { notification: { title: string; body: string }; data: Record<string, string> },
  logCtx: Record<string, any>
) {
  ensureAdmin();

  if (!tokens.length) {
    movimientoError.warn('FCM movimiento: sin tokens', logCtx);
    return;
  }

  const lotes = chunk(tokens, 500);
  for (let i = 0; i < lotes.length; i++) {
    const slice = lotes[i];
    try {
      const res = await admin.messaging().sendEachForMulticast({ ...payload, tokens: slice });
      movimientoError.info('FCM movimiento', {
        ...logCtx,
        lote: `${i + 1}/${lotes.length}`,
        enviados: res.successCount,
        fallidos: res.failureCount,
      });
    } catch (err: any) {
      movimientoError.error('FCM movimiento error', {
        ...logCtx,
        lote: `${i + 1}/${lotes.length}`,
        errName: err?.name,
        errMsg: err?.message,
        errCode: err?.errorInfo?.code,
      });
    }
  }
}

/** (Reservado) Resuelve tokens por IDs. */
async function tokensDeUsuarios(ids: number[]) {
  if (!ids.length) return [];
  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: ids }, activo: true },
    include: { fcmTokens: true },
  });
  return uniqueTokensFromUsers(usuarios);
}

// ----------------------------------------------------------------------------
// META parser para instrucciones (solo lectura info)
// ----------------------------------------------------------------------------
const META_RE = /\[META ([^\]]+)\]/i;
function parseMetaFromInstrucciones(instr?: string) {
  const meta = { destinoId: undefined as number | undefined, seccion: undefined as number | undefined, liberar: false };
  if (!instr) return meta;
  const m = instr.match(META_RE);
  if (!m) return meta;
  const tokens = m[1].split('|').map(s => s.trim().toUpperCase());
  for (const t of tokens) {
    if (t === 'LIBERAR') meta.liberar = true;
    if (t.startsWith('DESTINO:')) {
      const v = Number(t.split(':')[1]); if (!Number.isNaN(v)) meta.destinoId = v;
    }
    if (t.startsWith('SECCION:')) {
      const s = Number(t.split(':')[1]); if (!Number.isNaN(s)) meta.seccion = s;
    }
  }
  return meta;
}

// ----------------------------------------------------------------------------
// Notificaciones FCM (resto de eventos siguen locales); CREACIÓN DELEGA A NotificadorFCM
// ----------------------------------------------------------------------------

/** Cambio de prioridad → Admin/Coord/Sup (administrativos) */
async function notificarCambioPrioridad(movId: number, nueva: 'ALTA' | 'BAJA') {
  ensureAdmin();

  const m = await prisma.movimiento.findUnique({
    where: { id: movId },
    include: {
      empresa: { select: { nombre: true } },
      localidad: { select: { id: true, nombre: true } },
      viaOrigen: { select: { nombre: true } },
      viaDestino: { select: { nombre: true } },
      creadoPor: { select: { nombre: true } },
    },
  });
  if (!m) return;

  const admins = await prisma.usuario.findMany({
    where: {
      localidadId: m.localidadId,
      activo: true,
      rol: { in: [Rol.ADMINISTRADOR, Rol.COORDINADOR, Rol.SUPERVISOR] },
      ...(m.empresaId ? { empresaId: m.empresaId } : {}),
    },
    include: { fcmTokens: true },
  });

  const tokens = uniqueTokensFromUsers(admins);
  if (!tokens.length) {
    movimientoError.warn('Sin tokens para cambio_prioridad', { movId: m.id, localidadId: m.localidadId });
    return;
  }

  await enviarMulticastMovimiento(
    tokens,
    {
      notification: {
        title: `Cambio de prioridad → ${nueva}`,
        body:
          `Movimiento #${m.id} · Empresa: ${m.empresa?.nombre ?? 'N/D'} · ` +
          `Origen: ${m.viaOrigen?.nombre ?? 'N/D'} → Destino: ${m.viaDestino?.nombre ?? 'N/D'}`,
      },
      data: {
        tipo: 'cambio_prioridad',
        movimientoId: String(m.id),
        prioridad: nueva,
        creadoPor: String(m.creadoPor?.nombre ?? ''),
        fecha: new Date().toISOString(),
        empresa: String(m.empresa?.nombre ?? ''),
        localidadId: String(m.localidadId),
      },
    },
    { evento: 'cambio_prioridad', movId: m.id, localidadId: m.localidadId, prioridad: nueva, tokens: tokens.length }
  );
}

/** Inicio → Supervisor/Cliente/Coordinador/Operador */
async function notificarMovimientoIniciado(movId: number) {
  ensureAdmin();

  const m = await prisma.movimiento.findUnique({
    where: { id: movId },
    include: {
      empresa: { select: { nombre: true } },
      localidad: { select: { id: true, nombre: true } },
      viaOrigen: { select: { nombre: true } },
      viaDestino: { select: { nombre: true } },
    },
  });
  if (!m) return;

  const roles: Rol[] = [Rol.SUPERVISOR, Rol.CLIENTE, Rol.COORDINADOR, Rol.OPERADOR];
  const usuarios = await usuariosPorRolesLocalidadEmpresa(m.localidadId, m.empresaId, roles);
  const tokens = uniqueTokensFromUsers(usuarios);

  const roleCounts = roles.reduce<Record<string, number>>((acc, r) => {
    acc[r] = usuarios.filter(u => u.rol === r).length;
    return acc;
  }, {});

  if (!tokens.length) {
    movimientoError.warn('Sin tokens para movimiento_iniciado', {
      movId: m.id, localidadId: m.localidadId, roleCounts,
    });
    return;
  }

  const title = '🚦 Movimiento iniciado';
  const body =
    `#${m.id} · ${m.empresa?.nombre ?? 'Sin Empresa'} · Loco ${m.locomotiveNumber} · ` +
    `${m.viaOrigen?.nombre ?? 'N/D'} → ${m.viaDestino?.nombre ?? 'N/D'}`;

  const data = {
    tipo: 'movimiento_iniciado',
    movimientoId: String(m.id),
    empresa: String(m.empresa?.nombre ?? ''),
    localidadId: String(m.localidadId),
    viaOrigen: String(m.viaOrigen?.nombre ?? ''),
    viaDestino: String(m.viaDestino?.nombre ?? ''),
    fecha: new Date().toISOString(),
  };

  await enviarMulticastMovimiento(
    tokens,
    { notification: { title, body }, data },
    { evento: 'iniciado', movId: m.id, localidadId: m.localidadId, tokens: tokens.length, roleCounts }
  );
}

/** Fin → Cliente/Coordinador/Supervisor */
async function notificarMovimientoFinalizado(movId: number) {
  ensureAdmin();

  const m = await prisma.movimiento.findUnique({
    where: { id: movId },
    include: {
      empresa: { select: { nombre: true } },
      localidad: { select: { id: true, nombre: true } },
    },
  });
  if (!m) return;

  const roles: Rol[] = [Rol.CLIENTE, Rol.COORDINADOR, Rol.SUPERVISOR];
  const usuarios = await usuariosPorRolesLocalidadEmpresa(m.localidadId, m.empresaId, roles);
  const tokens = uniqueTokensFromUsers(usuarios);

  const roleCounts = roles.reduce<Record<string, number>>((acc, r) => {
    acc[r] = usuarios.filter(u => u.rol === r).length;
    return acc;
  }, {});

  if (!tokens.length) {
    movimientoError.warn('Sin tokens para movimiento_concluido', {
      movId: m.id, localidadId: m.localidadId, roleCounts,
    });
    return;
  }

  const title = '✅ Movimiento concluido';
  const body = `#${m.id} · ${m.empresa?.nombre ?? 'Sin Empresa'} · Loco ${m.locomotiveNumber}`;

  const data = {
    tipo: 'movimiento_concluido',
    movimientoId: String(m.id),
    empresa: String(m.empresa?.nombre ?? ''),
    localidadId: String(m.localidadId),
    fecha: new Date().toISOString(),
  };

  await enviarMulticastMovimiento(
    tokens,
    { notification: { title, body }, data },
    { evento: 'concluido', movId: m.id, localidadId: m.localidadId, tokens: tokens.length, roleCounts }
  );
}

// ----------------------------------------------------------------------------
// Modelo
// ----------------------------------------------------------------------------

export class MovimientoModel {
  /* ------------------------------ Consultas base ------------------------------ */

  static async obtenerMovimientos() {
    try {
      return await prisma.movimiento.findMany({
        include: {
          empresa: true,
          creadoPor: true,
          localidad: true,
          viaOrigen: true,
          viaDestino: true,
          incidentes: true,
          ronda: true,
        },
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos', {
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos');
    }
  }

  /** Servicios (lavado/torno) pendientes de iniciar. */
  static async obtenerServiciosPendientes(filters: { localidadId?: number; empresaId?: number } = {}) {
    try {
      const where: any = {
        finalizado: false,
        OR: [{ lavado: true }, { torno: true }],
        estado: { in: ['SOLICITADO', 'DETENIDO', 'ESPERA'] },
      };
      if (filters.localidadId) where.localidadId = filters.localidadId;
      if (filters.empresaId) where.empresaId = filters.empresaId;

      return await prisma.movimiento.findMany({
        where,
        include: {
          empresa: true,
          localidad: true,
          viaOrigen: true,
          viaDestino: true,
          ronda: true,
        },
        orderBy: [{ prioridad: 'desc' }, { createdAt: 'asc' }],
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener servicios pendientes', {
        filters,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener servicios pendientes');
    }
  }

  /* --------------------------- Cambios de estado CRUD --------------------------- */

  /** Detiene un movimiento (DETENIDO). */
  static async detenerMovimiento(id: number, razon?: string) {
    try {
      const fechaActual = new Date();
      const movimientoDetenido = await prisma.movimiento.update({
        where: { id },
        data: {
          estado: 'DETENIDO',
          fechaPausa: fechaActual,
          updatedAt: fechaActual,
          ...(razon && { instrucciones: razon }),
        },
        include: { empresa: true, localidad: true, ronda: true },
      });

      movimientoError.info('Movimiento detenido', {
        movimientoId: id,
        razon: razon || 'No especificada',
        empresa: movimientoDetenido.empresa?.nombre,
        localidad: movimientoDetenido.localidad?.nombre,
      });

      await RondaModel.siguienteInteligente(movimientoDetenido.localidadId);
      return movimientoDetenido;
    } catch (error: any) {
      movimientoError.error('Error al detener movimiento', {
        id, razon,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al detener movimiento');
    }
  }

  /** Cancela y finaliza un movimiento; elimina su ronda y recompone. */
  static async cancelarMovimiento(id: number, razonCancelacion: string, usuarioId?: number) {
    try {
      const movimientoCancelado = await prisma.$transaction(async (tx) => {
        const original = await tx.movimiento.findUnique({
          where: { id },
          include: { ronda: true, empresa: true, localidad: true },
        });
        if (!original) throw new Error(`No se encontró movimiento con id ${id}`);

        const cancelado = await tx.movimiento.update({
          where: { id },
          data: {
            estado: 'CANCELADO',
            finalizado: true,
            fechaFin: new Date(),
            updatedAt: new Date(),
            instrucciones: `CANCELADO: ${razonCancelacion}`,
            incidenteGlobal: false,
          },
          include: { ronda: true },
        });

        if (original.ronda) {
          await tx.ronda.delete({ where: { id: original.ronda.id } });
          await RondaModel.recomponerRondasLocalidad(original.localidadId, tx);
        }

        movimientoError.info('Movimiento cancelado', {
          movimientoId: id,
          razonCancelacion,
          usuarioId: usuarioId || 'No especificado',
          empresa: original.empresa?.nombre,
          localidad: original.localidad?.nombre,
          teniaRonda: !!original.ronda,
        });

        return cancelado;
      });

      await RondaModel.siguienteInteligente(movimientoCancelado.localidadId);
      return movimientoCancelado;
    } catch (error: any) {
      movimientoError.error('Error al cancelar movimiento', {
        id, razonCancelacion, usuarioId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al cancelar movimiento');
    }
  }

    /** INFO para editor: valores actuales + meta derivada + flags de edición */
  static async obtenerInfoEdicion(id: number) {
    const m = await prisma.movimiento.findUnique({
      where: { id },
      include: {
        empresa: { select: { id: true, nombre: true } },
        localidad: { select: { id: true, nombre: true } },
        viaOrigen: { select: { id: true, nombre: true, localidadId: true } },
        viaDestino: { select: { id: true, nombre: true, localidadId: true } },
      },
    });
    if (!m) throw new Error(`Movimiento ${id} no encontrado`);

    const meta = parseMetaFromInstrucciones(m.instrucciones ?? undefined);
    const editable = !m.finalizado && ESTADOS_EDITABLES.has(m.estado as any);

    return {
      editable,
      restricciones: {
        motivo: editable ? null : 'Finalizado o en estado no editable',
        estadosPermitidos: Array.from(ESTADOS_EDITABLES),
        mismaLocalidadParaVias: true,
      },
      movimiento: {
        id: m.id,
        empresa: m.empresa,
        localidad: m.localidad,
        estado: m.estado,
        finalizado: m.finalizado,
        instrucciones: m.instrucciones,
        locomotiveNumber: m.locomotiveNumber,
        viaOrigen: m.viaOrigen,
        viaDestino: m.viaDestino,
        tipoMovimiento: m.tipoMovimiento,
        posicionCabina: m.posicionCabina,
        posicionChimenea: m.posicionChimenea,
        direccionEmpuje: m.direccionEmpuje,
        meta,
      },
      editableKeys: Array.from(EDITABLE_KEYS),
    };
  }

  /** GUARDAR cambios del editor con whitelist + validaciones + log + reorden de ronda si aplica */
  static async guardarEdicion(id: number, payload: EditableMovimientoInput, actorId: number) {
    const updateData = pickEditable(payload);

    // bloquea payload vacío o llaves no permitidas
    if (!Object.keys(updateData).length) throw new Error('Sin cambios o campos no editables');

    const actual = await prisma.movimiento.findUnique({
      where: { id },
      include: { localidad: true, viaOrigen: true, viaDestino: true, empresa: true, ronda: true },
    });
    if (!actual) throw new Error(`Movimiento ${id} no encontrado`);
    if (actual.finalizado || !ESTADOS_EDITABLES.has(actual.estado as any)) {
      throw new Error(`Movimiento no editable en estado ${actual.estado}`);
    }

    // validar localidad consistente al cambiar vías
    const localidadId = actual.localidadId;
    if (updateData.viaOrigenId) {
      const v = await prisma.via.findUnique({ where: { id: Number(updateData.viaOrigenId) } });
      if (!v || v.localidadId !== localidadId) throw new Error('viaOrigenId inválida para la localidad del movimiento');
    }
    if (updateData.viaDestinoId) {
      const v = await prisma.via.findUnique({ where: { id: Number(updateData.viaDestinoId) } });
      if (!v || v.localidadId !== localidadId) throw new Error('viaDestinoId inválida para la localidad del movimiento');
    }

    // limpia undefined explícitos
    Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);

    // no tocar prioridad/estado/empresa/localidad en este endpoint
    ['prioridad','estado','empresaId','localidadId','lavado','torno','finalizado'].forEach(k => delete (updateData as any)[k]);

    const cambios = diff(actual, updateData);
    if (!Object.keys(cambios).length) return actual; // nada que hacer

    const actualizado = await prisma.$transaction(async (tx) => {
      const upd = await tx.movimiento.update({
        where: { id },
        data: { ...updateData, updatedAt: new Date() },
        include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true, ronda: true },
      });

      // Log opcional si existe la tabla MovimientoEditLog
      try {
        // @ts-ignore: puede no existir según tu schema actual
        await (tx as any).movimientoEditLog?.create({
          data: {
            movimientoId: id,
            actorId,
            cambios: cambios as any,
            motivo: 'edicion_general',
          },
        });
      } catch (e) {
      
      }

      return upd;
    });

    // Reglas de ronda mínimas: si estaba SOLICITADO y no tenía ronda, genera
    if (actualizado.estado === 'SOLICITADO' && !actualizado.ronda) {
      await RondaModel.generarRondaParaMovimiento({
        movimientoId: actualizado.id,
        empresaId: actualizado.empresaId,
        localidadId: actualizado.localidadId,
        prioridad: (actualizado.prioridad as 'ALTA' | 'BAJA') ?? 'BAJA',
      });
    }

    await RondaModel.siguienteInteligente(actualizado.localidadId);

    movimientoError.info('Movimiento editado', {
      movimientoId: id,
      actorId,
      cambios: Object.keys(cambios),
      localidadId,
    });

    return actualizado;
  }


  /** Reactiva un movimiento DETENIDO → EN_PROCESO. */
  static async reactivarMovimiento(id: number, maquinistaId?: number) {
    try {
      const fechaActual = new Date();
      const movimientoActual = await prisma.movimiento.findUnique({
        where: { id },
        select: {
          estado: true,
          empresa: { select: { nombre: true } },
          localidad: { select: { nombre: true } },
        },
      });

      if (!movimientoActual) throw new Error(`No se encontró movimiento con id ${id}`);
      if (movimientoActual.estado !== 'DETENIDO') {
        throw new Error(`El movimiento debe estar en estado DETENIDO para ser reactivado. Estado actual: ${movimientoActual.estado}`);
      }

      const movimientoReactivado = await prisma.movimiento.update({
        where: { id },
        data: {
          estado: 'EN_PROCESO',
          fechaInicio: fechaActual,
          fechaPausa: null,
          updatedAt: fechaActual,
          incidenteGlobal: false,
          ...(maquinistaId && { operadorId: maquinistaId }),
        },
        include: { empresa: true, localidad: true, ronda: true },
      });

      movimientoError.info('Movimiento reactivado', {
        movimientoId: id,
        maquinistaId: maquinistaId ?? 'No especificado',
        empresa: movimientoActual.empresa?.nombre,
        localidad: movimientoActual.localidad?.nombre,
      });

      await notificarMovimientoIniciado(movimientoReactivado.id);
      await RondaModel.siguienteInteligente(movimientoReactivado.localidadId);
      return movimientoReactivado;
    } catch (error: any) {
      movimientoError.error('Error al reactivar movimiento', {
        id, maquinistaId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al reactivar movimiento');
    }
  }

  /**
   * Cambia el estado del movimiento validando transición (a menos que forzar=true).
   */
  static async cambiarEstadoMovimiento(
    id: number,
    nuevoEstado: 'SOLICITADO' | 'EN_PROCESO' | 'DETENIDO' | 'CONCLUIDO' | 'CANCELADO',
    opciones: { maquinistaId?: number; operadorId?: number; razon?: string; forzar?: boolean } = {}
  ) {
    try {
      const { razon, forzar = false } = opciones;
      const maquinistaId = getMaquinistaId(opciones);

      const movAct = await prisma.movimiento.findUnique({
        where: { id },
        include: { empresa: true, localidad: true, ronda: true },
      });
      if (!movAct) throw new Error(`No se encontró movimiento con id ${id}`);

      if (!forzar) {
        const transiciones: Record<string, string[]> = {
          SOLICITADO: ['EN_PROCESO', 'DETENIDO', 'CANCELADO'],
          EN_PROCESO: ['DETENIDO', 'CONCLUIDO', 'CANCELADO'],
          DETENIDO: ['EN_PROCESO', 'CANCELADO', 'CONCLUIDO'],
          CONCLUIDO: [],
          CANCELADO: [],
        };
        const permitidos = transiciones[movAct.estado] ?? [];
        if (!permitidos.includes(nuevoEstado)) {
          throw new Error(`Transición inválida: ${movAct.estado} → ${nuevoEstado}. Permitidas: ${permitidos.join(', ')}`);
        }
      }

      const movUpd = await prisma.$transaction(async (tx) => {
        const ahora = new Date();
        const data: any = { estado: nuevoEstado, updatedAt: ahora };

        if (nuevoEstado === 'EN_PROCESO') {
          Object.assign(data, {
            fechaInicio: ahora,
            fechaPausa: null,
            incidenteGlobal: false,
            ...(maquinistaId && { operadorId: maquinistaId }),
          });
        }
        if (nuevoEstado === 'DETENIDO') Object.assign(data, { fechaPausa: ahora, ...(razon && { instrucciones: razon }) });
        if (nuevoEstado === 'CONCLUIDO') Object.assign(data, { fechaFin: ahora, finalizado: true, incidenteGlobal: false });
        if (nuevoEstado === 'CANCELADO')
          Object.assign(data, { fechaFin: ahora, finalizado: true, incidenteGlobal: false, ...(razon && { instrucciones: `CANCELADO: ${razon}` }) });

        const updated = await tx.movimiento.update({
          where: { id },
          data,
          include: { ronda: true },
        });

        if (movAct.ronda) {
          if (nuevoEstado === 'CONCLUIDO') {
            await tx.ronda.update({ where: { id: movAct.ronda.id }, data: { concluido: true } });
            await RondaModel.recomponerRondasLocalidad(movAct.localidadId, tx);
          } else if (nuevoEstado === 'CANCELADO') {
            await tx.ronda.delete({ where: { id: movAct.ronda.id } });
            await RondaModel.recomponerRondasLocalidad(movAct.localidadId, tx);
          }
        }

        return updated;
      });

      movimientoError.info('Estado de movimiento cambiado', {
        movimientoId: id,
        estadoAnterior: movAct.estado,
        estadoNuevo: nuevoEstado,
        maquinistaId: maquinistaId ?? 'No especificado',
        razon: razon ?? 'No especificada',
        empresa: movAct.empresa?.nombre,
        localidad: movAct.localidad?.nombre,
      });

      try {
        if (nuevoEstado === 'EN_PROCESO') await notificarMovimientoIniciado(id);
        else if (nuevoEstado === 'CONCLUIDO') await notificarMovimientoFinalizado(id);
      } catch (e: any) {
        movimientoError.error('Error notificando cambio de estado', {
          movimientoId: id, nuevoEstado, errName: e?.name, errMsg: e?.message,
        });
      }

      await RondaModel.siguienteInteligente(movAct.localidadId);
      return movUpd;
    } catch (error: any) {
      movimientoError.error('Error al cambiar estado de movimiento', {
        id, nuevoEstado, opciones,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al cambiar estado de movimiento');
    }
  }

  /* --------------------- Crear / Editar (sin tocar vías) --------------------- */


/**
 * Crea un movimiento (sin ocupar/liberar vías).
 * - Siempre encola en Ronda, sea servicio o no.
 * - Lavado/torno se tratan igual que cualquier movimiento (sin forzar ESPERA).
 * - Requiere al menos viaOrigenId **o** viaDestinoId.
 */
static async nuevoMovimiento(data: {
  empresaId: number;
  creadoPorId: number;
  localidadId: number;
  viaOrigenId?: number;
  viaDestinoId?: number;
  numeroSeccion?: number;
  locomotiveNumber: number;
  prioridad?: 'BAJA' | 'ALTA';
  tipoMovimiento?: 'MD_TRABAJANDO' | 'REMOLCADA';
  estado?: string;
  fechaSolicitud?: Date;
  instrucciones?: string;
  clienteId?: number;
  supervisorId?: number;
  coordinadorId?: number;
  operadorId?: number;   // compat
  maquinistaId?: number; // alias externo
  lavado?: boolean;
  torno?: boolean;
  posicionCabina?: 'Sin_Solicitar' | 'DENTRO' | 'AFUERA';
  posicionChimenea?: 'Sin_Solicitar' | 'DENTRO' | 'AFUERA';
  direccionEmpuje?: 'Sin_Solicitar' | 'EMPUJAR' | 'JALAR';
}) {
  try {
    const movData: any = { ...data };

    // alias maquinista → operador
    if (movData.maquinistaId && !movData.operadorId) movData.operadorId = movData.maquinistaId;
    delete movData.maquinistaId;

    // Validación: al menos uno de origen/destino
    const tieneOrigen = typeof movData.viaOrigenId === 'number' && !Number.isNaN(movData.viaOrigenId);
    const tieneDestino = typeof movData.viaDestinoId === 'number' && !Number.isNaN(movData.viaDestinoId);
    if (!tieneOrigen && !tieneDestino) {
      throw new Error('Debe especificar viaOrigenId o viaDestinoId');
    }

    // Defaults
    movData.prioridad ??= 'BAJA';
    movData.estado ??= 'SOLICITADO';
    movData.posicionCabina ??= 'Sin_Solicitar';
    movData.posicionChimenea ??= 'Sin_Solicitar';
    movData.direccionEmpuje ??= 'Sin_Solicitar';

    // Limpiar undefined
    Object.keys(movData).forEach((k) => movData[k] === undefined && delete movData[k]);

    const mv = await prisma.movimiento.create({ data: movData });

    // Encolar SIEMPRE en Ronda (servicio o no)
    await RondaModel.generarRondaParaMovimiento({
      movimientoId: mv.id,
      empresaId: mv.empresaId,
      localidadId: mv.localidadId,
      prioridad: (mv.prioridad as 'ALTA' | 'BAJA') ?? 'BAJA',
    });

    // Notificación de creación
    try {
      await NotificadorFCM.notificarNuevoMovimiento(mv.id);
    } catch (e) {
      movimientoError.error('Error delegando notificarNuevoMovimiento', { movId: mv.id, err: (e as any)?.message });
    }

    // Recalcular siguiente en ronda
    await RondaModel.siguienteInteligente(mv.localidadId);

    return await prisma.movimiento.findUnique({
      where: { id: mv.id },
      include: { empresa: true, localidad: true, viaDestino: true, ronda: true },
    });
  } catch (err: any) {
    movimientoError.error('Error al crear movimiento', {
      data,
      errName: err?.name, errMsg: err?.message, errStack: err?.stack, prismaCode: err?.code, prismaMeta: err?.meta,
    });
    throw new Error('Error al crear movimiento');
  }
}



  /** Cambia estado de servicios (lavado/torno) usando lógica central. */
  static async actualizarEstadoServicio(
    id: number,
    nuevoEstado: 'SOLICITADO' | 'EN_PROCESO' | 'DETENIDO' | 'CANCELADO',
    opciones: { maquinistaId?: number; operadorId?: number; razon?: string } = {}
  ) {
    try {
      const mov = await prisma.movimiento.findUnique({
        where: { id },
        select: { id: true, lavado: true, torno: true },
      });
      if (!mov) throw new Error(`No se encontró movimiento con id ${id}`);
      if (!mov.lavado && !mov.torno) {
        throw new Error('El movimiento no es un servicio de lavado/torno');
      }

      return await this.cambiarEstadoMovimiento(id, nuevoEstado, {
        maquinistaId: getMaquinistaId(opciones),
        razon: opciones.razon,
        forzar: false,
      });
    } catch (error: any) {
      movimientoError.error('Error al actualizar estado de servicio', {
        id, nuevoEstado, opciones,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al actualizar estado de servicio');
    }
  }

  /** Edita un movimiento; puede reinsertar/recomponer rondas. */
  static async editarMovimiento(
    id: number,
    data: {
      empresaId?: number;
      creadoPorId?: number;
      clienteId?: number;
      supervisorId?: number;
      coordinadorId?: number;
      operadorId?: number;   // compat
      maquinistaId?: number; // alias externo
      localidadId?: number;
      viaOrigenId?: number;
      viaDestinoId?: number;
      numeroSeccion?: number;
      locomotiveNumber?: number;
      lavado?: boolean;
      torno?: boolean;
      prioridad?: 'BAJA' | 'ALTA';
      tipoMovimiento?: 'MD_TRABAJANDO' | 'REMOLCADA';
      estado?: string;
      fechaSolicitud?: Date;
      fechaInicio?: Date;
      fechaFin?: Date;
      fechaPausa?: Date;
      instrucciones?: string;
      incidenteGlobal?: boolean;
      finalizado?: boolean;
      posicionCabina?: 'Sin_Solicitar' | 'DENTRO' | 'AFUERA';
      posicionChimenea?: 'Sin_Solicitar' | 'DENTRO' | 'AFUERA';
      direccionEmpuje?: 'Sin_Solicitar' | 'EMPUJAR' | 'JALAR';
    }
  ) {
    try {
      const { movUpd, requiereReorg } = await prisma.$transaction(async (tx) => {
        const actual = await tx.movimiento.findUnique({
          where: { id },
          select: { prioridad: true, estado: true, empresaId: true, localidadId: true, ronda: true, creadoPorId: true, clienteId: true },
        });
        if (!actual) throw new Error(`No se encontró movimiento con id ${id}`);

        const updateData: any = { ...data };

        if (updateData.maquinistaId && !updateData.operadorId) {
          updateData.operadorId = updateData.maquinistaId;
        }
        delete updateData.maquinistaId;

        updateData.posicionCabina ??= 'Sin_Solicitar';
        updateData.posicionChimenea ??= 'Sin_Solicitar';
        updateData.direccionEmpuje ??= 'Sin_Solicitar';
        Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k]);

        const movUpd = await tx.movimiento.update({
          where: { id },
          data: updateData,
          include: { empresa: true, localidad: true, viaDestino: true },
        });

        const requiereReorg =
          (data.prioridad === 'ALTA' && actual.prioridad !== 'ALTA') ||
          (data.estado === 'SOLICITADO' && actual.estado !== 'SOLICITADO') ||
          (data.empresaId && data.empresaId !== actual.empresaId) ||
          (data.localidadId && data.localidadId !== actual.localidadId);

        return { movUpd, requiereReorg };
      });

      if (requiereReorg) {
        const cur = await prisma.movimiento.findUnique({
          where: { id },
          select: { empresaId: true, localidadId: true, prioridad: true, estado: true, ronda: true },
        });
        if (cur) {
          if (cur.prioridad === 'ALTA' && cur.estado === 'SOLICITADO') {
            await RondaModel.generarRondaParaMovimiento({
              movimientoId: id,
              empresaId: cur.empresaId,
              localidadId: cur.localidadId,
              prioridad: 'ALTA',
            });
          } else if (!cur.ronda && cur.estado === 'SOLICITADO') {
            await RondaModel.generarRondaParaMovimiento({
              movimientoId: id,
              empresaId: cur.empresaId,
              localidadId: cur.localidadId,
              prioridad: (cur.prioridad as 'ALTA' | 'BAJA') ?? 'BAJA',
            });
          }
        }
      }

      await RondaModel.siguienteInteligente(movUpd.localidadId);
      return movUpd;
    } catch (error: any) {
      movimientoError.error('Error al editar movimiento', {
        id, data,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al editar movimiento');
    }
  }


/** SOLO servicios (lavado/torno) en SOLICITADO o DETENIDO. FIFO por fecha de creación. */
static async listarServiciosPendientesFIFO(filters: { localidadId?: number; empresaId?: number } = {}) {
  try {
    const where: any = {
      finalizado: false,
      OR: [{ lavado: true }, { torno: true }],
      estado: { in: ['SOLICITADO', 'DETENIDO'] },
    };
    if (filters.localidadId) where.localidadId = filters.localidadId;
    if (filters.empresaId) where.empresaId = filters.empresaId;

    return await prisma.movimiento.findMany({
      where,
      include: {
        empresa: true,
        localidad: true,
        viaOrigen: true,
        viaDestino: true,
        ronda: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  } catch (error: any) {
    movimientoError.error('Error al listar servicios pendientes (FIFO)', {
      filters,
      errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
    });
    throw new Error('Error al listar servicios pendientes');
  }
}


/**
 * Pasa un servicio (lavado/torno) de ESPERA → SOLICITADO y lo ENCOLA al **frente de R1**
 * sin importar prioridad (ALTA/BAJA).
 */
static async solicitarServicioYEncolarFrenteR1(id: number) {
  try {
    const m0 = await prisma.movimiento.findUnique({
      where: { id },
      select: { id: true, localidadId: true, empresaId: true, estado: true, lavado: true, torno: true },
    });
    if (!m0) throw new Error(`No se encontró movimiento con id ${id}`);
    if (!m0.lavado && !m0.torno) throw new Error('El movimiento no es un servicio de lavado/torno');

    // Hace el cambio a SOLICITADO y lo pone en posición 1 de R1 (transacción dentro del RondaModel)
    await RondaModel.solicitarYEncolarFrenteR1(id);

    // Recalcular “siguiente” para la localidad
    await RondaModel.siguienteInteligente(m0.localidadId);

    return await prisma.movimiento.findUnique({
      where: { id },
      include: { empresa: true, localidad: true, viaDestino: true, ronda: true },
    });
  } catch (error: any) {
    movimientoError.error('Error al solicitar y encolar servicio al frente de R1', {
      id,
      errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
    });
    throw new Error('Error al solicitar y encolar servicio');
  }
}

  /* --------------------------------- Otros --------------------------------- */

  /** Elimina un movimiento, limpia su ronda y recompone. */
  static async eliminarMovimiento(id: number) {
    try {
      const res = await prisma.$transaction(async (tx) => {
        const mov = await tx.movimiento.findUnique({ where: { id }, include: { ronda: true } });
        if (!mov) throw new Error(`Movimiento ${id} no encontrado`);

        if (mov.ronda) {
          await tx.ronda.delete({ where: { id: mov.ronda.id } });
          await RondaModel.recomponerRondasLocalidad(mov.localidadId, tx);
        }
        return await tx.movimiento.delete({ where: { id } });
      });

      await RondaModel.siguienteInteligente(res.localidadId);
      return res;
    } catch (error: any) {
      movimientoError.error('Error al eliminar movimiento', {
        id,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al eliminar movimiento');
    }
  }

  /**
   * Cambia prioridad (ALTA/BAJA). Readecua ronda cuando está SOLICITADO.
   * Notifica cambio de prioridad y recalcula “siguiente”.
   */
  static async cambiarPrioridad(id: number, prioridad: 'ALTA' | 'BAJA') {
    try {
      const movimiento = await prisma.movimiento.findUnique({
        where: { id },
        include: { ronda: true, empresa: true, localidad: true },
      });
      if (!movimiento) throw new Error(`No se encontró movimiento con id ${id}`);
      if (movimiento.prioridad === prioridad) return movimiento;

      const movimientoActualizado = await prisma.movimiento.update({
        where: { id },
        data: { prioridad },
      });

      if (movimiento.estado === 'SOLICITADO' && prioridad === 'ALTA') {
        await RondaModel.generarRondaParaMovimiento({
          movimientoId: id,
          empresaId: movimiento.empresaId,
          localidadId: movimiento.localidadId,
          prioridad: 'ALTA',
        });
      } else if (prioridad === 'BAJA' && movimiento.estado === 'SOLICITADO') {
        await prisma.ronda.deleteMany({ where: { movimientoId: id } });
        await RondaModel.generarRondaParaMovimiento({
          movimientoId: id,
          empresaId: movimiento.empresaId,
          localidadId: movimiento.localidadId,
          prioridad: 'BAJA',
        });
      }

      await notificarCambioPrioridad(id, prioridad);
      await RondaModel.siguienteInteligente(movimiento.localidadId);

      return movimientoActualizado;
    } catch (error: any) {
      movimientoError.error('Error al cambiar prioridad', {
        id, prioridad,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al cambiar prioridad del movimiento');
    }
  }

  /* --------------------- Consultas por filtros de negocio --------------------- */

  static async obtenerMovimientosPendientes() {
    try {
      return await prisma.movimiento.findMany({
        where: { estado: { in: ['EN_PROCESO', 'DETENIDO', 'ESPERA'] } },
        include: {
          empresa: true,
          creadoPor: true,
          localidad: true,
          viaOrigen: true,
          viaDestino: true,
          incidentes: true,
          ronda: true,
        },
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos pendientes', {
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos pendientes');
    }
  }

  static async obtenerMovimientosPendientesPorEmpresa(empresaId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { empresaId, estado: { in: ['SOLICITADO', 'EN_PROCESO', 'DETENIDO', 'ESPERA'] } },
        include: {
          empresa: true,
          creadoPor: true,
          localidad: true,
          viaOrigen: true,
          viaDestino: true,
          incidentes: true,
          ronda: true,
        },
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos pendientes por empresa', {
        empresaId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos pendientes por empresa');
    }
  }

  static async obtenerTodosLosMovimientos() {
    try {
      return await prisma.movimiento.findMany({
        include: {
          empresa: true,
          creadoPor: true,
          localidad: true,
          viaOrigen: true,
          viaDestino: true,
          incidentes: true,
          ronda: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener todos los movimientos', {
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener todos los movimientos');
    }
  }

  static async obtenerMovimientosPorEmpresa(empresaId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { empresaId },
        include: {
          empresa: true,
          creadoPor: true,
          localidad: true,
          viaOrigen: true,
          viaDestino: true,
          incidentes: true,
          ronda: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos por empresa', {
        empresaId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos por empresa');
    }
  }

  static async obtenerMovimientosPendientesPorLocalidad(localidadId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { localidadId, estado: { in: ['SOLICITADO', 'EN_PROCESO', 'DETENIDO', 'ESPERA'] } },
        include: {
          empresa: true,
          creadoPor: true,
          localidad: true,
          viaOrigen: true,
          viaDestino: true,
          incidentes: true,
          ronda: true,
        },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos pendientes por localidad', {
        localidadId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos pendientes por localidad');
    }
  }

  static async obtenerTodosMovimientosPorLocalidad(localidadId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { localidadId },
        include: {
          empresa: true,
          creadoPor: true,
          localidad: true,
          viaOrigen: true,
          viaDestino: true,
          incidentes: true,
          ronda: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener todos los movimientos por localidad', {
        localidadId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener todos los movimientos por localidad');
    }
  }

  static async obtenerMovimientosPorLocalidadEmpresa(localidadId: number, empresaId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { localidadId, empresaId },
        include: {
          empresa: true,
          creadoPor: true,
          localidad: true,
          viaOrigen: true,
          viaDestino: true,
          incidentes: true,
          ronda: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos por localidad y empresa', {
        localidadId, empresaId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos por localidad y empresa');
    }
  }

  static async obtenerMovimientosPorEmpresaYLocalidad(empresaId: number, localidadId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { empresaId, localidadId },
        include: {
          empresa: true,
          creadoPor: true,
          localidad: true,
          viaOrigen: true,
          viaDestino: true,
          incidentes: true,
          ronda: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos por empresa y localidad', {
        empresaId, localidadId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos por empresa y localidad');
    }
  }

  static async obtenerMovimientosNoConcluidosPorEmpresaYLocalidad(empresaId: number, localidadId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { empresaId, localidadId, finalizado: false },
        include: {
          empresa: true,
          creadoPor: true,
          localidad: true,
          viaOrigen: true,
          viaDestino: true,
          incidentes: true,
          ronda: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos no concluidos por empresa y localidad', {
        empresaId, localidadId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos no concluidos por empresa y localidad');
    }
  }

  /* -------------------------- Info compuesta por ronda -------------------------- */

  static async obtenerInfoPorRonda(rondaId: number) {
    
    try {
      const info = await RondaModel.obtenerInfoPorRonda(rondaId);
      
      if (!info) throw new Error(`No se encontró la ronda con ID ${rondaId}`);

      // Asegura instrucciones frescas desde la DB del movimiento
      const movDB = await prisma.movimiento.findUnique({
        where: { id: info.movimiento.id },
        select: { instrucciones: true },
      });
      const instrucciones = movDB?.instrucciones;
      const meta = parseMetaFromInstrucciones(instrucciones ?? undefined);

      return {
        rondaId: info.rondaId,
        rondaNumero: info.rondaNumero,
        orden: info.orden,
        concluido: info.concluido,
        empresa: info.empresa,
        movimiento: {
          id: info.movimiento.id,
          viaOrigen: info.movimiento.viaOrigen,
          viaDestino: info.movimiento.viaDestino,
          lavado: info.movimiento.lavado,
          torno: info.movimiento.torno,
          instrucciones, // ← proviene de la DB del movimiento
        },
        meta, // ← derivado del tag [META ...] en instrucciones (si existe)
      };
    } catch (error: any) {
      movimientoError.error('Error al obtener info de ronda desde MovimientoModel', {
        rondaId, errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener información de la ronda');
    }
  }

  /* -------------------------- Acciones rápidas maquinista -------------------------- */

  /** Marca EN_PROCESO e inicia (setea operadorId=maquinistaId). */
  static async iniciarMovimiento(id: number, maquinistaId: number) {
    try {
      const fechaActual = new Date();
      const mov = await prisma.movimiento.update({
        where: { id },
        data: {
          estado: 'EN_PROCESO',
          fechaInicio: fechaActual,
          operadorId: maquinistaId,
          updatedAt: fechaActual,
        },
      });

      await notificarMovimientoIniciado(mov.id);
      await RondaModel.siguienteInteligente(mov.localidadId);
      return mov;
    } catch (error: any) {
      movimientoError.error('Error al iniciar movimiento', {
        id, maquinistaId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al iniciar movimiento');
    }
  }

  /** Pausa (DETENIDO). */
  static async pausarMovimiento(id: number) {
    try {
      const fechaActual = new Date();
      const mov = await prisma.movimiento.update({
        where: { id },
        data: { estado: 'DETENIDO', fechaPausa: fechaActual, updatedAt: fechaActual },
      });

      await RondaModel.siguienteInteligente(mov.localidadId);
      return mov;
    } catch (error: any) {
      movimientoError.error('Error al pausar movimiento', {
        id, errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al pausar movimiento');
    }
  }

  /** Reanuda (EN_PROCESO). */
  static async reanudarMovimiento(id: number) {
    try {
      const fechaActual = new Date();
      const mov = await prisma.movimiento.update({
        where: { id },
        data: { estado: 'EN_PROCESO', fechaInicio: fechaActual, updatedAt: fechaActual },
      });

      await notificarMovimientoIniciado(mov.id);
      await RondaModel.siguienteInteligente(mov.localidadId);
      return mov;
    } catch (error: any) {
      movimientoError.error('Error al reanudar movimiento', {
        id, errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al reanudar movimiento');
    }
  }

  /* ------------------- Finalizar (no libera/ocupa vías aquí) ------------------- */

  /** Finaliza el movimiento (CONCLUIDO + finalizado) y concluye su ronda. */
  static async finalizarMovimiento(id: number) {
    try {
      const mov = await prisma.$transaction(async (tx) => {
        const actual = await tx.movimiento.findUnique({
          where: { id },
          include: { ronda: true },
        });
        if (!actual) throw new Error(`Movimiento ${id} no encontrado`);
        if (actual.finalizado) return actual;

        const res = await tx.movimiento.update({
          where: { id },
          data: { estado: 'CONCLUIDO', finalizado: true, fechaFin: new Date(), updatedAt: new Date() },
          include: { ronda: true },
        });

        if (res.ronda) {
          await tx.ronda.update({ where: { id: res.ronda.id }, data: { concluido: true, updatedAt: new Date() } });
          await RondaModel.recomponerRondasLocalidad(res.localidadId, tx);
        }

        return res;
      });

      await notificarMovimientoFinalizado(mov.id);
      await RondaModel.siguienteInteligente(mov.localidadId);
      return mov;
    } catch (error: any) {
      movimientoError.error('Error al finalizar movimiento', {
        id,
        errName: error?.name,
        errMsg: error?.message,
        errStack: error?.stack,
        prismaCode: error?.code,
        prismaMeta: error?.meta,
      });
      throw new Error('Error al finalizar movimiento');
    }
  }
}
