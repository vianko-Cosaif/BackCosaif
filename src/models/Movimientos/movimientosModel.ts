import { Prisma, PrismaClient } from '@prisma/client'; 
import { RondaModel } from './Ronda/RondaModel';
import { movimientoError } from './movimiento.logger';   // ajusta la ruta si es distinta

const prisma = new PrismaClient();

export class MovimientoModel {
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
/**
 * Actualizaciones para MovimientoModel.ts
 * 
 * Nuevos m�todos para manejo de estados DETENIDO y CANCELADO
 * Estos m�todos deben agregarse a la clase MovimientoModel existente
 */

/**
 * Detiene un movimiento y lo marca como DETENIDO.
 * Generalmente usado cuando hay un incidente activo.
 * 
 * @param id ID del movimiento a detener
 * @param razon Raz�n opcional por la cual se detiene
 * @returns Movimiento actualizado
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
        // Si se proporciona una raz�n, se puede guardar en instrucciones
        ...(razon && { instrucciones: razon })
      },
      include: {
        empresa: true,
        localidad: true,
        ronda: true
      }
    });

    movimientoError.info('Movimiento detenido', {
      movimientoId: id,
      razon: razon || 'No especificada',
      empresa: movimientoDetenido.empresa?.nombre,
      localidad: movimientoDetenido.localidad?.nombre
    });

    return movimientoDetenido;
  } catch (error) {
    movimientoError.error('Error al detener movimiento', { id, razon, error });
    throw new Error('Error al detener movimiento');
  }
}

/**
 * Cancela un movimiento permanentemente.
 * Un movimiento cancelado no puede ser reactivado.
 * 
 * @param id ID del movimiento a cancelar
 * @param razonCancelacion Raz�n de la cancelaci�n
 * @param usuarioId ID del usuario que cancela (opcional)
 * @returns Movimiento cancelado
 */static async cancelarMovimiento(
  id: number,
  razonCancelacion: string,
  usuarioId?: number
) {
  try {
    const fechaActual = new Date();
    
    // Obtener el movimiento con su ronda
    const movimiento = await prisma.movimiento.findUnique({
      where: { id },
      include: { 
        ronda: true,
        empresa: true,
        localidad: true 
      }
    });

    if (!movimiento) {
      throw new Error(`No se encontr� movimiento con id ${id}`);
    }

    // Actualizar el movimiento a CANCELADO
    const movimientoCancelado = await prisma.movimiento.update({
      where: { id },
      data: {
        estado: 'CANCELADO',
        finalizado: true,
        fechaFin: fechaActual,
        updatedAt: fechaActual,
        instrucciones: `CANCELADO: ${razonCancelacion}`,
        incidenteGlobal: false
      },
      include: {
        empresa: true,
        localidad: true,
        ronda: true
      }
    });

    // Si ten�a una ronda asignada, eliminarla y renumerar
    if (movimiento.ronda) {
      // Eliminar la ronda
      await prisma.ronda.delete({
        where: { id: movimiento.ronda.id }
      });

      // Renumera de 1..N en esa localidad
      await RondaModel.recomponerRondasLocalidad(movimiento.localidadId);

      movimientoError.info('Ronda eliminada por cancelaci�n de movimiento', {
        movimientoId: id,
        rondaId: movimiento.ronda.id,
        rondaNumero: movimiento.ronda.rondaNumero
      });
    }

    movimientoError.info('Movimiento cancelado', {
      movimientoId: id,
      razonCancelacion,
      usuarioId: usuarioId || 'No especificado',
      empresa: movimiento.empresa?.nombre,
      localidad: movimiento.localidad?.nombre,
      teniaRonda: !!movimiento.ronda
    });

    return movimientoCancelado;
  } catch (error) {
    movimientoError.error('Error al cancelar movimiento', { 
      id, 
      razonCancelacion, 
      usuarioId, 
      error 
    });
    throw new Error('Error al cancelar movimiento');
  }
}

/**
 * Reactiva un movimiento desde estado DETENIDO a EN_PROCESO.
 * Solo funciona si el movimiento est� en estado DETENIDO.
 * 
 * @param id ID del movimiento a reactivar
 * @param operadorId ID del operador que reactiva (opcional)
 * @returns Movimiento reactivado
 */
static async reactivarMovimiento(id: number, operadorId?: number) {
  try {
    const fechaActual = new Date();
    
    // Verificar estado actual
    const movimientoActual = await prisma.movimiento.findUnique({
      where: { id },
      select: { 
        estado: true, 
        empresa: { select: { nombre: true } },
        localidad: { select: { nombre: true } }
      }
    });

    if (!movimientoActual) {
      throw new Error(`No se encontr� movimiento con id ${id}`);
    }

    if (movimientoActual.estado !== 'DETENIDO') {
      throw new Error(`El movimiento debe estar en estado DETENIDO para ser reactivado. Estado actual: ${movimientoActual.estado}`);
    }

    const movimientoReactivado = await prisma.movimiento.update({
      where: { id },
      data: {
        estado: 'EN_PROCESO',
        fechaInicio: fechaActual, // Actualizar fecha de inicio
        fechaPausa: null, // Limpiar fecha de pausa
        updatedAt: fechaActual,
        incidenteGlobal: false, // Limpiar flag de incidente
        ...(operadorId && { operadorId })
      },
      include: {
        empresa: true,
        localidad: true,
        ronda: true
      }
    });

    movimientoError.info('Movimiento reactivado', {
      movimientoId: id,
      operadorId: operadorId || 'No especificado',
      empresa: movimientoActual.empresa?.nombre,
      localidad: movimientoActual.localidad?.nombre
    });

    return movimientoReactivado;
  } catch (error) {
    movimientoError.error('Error al reactivar movimiento', { id, operadorId, error });
    throw new Error('Error al reactivar movimiento');
  }
}

/**
 * Cambia el estado de un movimiento con validaciones.
 * M�todo unificado para cambios de estado con reglas de negocio.
 * 
 * @param id ID del movimiento
 * @param nuevoEstado Nuevo estado del movimiento
 * @param opciones Opciones adicionales para el cambio de estado
 * @returns Movimiento actualizado
 */
static async cambiarEstadoMovimiento(
  id: number,
  nuevoEstado: string,
  opciones: {
    operadorId?: number;
    razon?: string;
    forzar?: boolean;
  } = {}
) {
  try {
    const { operadorId, razon, forzar = false } = opciones;

    // -- 1. Estado actual --------------------------------------------------------
    const movimientoActual = await prisma.movimiento.findUnique({
      where: { id },
      include: { empresa: true, localidad: true, ronda: true }
    });
    if (!movimientoActual) throw new Error(`No se encontr� movimiento con id ${id}`);

    // -- 2. Validaciones de transici�n (si no se fuerza) ------------------------
    if (!forzar) {
      const transiciones: Record<string, string[]> = {
        SOLICITADO: ['EN_PROCESO', 'DETENIDO', 'CANCELADO'],
        EN_PROCESO: ['DETENIDO', 'CONCLUIDO', 'CANCELADO'],
        DETENIDO  : ['EN_PROCESO', 'CANCELADO', 'CONCLUIDO'],
        CONCLUIDO : [],
        CANCELADO : []
      };
      const permitidos = transiciones[movimientoActual.estado] ?? [];
      if (!permitidos.includes(nuevoEstado)) {
        throw new Error(
          `Transici�n inv�lida: ${movimientoActual.estado} ? ${nuevoEstado}. ` +
          `Permitidas: ${permitidos.join(', ')}`
        );
      }
    }

    // -- 3. Datos de actualizaci�n ----------------------------------------------
    const ahora = new Date();
    const updateData: any = { estado: nuevoEstado, updatedAt: ahora };

    switch (nuevoEstado) {
      case 'EN_PROCESO':
        Object.assign(updateData, {
          fechaInicio: ahora,
          fechaPausa : null,
          incidenteGlobal: false,
          ...(operadorId && { operadorId })
        });
        break;

      case 'DETENIDO':
        Object.assign(updateData, {
          fechaPausa: ahora,
          ...(razon && { instrucciones: razon })
        });
        break;

      case 'CONCLUIDO':
        Object.assign(updateData, {
          fechaFin: ahora,
          finalizado: true,
          incidenteGlobal: false
        });
        break;

      case 'CANCELADO':
        Object.assign(updateData, {
          fechaFin: ahora,
          finalizado: true,
          incidenteGlobal: false,
          ...(razon && { instrucciones: `CANCELADO: ${razon}` })
        });
        break;
    }

    // -- 4. Actualizar movimiento -----------------------------------------------
    const movimientoActualizado = await prisma.movimiento.update({
      where: { id },
      data : updateData,
      include: { empresa: true, localidad: true, ronda: true }
    });

    // -- 5. Gesti�n de ronda ----------------------------------------------------
    if (movimientoActual.ronda) {
      if (nuevoEstado === 'CONCLUIDO') {
        await RondaModel.marcarRondaComoConcluida(movimientoActual.ronda.id);
      } else if (nuevoEstado === 'CANCELADO') {
        // Eliminar ronda y renumerar en la localidad
        await prisma.ronda.delete({ where: { id: movimientoActual.ronda.id } });
        await RondaModel.recomponerRondasLocalidad(movimientoActual.localidadId);
      }
    }

    // -- 6. Log -----------------------------------------------------------------
    movimientoError.info('Estado de movimiento cambiado', {
      movimientoId : id,
      estadoAnterior: movimientoActual.estado,
      estadoNuevo  : nuevoEstado,
      operadorId   : operadorId ?? 'No especificado',
      razon        : razon ?? 'No especificada',
      empresa      : movimientoActual.empresa?.nombre,
      localidad    : movimientoActual.localidad?.nombre
    });

    return movimientoActualizado;
  } catch (error) {
    movimientoError.error('Error al cambiar estado de movimiento', {
      id, nuevoEstado, opciones, error
    });
    throw new Error('Error al cambiar estado de movimiento');
  }
}

/**
 * Obtiene movimientos por estado espec�fico.
 * �til para filtrar por estados como DETENIDO, CANCELADO, etc.
 * 
 * @param estado Estado a filtrar
 * @param incluirRelaciones Si incluir las relaciones completas
 * @returns Lista de movimientos en el estado especificado
 */
static async obtenerMovimientosPorEstado(estado: string, incluirRelaciones: boolean = true) {
  try {
    const include = incluirRelaciones ? {
      empresa: true,
      creadoPor: true,
      localidad: true,
      viaOrigen: true,
      viaDestino: true,
      incidentes: true,
      ronda: true,
    } : undefined;

    return await prisma.movimiento.findMany({
      where: { estado: estado as any }, // Cast expl�cito
      include,
      orderBy: {
        createdAt: 'desc'
      }
    });
  } catch (error) {
    movimientoError.error('Error al obtener movimientos por estado', { estado, error });
    throw new Error('Error al obtener movimientos por estado');
  }
}

/**
 * Obtiene estad�sticas de movimientos por estado.
 * �til para dashboards y reportes.
 * 
 * @param fechaInicio Fecha de inicio del per�odo (opcional)
 * @param fechaFin Fecha de fin del per�odo (opcional)
 * @returns Estad�sticas agrupadas por estado
 */
static async obtenerEstadisticasPorEstado(fechaInicio?: Date, fechaFin?: Date) {
  try {
    const whereCondition: any = {};
    
    if (fechaInicio && fechaFin) {
      whereCondition.createdAt = {
        gte: fechaInicio,
        lte: fechaFin
      };
    }

    const estadisticas = await prisma.movimiento.groupBy({
      by: ['estado'],
      where: whereCondition,
      _count: {
        id: true
      },
      orderBy: {
        estado: 'asc'
      }
    });

    // Convertir a formato m�s legible
    const resultado = estadisticas.reduce((acc, stat) => {
      acc[stat.estado] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Agregar total
    const total = Object.values(resultado).reduce((sum, count) => sum + count, 0);
    
    return {
      porEstado: resultado,
      total,
      periodo: fechaInicio && fechaFin ? {
        inicio: fechaInicio.toISOString(),
        fin: fechaFin.toISOString()
      } : null
    };
  } catch (error) {
    movimientoError.error('Error al obtener estad�sticas por estado', { fechaInicio, fechaFin, error });
    throw new Error('Error al obtener estad�sticas por estado');
  }
}
  /**
   * Crea un nuevo movimiento ferroviario y asigna una ronda según su prioridad.
   * - Para prioridad ALTA: desplaza todas las rondas existentes en la localidad (+1)
   *   y crea la nueva en rondaNúmero = 1, orden = 1.
   * - Para prioridad BAJA: busca la primera ronda en la que la empresa no participa
   *   y añade el movimiento allí; si no existe, crea una nueva al final.
   *
   * @param data Datos del movimiento a crear
   * @returns El movimiento creado, incluyendo empresa y localidad
   * @throws Error si falla la creación o la asignación de la ronda
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
    fechaInicio?: Date;
    fechaFin?: Date;
    fechaPausa?: Date;
    instrucciones?: string;
    finalizado?: boolean;
    incidenteGlobal?: boolean;
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
      // 1) Normalizar y sanitizar
      const movData: any = { ...data };
      movData.prioridad = movData.prioridad ?? 'BAJA';
      movData.estado    = movData.estado    ?? 'SOLICITADO';
      movData.posicionCabina   ||= 'Sin_Solicitar';
      movData.posicionChimenea ||= 'Sin_Solicitar';
      movData.direccionEmpuje  ||= 'Sin_Solicitar';

      Object.keys(movData).forEach(k => movData[k] === undefined && delete movData[k]);

      // 2) Crear movimiento
      const mv = await prisma.movimiento.create({
        data: movData,
        include: { empresa: true, localidad: true }
      });

      // 3) Si está SOLICITADO, asignar ronda sin desplazar nada
      if (mv.estado === 'SOLICITADO') {
        const { localidadId, empresaId, id: movimientoId, prioridad } = mv;

        if (prioridad === 'ALTA') {
          // contar cuántos ya hay en ronda 1
          const count1 = await prisma.ronda.count({ where: { localidadId, rondaNumero: 1 } });
          await prisma.ronda.create({
            data: { movimientoId, empresaId, localidadId, rondaNumero: 1, orden: count1 + 1 }
          });

        } else {
          // decidir ronda inicial: 2 si existe al menos una ALTA, sino 1
          const tieneAlta = await prisma.ronda.count({ where: { localidadId, rondaNumero: 1 } }) > 0;
          const minRonda = tieneAlta ? 2 : 1;

          // buscar primera ronda disponible
          const existe = await prisma.ronda.findFirst({
            where: { localidadId, rondaNumero: { gte: minRonda }, empresaId: { not: empresaId } },
            orderBy: { rondaNumero: 'asc' }
          });

          if (existe) {
            const maxOrden = await prisma.ronda.count({
              where: { localidadId, rondaNumero: existe.rondaNumero }
            });
            await prisma.ronda.create({
              data: {
                movimientoId,
                empresaId,
                localidadId,
                rondaNumero: existe.rondaNumero,
                orden: maxOrden + 1
              }
            });
          } else {
            // si no hay, nueva al final
            const agg = await prisma.ronda.aggregate({
              where: { localidadId },
              _max: { rondaNumero: true }
            });
            const next = (agg._max.rondaNumero ?? (minRonda - 1)) + 1;
            await prisma.ronda.create({
              data: { movimientoId, empresaId, localidadId, rondaNumero: next, orden: 1 }
            });
          }
        }
      }

      return mv;

    } catch (error: any) {
      movimientoError.error('Error al crear movimiento', { data, error: error.message });
      throw new Error('Error al crear movimiento');
    }
  }

  /**
   * Actualiza un movimiento existente y reorganiza las rondas cuando es necesario.
   * Cuando se actualiza la prioridad a ALTA, se reorganizan todas las rondas.
   * 
   * @param id ID del movimiento a editar
   * @param data Datos a actualizar
   * @returns Movimiento actualizado
   * @throws Error si falla la actualización o reorganización
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
      // 1) Leer existente
      const previo = await prisma.movimiento.findUnique({
        where: { id },
        select: {
          prioridad: true,
          estado: true,
          empresaId: true,
          localidadId: true,
          ronda: { select: { id: true, rondaNumero: true } }
        }
      });
      if (!previo) throw new Error(`No existe movimiento ${id}`);

      // 2) Normalizar y actualizar
      const upd: any = { ...data };
      upd.posicionCabina   ||= 'Sin_Solicitar';
      upd.posicionChimenea ||= 'Sin_Solicitar';
      upd.direccionEmpuje  ||= 'Sin_Solicitar';
      Object.keys(upd).forEach(k => upd[k] === undefined && delete upd[k]);

      const mv = await prisma.movimiento.update({
        where: { id },
        data: upd,
        include: { empresa: true, localidad: true }
      });

      // 3) Decidir si reasignar ronda
      const cambióRonda = (
        (data.prioridad   && data.prioridad   !== previo.prioridad) ||
        (data.estado     && data.estado     === 'SOLICITADO' && previo.estado !== 'SOLICITADO') ||
        (data.empresaId  && data.empresaId  !== previo.empresaId) ||
        (data.localidadId&& data.localidadId!== previo.localidadId)
      );

      if (cambióRonda) {
        // 3a) eliminar fila antigua si existía
        if (previo.ronda) {
          await prisma.ronda.delete({ where: { id: previo.ronda.id } });
        }
        // 3b) volver a inserción incremental
        await this.nuevoMovimiento({
          empresaId: mv.empresaId,
          creadoPorId: mv.creadoPorId,         // ya no cambia
          localidadId: mv.localidadId,
          prioridad: mv.prioridad,
          viaOrigenId: mv.viaOrigenId,
          viaDestinoId: mv.viaDestinoId === null ? undefined : mv.viaDestinoId,
          locomotiveNumber: mv.locomotiveNumber,
          tipoMovimiento: mv.tipoMovimiento === null ? undefined : mv.tipoMovimiento,
          estado: mv.estado,
          fechaSolicitud: mv.fechaSolicitud ?? undefined,
          fechaInicio: mv.fechaInicio ?? undefined,
          fechaFin: mv.fechaFin ?? undefined,
          fechaPausa: mv.fechaPausa ?? undefined,
          instrucciones: mv.instrucciones ?? undefined,
          finalizado: mv.finalizado ?? undefined,
          incidenteGlobal: mv.incidenteGlobal ?? undefined,
          clienteId: mv.clienteId ?? undefined,
          supervisorId: mv.supervisorId ?? undefined,
          coordinadorId: mv.coordinadorId ?? undefined,
          operadorId: mv.operadorId ?? undefined,
          lavado: mv.lavado ?? undefined,
          torno: mv.torno ?? undefined,
          posicionCabina: mv.posicionCabina ?? undefined,
          posicionChimenea: mv.posicionChimenea ?? undefined,
          direccionEmpuje: mv.direccionEmpuje ?? undefined
        });
      }

      return mv;

    } catch (error: any) {
      movimientoError.error('Error al editar movimiento', { id, data, error: error.message });
      throw new Error('Error al editar movimiento');
    }
  }

  static async eliminarMovimiento(id: number) {
    try {
      return await prisma.movimiento.delete({
        where: { id },
      });
    } catch (error) {
      movimientoError.error('Error al eliminar movimiento', { id, error });
      throw new Error('Error al eliminar movimiento');
    }
  }

  /**
   * Cambia la prioridad de un movimiento y reorganiza las rondas si es necesario.
   * 
   * @param id ID del movimiento
   * @param prioridad Nueva prioridad ('ALTA' o 'BAJA')
   * @returns Movimiento actualizado
   */
  static async cambiarPrioridad(id: number, prioridad: 'ALTA' | 'BAJA') {
    try {
      // Obtener el movimiento con su ronda
      const movimiento = await prisma.movimiento.findUnique({
        where: { id },
        include: { 
          ronda: true,
          empresa: true,
          localidad: true 
        }
      });

      if (!movimiento) {
        throw new Error(`No se encontró movimiento con id ${id}`);
      }

      // Si no cambia la prioridad, no hacer nada
      if (movimiento.prioridad === prioridad) {
        return movimiento;
      }

      // Actualizar la prioridad del movimiento
      const movimientoActualizado = await prisma.movimiento.update({
        where: { id },
        data: { prioridad }
      });

      // Si el movimiento está en SOLICITADO y cambia a ALTA prioridad
      if (movimiento.estado === 'SOLICITADO' && prioridad === 'ALTA') {
        // Reorganizar todas las rondas
        await RondaModel.generarRondaParaMovimiento({
          movimientoId: id,
          empresaId: movimiento.empresaId,
          localidadId: movimiento.localidadId,
          prioridad: 'ALTA'
        });
        
        movimientoError.info('Prioridad cambiada a ALTA - se reorganizaron las rondas', {
          movimientoId: id,
          empresa: movimiento.empresa?.nombre,
          localidad: movimiento.localidad?.nombre
        });
      } 
      // Si cambia a BAJA prioridad y tiene ronda
      else if (prioridad === 'BAJA' && movimiento.ronda && movimiento.estado === 'SOLICITADO') {
        // Eliminar ronda actual
        await prisma.ronda.delete({
          where: { movimientoId: id }
        });
        
        // Crear nueva ronda con prioridad BAJA
        await RondaModel.generarRondaParaMovimiento({
          movimientoId: id,
          empresaId: movimiento.empresaId,
          localidadId: movimiento.localidadId,
          prioridad: 'BAJA'
        });
      }

      return movimientoActualizado;
    } catch (error) {
      movimientoError.error('Error al cambiar prioridad', { id, prioridad, error });
      throw new Error('Error al cambiar prioridad del movimiento');
    }
  }

  static async obtenerMovimientosPendientes() {
    try {
      return await prisma.movimiento.findMany({
        where: {
          estado: { in: ['SOLICITADO', 'EN_PROCESO', 'DETENIDO', 'CONCLUIDO'] },
        },
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
        where: {
          empresaId,
          estado: { in: ['SOLICITADO', 'EN_PROCESO', 'DETENIDO'] },
        },
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
        orderBy: {
          createdAt: 'asc', // Opcional, para que te los regrese ordenados por creación
        },
      });
    } catch (error) {
      movimientoError.error('Error al obtener todos los movimientos', { error });
      throw new Error('Error al obtener todos los movimientos');
    }
  }
  
  static async obtenerMovimientosPorEmpresa(empresaId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: {
          empresaId,
        },
        include: {
          empresa: true,
          creadoPor: true,
          localidad: true,
          viaOrigen: true,
          viaDestino: true,
          incidentes: true,
          ronda: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    } catch (error) {
      movimientoError.error('Error al obtener movimientos por empresa', { empresaId, error });
      throw new Error('Error al obtener movimientos por empresa');
    }
  }
  
  // ✅ Obtener movimientos pendientes por localidad
static async obtenerMovimientosPendientesPorLocalidad(localidadId: number) {
  try {
    return await prisma.movimiento.findMany({
      where: {
        localidadId,
        estado: { in: ['SOLICITADO', 'EN_PROCESO', 'DETENIDO'] },
      },
      include: {
        empresa: true,
        creadoPor: true,
        localidad: true,
        viaOrigen: true,
        viaDestino: true,
        incidentes: true,
        ronda: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  } catch (error) {
    movimientoError.error('Error al obtener movimientos pendientes por localidad', { localidadId, error });
    throw new Error('Error al obtener movimientos pendientes por localidad');
  }
}

// ✅ Obtener todos los movimientos por localidad
static async obtenerTodosMovimientosPorLocalidad(localidadId: number) {
  try {
    return await prisma.movimiento.findMany({
      where: {
        localidadId,
      },
      include: {
        empresa: true,
        creadoPor: true,
        localidad: true,
        viaOrigen: true,
        viaDestino: true,
        incidentes: true,
        ronda: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  } catch (error) {
    movimientoError.error('Error al obtener todos los movimientos por localidad', { localidadId, error });
    throw new Error('Error al obtener todos los movimientos por localidad');
  }
}

// ✅ Obtener movimientos por localidad y empresa
static async obtenerMovimientosPorLocalidadEmpresa(localidadId: number, empresaId: number) {
  try {
    return await prisma.movimiento.findMany({
      where: {
        localidadId,
        empresaId,
      },
      include: {
        empresa: true,
        creadoPor: true,
        localidad: true,
        viaOrigen: true,
        viaDestino: true,
        incidentes: true,
        ronda: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  } catch (error) {
    movimientoError.error('Error al obtener movimientos por localidad y empresa', { localidadId, empresaId, error });
    throw new Error('Error al obtener movimientos por localidad y empresa');
  }
}
  /**
   * Obtener todos los movimientos de una empresa en una localidad
   */
  static async obtenerMovimientosPorEmpresaYLocalidad(
    empresaId: number,
    localidadId: number
  ) {
    try {
      return await prisma.movimiento.findMany({
        where: {
          empresaId,
          localidadId,
        },
        include: {
          empresa: true,
          creadoPor: true,
          localidad: true,
          viaOrigen: true,
          viaDestino: true,
          incidentes: true,
          ronda: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    } catch (error) {
      movimientoError.error(
        'Error al obtener movimientos por empresa y localidad',
        { empresaId, localidadId, error }
      );
      throw new Error('Error al obtener movimientos por empresa y localidad');
    }
  }

  /**
   * Obtener movimientos NO concluidos (finalizado = false) de una empresa en una localidad
   */
  static async obtenerMovimientosNoConcluidosPorEmpresaYLocalidad(
    empresaId: number,
    localidadId: number
  ) {
    try {
      return await prisma.movimiento.findMany({
        where: {
          empresaId,
          localidadId,
          finalizado: false,
        },
        include: {
          empresa: true,
          creadoPor: true,
          localidad: true,
          viaOrigen: true,
          viaDestino: true,
          incidentes: true,
          ronda: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    } catch (error) {
      movimientoError.error(
        'Error al obtener movimientos no concluidos por empresa y localidad',
        { empresaId, localidadId, error }
      );
      throw new Error(
        'Error al obtener movimientos no concluidos por empresa y localidad'
      );
    }
  }

  /**
   * Obtiene información completa de una ronda a partir de su ID,
   * incluyendo empresa, datos del movimiento (vía origen, vía destino)
   * y flags de lavado y torno.
   */
  static async obtenerInfoPorRonda(rondaId: number) {
    try {
      const info = await RondaModel.obtenerInfoPorRonda(rondaId);
      if (!info) {
        throw new Error(`No se encontró la ronda con ID ${rondaId}`);
      }

      // Transformación opcional: extraer solo los campos necesarios
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
      return await prisma.movimiento.update({
        where: { id },
        data: {
          estado: 'EN_PROCESO',
          fechaInicio: fechaActual,
          operadorId: operadorId, 
          updatedAt: fechaActual,
                },
      });
    } catch (error) {
      movimientoError.error('Error al iniciar movimiento', { id, error });
      throw new Error('Error al iniciar movimiento');
    }
  }

  static async pausarMovimiento(id: number) {
    try {
      const fechaActual = new Date();
      return await prisma.movimiento.update({
        where: { id },
        data: {
          estado: 'DETENIDO',
          fechaPausa: fechaActual,
          updatedAt: fechaActual,
        },
      });
    } catch (error) {
      movimientoError.error('Error al pausar movimiento', { id, error });
      throw new Error('Error al pausar movimiento');
    }
  }
  static async reanudarMovimiento(id: number) {
    try {
      const fechaActual = new Date();
      return await prisma.movimiento.update({
        where: { id },
        data: {
          estado: 'EN_PROCESO',
          fechaInicio: fechaActual,
          updatedAt: fechaActual,
        },
      });
    } catch (error) {
      movimientoError.error('Error al reanudar movimiento', { id, error });
      throw new Error('Error al reanudar movimiento');
    }
  }


// MovimientoModel.ts
static async finalizarMovimiento(id: number) {
  return prisma.$transaction(async (tx) => {
    // 1. Marcar el movimiento como CONCLUIDO
    const mov = await tx.movimiento.update({
      where: { id },
      data: {
        estado: 'CONCLUIDO',
        finalizado: true,
        fechaFin: new Date(),
      },
      include: { ronda: true },
    });

    // 2. Si tiene ronda, marcarla concluida
    if (mov.ronda) {
      await tx.ronda.update({
        where: { id: mov.ronda.id },
        data: { concluido: true },
      });

      // 3. Renumerar TODA la localidad (borra rondas fully-concluidas y ajusta 1,2,3�)
      await RondaModel.recomponerRondasLocalidad(mov.localidadId, tx);
    }

    return mov;
  });
}

}
