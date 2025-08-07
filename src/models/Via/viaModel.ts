import { PrismaClient } from '@prisma/client';
import { viaError } from './via.logger';
import { SeccionViaModel } from './Secciones/SeccionViasModel';

const prisma = new PrismaClient();

export class ViaModel {
  /**
   * Asigna un movimiento a una sección de una vía y marca la vía como ocupada.
   * Requiere número de sección. Si la vía no tiene secciones, ocupa vía completa.
   */
    /**
   * Asigna un movimiento a una sección de una vía y marca la vía como ocupada.
   * Requiere número de sección si hay secciones definidas.
   * @param viaId - ID de la vía.
   * @param numeroSeccion - Número de la sección a ocupar.
   * @param movimientoId - ID del movimiento.
   */
  static async asignarMovimientoASeccion(
    viaId: number,
    numeroSeccion: number,
    movimientoId: number
  ) {
    try {
      // Verificar si la vía tiene secciones
      const secciones = await prisma.seccionVia.findMany({ where: { viaId } });
      if (secciones.length > 0) {
        // Delegar en SeccionViaModel para manejar sección específica
        await SeccionViaModel.asignarMovimientoASeccion(viaId, numeroSeccion, movimientoId);
      } else {
        // Si no hay secciones, ocupa la vía completa
        await prisma.via.update({
          where: { id: viaId },
          data: { ocupada: true, movimientoId }
        });
      }
    } catch (error: any) {
      viaError.error('Error en asignarMovimientoASeccion', { error, viaId, numeroSeccion, movimientoId });
      throw error;
    }
  } 

  /**
   * Libera el movimiento de una sección (o vía completa) y actualiza estado.
   */
  static async liberarMovimientoDeSeccion(
    viaId: number,
    movimientoId: number
  ) {
    try {
      // delegar en SeccionViaModel
      await SeccionViaModel.liberarMovimientoDeSeccion(
        viaId,
        movimientoId
      );
    } catch (error: any) {
      viaError.error('Error en liberarMovimientoDeSeccion', { error, viaId, movimientoId });
      throw error;
    }
  }

  /**
   * Obtiene todas las vías, incluyendo su ocupación y secciones.
   */
  static async obtenerVias() {
    try {
      return await prisma.via.findMany({
        include: {
          localidad: true,
          movimiento: true,
          secciones: { include: { movimiento: true } },
          movimientosOrigen: true,
          movimientosDestino: true,
        },
      });
    } catch (error: any) {
      viaError.error('Error al obtener vías', { error });
      throw error;
    }
  }

  /** Crea una nueva vía. */
  static async crearVia(numero: number, nombre: string, localidadId: number) {
    try {
      return await prisma.via.create({ data: { numero, nombre, localidadId } });
    } catch (error: any) {
      viaError.error('Error al crear vía', { error, numero, nombre, localidadId });
      throw error;
    }
  }

  /** Edita una vía existente. */
  static async editarVia(
    id: number,
    data: { numero?: number; nombre?: string; localidadId?: number; ocupada?: boolean; movimientoId?: number | null }
  ) {
    try {
      return await prisma.via.update({ where: { id }, data });
    } catch (error: any) {
      viaError.error('Error al editar vía', { error, id, data });
      throw error;
    }
  }

  /** Elimina una vía por su ID. */
  static async eliminarVia(id: number) {
    try {
      return await prisma.via.delete({ where: { id } });
    } catch (error: any) {
      viaError.error('Error al eliminar vía', { error, id });
      throw error;
    }
  }

  /** Obtiene vías filtradas por localidad. */
  static async obtenerViasPorLocalidad(localidadId: number) {
    try {
      return await prisma.via.findMany({
        where: { localidadId },
        include: {
          localidad: true,
          movimiento: true,
          secciones: { include: { movimiento: true } },
          movimientosOrigen: true,
          movimientosDestino: true,
        },
      });
    } catch (error: any) {
      viaError.error('Error al obtener vías por localidad', { error, localidadId });
      throw error;
    }
  }
}

