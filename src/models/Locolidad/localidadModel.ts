/**
 * localidad.service.ts
 *
 * Servicio de acceso a datos para la entidad Localidad.
 * 
 * Funcionalidades:
 * - Obtener todas las localidades con sus relaciones.
 * - Crear una nueva localidad.
 * - Buscar localidad por ID.
 * - Buscar localidad por nombre (opcional).
 * 
 * Dependencias:
 * - PrismaClient para acceso a la base de datos.
 * - localidadLogger para manejo de errores.
 */

import { PrismaClient } from '@prisma/client';
import { localidadLogger } from './localidad.logger';

const prisma = new PrismaClient();

/**
 * Obtiene todas las localidades.
 *
 * @returns Lista de localidades con nombre, estado, y relaciones opcionales.
 */
export const obtenerLocalidades = async () => {
  try {
    return await prisma.localidad.findMany({
      include: {
        vias: true,
        usuarios: true,
        movimientos: true,
      },
    });
  } catch (error) {
    localidadLogger.error('Error al obtener localidades', { error });
    throw new Error('No se pudieron obtener las localidades');
  }
};

/**
 * Crea una nueva localidad.
 *
 * @param nombre - Nombre de la localidad.
 * @param estado - Estado de la localidad.
 * @returns La localidad recién creada.
 */
export const crearLocalidad = async (nombre: string, estado: string) => {
  try {
    return await prisma.localidad.create({
      data: { nombre, estado },
    });
  } catch (error) {
    localidadLogger.error(`Error al crear localidad ${nombre}`, { error });
    throw new Error('Error al crear la localidad');
  }
};

/**
 * Busca una localidad por su ID.
 *
 * @param id - ID de la localidad.
 * @returns La localidad encontrada o null si no existe.
 */
export const buscarLocalidadPorId = async (id: number) => {
  try {
    return await prisma.localidad.findUnique({
      where: { id },
    });
  } catch (error) {
    localidadLogger.error(`Error al buscar localidad con ID ${id}`, { error });
    throw new Error('Error al buscar la localidad');
  }
};

/**
 * (Opcional) Busca una localidad por nombre.
 *
 * @param nombre - Nombre de la localidad.
 * @returns La localidad encontrada o null.
 */
export const buscarLocalidadPorNombre = async (nombre: string) => {
  try {
    return await prisma.localidad.findFirst({
      where: { nombre },
    });
  } catch (error) {
    localidadLogger.error(`Error al buscar localidad con nombre ${nombre}`, { error });
    throw new Error('Error al buscar localidad por nombre');
  }
};
