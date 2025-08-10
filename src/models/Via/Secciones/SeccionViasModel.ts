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
 *  # Concurrencia
 *  - Todas las escrituras se realizan en `prisma.$transaction`.
 *  - Se emplea `updateMany(...).count` como check optimista.
 * ============================================================================
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient(); // TODO: centralizar/injectar singleton

/** Errores de dominio (exportables si quieres capturarlos por tipo) */
export class NotFoundError extends Error {}
export class ConflictError extends Error {}

export class SeccionViaModel {
  // -------------------- Lecturas --------------------

  /** Lista todas las secciones de una vía (ordenadas). */
  static async obtenerSeccionesPorVia(viaId: number) {
    return prisma.seccionVia.findMany({
      where: { viaId },
      orderBy: { numero: 'asc' },
      include: { via: true, movimiento: true },
    });
  }

  /** Obtiene una sección por clave compuesta (viaId, numero). */
  static async obtenerSeccion(viaId: number, numero: number) {
    return prisma.seccionVia.findUnique({
      where: { viaId_numero: { viaId, numero } },
    });
  }

  /** Obtiene una sección por ID. */
  static async obtenerSeccionPorId(id: number) {
    return prisma.seccionVia.findUnique({ where: { id } });
  }

  // -------------------- CRUD --------------------

  /**
   * Crea una sección en una vía.
   * - Si `numero` no se pasa, usa max(numero)+1 en esa vía.
   * - Si `nombre` no se pasa, usa "Sección {numero}".
   * - Sincroniza la vía tras crear.
   */
  static async crearSeccion(viaId: number, nombre?: string, numero?: number) {
    return prisma.$transaction(async (tx) => {
      const via = await tx.via.findUnique({ where: { id: viaId }, select: { id: true } });
      if (!via) throw new NotFoundError(`Vía ${viaId} no existe`);

      let num: number;
      if (Number.isInteger(Number(numero))) {
        num = Number(numero);
        const dup = await tx.seccionVia.findUnique({
          where: { viaId_numero: { viaId, numero: num } },
          select: { id: true },
        });
        if (dup) throw new ConflictError(`Ya existe la sección ${num} en la vía ${viaId}`);
      } else {
        const max = await tx.seccionVia.findFirst({
          where: { viaId },
          orderBy: { numero: 'desc' },
          select: { numero: true },
        });
        num = (max?.numero ?? 0) + 1;
      }

      const nombreFinal =
        typeof nombre === 'string' && nombre.trim() !== '' ? nombre.trim() : `Sección ${num}`;

      const creada = await tx.seccionVia.create({
        data: { viaId, numero: num, nombre: nombreFinal, ocupada: false, movimientoId: null },
        include: { via: true, movimiento: true },
      });

      await SeccionViaModel.syncViaFromSections(tx, viaId);
      return creada;
    });
  }

  /**
   * Actualiza una sección por ID (nombre y/o número).
   * - Verifica colisión de número dentro de la misma vía.
   * - Sincroniza la vía por consistencia general.
   */
  static async actualizarSeccion(
    id: number,
    data: { nombre?: string | null; numero?: number }
  ) {
    return prisma.$transaction(async (tx) => {
      const actual = await tx.seccionVia.findUnique({
        where: { id },
        select: { id: true, viaId: true, numero: true },
      });
      if (!actual) throw new NotFoundError(`Sección ${id} no existe`);

      const payload: Prisma.SeccionViaUpdateInput = {};
      if (typeof data.nombre !== 'undefined') {
        payload.nombre = data.nombre && data.nombre.trim() !== '' ? data.nombre.trim() : null;
      }
      if (Number.isInteger(Number(data.numero))) {
        const nuevoNum = Number(data.numero);
        if (nuevoNum !== actual.numero) {
          const dup = await tx.seccionVia.findUnique({
            where: { viaId_numero: { viaId: actual.viaId, numero: nuevoNum } },
            select: { id: true },
          });
          if (dup) {
            throw new ConflictError(
              `Ya existe la sección ${nuevoNum} en la vía ${actual.viaId}`
            );
          }
          payload.numero = nuevoNum;
        }
      }

      if (Object.keys(payload).length === 0) return actual; // nada que cambiar

      const updated = await tx.seccionVia.update({ where: { id }, data: payload });
      await SeccionViaModel.syncViaFromSections(tx, actual.viaId);
      return updated;
    });
  }

  /** Elimina una sección por ID y resincroniza la vía. */
  static async eliminarSeccion(id: number) {
    return prisma.$transaction(async (tx) => {
      const sec = await tx.seccionVia.findUnique({
        where: { id },
        select: { id: true, viaId: true },
      });
      if (!sec) throw new NotFoundError(`Sección ${id} no existe`);

      await tx.seccionVia.delete({ where: { id } });
      await SeccionViaModel.syncViaFromSections(tx, sec.viaId);
      return { ok: true };
    });
  }

  // -------------------- Ocupación --------------------

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

      const upd = await tx.seccionVia.updateMany({
        where: { id: seccion.id, OR: [{ ocupada: false }, { movimientoId }] },
        data: { ocupada: true, movimientoId },
      });
      if (upd.count !== 1) {
        throw new ConflictError('La sección cambió de estado; reintenta.');
      }

      await SeccionViaModel.syncViaFromSections(tx, viaId);

      return tx.seccionVia.findUnique({
        where: { viaId_numero: { viaId, numero: numeroSeccion } },
        include: { via: true, movimiento: true },
      });
    });
  }

  /** Libera una sección ocupada por un movimiento y sincroniza la vía. */
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

  // -------------------- Derivación de estado de Vía --------------------

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
