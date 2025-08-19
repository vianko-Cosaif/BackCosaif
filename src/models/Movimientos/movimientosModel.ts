// MovimientoModel.ts
import { Prisma, PrismaClient } from '@prisma/client';
import { RondaModel } from './Ronda/RondaModel';
import { movimientoError } from './movimiento.logger';
import admin from 'firebase-admin';

const prisma = new PrismaClient(); // TODO: usar singleton/inyección
const clientISO = () => new Date().toISOString();

// ==============================
// Helpers
// ==============================
function parseInstruccionesMeta(txt?: string) {
  const s = String(txt ?? '');
  const metaMatch = s.match(/\[META\s+([^\]]+)\]/i);
  const out = { destinoViaId: null as number | null, origenViaId: null as number | null, seccion: null as number | null };
  if (!metaMatch) return out;

  for (const raw of metaMatch[1].split('|')) {
    const t = raw.trim().toUpperCase();
    if (t.startsWith('DESTINO:')) {
      const v = Number(t.split(':')[1]); if (!Number.isNaN(v)) out.destinoViaId = v;
    } else if (t.startsWith('ORIGEN:')) {
      const v = Number(t.split(':')[1]); if (!Number.isNaN(v)) out.origenViaId = v;
    } else if (t.startsWith('SECCION:')) {
      const v = Number(t.split(':')[1]); if (!Number.isNaN(v)) out.seccion = v;
    }
  }
  return out;
}

function resolverDestinoNombre(m: { viaDestino?: { nombre: string } | null; lavado?: boolean | null; torno?: boolean | null; }) {
  return m.viaDestino?.nombre ?? (m.lavado ? 'Lavado' : m.torno ? 'Torno' : null);
}

// ==============================
// Notificaciones auxiliares
// ==============================
async function notificarMovimientoCreado(movId: number) {
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

  // SUPERVISOR, COORDINADOR, MAQUINISTA y OPERADOR de la localidad
  const usuarios = await prisma.usuario.findMany({
    where: {
      activo: true,
      localidadId: m.localidadId,
      rol: { in: ['SUPERVISOR', 'COORDINADOR', 'MAQUINISTA', 'OPERADOR'] as any },
    },
    include: { fcmTokens: true },
  });
  const tokens = usuarios.flatMap((u) => u.fcmTokens.map((t) => t.token));
  if (!tokens.length) return;

  const title = `Nuevo movimiento (${m.prioridad})`;
  const body =
    `Creado por: ${m.creadoPor?.nombre ?? 'N/D'} · ` +
    `Fecha: ${new Date(m.createdAt).toLocaleString()} · ` +
    `Empresa: ${m.empresa?.nombre ?? 'N/D'} · ` +
    `Locomotora: ${m.locomotiveNumber} · ` +
    `Origen: ${m.viaOrigen?.nombre ?? 'N/D'} → Destino: ${m.viaDestino?.nombre ?? 'N/D'} · ` +
    `Comentario: ${m.instrucciones ?? '—'}`;

  await admin.messaging().sendEachForMulticast({
    notification: { title, body },
    data: {
      tipo: 'movimiento_creado',
      movimientoId: String(m.id),
      prioridad: String(m.prioridad),
      creadoPor: String(m.creadoPor?.nombre ?? ''),
      fecha: new Date(m.createdAt).toISOString(),
      empresa: String(m.empresa?.nombre ?? ''),
      localidadId: String(m.localidadId),
      viaOrigen: String(m.viaOrigen?.nombre ?? ''),
      viaDestino: String(m.viaDestino?.nombre ?? ''),
    },
    tokens,
  });
}

async function notificarCambioPrioridad(movId: number, nueva: 'ALTA' | 'BAJA') {
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

  // ADMINISTRADOR + COORDINADOR + SUPERVISOR
  const admins = await prisma.usuario.findMany({
    where: {
      localidadId: m.localidadId,
      activo: true,
      rol: { in: ['ADMINISTRADOR', 'COORDINADOR', 'SUPERVISOR'] as any },
    },
    include: { fcmTokens: true },
  });
  const tokens = admins.flatMap((u) => u.fcmTokens.map((t) => t.token));
  if (!tokens.length) return;

  await admin.messaging().sendEachForMulticast({
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
    tokens,
  });
}

export class MovimientoModel {
  // -------------------- Consultas --------------------

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
    } catch (error) {
      movimientoError.error('Error al obtener movimientos', { error });
      throw new Error('Error al obtener movimientos');
    }
  }

  // -------------------- Cambios de estado atómicos principales --------------------

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
    } catch (error) {
      movimientoError.error('Error al detener movimiento', { id, razon, error });
      throw new Error('Error al detener movimiento');
    }
  }

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
          await RondaModel.recomponerRondasLocalidad(original.localidadId, tx, { clientLocalISO: clientISO() });
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
    } catch (error) {
      movimientoError.error('Error al cancelar movimiento', { id, razonCancelacion, usuarioId, error });
      throw new Error('Error al cancelar movimiento');
    }
  }

  static async reactivarMovimiento(id: number, operadorId?: number) {
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
        throw new Error(
          `El movimiento debe estar en estado DETENIDO para ser reactivado. Estado actual: ${movimientoActual.estado}`
        );
      }

      const movimientoReactivado = await prisma.movimiento.update({
        where: { id },
        data: {
          estado: 'EN_PROCESO',
          fechaInicio: fechaActual,
          fechaPausa: null,
          updatedAt: fechaActual,
          incidenteGlobal: false,
          ...(operadorId && { operadorId }),
        },
        include: { empresa: true, localidad: true, ronda: true },
      });

      movimientoError.info('Movimiento reactivado', {
        movimientoId: id,
        operadorId: operadorId || 'No especificado',
        empresa: movimientoActual.empresa?.nombre,
        localidad: movimientoActual.localidad?.nombre,
      });

      await RondaModel.siguienteInteligente(movimientoReactivado.localidadId);
      return movimientoReactivado;
    } catch (error) {
      movimientoError.error('Error al reactivar movimiento', { id, operadorId, error });
      throw new Error('Error al reactivar movimiento');
    }
  }

  static async cambiarEstadoMovimiento(
    id: number,
    nuevoEstado: string,
    opciones: { operadorId?: number; razon?: string; forzar?: boolean } = {}
  ) {
    try {
      const { operadorId, razon, forzar = false } = opciones;

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
          throw new Error(
            `Transición inválida: ${movAct.estado} → ${nuevoEstado}. Permitidas: ${permitidos.join(', ')}`
          );
        }
      }

      const movUpd = await prisma.$transaction(async (tx) => {
        const ahora = new Date();
        const data: any = { estado: nuevoEstado, updatedAt: ahora };

        if (nuevoEstado === 'EN_PROCESO')
          Object.assign(data, { fechaInicio: ahora, fechaPausa: null, incidenteGlobal: false, ...(operadorId && { operadorId }) });
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
            await RondaModel.recomponerRondasLocalidad(movAct.localidadId, tx, { clientLocalISO: clientISO() });
          } else if (nuevoEstado === 'CANCELADO') {
            await tx.ronda.delete({ where: { id: movAct.ronda.id } });
            await RondaModel.recomponerRondasLocalidad(movAct.localidadId, tx, { clientLocalISO: clientISO() });
          }
        }

        return updated;
      });

      movimientoError.info('Estado de movimiento cambiado', {
        movimientoId: id,
        estadoAnterior: movAct.estado,
        estadoNuevo: nuevoEstado,
        operadorId: opciones.operadorId ?? 'No especificado',
        razon: opciones.razon ?? 'No especificada',
        empresa: movAct.empresa?.nombre,
        localidad: movAct.localidad?.nombre,
      });

      await RondaModel.siguienteInteligente(movAct.localidadId);
      return movUpd;
    } catch (error) {
      movimientoError.error('Error al cambiar estado de movimiento', { id, nuevoEstado, opciones, error });
      throw new Error('Error al cambiar estado de movimiento');
    }
  }

  // -------------------- Creación / edición (SIN tocar vías/DB de secciones) --------------------

  /**
   * Crea un movimiento. NO ocupa vías/secciones aquí.
   * Si queda en SOLICITADO/ESPERA, se agrega a Ronda según prioridad.
   * Completa viaDestinoId desde [META DESTINO:x] si no viene explícito.
   */
  static async nuevoMovimiento(data: {
    empresaId: number;
    creadoPorId: number;
    localidadId: number;
    viaOrigenId: number;
    viaDestinoId?: number;
    locomotiveNumber: number;
    prioridad?: 'BAJA' | 'ALTA';
    tipoMovimiento?: 'MD_TRABAJANDO' | 'REMOLCADA';
    estado?: string;
    fechaSolicitud?: Date;
    instrucciones?: string;
    clienteId?: number;
    supervisorId?: number;
    coordinadorId?: number;
    operadorId?: number;
    lavado?: boolean;
    torno?: boolean;
    posicionCabina?: 'Sin_Solicitar' | 'DENTRO' | 'AFUERA';
    posicionChimenea?: 'Sin_Solicitar' | 'DENTRO' | 'AFUERA';
    direccionEmpuje?: 'Sin_Solicitar' | 'EMPUJAR' | 'JALAR';
  }) {
    try {
      const movData: any = { ...data };

      // Defaults
      movData.prioridad ??= 'BAJA';
      movData.estado ??= 'SOLICITADO';
      movData.posicionCabina ??= 'Sin_Solicitar';
      movData.posicionChimenea ??= 'Sin_Solicitar';
      movData.direccionEmpuje ??= 'Sin_Solicitar';

      // Rellenar viaDestinoId desde instrucciones si no vino
      if (!movData.viaDestinoId && movData.instrucciones) {
        const meta = parseInstruccionesMeta(movData.instrucciones);
        if (meta.destinoViaId) movData.viaDestinoId = meta.destinoViaId;
      }

      // Validación: la vía destino (si existe) debe pertenecer a la misma localidad
      if (movData.viaDestinoId) {
        const viaDest = await prisma.via.findUnique({
          where: { id: movData.viaDestinoId },
          select: { id: true, localidadId: true },
        });
        if (!viaDest) throw new Error(`Vía destino ${movData.viaDestinoId} no existe`);
        if (viaDest.localidadId !== movData.localidadId) {
          throw new Error(`La vía destino ${movData.viaDestinoId} no pertenece a la localidad ${movData.localidadId}`);
        }
      }

      // Limpieza
      Object.keys(movData).forEach((k) => movData[k] === undefined && delete movData[k]);

      // Crear
      const mv = await prisma.movimiento.create({ data: movData });

      // Encolar si aplica (respeta ALTAS/BAJAS y ventana horaria vía RondaModel)
      const cur = await prisma.movimiento.findUnique({
        where: { id: mv.id },
        select: { estado: true, prioridad: true, empresaId: true, localidadId: true },
      });
      if (cur && (cur.estado === 'SOLICITADO' || cur.estado === 'ESPERA')) {
        await RondaModel.generarRondaParaMovimiento(
          {
            movimientoId: mv.id,
            empresaId: cur.empresaId,
            localidadId: cur.localidadId,
            prioridad: (cur.prioridad as 'ALTA' | 'BAJA') ?? 'BAJA',
          },
          { clientLocalISO: clientISO() }
        );
      }

      await notificarMovimientoCreado(mv.id);
      await RondaModel.siguienteInteligente(mv.localidadId);

      return await prisma.movimiento.findUnique({
        where: { id: mv.id },
        include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true, ronda: true },
      });
    } catch (err: any) {
      movimientoError.error('Error al crear movimiento', { data, error: err?.message || err });
      throw new Error('Error al crear movimiento');
    }
  }

  /**
   * Edita un movimiento. NO toca ocupación de vías/secciones aquí.
   */
  static async editarMovimiento(
    id: number,
    data: {
      empresaId?: number;
      creadoPorId?: number;
      clienteId?: number;
      supervisorId?: number;
      coordinadorId?: number;
      operadorId?: number;
      localidadId?: number;
      viaOrigenId?: number;
      viaDestinoId?: number;
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
          select: { prioridad: true, estado: true, empresaId: true, localidadId: true, ronda: true },
        });
        if (!actual) throw new Error(`No se encontró movimiento con id ${id}`);

        const updateData: any = { ...data };

        // Si llega instrucciones nuevas y no se manda viaDestinoId, intenta resolver del META
        if (!updateData.viaDestinoId && updateData.instrucciones) {
          const meta = parseInstruccionesMeta(updateData.instrucciones);
          if (meta.destinoViaId) updateData.viaDestinoId = meta.destinoViaId;
        }

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
            await RondaModel.generarRondaParaMovimiento(
              {
                movimientoId: id,
                empresaId: cur.empresaId,
                localidadId: cur.localidadId,
                prioridad: 'ALTA',
              },
              { clientLocalISO: clientISO() }
            );
          } else if (!cur.ronda && cur.estado === 'SOLICITADO') {
            await RondaModel.generarRondaParaMovimiento(
              {
                movimientoId: id,
                empresaId: cur.empresaId,
                localidadId: cur.localidadId,
                prioridad: (cur.prioridad as 'ALTA' | 'BAJA') ?? 'BAJA',
              },
              { clientLocalISO: clientISO() }
            );
          }
        }
      }

      await RondaModel.siguienteInteligente(movUpd.localidadId);
      return movUpd;
    } catch (error) {
      movimientoError.error('Error al editar movimiento', { id, data, error });
      throw new Error('Error al editar movimiento');
    }
  }

  // -------------------- Soft-delete / Prioridad / Listados --------------------

  /** Soft-delete: NO eliminar histórico; marcamos CANCELADO + finalizado. */
  static async eliminarMovimiento(id: number) {
    try {
      const mov = await prisma.movimiento.update({
        where: { id },
        data: { estado: 'CANCELADO', finalizado: true, fechaFin: new Date() },
      });
      await RondaModel.siguienteInteligente(mov.localidadId);
      return mov;
    } catch (error) {
      movimientoError.error('Error al eliminar (soft) movimiento', { id, error });
      throw new Error('Error al (soft) eliminar movimiento');
    }
  }

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

      // Respetar orden ALTAS/BAJAS y ventana horaria (Guadalajara) a través de RondaModel
      if (movimiento.estado === 'SOLICITADO' && prioridad === 'ALTA') {
        await RondaModel.generarRondaParaMovimiento(
          {
            movimientoId: id,
            empresaId: movimiento.empresaId,
            localidadId: movimiento.localidadId,
            prioridad: 'ALTA',
          },
          { clientLocalISO: clientISO() }
        );
      } else if (prioridad === 'BAJA' && movimiento.ronda && movimiento.estado === 'SOLICITADO') {
        await prisma.ronda.delete({ where: { movimientoId: id } });
        await RondaModel.generarRondaParaMovimiento(
          {
            movimientoId: id,
            empresaId: movimiento.empresaId,
            localidadId: movimiento.localidadId,
            prioridad: 'BAJA',
          },
          { clientLocalISO: clientISO() }
        );
      }

      await notificarCambioPrioridad(id, prioridad);
      await RondaModel.siguienteInteligente(movimiento.localidadId);

      return movimientoActualizado;
    } catch (error) {
      movimientoError.error('Error al cambiar prioridad', { id, prioridad, error });
      throw new Error('Error al cambiar prioridad del movimiento');
    }
  }

  static async obtenerMovimientosPendientes() {
    try {
      return await prisma.movimiento.findMany({
        where: { estado: { in: ['SOLICITADO', 'EN_PROCESO', 'DETENIDO', 'CONCLUIDO'] } },
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
    } catch (error) {
      movimientoError.error('Error al obtener movimientos pendientes', { error });
      throw new Error('Error al obtener movimientos pendientes');
    }
  }

  static async obtenerMovimientosPendientesPorEmpresa(empresaId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { empresaId, estado: { in: ['SOLICITADO', 'EN_PROCESO', 'DETENIDO'] } },
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
    } catch (error) {
      movimientoError.error('Error al obtener movimientos pendientes por empresa', { empresaId, error });
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
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      movimientoError.error('Error al obtener todos los movimientos', { error });
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
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      movimientoError.error('Error al obtener movimientos por empresa', { empresaId, error });
      throw new Error('Error al obtener movimientos por empresa');
    }
  }

  static async obtenerMovimientosPendientesPorLocalidad(localidadId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { localidadId, estado: { in: ['SOLICITADO', 'EN_PROCESO', 'DETENIDO'] } },
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
    } catch (error) {
      movimientoError.error('Error al obtener movimientos pendientes por localidad', { localidadId, error });
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
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      movimientoError.error('Error al obtener todos los movimientos por localidad', { localidadId, error });
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
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      movimientoError.error('Error al obtener movimientos por localidad y empresa', {
        localidadId,
        empresaId,
        error,
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
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      movimientoError.error('Error al obtener movimientos por empresa y localidad', {
        empresaId,
        localidadId,
        error,
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
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      movimientoError.error('Error al obtener movimientos no concluidos por empresa y localidad', {
        empresaId,
        localidadId,
        error,
      });
      throw new Error('Error al obtener movimientos no concluidos por empresa y localidad');
    }
  }

  /**
   * Devuelve info de la ronda + meta parseado de instrucciones y un campo destinoResuelto
   * para que el front pueda pintar sin adivinar.
   */
  static async obtenerInfoPorRonda(rondaId: number) {
    try {
      const info = await RondaModel.obtenerInfoPorRonda(rondaId);
      if (!info) throw new Error(`No se encontró la ronda con ID ${rondaId}`);

      const movFull = await prisma.movimiento.findUnique({
        where: { id: info.movimiento.id },
        include: { viaOrigen: true, viaDestino: true },
      });

      const meta = parseInstruccionesMeta(movFull?.instrucciones || '');

      return {
        rondaId: info.rondaId,
        rondaNumero: info.rondaNumero,
        orden: info.orden,
        concluido: info.concluido,
        empresa: info.empresa,
        movimiento: {
          id: info.movimiento.id,
          viaOrigen: movFull?.viaOrigen || info.movimiento.viaOrigen || null,
          viaDestino: movFull?.viaDestino || info.movimiento.viaDestino || null,
          lavado: (movFull as any)?.lavado ?? (info.movimiento as any).lavado ?? false,
          torno: (movFull as any)?.torno ?? (info.movimiento as any).torno ?? false,
          instrucciones: movFull?.instrucciones ?? null,
          meta, // { destinoViaId, origenViaId, seccion }
          destinoResuelto: resolverDestinoNombre({
            viaDestino: movFull?.viaDestino || info.movimiento.viaDestino,
            lavado: (movFull as any)?.lavado ?? (info.movimiento as any).lavado,
            torno: (movFull as any)?.torno ?? (info.movimiento as any).torno,
          }),
        },
      };
    } catch (error: any) {
      movimientoError.error('Error al obtener info de ronda desde MovimientoModel', { rondaId, error });
      throw new Error('Error al obtener información de la ronda');
    }
  }

  static async iniciarMovimiento(id: number, operadorId: number) {
    try {
      const fechaActual = new Date();
      const mov = await prisma.movimiento.update({
        where: { id },
        data: {
          estado: 'EN_PROCESO',
          fechaInicio: fechaActual,
          operadorId,
          updatedAt: fechaActual,
        },
      });

      await RondaModel.siguienteInteligente(mov.localidadId);
      return mov;
    } catch (error) {
      movimientoError.error('Error al iniciar movimiento', { id, error });
      throw new Error('Error al iniciar movimiento');
    }
  }

  static async pausarMovimiento(id: number) {
    try {
      const fechaActual = new Date();
      const mov = await prisma.movimiento.update({
        where: { id },
        data: { estado: 'DETENIDO', fechaPausa: fechaActual, updatedAt: fechaActual },
      });

      await RondaModel.siguienteInteligente(mov.localidadId);
      return mov;
    } catch (error) {
      movimientoError.error('Error al pausar movimiento', { id, error });
      throw new Error('Error al pausar movimiento');
    }
  }

  static async reanudarMovimiento(id: number) {
    try {
      const fechaActual = new Date();
      const mov = await prisma.movimiento.update({
        where: { id },
        data: { estado: 'EN_PROCESO', fechaInicio: fechaActual, updatedAt: fechaActual },
      });

      await RondaModel.siguienteInteligente(mov.localidadId);
      return mov;
    } catch (error) {
      movimientoError.error('Error al reanudar movimiento', { id, error });
      throw new Error('Error al reanudar movimiento');
    }
  }

  // -------------------- Cierre (SIN tocar vías/DB de secciones) --------------------
  static async finalizarMovimiento(id: number) {
    try {
      const mov = await prisma.$transaction(async (tx) => {
        const res = await tx.movimiento.update({
          where: { id },
          data: { estado: 'CONCLUIDO', finalizado: true, fechaFin: new Date(), incidenteGlobal: false },
          include: { ronda: true },
        });

        if (res.ronda) {
          await tx.ronda.update({ where: { id: res.ronda.id }, data: { concluido: true } });
          await RondaModel.recomponerRondasLocalidad(res.localidadId, tx, { clientLocalISO: clientISO() });
        }

        return res;
      });

      await RondaModel.siguienteInteligente(mov.localidadId);
      return mov;
    } catch (error) {
      movimientoError.error('Error al finalizar movimiento', { id, error });
      throw new Error('Error al finalizar movimiento');
    }
  }
}
