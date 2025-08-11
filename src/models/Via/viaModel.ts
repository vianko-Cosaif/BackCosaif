// ViaModel.ts
/**
 * ============================================================================
 *  Ítem de información: ViaModel (Módulo de Dominio)
 *  Versión: 1.1.0
 *  Fecha: 2025-08-08
 *  Estado: Aprobado
 * ============================================================================
 *
 *  # Propósito
 *  Coordinar ocupación/liberación de vías y delegar a SeccionViaModel cuando
 *  existan secciones, manteniendo la política “la sección rige a la vía”.
 *
 *  # Política
 *  - Si la vía tiene **≥1 secciones**: NUNCA escribir directamente `via.ocupada`
 *    ni `via.movimientoId`; delegar a SeccionViaModel (que sincroniza la vía).
 *  - Si la vía tiene **0 secciones**: la vía es “simple”, se escribe directo.
 *
 *  # Notas
 *  - En asignación, si hay secciones y no se pasa `numeroSeccion`, toma la
 *    **primera sección libre**; si no hay libres → ConflictError.
 *  - `editarVia` filtra cambios a `ocupada/movimientoId` si hay secciones.
 * ============================================================================
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { viaError } from './via.logger';
import { SeccionViaModel, NotFoundError, ConflictError } from './Secciones/SeccionViasModel';

const prisma = new PrismaClient(); // TODO: inyectar singleton

export class ViaModel {
  // -------------------- Helpers --------------------

  private static async contarSecciones(viaId: number, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    return db.seccionVia.count({ where: { viaId } });
  }

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

  // -------------------- Ocupación / Liberación --------------------

  /**
   * Asignar movimiento:
   * - 0 secciones -> ocupa la vía completa.
   * - ≥1 secciones -> delega a SeccionViaModel (elige sección si no se pasa).
   *
   * Nota: acepta `tx` opcional para operar dentro de una transacción existente.
   */
  static async asignarMovimientoASeccion(
    viaId: number,
    numeroSeccion: number | null,
    movimientoId: number,
    tx?: Prisma.TransactionClient
  ) {
    const run = async (trx: Prisma.TransactionClient) => {
      const via = await trx.via.findUnique({ where: { id: viaId }, select: { id: true } });
      if (!via) throw new NotFoundError(`Vía ${viaId} no existe`);

      const seccionesCount = await this.contarSecciones(viaId, trx);

      // Vía simple (0 secciones): escribir directo en Via
      if (seccionesCount === 0) {
        const actual = await trx.via.findUnique({
          where: { id: viaId },
          select: { ocupada: true, movimientoId: true },
        });

        if (actual?.movimientoId && actual.movimientoId !== movimientoId) {
          throw new ConflictError(`Vía ${viaId} ya está asignada a otro movimiento.`);
        }

        const updated = await trx.via.updateMany({
          where: { id: viaId, OR: [{ movimientoId: null }, { movimientoId }] },
          data: { ocupada: true, movimientoId },
        });
        if (updated.count !== 1) throw new ConflictError('La vía cambió de estado; reintenta.');

        return trx.via.findUnique({ where: { id: viaId }, include: { movimiento: true } });
      }

      // Vía con secciones (≥1): delegar a SeccionViaModel
      let targetSeccion = numeroSeccion ?? null;
      if (targetSeccion == null) {
        targetSeccion = await this.primeraSeccionLibre(viaId, trx);
        if (targetSeccion == null) {
          throw new ConflictError(`La vía ${viaId} no tiene secciones libres.`);
        }
      }

      return SeccionViaModel.asignarMovimientoASeccion(viaId, targetSeccion, movimientoId, trx);
    };

    try {
      return tx ? run(tx) : prisma.$transaction(run);
    } catch (error: any) {
      viaError.error('Error en asignarMovimientoASeccion', { error, viaId, numeroSeccion, movimientoId });
      throw error;
    }
  }

  /**
   * Liberar movimiento:
   * - 0 secciones -> libera la vía completa si pertenece al movimiento.
   * - ≥1 secciones -> delega a SeccionViaModel.liberarMovimientoDeSeccion (libera todas las secciones del movimiento).
   *
   * Nota: acepta `tx` opcional para operar dentro de una transacción existente.
   */
  static async liberarMovimientoDeSeccion(viaId: number, movimientoId: number, tx?: Prisma.TransactionClient) {
    const run = async (trx: Prisma.TransactionClient) => {
      const viaExiste = await trx.via.findUnique({ where: { id: viaId }, select: { id: true } });
      if (!viaExiste) throw new NotFoundError(`Vía ${viaId} no existe`);

      const seccionesCount = await this.contarSecciones(viaId, trx);

      if (seccionesCount === 0) {
        const updated = await trx.via.updateMany({
          where: { id: viaId, movimientoId },
          data: { ocupada: false, movimientoId: null },
        });
        if (updated.count !== 1) {
          throw new NotFoundError('La vía no estaba ocupada por ese movimiento.');
        }
        return trx.via.findUnique({ where: { id: viaId } });
      }

      // Con secciones: delega (la vía se sincroniza dentro de ese flujo)
      return SeccionViaModel.liberarMovimientoDeSeccion(viaId, movimientoId, trx);
    };

    try {
      return tx ? run(tx) : prisma.$transaction(run);
    } catch (error: any) {
      viaError.error('Error en liberarMovimientoDeSeccion', { error, viaId, movimientoId });
      throw error;
    }
  }

  // -------------------- CRUD y consultas --------------------

  /** Listado de vías (con secciones ordenadas y relaciones útiles). */
  static async obtenerVias() {
    try {
      return await prisma.via.findMany({
        orderBy: [{ localidadId: 'asc' }, { numero: 'asc' }],
        include: {
          localidad: true,
          movimiento: true,
          secciones: { orderBy: { numero: 'asc' }, include: { movimiento: true } },
          movimientosOrigen: true,
          movimientosDestino: true,
        },
      });
    } catch (error: any) {
      viaError.error('Error al obtener vías', { error });
      throw error;
    }
  }

  static async crearVia(numero: number, nombre: string, localidadId: number) {
    try {
      return await prisma.via.create({ data: { numero, nombre, localidadId } });
    } catch (error: any) {
      viaError.error('Error al crear vía', { error, numero, nombre, localidadId });
      throw error;
    }
  }

  /**
   * Edita una vía.
   * Si la vía tiene secciones, **ignora** cambios a `ocupada` y `movimientoId`
   * para no romper la coherencia (la sección rige el estado).
   */
  static async editarVia(
    id: number,
    data: {
      numero?: number;
      nombre?: string;
      localidadId?: number;
      ocupada?: boolean;
      movimientoId?: number | null;
    }
  ) {
    try {
      const seccionesCount = await this.contarSecciones(id);

      const payload: typeof data = { ...data };
      if (seccionesCount > 0) {
        // No permitir que se editen estos campos cuando hay secciones
        if ('ocupada' in payload) delete payload.ocupada;
        if ('movimientoId' in payload) delete payload.movimientoId;
      }

      return await prisma.via.update({ where: { id }, data: payload });
    } catch (error: any) {
      viaError.error('Error al editar vía', { error, id, data });
      throw error;
    }
  }

  static async eliminarVia(id: number) {
    try {
      return await prisma.via.delete({ where: { id } });
    } catch (error: any) {
      viaError.error('Error al eliminar vía', { error, id });
      throw error;
    }
  }

  static async obtenerViasPorLocalidad(localidadId: number) {
    try {
      return await prisma.via.findMany({
        where: { localidadId },
        orderBy: { numero: 'asc' },
        include: {
          localidad: true,
          movimiento: true,
          secciones: { orderBy: { numero: 'asc' }, include: { movimiento: true } },
          movimientosOrigen: true,
          movimientosDestino: true,
        },
      });
    } catch (error: any) {
      viaError.error('Error al obtener vías por localidad', { error, localidadId });
      throw error;
    }
  }

  static async obtenerViaPorId(id: number) {
    try {
      return await prisma.via.findUnique({
        where: { id },
        include: {
          localidad: true,
          movimiento: true,
          secciones: { orderBy: { numero: 'asc' }, include: { movimiento: true } },
          movimientosOrigen: true,
          movimientosDestino: true,
        },
      });
    } catch (error: any) {
      viaError.error('Error al obtener vía por id', { error, id });
      throw error;
    }
  }
}
