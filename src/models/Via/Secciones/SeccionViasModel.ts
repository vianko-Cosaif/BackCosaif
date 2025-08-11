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
 *  - Todas las escrituras se realizan en una transacción: se usa la `tx`
 *    recibida o, en su defecto, se abre `prisma.$transaction`.
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
   * - Si no envías "numero", asigna el siguiente consecutivo dentro de la vía.
   * - "nombre" es opcional; por defecto "Sección <numero>".
   * - Resincroniza el estado de la vía tras crear.
   */
  static async crearSeccion(
    viaId: number,
    nombre?: string,
    numero?: number,
    tx?: Prisma.TransactionClient
  ) {
    const run = async (trx: Prisma.TransactionClient) => {
      // Validar que la vía exista
      const via = await trx.via.findUnique({ where: { id: viaId }, select: { id: true } });
      if (!via) throw new NotFoundError(`La vía ${viaId} no existe`);

      // Calcular número si no viene
      let num = Number.isInteger(numero) ? (numero as number) : undefined;
      if (num === undefined) {
        const last = await trx.seccionVia.aggregate({
          where: { viaId },
          _max: { numero: true },
        });
        num = (last._max.numero ?? 0) + 1;
      }

      // Normalizar nombre (opcional)
      const nombreFinal = (nombre && nombre.trim()) || `Sección ${num}`;

      // Crear
      const creada = await trx.seccionVia.create({
        data: {
          viaId,
          numero: num,
          nombre: nombreFinal,
          // ocupada: false por default (según schema)
        },
      });

      // Sincronizar estado de la vía con sus secciones
      await SeccionViaModel.syncViaFromSections(trx, viaId);

      return creada;
    };

    return tx ? run(tx) : prisma.$transaction(run);
  }

  /**
   * Actualiza una sección por ID (nombre y/o número).
   * - Verifica colisión de número dentro de la misma vía.
   * - Sincroniza la vía por consistencia general.
   */
  static async actualizarSeccion(
    id: number,
    data: { nombre?: string | null; numero?: number },
    tx?: Prisma.TransactionClient
  ) {
    const run = async (trx: Prisma.TransactionClient) => {
      const actual = await trx.seccionVia.findUnique({
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
          const dup = await trx.seccionVia.findUnique({
            where: { viaId_numero: { viaId: actual.viaId, numero: nuevoNum } },
            select: { id: true },
          });
          if (dup) {
            throw new ConflictError(`Ya existe la sección ${nuevoNum} en la vía ${actual.viaId}`);
          }
          payload.numero = nuevoNum;
        }
      }

      if (Object.keys(payload).length === 0) return actual; // nada que cambiar

      const updated = await trx.seccionVia.update({ where: { id }, data: payload });
      await SeccionViaModel.syncViaFromSections(trx, actual.viaId);
      return updated;
    };

    return tx ? run(tx) : prisma.$transaction(run);
  }

  /** Elimina una sección por ID y resincroniza la vía. */
  static async eliminarSeccion(id: number, tx?: Prisma.TransactionClient) {
    const run = async (trx: Prisma.TransactionClient) => {
      const sec = await trx.seccionVia.findUnique({
        where: { id },
        select: { id: true, viaId: true },
      });
      if (!sec) throw new NotFoundError(`Sección ${id} no existe`);

      await trx.seccionVia.delete({ where: { id } });
      await SeccionViaModel.syncViaFromSections(trx, sec.viaId);
      return { ok: true };
    };

    return tx ? run(tx) : prisma.$transaction(run);
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
    movimientoId: number,
    tx?: Prisma.TransactionClient
  ) {
    const run = async (trx: Prisma.TransactionClient) => {
      const seccion = await trx.seccionVia.findUnique({
        where: { viaId_numero: { viaId, numero: numeroSeccion } },
        select: { id: true, ocupada: true, movimientoId: true },
      });
      if (!seccion) {
        throw new NotFoundError(`Sección ${numeroSeccion} no existe en vía ${viaId}`);
      }
      if (seccion.ocupada && seccion.movimientoId !== movimientoId) {
        throw new ConflictError(`Sección ${numeroSeccion} ya ocupada por otro movimiento`);
      }

      const upd = await trx.seccionVia.updateMany({
        where: { id: seccion.id, OR: [{ ocupada: false }, { movimientoId }] },
        data: { ocupada: true, movimientoId },
      });
      if (upd.count !== 1) {
        throw new ConflictError('La sección cambió de estado; reintenta.');
      }

      await SeccionViaModel.syncViaFromSections(trx, viaId);

      return trx.seccionVia.findUnique({
        where: { viaId_numero: { viaId, numero: numeroSeccion } },
        include: { via: true, movimiento: true },
      });
    };

    return tx ? run(tx) : prisma.$transaction(run);
  }

  /** Libera una sección ocupada por un movimiento y sincroniza la vía. */
  static async liberarSeccion(
    viaId: number,
    numeroSeccion: number,
    movimientoId: number,
    tx?: Prisma.TransactionClient
  ) {
    const run = async (trx: Prisma.TransactionClient) => {
      const res = await trx.seccionVia.updateMany({
        where: { viaId, numero: numeroSeccion, ocupada: true, movimientoId },
        data: { ocupada: false, movimientoId: null },
      });
      if (res.count !== 1) {
        throw new NotFoundError(
          `La sección ${numeroSeccion} de la vía ${viaId} no estaba ocupada por el movimiento ${movimientoId}.`
        );
      }

      await SeccionViaModel.syncViaFromSections(trx, viaId);

      return trx.seccionVia.findUnique({
        where: { viaId_numero: { viaId, numero: numeroSeccion } },
        include: { via: true },
      });
    };

    return tx ? run(tx) : prisma.$transaction(run);
  }

  /**
   * Libera TODAS las secciones de una vía ocupadas por un movimiento.
   * - Útil para “desocupar” rápido cuando termina un movimiento.
   */
  static async liberarMovimientoDeSeccion(viaId: number, movimientoId: number, tx?: Prisma.TransactionClient) {
    const run = async (trx: Prisma.TransactionClient) => {
      await trx.seccionVia.updateMany({
        where: { viaId, ocupada: true, movimientoId },
        data: { ocupada: false, movimientoId: null },
      });

      await SeccionViaModel.syncViaFromSections(trx, viaId);

      return trx.via.findUnique({ where: { id: viaId }, include: { secciones: true } });
    };

    return tx ? run(tx) : prisma.$transaction(run);
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
