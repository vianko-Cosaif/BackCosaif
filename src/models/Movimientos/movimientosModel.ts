// MovimientoModel.ts
import { Prisma, PrismaClient } from '@prisma/client';
import { RondaModel } from './Ronda/RondaModel';
import { movimientoError } from './movimiento.logger';
import { ViaModel } from '../Via/viaModel';
import { ConflictError } from '../Via/Secciones/SeccionViasModel';
import admin from 'firebase-admin';

const prisma = new PrismaClient(); // TODO: usar singleton/inyección

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
      creadoPor: { select: { id: true, nombre: true } },
    },
  });
  if (!m) return;

  // Coordinador, supervisor, operador y TODOS los maquinistas/operadores de la localidad
  const destinatarios = new Set<number>();
  if (m.coordinadorId) destinatarios.add(m.coordinadorId);
  if (m.supervisorId) destinatarios.add(m.supervisorId);
  if (m.operadorId) destinatarios.add(m.operadorId);

  const maquinistas = await prisma.usuario.findMany({
    where: {
      activo: true,
      localidadId: m.localidadId,
      rol: { in: ['MAQUINISTA', 'OPERADOR'] as any },
    },
    select: { id: true },
  });
  maquinistas.forEach((u) => destinatarios.add(u.id));

  const tokens = await tokensDeUsuarios([...destinatarios]);
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

  // ADMIN + COORDINADOR + SUPERVISOR
  const admins = await prisma.usuario.findMany({
    where: { localidadId: m.localidadId, activo: true, rol: { in: ['ADMIN', 'COORDINADOR', 'SUPERVISOR'] as any } },
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
  // -------------------- Helpers internos --------------------

  /** Devuelve el número de la primera sección libre (o null si ninguna). */
  private static async primeraSeccionLibre(viaId: number): Promise<number | null> {
    const libre = await prisma.seccionVia.findFirst({
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
    numeroSeccion?: number | null
  ): Promise<void> {
    const count = await prisma.seccionVia.count({ where: { viaId } });

    if (count === 0) {
      await ViaModel.asignarMovimientoASeccion(viaId, null, movimientoId);
      return;
    }

    let seccion = numeroSeccion ?? null;
    if (seccion == null) {
      const libre = await this.primeraSeccionLibre(viaId);
      if (libre == null) throw new ConflictError(`La vía ${viaId} no tiene secciones libres.`);
      seccion = libre;
    }

    await ViaModel.asignarMovimientoASeccion(viaId, seccion, movimientoId);
  }

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

      // Reordenar / seleccionar siguiente automáticamente
      await RondaModel.siguienteInteligente(movimientoDetenido.localidadId);

      return movimientoDetenido;
    } catch (error) {
      movimientoError.error('Error al detener movimiento', { id, razon, error });
      throw new Error('Error al detener movimiento');
    }
  }

  static async cancelarMovimiento(id: number, razonCancelacion: string, usuarioId?: number) {
    try {
      const fechaActual = new Date();

      const movimiento = await prisma.movimiento.findUnique({
        where: { id },
        include: { ronda: true, empresa: true, localidad: true },
      });
      if (!movimiento) throw new Error(`No se encontró movimiento con id ${id}`);

      const movimientoCancelado = await prisma.movimiento.update({
        where: { id },
        data: {
          estado: 'CANCELADO',
          finalizado: true,
          fechaFin: fechaActual,
          updatedAt: fechaActual,
          instrucciones: `CANCELADO: ${razonCancelacion}`,
          incidenteGlobal: false,
        },
        include: { empresa: true, localidad: true, ronda: true, viaDestino: { select: { id: true } } },
      });

      if (movimientoCancelado.viaDestino?.id) {
        await ViaModel.liberarMovimientoDeSeccion(movimientoCancelado.viaDestino.id, id);
      }

      if (movimiento.ronda) {
        await prisma.ronda.delete({ where: { id: movimiento.ronda.id } });
        await RondaModel.recomponerRondasLocalidad(movimiento.localidadId);
        movimientoError.info('Ronda eliminada por cancelación de movimiento', {
          movimientoId: id,
          rondaId: movimiento.ronda.id,
          rondaNumero: movimiento.ronda.rondaNumero,
        });
      }

      movimientoError.info('Movimiento cancelado', {
        movimientoId: id,
        razonCancelacion,
        usuarioId: usuarioId || 'No especificado',
        empresa: movimiento.empresa?.nombre,
        localidad: movimiento.localidad?.nombre,
        teniaRonda: !!movimiento.ronda,
      });

      // Reordenar / seleccionar siguiente automáticamente
      await RondaModel.siguienteInteligente(movimiento.localidadId);

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

      // Reordenar / seleccionar siguiente automáticamente
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

      const movimientoActual = await prisma.movimiento.findUnique({
        where: { id },
        include: { empresa: true, localidad: true, ronda: true, viaDestino: { select: { id: true } } },
      });
      if (!movimientoActual) throw new Error(`No se encontró movimiento con id ${id}`);

      if (!forzar) {
        const transiciones: Record<string, string[]> = {
          SOLICITADO: ['EN_PROCESO', 'DETENIDO', 'CANCELADO'],
          EN_PROCESO: ['DETENIDO', 'CONCLUIDO', 'CANCELADO'],
          DETENIDO: ['EN_PROCESO', 'CANCELADO', 'CONCLUIDO'],
          CONCLUIDO: [],
          CANCELADO: [],
        };
        const permitidos = transiciones[movimientoActual.estado] ?? [];
        if (!permitidos.includes(nuevoEstado)) {
          throw new Error(
            `Transición inválida: ${movimientoActual.estado} → ${nuevoEstado}. Permitidas: ${permitidos.join(', ')}`
          );
        }
      }

      const ahora = new Date();
      const updateData: any = { estado: nuevoEstado, updatedAt: ahora };

      switch (nuevoEstado) {
        case 'EN_PROCESO':
          Object.assign(updateData, {
            fechaInicio: ahora,
            fechaPausa: null,
            incidenteGlobal: false,
            ...(operadorId && { operadorId }),
          });
          break;
        case 'DETENIDO':
          Object.assign(updateData, { fechaPausa: ahora, ...(razon && { instrucciones: razon }) });
          break;
        case 'CONCLUIDO':
          Object.assign(updateData, { fechaFin: ahora, finalizado: true, incidenteGlobal: false });
          break;
        case 'CANCELADO':
          Object.assign(updateData, {
            fechaFin: ahora,
            finalizado: true,
            incidenteGlobal: false,
            ...(razon && { instrucciones: `CANCELADO: ${razon}` }),
          });
          break;
      }

      const movimientoActualizado = await prisma.movimiento.update({
        where: { id },
        data: updateData,
        include: { empresa: true, localidad: true, ronda: true, viaDestino: { select: { id: true } } },
      });

      if ((nuevoEstado === 'CONCLUIDO' || nuevoEstado === 'CANCELADO') && movimientoActualizado.viaDestino?.id) {
        await ViaModel.liberarMovimientoDeSeccion(movimientoActualizado.viaDestino.id, id);
      }

      if (movimientoActual.ronda) {
        if (nuevoEstado === 'CONCLUIDO') {
          await RondaModel.marcarRondaComoConcluida(movimientoActual.ronda.id);
          await RondaModel.recomponerRondasLocalidad(movimientoActual.localidadId);
        } else if (nuevoEstado === 'CANCELADO') {
          await prisma.ronda.delete({ where: { id: movimientoActual.ronda.id } });
          await RondaModel.recomponerRondasLocalidad(movimientoActual.localidadId);
        }
      }

      movimientoError.info('Estado de movimiento cambiado', {
        movimientoId: id,
        estadoAnterior: movimientoActual.estado,
        estadoNuevo: nuevoEstado,
        operadorId: operadorId ?? 'No especificado',
        razon: razon ?? 'No especificada',
        empresa: movimientoActual.empresa?.nombre,
        localidad: movimientoActual.localidad?.nombre,
      });

      // Reordenar / seleccionar siguiente automáticamente
      await RondaModel.siguienteInteligente(movimientoActual.localidadId);

      return movimientoActualizado;
    } catch (error) {
      movimientoError.error('Error al cambiar estado de movimiento', { id, nuevoEstado, opciones, error });
      throw new Error('Error al cambiar estado de movimiento');
    }
  }

  // -------------------- Creación / edición alineadas a secciones --------------------

  /**
   * Crea un movimiento. Si trae `viaDestinoId`, intenta ocupar:
   * - vía completa (si no tiene secciones),
   * - o la primera sección libre (o `numeroSeccion` si se proporcionó).
   * Si no hay espacio, queda en ESPERA y se agrega a Ronda.
   * Notifica a coordinador/supervisor/operador y maquinistas de la localidad.
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
      movData.prioridad = movData.prioridad ?? 'BAJA';
      movData.estado = movData.estado ?? 'SOLICITADO';
      movData.posicionCabina = movData.posicionCabina || 'Sin_Solicitar';
      movData.posicionChimenea = movData.posicionChimenea || 'Sin_Solicitar';
      movData.direccionEmpuje = movData.direccionEmpuje || 'Sin_Solicitar';
      Object.keys(movData).forEach((k) => movData[k] === undefined && delete movData[k]);

      const mv = await prisma.movimiento.create({
        data: movData,
        include: { empresa: true, localidad: true, viaDestino: true },
      });

      if (data.viaDestinoId) {
        try {
          await this.intentarOcuparViaDestino(data.viaDestinoId, mv.id, data.numeroSeccion ?? null);
        } catch (e: any) {
          if (e instanceof ConflictError) {
            await prisma.movimiento.update({ where: { id: mv.id }, data: { estado: 'ESPERA' } });
          } else {
            throw e;
          }
        }
      }

      const movActual = await prisma.movimiento.findUnique({ where: { id: mv.id } });
      if (movActual && (movActual.estado === 'SOLICITADO' || movActual.estado === 'ESPERA')) {
        await RondaModel.generarRondaParaMovimiento({
          movimientoId: mv.id,
          empresaId: mv.empresaId,
          localidadId: mv.localidadId,
          prioridad: (mv.prioridad as 'ALTA' | 'BAJA') ?? 'BAJA',
        });
      }

      // Notificación de creación
      await notificarMovimientoCreado(mv.id);

      // Reordenar / seleccionar siguiente automáticamente
      await RondaModel.siguienteInteligente(mv.localidadId);

      return await prisma.movimiento.findUnique({
        where: { id: mv.id },
        include: { empresa: true, localidad: true, viaDestino: true, ronda: true },
      });
    } catch (err: any) {
      movimientoError.error('Error al crear movimiento', { data, error: err?.message || err });
      throw new Error('Error al crear movimiento');
    }
  }

  /**
   * Edita un movimiento. Si cambia `viaDestinoId`, libera la anterior y ocupa la nueva.
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
      const actual = await prisma.movimiento.findUnique({
        where: { id },
        select: {
          prioridad: true,
          estado: true,
          empresaId: true,
          localidadId: true,
          viaDestinoId: true,
          ronda: true,
        },
      });
      if (!actual) throw new Error(`No se encontró movimiento con id ${id}`);

      const updateData: any = { ...data };
      updateData.posicionCabina = updateData.posicionCabina || 'Sin_Solicitar';
      updateData.posicionChimenea = updateData.posicionChimenea || 'Sin_Solicitar';
      updateData.direccionEmpuje = updateData.direccionEmpuje || 'Sin_Solicitar';
      Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k]);

      const movUpd = await prisma.movimiento.update({
        where: { id },
        data: updateData,
        include: { empresa: true, localidad: true, viaDestino: true },
      });

      if (data.viaDestinoId && data.viaDestinoId !== actual.viaDestinoId) {
        if (actual.viaDestinoId) await ViaModel.liberarMovimientoDeSeccion(actual.viaDestinoId, id);
        try {
          await this.intentarOcuparViaDestino(data.viaDestinoId, id, data.numeroSeccion ?? null);
        } catch (e: any) {
          if (e instanceof ConflictError) {
            await prisma.movimiento.update({ where: { id }, data: { estado: 'ESPERA' } });
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

      if (actual.ronda && requiereReorg) {
        if (data.prioridad === 'ALTA') {
          await RondaModel.generarRondaParaMovimiento({
            movimientoId: id,
            empresaId: movUpd.empresaId,
            localidadId: movUpd.localidadId,
            prioridad: 'ALTA',
          });
        } else if (
          (data.empresaId && data.empresaId !== actual.empresaId) ||
          (data.localidadId && data.localidadId !== actual.localidadId)
        ) {
          await prisma.ronda.delete({ where: { movimientoId: id } });
          await RondaModel.generarRondaParaMovimiento({
            movimientoId: id,
            empresaId: movUpd.empresaId,
            localidadId: movUpd.localidadId,
            prioridad: (movUpd.prioridad as 'ALTA' | 'BAJA') ?? 'BAJA',
          });
        }
      } else if (!actual.ronda && movUpd.estado === 'SOLICITADO') {
        await RondaModel.generarRondaParaMovimiento({
          movimientoId: id,
          empresaId: movUpd.empresaId,
          localidadId: movUpd.localidadId,
          prioridad: (movUpd.prioridad as 'ALTA' | 'BAJA') ?? 'BAJA',
        });
      }

      // Reordenar / seleccionar siguiente automáticamente
      await RondaModel.siguienteInteligente(movUpd.localidadId);

      return movUpd;
    } catch (error) {
      movimientoError.error('Error al editar movimiento', { id, data, error });
      throw new Error('Error al editar movimiento');
    }
  }

  // -------------------- Otros métodos ya existentes (con notificación de prioridad) --------------------

  static async eliminarMovimiento(id: number) {
    try {
      const mov = await prisma.movimiento.delete({ where: { id } });
      // Reordenar / seleccionar siguiente automáticamente
      await RondaModel.siguienteInteligente(mov.localidadId);
    } catch (error) {
      movimientoError.error('Error al eliminar movimiento', { id, error });
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
      } else if (prioridad === 'BAJA' && movimiento.ronda && movimiento.estado === 'SOLICITADO') {
        await prisma.ronda.delete({ where: { movimientoId: id } });
        await RondaModel.generarRondaParaMovimiento({
          movimientoId: id,
          empresaId: movimiento.empresaId,
          localidadId: movimiento.localidadId,
          prioridad: 'BAJA',
        });
      }

      await notificarCambioPrioridad(id, prioridad);

      // Reordenar / seleccionar siguiente automáticamente
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

      // Reordenar / seleccionar siguiente automáticamente
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

      // Reordenar / seleccionar siguiente automáticamente
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

      // Reordenar / seleccionar siguiente automáticamente
      await RondaModel.siguienteInteligente(mov.localidadId);

      return mov;
    } catch (error) {
      movimientoError.error('Error al reanudar movimiento', { id, error });
      throw new Error('Error al reanudar movimiento');
    }
  }

  static async finalizarMovimiento(id: number) {
    try {
      const mov = await prisma.$transaction(async (tx) => {
        const res = await tx.movimiento.update({
          where: { id },
          data: { estado: 'CONCLUIDO', finalizado: true, fechaFin: new Date() },
          include: { ronda: true, viaDestino: { select: { id: true } } },
        });

        if (res.viaDestino?.id) {
          await ViaModel.liberarMovimientoDeSeccion(res.viaDestino.id, id);
        }

        if (res.ronda) {
          await tx.ronda.update({ where: { id: res.ronda.id }, data: { concluido: true } });
          await RondaModel.recomponerRondasLocalidad(res.localidadId, tx);
        }

        return res;
      });

      // Reordenar / seleccionar siguiente automáticamente
      await RondaModel.siguienteInteligente(mov.localidadId);

      return mov;
    } catch (error) {
      movimientoError.error('Error al finalizar movimiento', { id, error });
      throw new Error('Error al finalizar movimiento');
    }
  }
}
