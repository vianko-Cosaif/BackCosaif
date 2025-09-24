// src/models/Movimientos/MovimientoModel.ts

/**
 * @file MovimientoModel.ts
 * @author Isaac
 * @version 1.6.2 2025-09-08
 *
 * Modelo/dominio para gestionar Movimientos + notificaciones FCM bien segmentadas.
 * - No ocupa/libera vías; solo estados y coordinación con RondaModel.
 * - CREACIÓN: MAQUINISTA/OPERADOR por LOCALIDAD (sin filtrar por empresa) → delega a NotificadorFCM.
 * - INICIO: OPERADOR por LOCALIDAD (sin filtrar por empresa) + STAFF/CLIENTE filtrables por empresa.
 * - Staff (SUPERVISOR/COORDINADOR/ADMIN) sí puede filtrarse por empresa.
 * - Al concluir un MOVIMIENTO que va a LAVADO/TORNO se ABRE el servicio en LavadoT/TornoT (NO se crea otro movimiento).
 */

import { Prisma, PrismaClient, Rol, ServicioEstado } from '@prisma/client';
import { RondaModel } from './Ronda/RondaModel';
import { movimientoError } from './movimiento.logger';
import admin from 'firebase-admin';
import { NotificadorFCM } from '../../services/NotificadorFCM';

// --- helpers (arriba, junto a otros helpers) ---
function assertViasCreate(args: { viaOrigenId?: number|null; viaDestinoId?: number|null }) {
  const a = !!args.viaOrigenId, b = !!args.viaDestinoId;
  if ((a ? 1 : 0) + (b ? 1 : 0) !== 1) {
    throw new Error('Debe indicar exactamente una vía (origen o destino)');
  }
}

// normLoco → INT estricto a DB. Acepta string/number, limpia y convierte.
function normLoco(v: unknown): number {
  if (v === null || v === undefined) throw new Error('locomotiveNumber requerido');
  const digits = String(v).trim().replace(/\D+/g, '');
  if (!digits) throw new Error('locomotiveNumber inválido');
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) throw new Error('locomotiveNumber inválido');
  // opcional: límites
  if (n > Number.MAX_SAFE_INTEGER) throw new Error('locomotiveNumber fuera de rango');
  return n;
}
// ----------------------------------------------------------------------------
// Prisma singleton (evita múltiples conexiones en hot-reload)
// ----------------------------------------------------------------------------
const prisma: PrismaClient =
  (global as any).__PRISMA__ ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  (global as any).__PRISMA__ = prisma;
}
type Paginado<T> = { items: T[]; hasMore: boolean; nextCursorId?: number };

// Helper: inferir servicio por nombre de vía destino
async function inferirServicioDesdeDestino(movId: number) {
  const m = await prisma.movimiento.findUnique({
    where: { id: movId },
    select: { viaDestino: { select: { nombre: true } } },
  });
  const n = (m?.viaDestino?.nombre ?? '').toUpperCase();
  return {
    lavado: /\bLAVAD/.test(n),
    torno:  /\bTORN/.test(n),
  };
}

type MovimientoResumen = {
  id: number;
  locomotora: number;
  estado: string;
  estatus: string;
  prioridad: string;
  tipo?: string;
  empresa: string;
  localidad: string;
  via: {
    origen: { numero: number; nombre: string };
    destino?: { numero: number; nombre: string };
  };
  personas: {
    creadoPor: string;
    cliente?: string;
    operador?: string;
    maquinista?: string; // alias público de operador
    supervisor?: string;
    coordinador?: string;
  };
  servicio?: { tipo: string; estado: string; orden: number };
  ronda?: { numero: number; orden: number; concluido: boolean };
  incidentes: { total: number; abiertos: number; ultimoEstado?: string };
  fechas: { solicitud: string; inicio?: string; pausa?: string; fin?: string };
  instrucciones?: string;
  posiciones: { cabina?: string; chimenea?: string; empuje?: string };
  flags: { lavado: boolean; torno: boolean; incidenteGlobal: boolean };
};

// Mapeos a texto
const MAP_ESTADO: Record<string, string> = {
  SOLICITADO: "Solicitado",
  EN_PROCESO: "En proceso",
  DETENIDO: "Detenido",
  ESPERA: "En espera",
  MODIFICADO: "Modificado",
  CONCLUIDO: "Concluido",
  CANCELADO: "Cancelado",
};
const MAP_PRIORIDAD: Record<string, string> = { ALTA: "Alta", BAJA: "Baja" };
const MAP_TIPO: Record<string, string> = {
  MD_TRABAJANDO: "MD trabajando",
  REMOLCADA: "Remolcada",
};
const MAP_SERV_TIPO: Record<string, string> = { LAVADO: "Lavado", TORNO: "Torno" };
const MAP_SERV_ESTADO: Record<string, string> = {
  EN_COLA: "En cola",
  SIGUIENTE: "Siguiente",
  EN_SERVICIO: "En servicio",
  FINALIZADO: "Finalizado",
};
const MAP_POS: Record<string, string> = {
  DENTRO: "Dentro",
  AFUERA: "Afuera",
  Sin_Solicitar: "Sin solicitar",
};
const MAP_EMP: Record<string, string> = {
  EMPUJAR: "Empujar",
  JALAR: "Jalar",
  Sin_Solicitar: "Sin solicitar",
};
const MAP_INC: Record<string, string> = {
  ABIERTO: "Abierto",
  CERRADO: "Cerrado",
  RESUELTO: "Resuelto",
};

// Fecha -> "DD/MM/YYYY HH:mm" TZ America/Mexico_City
function fmt(d?: Date | null): string | undefined {
  if (!d) return undefined;
  const mx = new Date(
    new Date(d).toLocaleString("en-US", { timeZone: "America/Mexico_City" })
  );
  const y = mx.getFullYear();
  const M = String(mx.getMonth() + 1).padStart(2, "0");
  const day = String(mx.getDate()).padStart(2, "0");
  const hh = String(mx.getHours()).padStart(2, "0");
  const mm = String(mx.getMinutes()).padStart(2, "0");
  return `${day}/${M}/${y} ${hh}:${mm}`;
}

// Estatus compuesto según reglas acordadas
function buildEstatus(m: {
  estado: string;
  finalizado: boolean | null;
  prioridad: "ALTA" | "BAJA";
  servicio?: { tipo: keyof typeof MAP_SERV_TIPO; estado: keyof typeof MAP_SERV_ESTADO } | null;
  abiertos: number;
}): string {
  let base: string;
  if (m.estado === "CANCELADO") base = "Cancelado";
  else if (m.finalizado || m.estado === "CONCLUIDO") base = "Concluido";
  else if (m.servicio?.estado === "EN_SERVICIO")
    base = `En servicio de ${MAP_SERV_TIPO[m.servicio.tipo]}`;
  else if (m.servicio?.estado === "SIGUIENTE") base = "Siguiente en servicio";
  else if (m.estado === "EN_PROCESO") base = "En proceso";
  else if (m.estado === "DETENIDO") base = "Detenido";
  else if (m.estado === "ESPERA") base = "En espera";
  else base = "Solicitado en cola";

  const sufijos: string[] = [];
  if (m.abiertos === 1) sufijos.push("con 1 incidente");
  else if (m.abiertos > 1) sufijos.push(`con ${m.abiertos} incidentes`);
  if (m.prioridad === "ALTA") sufijos.push("prioridad alta");

  return sufijos.length ? `${base} · ${sufijos.join(" · ")}` : base;
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

  await enviarMulticastMovimiento(
    tokens,
    {
      notification: {
        title: `Cambio de prioridad → ${nueva}`,
        body:
          `Movimiento #${m.id} · Empresa: ${m.empresa?.nombre ?? 'N/D'} · ` +
          `Origen: ${m.viaOrigen?.nombre ?? 'N/D'} • Destino: ${m.viaDestino?.nombre ?? 'N/D'}`,
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

/** Inicio → Operador (por localidad S/empresa) + Supervisor/Cliente/Coordinador (filtrables por empresa) */
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

  // Operadores por LOCALIDAD sin filtrar por empresa
  const operadoresLocalidad = await usuariosPorRolesLocalidadEmpresa(m.localidadId, undefined, [Rol.OPERADOR]);

  // Staff + cliente (permitido filtrar por empresa)
  const staffCliente = await usuariosPorRolesLocalidadEmpresa(
    m.localidadId,
    m.empresaId,
    [Rol.SUPERVISOR, Rol.COORDINADOR, Rol.CLIENTE]
  );

  const tokens = uniqueTokensFromUsers([...operadoresLocalidad, ...staffCliente]);

  const roleCounts = {
    OPERADOR: operadoresLocalidad.length,
    SUPERVISOR: staffCliente.filter(u => u.rol === Rol.SUPERVISOR).length,
    COORDINADOR: staffCliente.filter(u => u.rol === Rol.COORDINADOR).length,
    CLIENTE: staffCliente.filter(u => u.rol === Rol.CLIENTE).length,
  };

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

/** Fin → Cliente/Coordinador/Supervisor (filtrables por empresa) */
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

  const usuarios = await usuariosPorRolesLocalidadEmpresa(
    m.localidadId,
    m.empresaId,
    [Rol.CLIENTE, Rol.COORDINADOR, Rol.SUPERVISOR]
  );
  const tokens = uniqueTokensFromUsers(usuarios);

  const roleCounts = {
    CLIENTE: usuarios.filter(u => u.rol === Rol.CLIENTE).length,
    COORDINADOR: usuarios.filter(u => u.rol === Rol.COORDINADOR).length,
    SUPERVISOR: usuarios.filter(u => u.rol === Rol.SUPERVISOR).length,
  };

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

  // reactivarMovimiento: SIN onServicioActivado
  static async reactivarMovimiento(id: number, maquinistaId?: number) {
    try {
      const fechaActual = new Date();
      const movimientoActual = await prisma.movimiento.findUnique({
        where: { id },
        select: { estado: true, empresa: { select: { nombre: true } }, localidad: { select: { nombre: true } } },
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
        movimientoId: id, maquinistaId: maquinistaId ?? 'No especificado',
        empresa: movimientoActual.empresa?.nombre, localidad: movimientoActual.localidad?.nombre,
      });

      await notificarMovimientoIniciado(movimientoReactivado.id);
      await RondaModel.siguienteInteligente(movimientoReactivado.localidadId);
      return movimientoReactivado;
    } catch (error: any) {
      movimientoError.error('Error al reactivar movimiento', { id, maquinistaId, errName: error?.name, errMsg: error?.message });
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
include: { empresa: true, localidad: true, ronda: true }
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
        flags: { lavado: !!(movAct as any).lavado, torno: !!(movAct as any).torno },
      });

      try {
        if (nuevoEstado === 'EN_PROCESO') {
          await notificarMovimientoIniciado(id);
        } else if (nuevoEstado === 'CONCLUIDO') {
          // ✔ Aquí se activa el servicio (LavadoT/TornoT) en lugar de crear otro movimiento.
          await MovimientoModel._activarServicioTrasMovimiento(id);
          await notificarMovimientoFinalizado(id);
        }
      } catch (e: any) {
        movimientoError.error('Error post-cambio de estado', {
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
 * Crea un movimiento (no ocupa/libera vías). Si queda en SOLICITADO/ESPERA, crea su ronda
 * salvo que sea un servicio (lavado/torno) detectado por flags de entrada o vía destino.
 * No marca lavado/torno; quedará oculto hasta que lo encolen explícitamente.
 * Notifica creación y recalcula “siguiente”.
 */


static async nuevoMovimiento(data: {
  empresaId: number;
  creadoPorId: number;
  localidadId: number;
  viaOrigenId?: number;
  viaDestinoId?: number;
  numeroSeccion?: number;
  locomotiveNumber: string | number; // entrada flexible
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
  lavado?: boolean;      // ignorado en creación
  torno?: boolean;       // ignorado en creación
  posicionCabina?: 'Sin_Solicitar' | 'DENTRO' | 'AFUERA';
  posicionChimenea?: 'Sin_Solicitar' | 'DENTRO' | 'AFUERA';
  direccionEmpuje?: 'Sin_Solicitar' | 'EMPUJAR' | 'JALAR';
}) {
  try {
    // 1) Validar que vías pertenezcan a la misma localidad
    const origenId  = data.viaOrigenId ?? undefined;
    const destinoId = data.viaDestinoId ?? undefined;
    const idsAValidar = Array.from(new Set([origenId, destinoId].filter(Boolean))) as number[];
    if (idsAValidar.length) {
      const vias = await prisma.via.findMany({
        where: { id: { in: idsAValidar } },
        select: { id: true, localidadId: true },
      });
      if (vias.length !== idsAValidar.length) throw new Error('Alguna vía indicada no existe.');
      const mismatch = vias.find(v => v.localidadId !== data.localidadId);
      if (mismatch) throw new Error('La vía indicada no pertenece a la localidad del movimiento.');
    }

    // 2) Normalizar y NO marcar servicio en creación
    const movData: any = { ...data };

    // normLoco → Int para Prisma
    movData.locomotiveNumber = normLoco(data.locomotiveNumber);

    if (movData.maquinistaId && !movData.operadorId) movData.operadorId = movData.maquinistaId;
    delete movData.maquinistaId;
    delete movData.lavado;
    delete movData.torno;

    movData.prioridad ??= 'BAJA';
    movData.estado ??= 'SOLICITADO';
    movData.fechaSolicitud ??= new Date();
    movData.posicionCabina ??= 'Sin_Solicitar';
    movData.posicionChimenea ??= 'Sin_Solicitar';
    movData.direccionEmpuje ??= 'Sin_Solicitar';

    Object.keys(movData).forEach((k) => movData[k] === undefined && delete movData[k]);

    // 3) Crear (sin ocupar/liberar y SIN encolar)
    const mv = await prisma.movimiento.create({ data: movData });

    // 4) Notificar creación. No recalcula “siguiente” porque no se encoló.
    try {
      await NotificadorFCM.notificarNuevoMovimiento(mv.id);
    } catch (e) {
      movimientoError.error('Error delegando notificarNuevoMovimiento', { movId: mv.id, err: (e as any)?.message });
    }

    return await prisma.movimiento.findUnique({
      where: { id: mv.id },
      include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true, ronda: true },
    });
  } catch (err: any) {
    movimientoError.error('Error al crear movimiento', {
      data: { ...data, locomotiveNumber: String(data.locomotiveNumber) },
      errName: err?.name, errMsg: err?.message, errStack: err?.stack, prismaCode: err?.code, prismaMeta: err?.meta,
    });
    throw new Error('Error al crear movimiento');
  }
}

static async encolarMovimiento(
  id: number,
  opciones: { prioridad?: 'ALTA' | 'BAJA'; forzarR1Front?: boolean } = {}
) {
  try {
    const mov = await prisma.movimiento.findUnique({
      where: { id },
      include: { ronda: true },
    });
    if (!mov) throw new Error(`Movimiento ${id} no encontrado`);
    if (mov.finalizado || mov.estado === 'CONCLUIDO' || mov.estado === 'CANCELADO') {
      throw new Error('No se puede encolar un movimiento concluido o cancelado');
    }

    await prisma.$transaction(async (tx) => {
      // limpiar ronda previa si existía
      if (mov.ronda) {
        await tx.ronda.delete({ where: { id: mov.ronda.id } });
      }

      if (opciones.forzarR1Front) {
        await RondaModel.insertarAlFrenteR1(
          { movimientoId: mov.id, empresaId: mov.empresaId, localidadId: mov.localidadId },
          tx
        );
      } else {
        await RondaModel.generarRondaParaMovimiento({
          movimientoId: mov.id,
          empresaId: mov.empresaId,
          localidadId: mov.localidadId,
          prioridad: opciones.prioridad ?? (mov.prioridad as 'ALTA' | 'BAJA') ?? 'BAJA',
        });
      }
    });

    await RondaModel.siguienteInteligente(mov.localidadId);

    return await prisma.movimiento.findUnique({
      where: { id },
      include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true, ronda: true },
    });
  } catch (error:any) {
    movimientoError.error('Error al encolar movimiento', { id, opciones, errMsg: error?.message });
    throw new Error(error?.message || 'Error al encolar movimiento');
  }
}


static async obtenerServiciosNoEncolados(filters: {
  localidadId: number;
  empresaId?: number;
  tipo?: 'LAVADO' | 'TORNO';
}) {
  const { localidadId, empresaId, tipo } = filters;
  try {
    // ✅ filtros tipados (sin readonly) y con relación correcta: servicio { is: null }
    const whereLav: Prisma.LavadoTWhereInput = {
      localidadId,
      status: { in: [ServicioEstado.EN_SERVICIO, ServicioEstado.DETENIDO] },
      movimiento: {
        ...(empresaId ? { empresaId } : {}),
        servicio: { is: null },
      },
    };

    const whereTor: Prisma.TornoTWhereInput = {
      localidadId,
      status: { in: [ServicioEstado.EN_SERVICIO, ServicioEstado.DETENIDO] },
      movimiento: {
        ...(empresaId ? { empresaId } : {}),
        servicio: { is: null },
      },
    };

    const selectMov = {
      id: true,
      empresaId: true,
      localidadId: true,
      empresa: { select: { nombre: true } },
      localidad: { select: { nombre: true } },
      viaOrigen: { select: { id: true, numero: true, nombre: true } },
      viaDestino: { select: { id: true, numero: true, nombre: true } },
      prioridad: true,
      estado: true,
      fechaSolicitud: true,
      fechaInicio: true,
      fechaFin: true,
      locomotiveNumber: true,
    } as const;

    // ✅ lecturas en paralelo (sin $transaction de array)
    const [lavados, tornos] = await Promise.all([
      tipo === 'TORNO'
        ? Promise.resolve([])
        : prisma.lavadoT.findMany({
            where: whereLav,
            include: { movimiento: { select: selectMov } },
            orderBy: { createdAt: 'asc' },
          }),
      tipo === 'LAVADO'
        ? Promise.resolve([])
        : prisma.tornoT.findMany({
            where: whereTor,
            include: { movimiento: { select: selectMov } },
            orderBy: { createdAt: 'asc' },
          }),
    ]);

    // ✅ mapeos tipados y devolvemos id = movimientoId (lo usa tu RN)
    const mapLav = (lavados as Array<
      Prisma.LavadoTGetPayload<{ include: { movimiento: { select: typeof selectMov } } }>
    >).map((l) => ({
      id: l.movimientoId,            // ← importante para RN
      tipo: 'LAVADO' as const,
      servicioId: l.id,
      movimientoId: l.movimientoId,
      status: l.status,
      inicio: l.inicio,
      fin: l.fin,
      creadoEn: l.createdAt,
      empresa: l.movimiento.empresa?.nombre ?? 'N/D',
      localidad: l.movimiento.localidad?.nombre ?? 'N/D',
      viaOrigen: l.movimiento.viaOrigen,
      viaDestino: l.movimiento.viaDestino,
      prioridad: l.movimiento.prioridad,
      estadoMovimiento: l.movimiento.estado,
      locomotiveNumber: l.movimiento.locomotiveNumber ?? null,
      lavado: true,
      torno: false,
      fechas: {
        solicitud: l.movimiento.fechaSolicitud,
        inicio: l.movimiento.fechaInicio,
        fin: l.movimiento.fechaFin,
      },
    }));

    const mapTor = (tornos as Array<
      Prisma.TornoTGetPayload<{ include: { movimiento: { select: typeof selectMov } } }>
    >).map((t) => ({
      id: t.movimientoId,            // ← importante para RN
      tipo: 'TORNO' as const,
      servicioId: t.id,
      movimientoId: t.movimientoId,
      status: t.status,
      inicio: t.inicio,
      fin: t.fin,
      creadoEn: t.createdAt,
      empresa: t.movimiento.empresa?.nombre ?? 'N/D',
      localidad: t.movimiento.localidad?.nombre ?? 'N/D',
      viaOrigen: t.movimiento.viaOrigen,
      viaDestino: t.movimiento.viaDestino,
      prioridad: t.movimiento.prioridad,
      estadoMovimiento: t.movimiento.estado,
      locomotiveNumber: t.movimiento.locomotiveNumber ?? null,
      lavado: false,
      torno: true,
      fechas: {
        solicitud: t.movimiento.fechaSolicitud,
        inicio: t.movimiento.fechaInicio,
        fin: t.movimiento.fechaFin,
      },
    }));

    const out = [...mapLav, ...mapTor];

    // 📜 LOGS ESPECÍFICOS
    movimientoError.info('NO-ENCOLADOS', {
      localidadId,
      ...(empresaId ? { empresaId } : {}),
      tipo: tipo ?? 'AMBOS',
      countLav: mapLav.length,
      countTor: mapTor.length,
      total: out.length,
    });

    if (out.length === 0) {
      movimientoError.warn('NO-ENCOLADOS vacío', { localidadId, empresaId: empresaId ?? null, tipo: tipo ?? 'AMBOS' });
    }

    return out;
  } catch (error: any) {
    movimientoError.error('Error servicios NO encolados', {
      filters,
      errName: error?.name,
      errMsg: error?.message,
      prismaCode: error?.code,
      prismaMeta: error?.meta,
    });
    throw new Error('Error al obtener servicios no encolados');
  }
}

  // Mantener compat: forzamos transición aunque no respete máquina de estados (UI legacy)
  static async actualizarEstadoServicio(
    id: number,
    nuevoEstado: 'SOLICITADO' | 'EN_PROCESO' | 'DETENIDO' | 'CANCELADO' | 'CONCLUIDO',
    opciones: { maquinistaId?: number; operadorId?: number; razon?: string } = {}
  ) {
    try {
      return await this.cambiarEstadoMovimiento(id, nuevoEstado, {
        maquinistaId: getMaquinistaId(opciones),
        razon: opciones.razon,
        forzar: true,
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
        select: {
          prioridad: true,
          estado: true,
          empresaId: true,
          localidadId: true,
          ronda: true,
          creadoPorId: true,
          clienteId: true,
        },
      });
      if (!actual) throw new Error(`No se encontró movimiento con id ${id}`);

      const updateData: any = { ...data };

      // Normalización de alias
      if (updateData.maquinistaId && !updateData.operadorId) {
        updateData.operadorId = updateData.maquinistaId;
      }
      delete updateData.maquinistaId;

      // Defaults (mantener consistencia)
      updateData.posicionCabina ??= 'Sin_Solicitar';
      updateData.posicionChimenea ??= 'Sin_Solicitar';
      updateData.direccionEmpuje ??= 'Sin_Solicitar';

      // Remover undefineds
      Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k]);

      const movUpd = await tx.movimiento.update({
        where: { id },
        data: updateData,
        include: { empresa: true, localidad: true, viaDestino: true, ronda: true },
      });

      // ¿Reorganizar rondas? (solo aplica para SOLICITADO y NO-servicio)
      let requiereReorg =
        (data.prioridad === 'ALTA' && actual.prioridad !== 'ALTA') ||
        (data.estado === 'SOLICITADO' && actual.estado !== 'SOLICITADO') ||
        (data.empresaId && data.empresaId !== actual.empresaId) ||
        (data.localidadId && data.localidadId !== actual.localidadId);

      const esServicioPost = !!movUpd.lavado || !!movUpd.torno;
      if (esServicioPost) requiereReorg = false; // ⚠️ servicios NO se encolan aquí

      return { movUpd, requiereReorg };
    });

    if (requiereReorg) {
      // Solo reencolar si NO es servicio
      if (movUpd.prioridad === 'ALTA' && movUpd.estado === 'SOLICITADO') {
        await RondaModel.generarRondaParaMovimiento({
          movimientoId: movUpd.id,
          empresaId: movUpd.empresaId,
          localidadId: movUpd.localidadId,
          prioridad: 'ALTA',
        });
      } else if (!movUpd.ronda && movUpd.estado === 'SOLICITADO') {
        await RondaModel.generarRondaParaMovimiento({
          movimientoId: movUpd.id,
          empresaId: movUpd.empresaId,
          localidadId: movUpd.localidadId,
          prioridad: (movUpd.prioridad as 'ALTA' | 'BAJA') ?? 'BAJA',
        });
      }
    }

    await RondaModel.siguienteInteligente(movUpd.localidadId);
    return movUpd;
  } catch (error: any) {
    movimientoError.error('Error al editar movimiento', {
      id,
      data,
      errName: error?.name,
      errMsg: error?.message,
      errStack: error?.stack,
      prismaCode: error?.code,
      prismaMeta: error?.meta,
    });
    throw new Error('Error al editar movimiento');
  }
}


  /* --------------------------------- Otros --------------------------------- */
  /** Marca lavado/torno y activa servicio asociado (si existe). */
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
        where: { estado: { in: ['SOLICITADO', 'EN_PROCESO', 'DETENIDO', 'ESPERA'] } },
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

  static async obtenerTodosMovimientosPorLocalidad(
    localidadId: number,
    opts: { take?: number; cursorId?: number } = {}
  ): Promise<Paginado<MovimientoResumen>> {
    const take = Math.min(Math.max(opts.take ?? 50, 1), 200); // 1..200

    try {
      // Página con cursor (id) y orden estable
      const movs = await prisma.movimiento.findMany({
        where: { localidadId },
        orderBy: [
          { prioridad: 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' }, // único para cursor estable
        ],
        cursor: opts.cursorId ? { id: opts.cursorId } : undefined,
        skip: opts.cursorId ? 1 : 0,
        take: take + 1, // 1 extra para detectar hasMore
        select: {
          id: true,
          locomotiveNumber: true,
          estado: true,
          prioridad: true,
          tipoMovimiento: true,
          finalizado: true,
          instrucciones: true,
          lavado: true,
          torno: true,
          incidenteGlobal: true,
          posicionCabina: true,
          posicionChimenea: true,
          direccionEmpuje: true,
          fechaSolicitud: true,
          fechaInicio: true,
          fechaPausa: true,
          fechaFin: true,
          empresa: { select: { nombre: true } },
          localidad: { select: { nombre: true } },
          viaOrigen: { select: { numero: true, nombre: true } },
          viaDestino: { select: { numero: true, nombre: true } },
          creadoPor: { select: { nombre: true } },
          cliente: { select: { nombre: true } },
          operador: { select: { nombre: true } },
          supervisor: { select: { nombre: true } },
          coordinador: { select: { nombre: true } },
          ronda: { select: { rondaNumero: true, orden: true, concluido: true } },
          servicio: { select: { tipo: true, estado: true, orden: true } },
          incidentes: { select: { estado: true }, orderBy: { fechaInicio: 'desc' }, take: 1 }, // último
        },
      });

      if (movs.length === 0) return { items: [], hasMore: false };

      const hasMore = movs.length > take;
      const page = hasMore ? movs.slice(0, take) : movs;
      const nextCursorId = hasMore ? page[page.length - 1].id : undefined;

      const ids = page.map(m => m.id);

      type IncRow = { movimientoId: number; _count: { _all: number } };

      const [abiertosRows, totalesRows] = await prisma.$transaction([
        prisma.incidente.groupBy({
          by: ['movimientoId'],
          where: { movimientoId: { in: ids }, estado: 'ABIERTO' },
          _count: { _all: true },
        }),
        prisma.incidente.groupBy({
          by: ['movimientoId'],
          where: { movimientoId: { in: ids } },
          _count: { _all: true },
        }),
      ]) as [IncRow[], IncRow[]];

      const mapAbiertos = new Map<number, number>();
      for (const r of abiertosRows) mapAbiertos.set(r.movimientoId, r._count._all);

      const mapTotales = new Map<number, number>();
      for (const r of totalesRows) mapTotales.set(r.movimientoId, r._count._all);

      const items: MovimientoResumen[] = page.map((m) => {
        const total = mapTotales.get(m.id) ?? 0;
        const abiertos = mapAbiertos.get(m.id) ?? 0;

        const ultimoEstado = m.incidentes[0]?.estado
          ? (MAP_INC[m.incidentes[0].estado] ?? m.incidentes[0].estado)
          : undefined;

        const servicio = m.servicio
          ? {
              tipo: MAP_SERV_TIPO[m.servicio.tipo] ?? m.servicio.tipo,
              estado: MAP_SERV_ESTADO[m.servicio.estado] ?? m.servicio.estado,
              orden: m.servicio.orden,
            }
          : undefined;

        const instrucciones =
          m.instrucciones && m.instrucciones.length > 140
            ? `${m.instrucciones.slice(0, 140)}…`
            : (m.instrucciones ?? undefined);

        return {
          id: m.id,
          locomotora: m.locomotiveNumber,
          estado: MAP_ESTADO[m.estado] ?? m.estado,
          estatus: buildEstatus({
            estado: m.estado,
            finalizado: m.finalizado ?? false,
            prioridad: m.prioridad as 'ALTA' | 'BAJA',
            servicio: m.servicio ? { tipo: m.servicio.tipo, estado: m.servicio.estado } : null,
            abiertos,
          }),
          prioridad: MAP_PRIORIDAD[m.prioridad] ?? m.prioridad,
          tipo: m.tipoMovimiento ? (MAP_TIPO[m.tipoMovimiento] ?? m.tipoMovimiento) : undefined,
          empresa: m.empresa?.nombre ?? 'N/D',
          localidad: m.localidad?.nombre ?? 'N/D',
          via: {
            origen: {
              numero: m.viaOrigen?.numero ?? 0,
              nombre: m.viaOrigen?.nombre ?? 'N/D',
            },
            destino: m.viaDestino
              ? { numero: m.viaDestino.numero, nombre: m.viaDestino.nombre }
              : undefined,
          },
          personas: {
            creadoPor: m.creadoPor?.nombre ?? 'N/D',
            cliente: m.cliente?.nombre ?? undefined,
            operador: m.operador?.nombre ?? undefined,
            maquinista: m.operador?.nombre ?? undefined, // alias
            supervisor: m.supervisor?.nombre ?? undefined,
            coordinador: m.coordinador?.nombre ?? undefined,
          },
          servicio,
          ronda: m.ronda
            ? {
                numero: m.ronda.rondaNumero,
                orden: m.ronda.orden,
                concluido: m.ronda.concluido ?? false,
              }
            : undefined,
          incidentes: { total, abiertos, ultimoEstado },
          fechas: {
            solicitud: fmt(m.fechaSolicitud) ?? '',
            inicio: fmt(m.fechaInicio),
            pausa: fmt(m.fechaPausa),
            fin: fmt(m.fechaFin),
          },
          instrucciones,
          posiciones: {
            cabina: m.posicionCabina ? (MAP_POS[m.posicionCabina] ?? m.posicionCabina) : undefined,
            chimenea: m.posicionChimenea ? (MAP_POS[m.posicionChimenea] ?? m.posicionChimenea) : undefined,
            empuje: m.direccionEmpuje ? (MAP_EMP[m.direccionEmpuje] ?? m.direccionEmpuje) : undefined,
          },
          flags: { lavado: !!m.lavado, torno: !!m.torno, incidenteGlobal: !!m.incidenteGlobal },
        };
      });

      return { items, hasMore, nextCursorId };
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos por localidad (paginado)', {
        localidadId,
        cursorId: opts.cursorId,
        take,
        errName: error?.name,
        errMsg: error?.message,
        errStack: error?.stack,
        prismaCode: error?.code,
        prismaMeta: error?.meta,
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
      const instrucciones = movDB?.instrucciones ?? null;
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

  // iniciarMovimiento: SIN onServicioActivado
  static async iniciarMovimiento(id: number, maquinistaId: number) {
    try {
      const fechaActual = new Date();
      const mov = await prisma.movimiento.update({
        where: { id },
        data: {
          estado: 'EN_PROCESO',
          fechaInicio: fechaActual,
          fechaPausa: null,
          operadorId: maquinistaId,
          updatedAt: fechaActual,
        },
      });

      await notificarMovimientoIniciado(mov.id);
      await RondaModel.siguienteInteligente(mov.localidadId);
      return mov;
    } catch (error: any) {
      movimientoError.error('Error al iniciar movimiento', { id, maquinistaId, errName: error?.name, errMsg: error?.message });
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
        data: { estado: 'EN_PROCESO', fechaInicio: fechaActual, fechaPausa: null, updatedAt: fechaActual },
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

      // ✔ Abrir servicio en LavadoT/TornoT (NO crear nuevo movimiento)
      await MovimientoModel._activarServicioTrasMovimiento(mov.id);

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

  /* ------------------- ACTIVAR servicio (LavadoT/TornoT) ------------------- */
  /**
   * Al concluir el movimiento, si su destino es LAVADO/TORNO:
   *  - Crea (si no existe) LavadoT/TornoT con status EN_SERVICIO e inicio=now().
   *  - Informa a RondaModel para que gestione ServicioCola (orden/estado) vía onServicioActivado.
   *  - Es idempotente (no duplica).
   */
private static async _activarServicioTrasMovimiento(movimientoId: number) {
  const mov = await prisma.movimiento.findUnique({
    where: { id: movimientoId },
    select: { id: true, empresaId: true, localidadId: true, lavado: true, torno: true },
  });
  if (!mov) return;

  let destinoLavado = !!mov.lavado;
  let destinoTorno = !!mov.torno;

  // Si no viene marcado, lo inferimos por la vía destino
  if (!destinoLavado && !destinoTorno) {
    const inf = await inferirServicioDesdeDestino(movimientoId);
    destinoLavado = inf.lavado;
    destinoTorno = inf.torno;
    if (destinoLavado || destinoTorno) {
      await prisma.movimiento.update({
        where: { id: movimientoId },
        data: { lavado: destinoLavado, torno: destinoTorno },
      });
    }
  }

  if (destinoLavado) {
    const existeL = await prisma.lavadoT.findFirst({ where: { movimientoId } });
    if (!existeL) {
      await prisma.lavadoT.create({
        data: {
          movimientoId,
          localidadId: mov.localidadId,
          status: ServicioEstado.EN_SERVICIO,
          inicio: new Date(),
        },
      });
    }
  }

  if (destinoTorno) {
    const existeT = await prisma.tornoT.findFirst({ where: { movimientoId } });
    if (!existeT) {
      await prisma.tornoT.create({
        data: {
          movimientoId,
          localidadId: mov.localidadId,
          status: ServicioEstado.EN_SERVICIO,
          inicio: new Date(),
        },
      });
    }
  }

}

}
