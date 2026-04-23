import { Rol } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { NotificadorFCM } from '../../services/NotificadorFCM';
import { RondaModel } from './Ronda/RondaModel';
import { movimientoError } from './movimiento.logger';
import { notificarCambioPrioridad, notificarMovimientoFinalizado, notificarMovimientoIniciado } from './movimiento.notifications';
import { EDITABLE_KEYS, ESTADOS_EDITABLES, diff, EditableMovimientoInput, getMaquinistaId, pickEditable } from './movimiento.shared';

export class MovimientoWriteService {
  private static async assertMovimientoNoBloqueadoPorIncidente(id: number) {
    const movimiento = await prisma.movimiento.findUnique({
      where: { id },
      select: { id: true, estado: true, incidenteGlobal: true },
    });
    if (!movimiento) throw new Error(`No se encontró movimiento con id ${id}`);
    if (!movimiento.incidenteGlobal) return;

    const incidentesAbiertos = await prisma.incidente.count({
      where: { movimientoId: id, estado: 'ABIERTO' },
    });

    if (incidentesAbiertos > 0 || movimiento.estado === 'DETENIDO') {
      throw new Error('Movimiento bloqueado por incidente abierto');
    }
  }

  private static async obtenerResponsableActivoMasReciente(
    rol: 'SUPERVISOR' | 'COORDINADOR',
    localidadId: number,
    empresaId: number
  ) {
    const orderBy = [{ issuedAt: 'desc' as const }, { createdAt: 'desc' as const }];
    const vigencia = { revokedAt: null, expiresAt: { gt: new Date() } };

    const exacto = await prisma.token.findFirst({
      where: {
        ...vigencia,
        usuario: { activo: true, rol, localidadId, empresaId },
      },
      orderBy,
      select: { usuarioId: true },
    });
    if (exacto) return exacto.usuarioId;

    const fallback = await prisma.token.findFirst({
      where: {
        ...vigencia,
        usuario: { activo: true, rol, localidadId },
      },
      orderBy,
      select: { usuarioId: true },
    });

    return fallback?.usuarioId ?? null;
  }

  private static async resolverResponsablesActivos(localidadId: number, empresaId: number) {
    const [supervisorId, coordinadorId] = await Promise.all([
      this.obtenerResponsableActivoMasReciente(Rol.SUPERVISOR, localidadId, empresaId),
      this.obtenerResponsableActivoMasReciente(Rol.COORDINADOR, localidadId, empresaId),
    ]);

    return {
      ...(supervisorId ? { supervisorId } : {}),
      ...(coordinadorId ? { coordinadorId } : {}),
    };
  }

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
        id,
        razon,
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
          await tx.ronda.update({ where: { id: original.ronda.id }, data: { concluido: true } });
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
        id,
        razonCancelacion,
        usuarioId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al cancelar movimiento');
    }
  }

  static async guardarEdicion(id: number, payload: EditableMovimientoInput, actorId: number) {
    const updateData = pickEditable(payload);
    if (!Object.keys(updateData).length) throw new Error('Sin cambios o campos no editables');

    const actual = await prisma.movimiento.findUnique({
      where: { id },
      include: { localidad: true, viaOrigen: true, viaDestino: true, empresa: true, ronda: true },
    });
    if (!actual) throw new Error(`Movimiento ${id} no encontrado`);
    if (actual.finalizado || !ESTADOS_EDITABLES.has(actual.estado as any)) {
      throw new Error(`Movimiento no editable en estado ${actual.estado}`);
    }

    const localidadId = actual.localidadId;
    if (updateData.viaOrigenId) {
      const via = await prisma.via.findUnique({ where: { id: Number(updateData.viaOrigenId) } });
      if (!via || via.localidadId !== localidadId) throw new Error('viaOrigenId inválida para la localidad del movimiento');
    }
    if (updateData.viaDestinoId) {
      const via = await prisma.via.findUnique({ where: { id: Number(updateData.viaDestinoId) } });
      if (!via || via.localidadId !== localidadId) throw new Error('viaDestinoId inválida para la localidad del movimiento');
    }

    Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);
    ['prioridad', 'estado', 'empresaId', 'localidadId', 'finalizado'].forEach((key) => delete (updateData as any)[key]);

    const cambios = diff(actual, updateData);
    if (!Object.keys(cambios).length) return actual;

    const actualizado = await prisma.$transaction(async (tx) => {
      const updated = await tx.movimiento.update({
        where: { id },
        data: { ...updateData, updatedAt: new Date() },
        include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true, ronda: true },
      });

      try {
        // @ts-ignore modelo opcional
        await (tx as any).movimientoEditLog?.create({
          data: {
            movimientoId: id,
            actorId,
            cambios: cambios as any,
            motivo: 'edicion_general',
          },
        });
      } catch {
      }

      return updated;
    });

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

  static async reactivarMovimiento(id: number, maquinistaId?: number) {
    try {
      const fechaActual = new Date();
      const movimientoActual = await prisma.movimiento.findUnique({
        where: { id },
        select: {
          empresaId: true,
          localidadId: true,
          estado: true,
          empresa: { select: { nombre: true } },
          localidad: { select: { nombre: true } },
        },
      });

      if (!movimientoActual) throw new Error(`No se encontró movimiento con id ${id}`);
      if (movimientoActual.estado !== 'DETENIDO') {
        throw new Error(`El movimiento debe estar en estado DETENIDO para ser reactivado. Estado actual: ${movimientoActual.estado}`);
      }

      await this.assertMovimientoNoBloqueadoPorIncidente(id);

      const responsablesActivos = await this.resolverResponsablesActivos(
        movimientoActual.localidadId,
        movimientoActual.empresaId
      );

      const movimientoReactivado = await prisma.movimiento.update({
        where: { id },
        data: {
          estado: 'EN_PROCESO',
          fechaInicio: fechaActual,
          fechaPausa: null,
          updatedAt: fechaActual,
          incidenteGlobal: false,
          ...(maquinistaId && { operadorId: maquinistaId }),
          ...responsablesActivos,
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
        id,
        maquinistaId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al reactivar movimiento');
    }
  }

  static async cambiarEstadoMovimiento(
    id: number,
    nuevoEstado: 'SOLICITADO' | 'EN_PROCESO' | 'DETENIDO' | 'CONCLUIDO' | 'CANCELADO',
    opciones: { maquinistaId?: number; operadorId?: number; razon?: string; forzar?: boolean } = {}
  ) {
    try {
      const { razon, forzar = false } = opciones;
      const maquinistaId = getMaquinistaId(opciones);

      const movimientoActual = await prisma.movimiento.findUnique({
        where: { id },
        include: { empresa: true, localidad: true, ronda: true },
      });
      if (!movimientoActual) throw new Error(`No se encontró movimiento con id ${id}`);

      const responsablesActivos =
        nuevoEstado === 'EN_PROCESO'
          ? await this.resolverResponsablesActivos(movimientoActual.localidadId, movimientoActual.empresaId)
          : {};

      if (nuevoEstado === 'EN_PROCESO') {
        await this.assertMovimientoNoBloqueadoPorIncidente(id);
      }

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
          throw new Error(`Transición inválida: ${movimientoActual.estado} -> ${nuevoEstado}. Permitidas: ${permitidos.join(', ')}`);
        }
      }

      const movimientoActualizado = await prisma.$transaction(async (tx) => {
        const ahora = new Date();
        const data: any = { estado: nuevoEstado, updatedAt: ahora };

        if (nuevoEstado === 'EN_PROCESO') {
          Object.assign(data, {
            fechaInicio: ahora,
            fechaPausa: null,
            incidenteGlobal: false,
            ...(maquinistaId && { operadorId: maquinistaId }),
            ...responsablesActivos,
          });
        }
        if (nuevoEstado === 'DETENIDO') {
          Object.assign(data, { fechaPausa: ahora, ...(razon && { instrucciones: razon }) });
        }
        if (nuevoEstado === 'CONCLUIDO') {
          Object.assign(data, { fechaFin: ahora, finalizado: true, incidenteGlobal: false });
        }
        if (nuevoEstado === 'CANCELADO') {
          Object.assign(data, {
            fechaFin: ahora,
            finalizado: true,
            incidenteGlobal: false,
            ...(razon && { instrucciones: `CANCELADO: ${razon}` }),
          });
        }

        const updated = await tx.movimiento.update({
          where: { id },
          data,
          include: { ronda: true },
        });

        if (movimientoActual.ronda && (nuevoEstado === 'CONCLUIDO' || nuevoEstado === 'CANCELADO')) {
          await tx.ronda.update({ where: { id: movimientoActual.ronda.id }, data: { concluido: true } });
          await RondaModel.recomponerRondasLocalidad(movimientoActual.localidadId, tx);
        }

        return updated;
      });

      movimientoError.info('Estado de movimiento cambiado', {
        movimientoId: id,
        estadoAnterior: movimientoActual.estado,
        estadoNuevo: nuevoEstado,
        maquinistaId: maquinistaId ?? 'No especificado',
        razon: razon ?? 'No especificada',
        empresa: movimientoActual.empresa?.nombre,
        localidad: movimientoActual.localidad?.nombre,
      });

      try {
        if (nuevoEstado === 'EN_PROCESO') await notificarMovimientoIniciado(id);
        else if (nuevoEstado === 'CONCLUIDO') await notificarMovimientoFinalizado(id);
      } catch (error: any) {
        movimientoError.error('Error notificando cambio de estado', {
          movimientoId: id,
          nuevoEstado,
          errName: error?.name,
          errMsg: error?.message,
        });
      }

      await RondaModel.siguienteInteligente(movimientoActual.localidadId);
      return movimientoActualizado;
    } catch (error: any) {
      movimientoError.error('Error al cambiar estado de movimiento', {
        id,
        nuevoEstado,
        opciones,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al cambiar estado de movimiento');
    }
  }

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
    operadorId?: number;
    maquinistaId?: number;
    lavado?: boolean;
    torno?: boolean;
    posicionCabina?: 'Sin_Solicitar' | 'DENTRO' | 'AFUERA';
    posicionChimenea?: 'Sin_Solicitar' | 'DENTRO' | 'AFUERA';
    direccionEmpuje?: 'Sin_Solicitar' | 'EMPUJAR' | 'JALAR';
  }) {
    try {
      const movData: any = { ...data };

      if (movData.maquinistaId && !movData.operadorId) movData.operadorId = movData.maquinistaId;
      delete movData.maquinistaId;

      const tieneOrigen = typeof movData.viaOrigenId === 'number' && !Number.isNaN(movData.viaOrigenId);
      const tieneDestino = typeof movData.viaDestinoId === 'number' && !Number.isNaN(movData.viaDestinoId);
      if (!tieneOrigen && !tieneDestino) {
        throw new Error('Debe especificar viaOrigenId o viaDestinoId');
      }

      movData.prioridad ??= 'BAJA';
      movData.estado ??= 'SOLICITADO';
      movData.posicionCabina ??= 'Sin_Solicitar';
      movData.posicionChimenea ??= 'Sin_Solicitar';
      movData.direccionEmpuje ??= 'Sin_Solicitar';

      Object.keys(movData).forEach((key) => movData[key] === undefined && delete movData[key]);

      const movimiento = await prisma.movimiento.create({ data: movData });

      await RondaModel.generarRondaParaMovimiento({
        movimientoId: movimiento.id,
        empresaId: movimiento.empresaId,
        localidadId: movimiento.localidadId,
        prioridad: (movimiento.prioridad as 'ALTA' | 'BAJA') ?? 'BAJA',
      });

      try {
        await NotificadorFCM.notificarNuevoMovimiento(movimiento.id);
      } catch (error: any) {
        movimientoError.error('Error delegando notificarNuevoMovimiento', {
          movId: movimiento.id,
          err: error?.message,
        });
      }

      await RondaModel.siguienteInteligente(movimiento.localidadId);

      return await prisma.movimiento.findUnique({
        where: { id: movimiento.id },
        include: { empresa: true, localidad: true, viaDestino: true, ronda: true },
      });
    } catch (error: any) {
      movimientoError.error('Error al crear movimiento', {
        data,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al crear movimiento');
    }
  }

  static async actualizarEstadoServicio(
    id: number,
    nuevoEstado: 'SOLICITADO' | 'EN_PROCESO' | 'DETENIDO' | 'CANCELADO',
    opciones: { maquinistaId?: number; operadorId?: number; razon?: string } = {}
  ) {
    try {
      const movimiento = await prisma.movimiento.findUnique({
        where: { id },
        select: { id: true, lavado: true, torno: true },
      });
      if (!movimiento) throw new Error(`No se encontró movimiento con id ${id}`);
      if (!movimiento.lavado && !movimiento.torno) {
        throw new Error('El movimiento no es un servicio de lavado/torno');
      }

      return await this.cambiarEstadoMovimiento(id, nuevoEstado, {
        maquinistaId: getMaquinistaId(opciones),
        razon: opciones.razon,
        forzar: false,
      });
    } catch (error: any) {
      movimientoError.error('Error al actualizar estado de servicio', {
        id,
        nuevoEstado,
        opciones,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al actualizar estado de servicio');
    }
  }

  static async editarMovimiento(
    id: number,
    data: {
      empresaId?: number;
      creadoPorId?: number;
      clienteId?: number;
      supervisorId?: number;
      coordinadorId?: number;
      operadorId?: number;
      maquinistaId?: number;
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
          select: { prioridad: true, estado: true, empresaId: true, localidadId: true, ronda: true },
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
        Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

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
        const current = await prisma.movimiento.findUnique({
          where: { id },
          select: { empresaId: true, localidadId: true, prioridad: true, estado: true, ronda: true },
        });
        if (current) {
          if (current.prioridad === 'ALTA' && current.estado === 'SOLICITADO') {
            await RondaModel.generarRondaParaMovimiento({
              movimientoId: id,
              empresaId: current.empresaId,
              localidadId: current.localidadId,
              prioridad: 'ALTA',
            });
          } else if (!current.ronda && current.estado === 'SOLICITADO') {
            await RondaModel.generarRondaParaMovimiento({
              movimientoId: id,
              empresaId: current.empresaId,
              localidadId: current.localidadId,
              prioridad: (current.prioridad as 'ALTA' | 'BAJA') ?? 'BAJA',
            });
          }
        }
      }

      await RondaModel.siguienteInteligente(movUpd.localidadId);
      return movUpd;
    } catch (error: any) {
      movimientoError.error('Error al editar movimiento', {
        id,
        data,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al editar movimiento');
    }
  }

  static async solicitarServicioYEncolarFrenteR1(id: number) {
    try {
      const movimiento = await prisma.movimiento.findUnique({
        where: { id },
        select: { id: true, localidadId: true, estado: true, lavado: true, torno: true },
      });
      if (!movimiento) throw new Error(`No se encontró movimiento con id ${id}`);
      if (!movimiento.lavado && !movimiento.torno) throw new Error('El movimiento no es un servicio de lavado/torno');

      await RondaModel.solicitarYEncolarFrenteR1(id);
      await RondaModel.siguienteInteligente(movimiento.localidadId);

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

  static async eliminarMovimiento(id: number) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const movimiento = await tx.movimiento.findUnique({ where: { id }, include: { ronda: true } });
        if (!movimiento) throw new Error(`Movimiento ${id} no encontrado`);

        if (movimiento.ronda) {
          await tx.ronda.delete({ where: { id: movimiento.ronda.id } });
          await RondaModel.recomponerRondasLocalidad(movimiento.localidadId, tx);
        }

        return await tx.movimiento.delete({ where: { id } });
      });

      await RondaModel.siguienteInteligente(result.localidadId);
      return result;
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
        id,
        prioridad,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al cambiar prioridad del movimiento');
    }
  }

  static async iniciarMovimiento(id: number, maquinistaId: number) {
    try {
      const fechaActual = new Date();
      const actual = await prisma.movimiento.findUnique({
        where: { id },
        select: { id: true, empresaId: true, localidadId: true },
      });
      if (!actual) throw new Error(`Movimiento ${id} no encontrado`);

      await this.assertMovimientoNoBloqueadoPorIncidente(id);

      const responsablesActivos = await this.resolverResponsablesActivos(actual.localidadId, actual.empresaId);

      const movimiento = await prisma.movimiento.update({
        where: { id },
        data: {
          estado: 'EN_PROCESO',
          fechaInicio: fechaActual,
          operadorId: maquinistaId,
          updatedAt: fechaActual,
          ...responsablesActivos,
        },
      });

      await notificarMovimientoIniciado(movimiento.id);
      await RondaModel.siguienteInteligente(movimiento.localidadId);
      return movimiento;
    } catch (error: any) {
      movimientoError.error('Error al iniciar movimiento', {
        id,
        maquinistaId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al iniciar movimiento');
    }
  }

  static async pausarMovimiento(id: number) {
    try {
      const fechaActual = new Date();
      const movimiento = await prisma.movimiento.update({
        where: { id },
        data: { estado: 'DETENIDO', fechaPausa: fechaActual, updatedAt: fechaActual },
      });

      await RondaModel.siguienteInteligente(movimiento.localidadId);
      return movimiento;
    } catch (error: any) {
      movimientoError.error('Error al pausar movimiento', {
        id,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al pausar movimiento');
    }
  }

  static async reanudarMovimiento(id: number) {
    try {
      const fechaActual = new Date();
      const actual = await prisma.movimiento.findUnique({
        where: { id },
        select: { id: true, empresaId: true, localidadId: true },
      });
      if (!actual) throw new Error(`Movimiento ${id} no encontrado`);

      await this.assertMovimientoNoBloqueadoPorIncidente(id);

      const responsablesActivos = await this.resolverResponsablesActivos(actual.localidadId, actual.empresaId);

      const movimiento = await prisma.movimiento.update({
        where: { id },
        data: { estado: 'EN_PROCESO', fechaInicio: fechaActual, updatedAt: fechaActual, ...responsablesActivos },
      });

      await notificarMovimientoIniciado(movimiento.id);
      await RondaModel.siguienteInteligente(movimiento.localidadId);
      return movimiento;
    } catch (error: any) {
      movimientoError.error('Error al reanudar movimiento', {
        id,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al reanudar movimiento');
    }
  }

  static async finalizarMovimiento(id: number) {
    try {
      const movimiento = await prisma.$transaction(async (tx) => {
        const actual = await tx.movimiento.findUnique({
          where: { id },
          include: { ronda: true },
        });
        if (!actual) throw new Error(`Movimiento ${id} no encontrado`);
        if (actual.finalizado) return actual;

        const result = await tx.movimiento.update({
          where: { id },
          data: { estado: 'CONCLUIDO', finalizado: true, fechaFin: new Date(), updatedAt: new Date() },
          include: { ronda: true },
        });

        if (result.ronda) {
          await tx.ronda.update({ where: { id: result.ronda.id }, data: { concluido: true, updatedAt: new Date() } });
          await RondaModel.recomponerRondasLocalidad(result.localidadId, tx);
        }

        return result;
      });

      await notificarMovimientoFinalizado(movimiento.id);
      await RondaModel.siguienteInteligente(movimiento.localidadId);
      return movimiento;
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

  static getEditableKeys() {
    return Array.from(EDITABLE_KEYS);
  }
}
