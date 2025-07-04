import { PrismaClient } from '@prisma/client';
import { viaError } from './via.logger'; // Asegúrate de tener un logger configurado

const prisma = new PrismaClient();

export class ViaModel {
  /**
   * Obtiene todas las vías.
   */
  static async obtenerVias() {
    try {
      return await prisma.via.findMany({
        include: {
          localidad: true,
          movimientosOrigen: true,
          movimientosDestino: true,
        },
      });
    } catch (error) {
      viaError.error('Error al obtener vías', { error });
      throw new Error('Error al obtener vías');
    }
  }

  /**
   * Crea una nueva vía.
   * @param numero - Número de la vía.
   * @param nombre - Nombre de la vía.
   * @param localidadId - ID de la localidad asociada.
   */
  static async crearVia(numero: number, nombre: string, localidadId: number) {
    try {
      return await prisma.via.create({
        data: { numero, nombre, localidadId },
      });
    } catch (error) {
      viaError.error('Error al crear vía', { error, numero, nombre, localidadId });
      throw new Error('Error al crear vía');
    }
  }

  /**
   * Edita una vía existente.
   * @param id - ID de la vía a editar.
   * @param data - Datos a actualizar (pueden ser numero, nombre o localidadId).
   */
  static async editarVia(id: number, data: { numero?: number; nombre?: string; localidadId?: number }) {
    try {
      return await prisma.via.update({
        where: { id },
        data,
      });
    } catch (error) {
      viaError.error('Error al editar vía', { error, id, data });
      throw new Error('Error al editar vía');
    }
  }

  /**
   * Elimina una vía por su ID.
   * @param id - ID de la vía a eliminar.
   */
  static async eliminarVia(id: number) {
    try {
      return await prisma.via.delete({
        where: { id },
      });
    } catch (error) {
      viaError.error('Error al eliminar vía', { error, id });
      throw new Error('Error al eliminar vía');
    }
  }
  
  /**
   * Busca todas las vías por el ID de la localidad.
   * @param localidadId - ID de la localidad a filtrar.
   */
  static async obtenerViasPorLocalidad(localidadId: number) {
    try {
      return await prisma.via.findMany({
        where: { localidadId },
        include: {
          localidad: true,
          movimientosOrigen: true,
          movimientosDestino: true,
        },
      });
    } catch (error) {
      viaError.error('Error al obtener vías por localidad', { error, localidadId });
      throw new Error('Error al obtener vías por localidad');
    }
  }
}
