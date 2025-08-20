// MovimientoModel.ts
import { Prisma, PrismaClient } from '@prisma/client';
import { RondaModel } from './Ronda/RondaModel';
import { movimientoError } from './movimiento.logger';
import { ViaModel, ViaOcupadaPorOtroError } from '../Via/viaModel';
import { ConflictError } from '../Via/Secciones/SeccionViasModel';
import admin from 'firebase-admin';

const prisma = new PrismaClient(); // TODO: usar singleton/inyección

// ================== Helpers de notificación ==================
async function tokensDeUsuarios(ids: number[]) {
  if (!ids.length) return [];
  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: ids }, activo: true },
    include: { fcmTokens: true },
  });
  return usuarios.flatMap((u) => u.fcmTokens.map((t) => t.token));
}

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

// Notifica SOLO al solicitante cuando el destino está ocupado por otro movimiento
async function notificarDestinoOcupadoASolicitante(
  solicitanteId: number | undefined,
  movId: number,
  viaId: number,
  bloqueadorId: number,
  locomotiveNumber?: number | null
) {
  if (!solicitanteId) return;
  const tokens = await tokensDeUsuarios([solicitanteId]);
  if (!tokens.length) return;

  const via = await prisma.via.findUnique({ where: { id: viaId }, select: { nombre: true } });

  await admin.messaging().sendEachForMulticast({
    notification: {
      title: 'Destino ocupado',
      body: `Tu movimiento #${movId} quedó en ESPERA: destino ${via?.nombre ?? 'N/D'} ocupado por locomotora ${locomotiveNumber ?? 'N/D'} (mov #${bloqueadorId}).`,
    },
    data: {
      tipo: 'destino_ocupado',
      movimientoId: String(movId),
      viaId: String(viaId),
      bloqueadorId: String(bloqueadorId),
      locomotiveNumber: String(locomotiveNumber ?? ''),
    },
    tokens,
  });
}

// ================== Helpers de Vías/Secciones ==================
export class MovimientoModel {
  /** Devuelve el número de la primera sección libre (o null si ninguna). */
  private static async primeraSeccionLibre(viaId: number, tx?: Prisma.TransactionClient): Promise<number | null> {
    const db = tx ?? prisma;
    const libre = await db.seccionVia.findFirst({
      where: { viaId, ocupada: false },
      orderBy: { numero: 'asc' },
      select: { numero: true },
    });
    return libre?.numero ?? null;
  }

  /** Intenta ocupar la vía (sección o vía completa) para el movimiento. */
  private static async intentarOcuparViaDestino(
    viaId: number,
    movimientoId: number,
    numeroSeccion?: number | null,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const db = tx ?? prisma;
    const count = await db.seccionVia.count({ where: { viaId } });

    if (count === 0) {
      // vía simple
      await ViaModel.asignarMovimientoASeccion(viaId, null, movimientoId, tx);
      return;
    }

    let seccion = numeroSeccion ?? null;
    if (seccion == null) {
      const libre = await this.primeraSeccionLibre(viaId, tx);
      if (libre == null) throw new ConflictError(`La vía ${viaId} no tiene secciones libres.`);
      seccion = libre;
    }

    await ViaModel.asignarMovimientoASeccion(viaId, seccion, movimientoId, tx);
  }

  /** Liberación best-effort: intenta liberar y jamás bloquea el flujo si falla. */
  private static async liberarViaSiCorresponde(
    viaId: number,
    movimientoId: number,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    try {
      await ViaModel.liberarMovimientoDeSeccion(viaId, movimientoId, tx);
    } catch (e: any) {
      movimientoError.warn('No se pudo liberar vía/sección (se ignora)', {
        viaId,
        movimientoId,
        errName: e?.name,
        errMsg: e?.message,
      });
      // ignorar por completo
    }
  }

  // ================== Consultas ==================
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

  // ================== Cambios de estado atómicos ==================
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

  static async cancelarMovimiento(id: number, razonCancelacion: string, usuarioId?: number) {
    try {
      const movimientoCancelado = await prisma.$transaction(async (tx) => {
        const original = await tx.movimiento.findUnique({
          where: { id },
          include: { ronda: true, empresa: true, localidad: true, viaDestino: { select: { id: true } } },
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
          include: { ronda: true, viaDestino: { select: { id: true } } },
        });

        if (cancelado.viaDestino?.id) {
          await this.liberarViaSiCorresponde(cancelado.viaDestino.id, id, tx);
        }

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
    } catch (error: any) {
      movimientoError.error('Error al reactivar movimiento', {
        id, operadorId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
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
        include: { empresa: true, localidad: true, ronda: true, viaDestino: { select: { id: true } } },
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

        if (nuevoEstado === 'EN_PROCESO')
          Object.assign(data, { fechaInicio: ahora, fechaPausa: null, incidenteGlobal: false, ...(operadorId && { operadorId }) });
        if (nuevoEstado === 'DETENIDO') Object.assign(data, { fechaPausa: ahora, ...(razon && { instrucciones: razon }) });
        if (nuevoEstado === 'CONCLUIDO') Object.assign(data, { fechaFin: ahora, finalizado: true, incidenteGlobal: false });
        if (nuevoEstado === 'CANCELADO')
          Object.assign(data, { fechaFin: ahora, finalizado: true, incidenteGlobal: false, ...(razon && { instrucciones: `CANCELADO: ${razon}` }) });

        const updated = await tx.movimiento.update({
          where: { id },
          data,
          include: { ronda: true, viaDestino: { select: { id: true } } },
        });

        if ((nuevoEstado === 'CONCLUIDO' || nuevoEstado === 'CANCELADO') && updated.viaDestino?.id) {
          await this.liberarViaSiCorresponde(updated.viaDestino.id, id, tx);
        }

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
        operadorId: opciones.operadorId ?? 'No especificado',
        razon: opciones.razon ?? 'No especificada',
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

  // ================== Creación / edición alineadas a secciones ==================
  /**
   * Crea un movimiento. Si trae `viaDestinoId`, intenta ocupar:
   * - vía completa (si no tiene secciones),
   * - o la primera sección libre (o `numeroSeccion` si se proporcionó).
   * Si no hay espacio, queda en ESPERA y se agrega a Ronda.
   * Notifica a SUPERVISOR/COORDINADOR/MAQUINISTA/OPERADOR de la localidad.
   * Además, si está ocupada, se notifica SOLO al solicitante con la loco que bloquea.
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
    operadorId?: number;
    lavado?: boolean;
    torno?: boolean;
    posicionCabina?: 'Sin_Solicitar' | 'DENTRO' | 'AFUERA';
    posicionChimenea?: 'Sin_Solicitar' | 'DENTRO' | 'AFUERA';
    direccionEmpuje?: 'Sin_Solicitar' | 'EMPUJAR' | 'JALAR';
  }) {
    try {
      const movData: any = { ...data };
      movData.prioridad ??= 'BAJA';
      movData.estado ??= 'SOLICITADO';
      movData.posicionCabina ??= 'Sin_Solicitar';
      movData.posicionChimenea ??= 'Sin_Solicitar';
      movData.direccionEmpuje ??= 'Sin_Solicitar';
      Object.keys(movData).forEach((k) => movData[k] === undefined && delete movData[k]);

      const { mv, needsRonda, bloqueador } = await prisma.$transaction(async (tx) => {
        const mv = await tx.movimiento.create({ data: movData });

        let bloqueador:
          | { viaId: number; bloqueadorId: number; locomotiveNumber?: number | null }
          | undefined;

        if (data.viaDestinoId) {
          try {
            await this.intentarOcuparViaDestino(data.viaDestinoId, mv.id, data.numeroSeccion ?? null, tx);
          } catch (e: any) {
            if (e instanceof ViaOcupadaPorOtroError) {
              await tx.movimiento.update({ where: { id: mv.id }, data: { estado: 'ESPERA' } });
              bloqueador = {
                viaId: data.viaDestinoId,
                bloqueadorId: e.bloqueadorId,
                locomotiveNumber: e.locomotiveNumber,
              };
            } else if (e instanceof ConflictError) {
              // fallback genérico
              await tx.movimiento.update({ where: { id: mv.id }, data: { estado: 'ESPERA' } });
              const v = await tx.via.findUnique({
                where: { id: data.viaDestinoId },
                select: { movimientoId: true, movimiento: { select: { locomotiveNumber: true } } },
              });
              if (v?.movimientoId) {
                bloqueador = {
                  viaId: data.viaDestinoId,
                  bloqueadorId: v.movimientoId,
                  locomotiveNumber: v.movimiento?.locomotiveNumber ?? null,
                };
              }
            } else {
              throw e;
            }
          }
        }

        const cur = await tx.movimiento.findUnique({ where: { id: mv.id }, select: { estado: true } });
        const needsRonda = !!cur && (cur.estado === 'SOLICITADO' || cur.estado === 'ESPERA');
        return { mv, needsRonda, bloqueador };
      });

      if (needsRonda) {
        await RondaModel.generarRondaParaMovimiento({
          movimientoId: mv.id,
          empresaId: mv.empresaId,
          localidadId: mv.localidadId,
          prioridad: (mv.prioridad as 'ALTA' | 'BAJA') ?? 'BAJA',
        });
      }

      await notificarMovimientoCreado(mv.id);

      // Notifica SOLO al solicitante si estaba ocupada
      if (bloqueador) {
        await notificarDestinoOcupadoASolicitante(
          data.creadoPorId ?? data.clienteId,
          mv.id,
          bloqueador.viaId,
          bloqueador.bloqueadorId,
          bloqueador.locomotiveNumber
        );
      }

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
   * Edita un movimiento. Si cambia `viaDestinoId`, libera la anterior y ocupa la nueva.
   * Si está ocupada, el movimiento queda en ESPERA y se notifica SOLO al solicitante.
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
      const { movUpd, requiereReorg, bloqueador, solicitanteId } = await prisma.$transaction(async (tx) => {
        const actual = await tx.movimiento.findUnique({
          where: { id },
          select: {
            prioridad: true,
            estado: true,
            empresaId: true,
            localidadId: true,
            viaDestinoId: true,
            ronda: true,
            creadoPorId: true,
            clienteId: true,
          },
        });
        if (!actual) throw new Error(`No se encontró movimiento con id ${id}`);

        const updateData: any = { ...data };
        updateData.posicionCabina ??= 'Sin_Solicitar';
        updateData.posicionChimenea ??= 'Sin_Solicitar';
        updateData.direccionEmpuje ??= 'Sin_Solicitar';
        Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k]);

        let bloqueador:
          | { viaId: number; bloqueadorId: number; locomotiveNumber?: number | null }
          | undefined;

        const movUpd = await tx.movimiento.update({
          where: { id },
          data: updateData,
          include: { empresa: true, localidad: true, viaDestino: true },
        });

        if (data.viaDestinoId && data.viaDestinoId !== actual.viaDestinoId) {
          if (actual.viaDestinoId) {
            await this.liberarViaSiCorresponde(actual.viaDestinoId, id, tx);
          }
          try {
            await this.intentarOcuparViaDestino(data.viaDestinoId, id, data.numeroSeccion ?? null, tx);
          } catch (e: any) {
            if (e instanceof ViaOcupadaPorOtroError) {
              await tx.movimiento.update({ where: { id }, data: { estado: 'ESPERA' } });
              bloqueador = {
                viaId: data.viaDestinoId,
                bloqueadorId: e.bloqueadorId,
                locomotiveNumber: e.locomotiveNumber,
              };
            } else if (e instanceof ConflictError) {
              await tx.movimiento.update({ where: { id }, data: { estado: 'ESPERA' } });
              const v = await tx.via.findUnique({
                where: { id: data.viaDestinoId },
                select: { movimientoId: true, movimiento: { select: { locomotiveNumber: true } } },
              });
              if (v?.movimientoId) {
                bloqueador = {
                  viaId: data.viaDestinoId,
                  bloqueadorId: v.movimientoId,
                  locomotiveNumber: v.movimiento?.locomotiveNumber ?? null,
                };
              }
            } else {
              throw e;
            }
          }
        }

        const requiereReorg =
          (data.prioridad === 'ALTA' && actual.prioridad !== 'ALTA') ||
          (data.estado === 'SOLICITADO' && actual.estado !== 'SOLICITADO') ||
          (data.empresaId && data.empresaId !== actual.empresaId) ||
          (data.localidadId && data.localidadId !== actual.localidadId);

        const solicitanteId = data.creadoPorId ?? actual.creadoPorId ?? actual.clienteId;

        return { movUpd, requiereReorg, actual, bloqueador, solicitanteId };
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

      if (bloqueador) {
        await notificarDestinoOcupadoASolicitante(
          solicitanteId,
          id,
          bloqueador.viaId,
          bloqueador.bloqueadorId,
          bloqueador.locomotiveNumber
        );
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

  // ================== Otros métodos (con fixes y logs útiles) ==================
  static async eliminarMovimiento(id: number) {
    try {
      const res = await prisma.$transaction(async (tx) => {
        const mov = await tx.movimiento.findUnique({
          where: { id },
          include: { ronda: true, viaDestino: { select: { id: true } } },
        });
        if (!mov) throw new Error(`Movimiento ${id} no encontrado`);

        if (mov.viaDestino?.id) {
          await this.liberarViaSiCorresponde(mov.viaDestino.id, id, tx);
        }
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
        orderBy: { createdAt: 'asc' },
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
        orderBy: { createdAt: 'asc' },
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
        orderBy: { createdAt: 'asc' },
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
        orderBy: { createdAt: 'asc' },
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos no concluidos por empresa y localidad', {
        empresaId, localidadId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos no concluidos por empresa y localidad');
    }
  }

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
    } catch (error: any) {
      movimientoError.error('Error al iniciar movimiento', {
        id, errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
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
    } catch (error: any) {
      movimientoError.error('Error al pausar movimiento', {
        id, errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
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
    } catch (error: any) {
      movimientoError.error('Error al reanudar movimiento', {
        id, errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al reanudar movimiento');
    }
  }

  // ================== FINALIZAR (idempotente + best-effort en liberación) ==================
  static async finalizarMovimiento(id: number) {
    try {
      const mov = await prisma.$transaction(async (tx) => {
        // Verifica existencia / idempotencia
        const actual = await tx.movimiento.findUnique({
          where: { id },
          include: { ronda: true, viaDestino: { select: { id: true } } },
        });
        if (!actual) throw new Error(`Movimiento ${id} no encontrado`);
        if (actual.finalizado) return actual;

        // Actualiza estado
        const res = await tx.movimiento.update({
          where: { id },
          data: { estado: 'CONCLUIDO', finalizado: true, fechaFin: new Date(), updatedAt: new Date() },
          include: { ronda: true, viaDestino: { select: { id: true } } },
        });

        // Libera vía/sección (best-effort, sin bloquear)
        if (res.viaDestino?.id) {
          await this.liberarViaSiCorresponde(res.viaDestino.id, id, tx);
        }

        // Marca ronda como concluida y recomponer
        if (res.ronda) {
          await tx.ronda.update({ where: { id: res.ronda.id }, data: { concluido: true, updatedAt: new Date() } });
          await RondaModel.recomponerRondasLocalidad(res.localidadId, tx);
        }

        return res;
      });

      await RondaModel.siguienteInteligente(mov.localidadId);
      return mov;
    } catch (error: any) {
      // Logs enriquecidos (evita {} en consola)
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
