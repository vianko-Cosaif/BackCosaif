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
export class LocalidadModel {
  private static readonly CACHE_TTL_MS = 60 * 1000;
  private static localidadesLiteCache: { data: Array<{ id: number; nombre: string; estado: string }>; exp: number } | null = null;

  private static getLocalidadesLiteCache() {
    if (!this.localidadesLiteCache) return null;
    if (Date.now() > this.localidadesLiteCache.exp) {
      this.localidadesLiteCache = null;
      return null;
    }
    return this.localidadesLiteCache.data;
  }

  private static setLocalidadesLiteCache(data: Array<{ id: number; nombre: string; estado: string }>) {
    this.localidadesLiteCache = { data, exp: Date.now() + this.CACHE_TTL_MS };
  }

  private static clearLocalidadesLiteCache() {
    this.localidadesLiteCache = null;
  }

  static async obtenerLocalidades() {
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
  }

  static async obtenerLocalidadesLite() {
    const cached = this.getLocalidadesLiteCache();
    if (cached) return cached;

    try {
      const data = await prisma.localidad.findMany({
        select: { id: true, nombre: true, estado: true },
        orderBy: { nombre: 'asc' },
      });
      this.setLocalidadesLiteCache(data);
      return data;
    } catch (error) {
      localidadLogger.error('Error al obtener localidades lite', { error });
      throw new Error('No se pudieron obtener las localidades');
    }
  }

/**
 * Crea una nueva localidad.
 *
 * @param nombre - Nombre de la localidad.
 * @param estado - Estado de la localidad.
 * @returns La localidad recién creada.
 */
  static async crearLocalidad(nombre: string, estado: string) {
    try {
      const created = await prisma.localidad.create({
        data: { nombre, estado },
      });
      this.clearLocalidadesLiteCache();
      return created;
    } catch (error) {
      localidadLogger.error(`Error al crear localidad ${nombre}`, { error });
      throw new Error('Error al crear la localidad');
    }
  }

/**
 * Busca una localidad por su ID.
 *
 * @param id - ID de la localidad.
 * @returns La localidad encontrada o null si no existe.
 */
  static async buscarLocalidadPorId(id: number) {
    try {
      return await prisma.localidad.findUnique({
        where: { id },
      });
    } catch (error) {
      localidadLogger.error(`Error al buscar localidad con ID ${id}`, { error });
      throw new Error('Error al buscar la localidad');
    }
  }

/**
 * (Opcional) Busca una localidad por nombre.
 *
 * @param nombre - Nombre de la localidad.
 * @returns La localidad encontrada o null.
 */
  static async buscarLocalidadPorNombre(nombre: string) {
    try {
      return await prisma.localidad.findFirst({
        where: { nombre },
      });
    } catch (error) {
      localidadLogger.error(`Error al buscar localidad con nombre ${nombre}`, { error });
      throw new Error('Error al buscar localidad por nombre');
    }
  }
}
