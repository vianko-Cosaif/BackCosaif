// src/models/Movimientos/MovimientoModel.ts

/**
 * @file MovimientoModel.ts
 * @author Isaac
 * @version 1.4.1 2025-08-18
 *
 * @overview
 * Capa **modelo/dominio** para gestionar `Movimiento` y su interacción con la
 * cola operativa de `Ronda` (a través de RondaModel). Aquí viven las reglas
 * de negocio de **estado**, **creación/edición**, **notificaciones FCM** y
 * **recomposición** de rondas. No se realizan ocupaciones/liberaciones físicas
 * de vías/secciones (eso lo hace otra capa/servicio).
 *
 * @keypoints
 * - **Estados y transiciones** (máquina de estados):
 *   SOLICITADO → EN_PROCESO | DETENIDO | CANCELADO
 *   EN_PROCESO → DETENIDO | CONCLUIDO | CANCELADO
 *   DETENIDO   → EN_PROCESO | CONCLUIDO | CANCELADO
 *   CONCLUIDO/CANCELADO → (terminal)
 * - **Rondas**:
 *   - En creación/edición, si el movimiento queda en `SOLICITADO`, se garantiza
 *     su presencia en la cola (`RondaModel.generarRondaParaMovimiento`).
 *   - En cambios de estado CONCLUIDO/CANCELADO se actualiza/elimina la ronda y
 *     se ejecuta recomposición (`RondaModel.recomponerRondasLocalidad`).
 * - **Servicios (lavado/torno)**: se consideran "siguientes" para maquinista
 *   solo cuando están `EN_PROCESO`.
 * - **Notificaciones**: se emiten eventos FCM relevantes (creación, cambio de
 *   prioridad). En cargas altas se recomienda **Outbox** posterior a commit.
 *
 * @errors
 * - Lanza `Error` con mensajes semánticos. Los controladores traducen a HTTP.
 * - Registra con `movimientoError` tanto errores como info relevante.
 *
 * @concurrency
 * - Se usan transacciones Prisma en operaciones que modifican estado+ronda.
 * - Evitar múltiples `PrismaClient` (ver TODO singleton).
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { RondaModel } from './Ronda/RondaModel';
import { movimientoError } from './movimiento.logger';
import admin from 'firebase-admin';

const prisma = new PrismaClient(); // TODO: migrar a singleton/inyección para evitar exceso de conexiones.

/** Devuelve el id del maquinista/operador desde alias permitidos. */
const getMaquinistaId = (o?: { maquinistaId?: number; operadorId?: number }) =>
  o?.maquinistaId ?? o?.operadorId;

/* ==========================================================================
 *                                 Notificaciones
 * ========================================================================== */

/**
 * @summary Resuelve tokens FCM activos para una lista de usuarios.
 * @returns string[] tokens
 */
async function tokensDeUsuarios(ids: number[]) {
  if (!ids.length) return [];
  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: ids }, activo: true },
    include: { fcmTokens: true },
  });
  return usuarios.flatMap((u) => u.fcmTokens.map((t) => t.token));
}

/**
 * @summary Notifica la creación de un movimiento a actores locales (roles operativos).
 * @sideEffects Envía FCM (considerar Outbox en producción).
 */
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

/**
 * @summary Notifica un cambio de prioridad a roles administrativos/líderes.
 * @sideEffects Envía FCM.
 */
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

/* ==========================================================================
 *                                   Modelo
 * ========================================================================== */

export class MovimientoModel {
  /* ------------------------------ Consultas base ------------------------------ */

  /**
   * @summary Lista de movimientos con joins relevantes.
   * @returns Movimiento[]
   */
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

  /**
   * @summary Servicios (lavado/torno) pendientes de iniciar.
   * @description Excluye EN_PROCESO, CONCLUIDO, CANCELADO. Filtro opcional por localidad/empresa.
   */
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

  /**
   * @summary Cambia estado de **servicios** (lavado/torno) usando la lógica central de estados.
   * @param id Movimiento id.
   * @param nuevoEstado 'SOLICITADO' | 'EN_PROCESO' | 'DETENIDO' | 'CANCELADO'
   * @param opciones { maquinistaId?/operadorId?, razon? }
   */
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

  /* --------------------------- Cambios de estado CRUD --------------------------- */

  /**
   * @summary Detiene un movimiento (cambia a DETENIDO y marca `fechaPausa`).
   * @sideEffects Recomposición de siguiente inteligente.
   */
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

  /**
   * @summary Cancela y finaliza un movimiento; elimina su ronda y recompone.
   */
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

  /**
   * @summary Reactiva un movimiento DETENIDO → EN_PROCESO.
   * @throws Error si no está en DETENIDO.
   */
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
   * @summary Cambia el estado del movimiento validando la transición.
   * @param opciones.forzar Si true, omite validación de transición.
   * @sideEffects Actualiza/elimina ronda y recompone si CONCLUIDO/CANCELADO.
   */
  static async cambiarEstadoMovimiento(
    id: number,
    nuevoEstado: string,
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
   * @summary Crea un movimiento (no ocupa/libera vías). Si queda en SOLICITADO/ESPERA, crea su ronda.
   * @sideEffects Notifica creación y recálculo de “siguiente”.
   */
  static async nuevoMovimiento(data: {
    empresaId: number;
    creadoPorId: number;
    localidadId: number;
    viaOrigenId: number;
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
    operadorId?: number;  // compat
    maquinistaId?: number; // alias externo
    lavado?: boolean;
    torno?: boolean;
    posicionCabina?: 'Sin_Solicitar' | 'DENTRO' | 'AFUERA';
    posicionChimenea?: 'Sin_Solicitar' | 'DENTRO' | 'AFUERA';
    direccionEmpuje?: 'Sin_Solicitar' | 'EMPUJAR' | 'JALAR';
  }) {
    try {
      const movData: any = { ...data };
      // alias -> operadorId
      if (movData.maquinistaId && !movData.operadorId) movData.operadorId = movData.maquinistaId;
      delete movData.maquinistaId;

      movData.prioridad ??= 'BAJA';
      movData.estado ??= 'SOLICITADO';
      movData.posicionCabina ??= 'Sin_Solicitar';
      movData.posicionChimenea ??= 'Sin_Solicitar';
      movData.direccionEmpuje ??= 'Sin_Solicitar';
      Object.keys(movData).forEach((k) => movData[k] === undefined && delete movData[k]);

      const mv = await prisma.movimiento.create({ data: movData });

      // Si está SOLICITADO/ESPERA => generar ronda (sin ocupar vía)
      if (mv.estado === 'SOLICITADO' || mv.estado === 'ESPERA') {
        await RondaModel.generarRondaParaMovimiento({
          movimientoId: mv.id,
          empresaId: mv.empresaId,
          localidadId: mv.localidadId,
          prioridad: (mv.prioridad as 'ALTA' | 'BAJA') ?? 'BAJA',
        });
      }

      await notificarMovimientoCreado(mv.id);
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

  /**
   * @summary Edita un movimiento; si cambia prioridad/estado/empresa/localidad puede reinsertar/recomponer rondas.
   */
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

        // alias -> operadorId
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

  /* --------------------------------- Otros --------------------------------- */

  /**
   * @summary Elimina un movimiento, limpia su ronda y recomponen.
   */
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
   * @summary Cambia prioridad (ALTA/BAJA). Readecua ronda cuando está SOLICITADO.
   * @sideEffects Notifica cambio de prioridad y recalcula “siguiente”.
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

  /** @summary Movimientos con estado pendiente (incluye CONCLUIDO para visibilidad histórica reciente). */
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
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos pendientes', {
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos pendientes');
    }
  }

  /** @summary Pendientes por empresa (sin concluidos). */
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
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos pendientes por empresa', {
        empresaId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos pendientes por empresa');
    }
  }

  /** @summary Todos los movimientos (orden ascendente por creación). */
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

  /** @summary Movimientos por empresa. */
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

  /** @summary Pendientes por localidad. */
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
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos pendientes por localidad', {
        localidadId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos pendientes por localidad');
    }
  }

  /** @summary Todos por localidad. */
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

  /** @summary Movimientos por localidad + empresa. */
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

  /** @summary Movimientos por empresa + localidad (orden de ruta inverso). */
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

  /** @summary No concluidos por empresa+localidad. */
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

  /**
   * @summary Proyección de información de una ronda desde el modelo de movimientos.
   * @returns Estructura simplificada: empresa + vías + flags de servicio.
   */
  static async obtenerInfoPorRonda(rondaId: number) {
    try {
      const info = await RondaModel.obtenerInfoPorRonda(rondaId);
      if (!info) throw new Error(`No se encontró la ronda con ID ${rondaId}`);

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
        },
      };
    } catch (error: any) {
      movimientoError.error('Error al obtener info de ronda desde MovimientoModel', {
        rondaId, errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener información de la ronda');
    }
  }

  /* -------------------------- Acciones rápidas maquinista -------------------------- */

  /** @summary Marca EN_PROCESO e inicia (setea operadorId=maquinistaId). */
  static async iniciarMovimiento(id: number, maquinistaId: number) {
    try {
      const fechaActual = new Date();
      const mov = await prisma.movimiento.update({
        where: { id },
        data: {
          estado: 'EN_PROCESO',
          fechaInicio: fechaActual,
          operadorId: maquinistaId, // guardamos en operadorId
          updatedAt: fechaActual,
        },
      });

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

  /** @summary Pausa (DETENIDO). */
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

  /** @summary Reanuda (EN_PROCESO). */
  static async reanudarMovimiento(id: number) {
    try {
      const fechaActual = new Date();
      const mov = await prisma.movimiento.update({
        where: { id },
        data: { estado: 'EN_PROCESO', fechaInicio: fechaActual, updatedAt: fechaActual },
      });

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

  /**
   * @summary Finaliza el movimiento (CONCLUIDO + finalizado) y concluye su ronda.
   * @note No realiza liberación/ocupación física; se delega a otra capa/servicio.
   */
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
