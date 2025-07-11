// actualizacion.service.ts
//
// Servicio de acceso a datos para la entidad Actualizacion.
//
// Operaciones disponibles:
//  - obtenerActualizaciones(): obtener todas las actualizaciones.
//  - obtenerUltimaActualizacion(): obtener la actualización más reciente.
//  - actualizarActualizacion(): modificar una actualización existente (sin eliminar).

import { PrismaClient, Actualizacion, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Obtiene todas las actualizaciones almacenadas en la base de datos.
 *
 * @returns Array de Actualizacion.
 * @throws Error si falla la consulta.
 */
export const obtenerActualizaciones = async (): Promise<Actualizacion[]> => {
  try {
    return await prisma.actualizacion.findMany({
      orderBy: { fechalanzamiento: 'desc' },
    });
  } catch (error) {
    throw new Error('No se pudieron obtener las actualizaciones');
  }
};

/**
 * Obtiene la última actualización basada en la fecha de lanzamiento más reciente.
 *
 * @returns La Actualizacion más reciente, o null si no hay ninguna.
 * @throws Error si falla la consulta.
 */
export const obtenerUltimaActualizacion = async (): Promise<Actualizacion | null> => {
  try {
    return await prisma.actualizacion.findFirst({
      orderBy: { fechalanzamiento: 'desc' },
    });
  } catch (error) {
    throw new Error('No se pudo obtener la última actualización');
  }
};

/**
 * Actualiza una actualización existente.
 *
 * @param id      - ID de la actualización a modificar.
 * @param cambios - Objeto con los campos a actualizar:
 *                  nombre?, fechaLanzamiento?, estado?
 * @returns La Actualizacion actualizada.
 * @throws Error si falla la operación.
 */
export const actualizarActualizacion = async (
  id: number,
  cambios: {
    nombre?: string;
    fechaLanzamiento?: Date;
    estado?: Prisma.EstadoActualizacion;
  }
): Promise<Actualizacion> => {
  try {
    return await prisma.actualizacion.update({
      where: { id },
      data: cambios,
    });
  } catch (error) {
    throw new Error(`Error al actualizar la Actualizacion con ID ${id}`);
  }
};
