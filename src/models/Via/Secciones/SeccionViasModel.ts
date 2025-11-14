// SeccionViasModel.ts
/**
 * ============================================================================
 *  Ítem de información: SeccionViaModel (Módulo de Dominio)
 *  Versión: 1.3.0
 *  Fecha: 2025-08-13
 *  Estado: Aprobado
 * ============================================================================
 *  Propósito: gobernar secciones y derivar via.{ocupada, movimientoId}.
 *  Concurrencia: todas las escrituras en prisma.$transaction.
 *  Errores de dominio: NotFoundError, ConflictError.
 * ============================================================================
 */

import { PrismaClient, Prisma } from '@prisma/client';
const prisma = new PrismaClient(); // TODO: inyectar singleton

/** Errores de dominio exportables */
export class NotFoundError extends Error {}
export class ConflictError extends Error {}

export type SeccionPatch = {
  numero?: number;
  nombre?: string | null;
};

export class SeccionViaModel {
  // -------------------- Consultas --------------------

  /** Todas las secciones de una vía (ordenadas) */
  static async obtenerSeccionesPorVia(viaId: number) {
    return prisma.seccionVia.findMany({
      where: { viaId },
      orderBy: { numero: 'asc' },
      include: { via: true, movimiento: true },
    });
  }

  /** Sección por clave compuesta (viaId, numero) */
  static async obtenerSeccion(viaId: number, numero: number) {
    return prisma.seccionVia.findUnique({
      where: { viaId_numero: { viaId, numero } },
    });
  }

  /** Sección por id */
  static async obtenerSeccionPorId(id: number) {
    return prisma.seccionVia.findUnique({ where: { id } });
  }

  // -------------------- CRUD --------------------

  /** Crear sección. Sincroniza vía tras crear. */
  static async crearSeccion(viaId: number, numero: number, nombre?: string | null) {
    return prisma.$transaction(async (tx) => {
      const nueva = await tx.seccionVia.create({
        data: { viaId, numero, nombre: nombre ?? null, ocupada: false, movimientoId: null },
      });
      await SeccionViaModel.syncViaFromSections(tx, viaId);
      return nueva;
    });
  }

  /**
   * Editar sección por id.
   * - Permite cambiar numero/nombre.
   * - Si cambias `numero` respeta @@unique([viaId, numero]).
   * - No toca ocupación ni movimientoId.
   */
  static async editarSeccion(id: number, patch: SeccionPatch) {
    const data: Prisma.SeccionViaUpdateInput = {};
    if (typeof patch.numero === 'number') data.numero = patch.numero;
    if (patch.nombre !== undefined) data.nombre = patch.nombre;

    // Necesitamos viaId para decidir si sincronizar o no (no debería ser necesario).
    const before = await prisma.seccionVia.findUnique({
      where: { id },
      select: { viaId: true },
    });
    if (!before) throw new NotFoundError('Sección no existe');

    const updated = await prisma.seccionVia.update({ where: { id }, data });

    // Cambiar numero/nombre no altera ocupación → no requiere sync.
    return updated;
  }

  /** Eliminar sección. Sincroniza vía tras eliminar. */
  static async eliminarSeccion(id: number) {
    return prisma.$transaction(async (tx) => {
      const row = await tx.seccionVia.findUnique({
        where: { id },
        select: { viaId: true },
      });
      if (!row) throw new NotFoundError('Sección no existe');

      await tx.seccionVia.delete({ where: { id } });
      await SeccionViaModel.syncViaFromSections(tx, row.viaId);
      return true;
    });
  }

  // -------------------- Comandos de ocupación --------------------

  /** Asignar un movimiento a una sección (idempotente si ya coincide). */
  static async asignarMovimientoASeccion(viaId: number, numeroSeccion: number, movimientoId: number) {
    return prisma.$transaction(async (tx) => {
      const seccion = await tx.seccionVia.findUnique({
        where: { viaId_numero: { viaId, numero: numeroSeccion } },
        select: { id: true, ocupada: true, movimientoId: true },
      });
      if (!seccion) throw new NotFoundError(`Sección ${numeroSeccion} no existe en vía ${viaId}`);
      if (seccion.ocupada && seccion.movimientoId !== movimientoId) {
        throw new ConflictError(`Sección ${numeroSeccion} ya ocupada por otro movimiento`);
      }

      const upd = await tx.seccionVia.updateMany({
        where: { id: seccion.id, OR: [{ ocupada: false }, { movimientoId }] },
        data: { ocupada: true, movimientoId },
      });
      if (upd.count !== 1) throw new ConflictError('La sección cambió de estado; reintenta.');

      await SeccionViaModel.syncViaFromSections(tx, viaId);

      return tx.seccionVia.findUnique({
        where: { viaId_numero: { viaId, numero: numeroSeccion } },
        include: { via: true, movimiento: true },
      });
    });
  }

  /** Liberar una sección ocupada por un movimiento. */
  static async liberarSeccion(viaId: number, numeroSeccion: number, movimientoId: number) {
    return prisma.$transaction(async (tx) => {
      const res = await tx.seccionVia.updateMany({
        where: { viaId, numero: numeroSeccion, ocupada: true, movimientoId },
        data: { ocupada: false, movimientoId: null },
      });
      if (res.count !== 1) {
        throw new NotFoundError(
          `La sección ${numeroSeccion} de la vía ${viaId} no estaba ocupada por el movimiento ${movimientoId}.`
        );
      }

      await SeccionViaModel.syncViaFromSections(tx, viaId);

      return tx.seccionVia.findUnique({
        where: { viaId_numero: { viaId, numero: numeroSeccion } },
        include: { via: true },
      });
    });
  }

  /** Liberar todas las secciones de una vía ocupadas por un movimiento. */
  static async liberarMovimientoDeSeccion(viaId: number, movimientoId: number) {
    return prisma.$transaction(async (tx) => {
      await tx.seccionVia.updateMany({
        where: { viaId, ocupada: true, movimientoId },
        data: { ocupada: false, movimientoId: null },
      });
      await SeccionViaModel.syncViaFromSections(tx, viaId);
      return tx.via.findUnique({ where: { id: viaId }, include: { secciones: true } });
    });
  }

  // -------------------- Sincronización de Vía --------------------

  /**
   * Sincroniza la vía desde sus secciones.
   * - 0 secciones  → no modifica la vía (vía simple).
   * - 1 sección    → vía “espejo” de esa sección.
   * - 2+ secciones → ver política en el encabezado.
   */
  private static async syncViaFromSections(tx: Prisma.TransactionClient, viaId: number) {
    const [totalSecciones, ocupadas, movsDistinct] = await Promise.all([
      tx.seccionVia.count({ where: { viaId } }),
      tx.seccionVia.count({ where: { viaId, ocupada: true } }),
      tx.seccionVia.findMany({
        where: { viaId, ocupada: true, movimientoId: { not: null } },
        select: { movimientoId: true },
        distinct: ['movimientoId'],
      }),
    ]);

    if (totalSecciones === 0) return;

    if (totalSecciones === 1) {
      if (ocupadas === 0) {
        await tx.via.update({ where: { id: viaId }, data: { ocupada: false, movimientoId: null } });
      } else {
        await tx.via.update({
          where: { id: viaId },
          data: { ocupada: true, movimientoId: movsDistinct[0]?.movimientoId ?? null },
        });
      }
      return;
    }

    if (ocupadas === 0) {
      await tx.via.update({ where: { id: viaId }, data: { ocupada: false, movimientoId: null } });
      return;
    }

    if (movsDistinct.length === 1) {
      await tx.via.update({
        where: { id: viaId },
        data: { ocupada: true, movimientoId: movsDistinct[0].movimientoId },
      });
    } else {
      await tx.via.update({
        where: { id: viaId },
        data: { ocupada: true, movimientoId: null },
      });
    }
  }
}
