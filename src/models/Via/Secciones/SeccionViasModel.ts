// SeccionViaModel.ts
/**
 * ============================================================================
 *  Ítem de información: SeccionViaModel (Módulo de Dominio)
 *  Versión: 1.1.0
 *  Fecha: 2025-08-08
 *  Estado: Aprobado
 * ============================================================================
 *
 *  # Propósito
 *  (ISO/IEC/IEEE 15289 §5, ISO/IEC 12207 - Desarrollo)
 *  Controlar la ocupación de secciones de una vía y mantener la consistencia
 *  de `via.{ocupada, movimientoId}` derivándola SIEMPRE del estado real de
 *  sus secciones.
 *
 *  # Política de negocio
 *  - La **sección** es la fuente de verdad.
 *  - Derivación de `via`:
 *      - **0 secciones** → este módulo NO toca la vía (la maneja ViaModel).
 *      - **1 sección**  → `via` refleja exactamente esa sección.
 *      - **2+ secciones**:
 *          - 0 ocupadas → `via.ocupada=false`, `via.movimientoId=null`
 *          - Ocupadas de **un solo** movimiento → `via.ocupada=true`, `via.movimientoId=<id>`
 *          - Ocupadas por **>1** movimientos → `via.ocupada=true`, `via.movimientoId=null`
 *
 *  # Alcance (ISO/IEC 26514)
 *  - Consultas por vía/sección.
 *  - Asignar y liberar secciones.
 *  - Sincronizar vía tras cambios en secciones (misma transacción).
 *
 *  # Concurrencia
 *  - Todas las escrituras se realizan en `prisma.$transaction`.
 *  - Se emplea `updateMany(...).count` como check optimista.
 *
 *  # Errores
 *  - NotFoundError → entidad no existe / precondición no cumplida.
 *  - ConflictError → estado cambió por concurrencia.
 *
 *  # Historial
 *  - 1.1.0: Se elimina validación bloqueante en vía (permite concurrencia por secciones)
 *           y se añade `syncViaFromSections`.
 *  - 1.0.0: Versión inicial.
 * ============================================================================
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient(); // TODO: centralizar/injectar singleton

/** Errores de dominio (exportables si quieres capturarlos por tipo) */
export class NotFoundError extends Error {}
export class ConflictError extends Error {}

export class SeccionViaModel {
  /**
   * Obtiene todas las secciones de una vía (ordenadas).
   */
  static async obtenerSeccionesPorVia(viaId: number) {
    return prisma.seccionVia.findMany({
      where: { viaId },
      orderBy: { numero: 'asc' },
      include: { via: true, movimiento: true },
    });
  }

  /**
   * Obtiene una sección por clave compuesta (viaId, numero).
   */
  static async obtenerSeccion(viaId: number, numero: number) {
    return prisma.seccionVia.findUnique({
      where: { viaId_numero: { viaId, numero } },
    });
  }

  /**
   * Asigna un movimiento a una sección.
   * - Idempotente si ya está ocupada por el mismo movimiento.
   * - Sincroniza la vía en la misma transacción.
   */
  static async asignarMovimientoASeccion(
    viaId: number,
    numeroSeccion: number,
    movimientoId: number
  ) {
    return prisma.$transaction(async (tx) => {
      // 1) Obtener sección (clave compuesta)
      const seccion = await tx.seccionVia.findUnique({
        where: { viaId_numero: { viaId, numero: numeroSeccion } },
        select: { id: true, ocupada: true, movimientoId: true },
      });
      if (!seccion) {
        throw new NotFoundError(`Sección ${numeroSeccion} no existe en vía ${viaId}`);
      }
      if (seccion.ocupada && seccion.movimientoId !== movimientoId) {
        throw new ConflictError(`Sección ${numeroSeccion} ya ocupada por otro movimiento`);
      }

      // 2) Ocupación con verificación optimista (permite idempotencia)
      const upd = await tx.seccionVia.updateMany({
        where: { id: seccion.id, OR: [{ ocupada: false }, { movimientoId }] },
        data: { ocupada: true, movimientoId },
      });
      if (upd.count !== 1) {
        throw new ConflictError('La sección cambió de estado; reintenta.');
      }

      // 3) Derivar estado de la vía desde las secciones
      await SeccionViaModel.syncViaFromSections(tx, viaId);

      // 4) Retornar estado actualizado
      return tx.seccionVia.findUnique({
        where: { viaId_numero: { viaId, numero: numeroSeccion } },
        include: { via: true, movimiento: true },
      });
    });
  }

  /**
   * Libera una sección ocupada por un movimiento.
   * - Sincroniza la vía en la misma transacción.
   */
  static async liberarSeccion(
    viaId: number,
    numeroSeccion: number,
    movimientoId: number
  ) {
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

  /**
   * Libera TODAS las secciones de una vía ocupadas por un movimiento.
   * - Útil para “desocupar” rápido cuando termina un movimiento.
   */
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

  /**
   * Sincroniza la vía desde sus secciones.
   * - 0 secciones  → no modifica la vía (vía simple).
   * - 1 sección    → vía “espejo” de esa sección.
   * - 2+ secciones → ver política en el encabezado.
   */
  private static async syncViaFromSections(
    tx: Prisma.TransactionClient,
    viaId: number
  ) {
    const [totalSecciones, ocupadas, movsDistinct] = await Promise.all([
      tx.seccionVia.count({ where: { viaId } }),
      tx.seccionVia.count({ where: { viaId, ocupada: true } }),
      tx.seccionVia.findMany({
        where: { viaId, ocupada: true, movimientoId: { not: null } },
        select: { movimientoId: true },
        distinct: ['movimientoId'],
      }),
    ]);

    // 0 secciones → la gobierna ViaModel (no tocar)
    if (totalSecciones === 0) return;

    // 1 sección → vía espejo de la sección
    if (totalSecciones === 1) {
      if (ocupadas === 0) {
        await tx.via.update({
          where: { id: viaId },
          data: { ocupada: false, movimientoId: null },
        });
      } else {
        await tx.via.update({
          where: { id: viaId },
          data: { ocupada: true, movimientoId: movsDistinct[0]?.movimientoId ?? null },
        });
      }
      return;
    }

    // 2+ secciones → derivación por cardinalidad de movimientos
    if (ocupadas === 0) {
      await tx.via.update({
        where: { id: viaId },
        data: { ocupada: false, movimientoId: null },
      });
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
