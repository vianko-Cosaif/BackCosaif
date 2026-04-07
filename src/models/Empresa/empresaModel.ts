/**
 * empresaModel.ts
 *
 * Modelo de acceso a datos para la entidad Empresa.
 *
 * Este módulo encapsula la lógica de interacción con la base de datos relacionada a empresas.
 * Utiliza Prisma ORM como capa de acceso y proporciona métodos estáticos para las operaciones
 * CRUD básicas: obtener, crear, editar y eliminar empresas.
 *
 * Cada operación se encuentra envuelta en un bloque try/catch con logging de errores.
 *
 * Dependencias:
 * - Prisma Client: para interacción con la base de datos.
 * - empresaError: logger dedicado a errores del modelo Empresa.
 */

import { PrismaClient } from '@prisma/client';
import { empresaError } from './empresa.logger';

const prisma = new PrismaClient();

/**
 * Clase EmpresaModel
 *
 * Contiene métodos estáticos que representan las operaciones
 * disponibles sobre el modelo Empresa.
 */
export class EmpresaModel {
  private static readonly CACHE_TTL_MS = 60 * 1000;
  private static empresasLiteCache: { data: Array<{ id: number; nombre: string }>; exp: number } | null = null;

  private static getEmpresasLiteCache() {
    if (!this.empresasLiteCache) return null;
    if (Date.now() > this.empresasLiteCache.exp) {
      this.empresasLiteCache = null;
      return null;
    }
    return this.empresasLiteCache.data;
  }

  private static setEmpresasLiteCache(data: Array<{ id: number; nombre: string }>) {
    this.empresasLiteCache = { data, exp: Date.now() + this.CACHE_TTL_MS };
  }

  private static clearEmpresasLiteCache() {
    this.empresasLiteCache = null;
  }

  /**
   * Obtener todas las empresas registradas.
   * Incluye la relación con los usuarios asociados a cada empresa.
   *
   * @returns Lista de empresas con usuarios asociados.
   * @throws Error si ocurre un fallo durante la consulta.
   */
  static async obtenerEmpresas() {
    try {
      return await prisma.empresa.findMany({
        // include: { usuarios: true },
      });
    } catch (error) {
      empresaError.error('Error al obtener empresas', { error });
      throw new Error('Error al obtener empresas');
    }
  }

  static async obtenerEmpresasLite() {
    const cached = this.getEmpresasLiteCache();
    if (cached) return cached;

    try {
      const data = await prisma.empresa.findMany({
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' },
      });
      this.setEmpresasLiteCache(data);
      return data;
    } catch (error) {
      empresaError.error('Error al obtener empresas lite', { error });
      throw new Error('Error al obtener empresas');
    }
  }

  /**
   * Crear una nueva empresa.
   *
   * @param nombre - Nombre de la empresa a crear.
   * @returns Objeto de la empresa creada.
   * @throws Error si ocurre un fallo durante la creación.
   */
  static async crearEmpresa(nombre: string) {
    try {
      const created = await prisma.empresa.create({ data: { nombre } });
      this.clearEmpresasLiteCache();
      return created;
    } catch (error) {
      empresaError.error('Error al crear empresa', { error });
      throw new Error('Error al crear empresa');
    }
  }

  /**
   * Editar el nombre de una empresa existente.
   *
   * @param id - ID de la empresa a modificar.
   * @param nombre - Nuevo nombre de la empresa.
   * @returns Objeto de la empresa actualizada.
   * @throws Error si ocurre un fallo durante la actualización.
   */
  static async editarEmpresa(id: number, nombre: string) {
    try {
      const updated = await prisma.empresa.update({
        where: { id },
        data: { nombre },
      });
      this.clearEmpresasLiteCache();
      return updated;
    } catch (error) {
      empresaError.error('Error al editar empresa', { error });
      throw new Error('Error al editar empresa');
    }
  }

  /**
   * Eliminar una empresa por su ID.
   *
   * @param id - ID de la empresa a eliminar.
   * @returns Objeto de la empresa eliminada.
   * @throws Error si ocurre un fallo durante la eliminación.
   */
  static async eliminarEmpresa(id: number) {
    try {
      const deleted = await prisma.empresa.delete({
        where: { id },
      });
      this.clearEmpresasLiteCache();
      return deleted;
    } catch (error) {
      empresaError.error('Error al eliminar empresa', { error });
      throw new Error('Error al eliminar empresa');
    }
  }
}
