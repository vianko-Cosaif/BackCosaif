// src/models/Via/viaModel.ts
import { PrismaClient, Prisma } from '@prisma/client';
import { viaError } from './via.logger';
import { SeccionViaModel, NotFoundError, ConflictError } from './Secciones/SeccionViasModel';

const prisma = new PrismaClient();

// Error especializado para adjuntar info del bloqueador
export class ViaOcupadaPorOtroError extends ConflictError {
  bloqueadorId: number;
  locomotiveNumber?: String | null;
  constructor(message: string, info: { bloqueadorId: number; locomotiveNumber?: String | null }) {
    super(message);
    this.bloqueadorId = info.bloqueadorId;
    this.locomotiveNumber = info.locomotiveNumber ?? null;
  }
}

export class ViaModel {
  // -------------------- Helpers --------------------
  private static async contarSecciones(viaId: number, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    return db.seccionVia.count({ where: { viaId } });
  }

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
  static async asignarMovimientoASeccion(
    viaId: number,
    numeroSeccion: number | null,
    movimientoId: number,
    tx?: Prisma.TransactionClient
  ) {
    try {
      const db = tx ?? prisma;

      const via = await db.via.findUnique({ where: { id: viaId }, select: { id: true } });
      if (!via) throw new NotFoundError(`Vía ${viaId} no existe`);

      const seccionesCount = await this.contarSecciones(viaId, tx);

      // --- Vía simple (0 secciones) ---
      if (seccionesCount === 0) {
        const runner = tx
          ? async <T>(fn: (t: Prisma.TransactionClient) => Promise<T>) => fn(tx)
          : async <T>(fn: (t: Prisma.TransactionClient) => Promise<T>) => prisma.$transaction(fn);

        return await runner(async (t) => {
          const actual = await t.via.findUnique({
            where: { id: viaId },
            select: { ocupada: true, movimientoId: true },
          });

          if (actual?.movimientoId && actual.movimientoId !== movimientoId) {
            const bloq = await t.movimiento.findUnique({
              where: { id: actual.movimientoId },
              select: { id: true, locomotiveNumber: true },
            });
            throw new ViaOcupadaPorOtroError(
              `Vía ${viaId} ocupada por movimiento #${bloq?.id ?? actual.movimientoId}`,
              { bloqueadorId: actual.movimientoId, locomotiveNumber: bloq?.locomotiveNumber }
            );
          }

          // asignación segura con connect (evita P2003)
          await t.via.update({
            where: { id: viaId },
            data: { ocupada: true, movimiento: { connect: { id: movimientoId } } },
          });

          return t.via.findUnique({ where: { id: viaId }, include: { movimiento: true } });
        });
      }

      // --- Vía con secciones (≥1) ---
      let targetSeccion = numeroSeccion ?? null;
      if (targetSeccion == null) {
        targetSeccion = await this.primeraSeccionLibre(viaId, tx);
        if (targetSeccion == null) {
          throw new ConflictError(`La vía ${viaId} no tiene secciones libres.`);
        }
      }

      const s = await db.seccionVia.findUnique({
        where: { viaId_numero: { viaId, numero: targetSeccion } },
        select: { ocupada: true, movimientoId: true },
      });
      if (!s) throw new NotFoundError(`Sección ${targetSeccion} no existe en vía ${viaId}.`);

      if (s.ocupada && s.movimientoId !== movimientoId) {
        const bloq = await db.movimiento.findUnique({
          where: { id: s.movimientoId! },
          select: { id: true, locomotiveNumber: true },
        });
        throw new ViaOcupadaPorOtroError(
          `Sección ${targetSeccion} de vía ${viaId} ocupada por movimiento #${bloq?.id ?? s.movimientoId}`,
          { bloqueadorId: s.movimientoId!, locomotiveNumber: bloq?.locomotiveNumber }
        );
      }

      return await SeccionViaModel.asignarMovimientoASeccion(viaId, targetSeccion, movimientoId);
    } catch (error: any) {
      viaError.error('Error en asignarMovimientoASeccion', { error, viaId, numeroSeccion, movimientoId });
      throw error;
    }
  }

  static async liberarMovimientoDeSeccion(viaId: number, movimientoId: number, tx?: Prisma.TransactionClient) {
    try {
      const db = tx ?? prisma;

      const viaExiste = await db.via.findUnique({ where: { id: viaId }, select: { id: true } });
      if (!viaExiste) throw new NotFoundError(`Vía ${viaId} no existe`);

      const seccionesCount = await this.contarSecciones(viaId, tx);

      if (seccionesCount === 0) {
        const runner = tx
          ? async <T>(fn: (t: Prisma.TransactionClient) => Promise<T>) => fn(tx)
          : async <T>(fn: (t: Prisma.TransactionClient) => Promise<T>) => prisma.$transaction(fn);

        return await runner(async (t) => {
          const updated = await t.via.updateMany({
            where: { id: viaId, movimientoId },
            data: { ocupada: false, movimientoId: null },
          });
          if (updated.count !== 1) throw new NotFoundError('La vía no estaba ocupada por ese movimiento.');
          return t.via.findUnique({ where: { id: viaId } });
        });
      }

      return await SeccionViaModel.liberarMovimientoDeSeccion(viaId, movimientoId);
    } catch (error: any) {
      viaError.error('Error en liberarMovimientoDeSeccion', { error, viaId, movimientoId });
      throw error;
    }
  }

  // -------------------- CRUD / Consultas --------------------
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

  static async editarVia(
    id: number,
    data: { numero?: number; nombre?: string; localidadId?: number; ocupada?: boolean; movimientoId?: number | null }
  ) {
    try {
      const seccionesCount = await this.contarSecciones(id);
      const payload: typeof data = { ...data };
      if (seccionesCount > 0) {
        if ('ocupada' in payload) delete (payload as any).ocupada;
        if ('movimientoId' in payload) delete (payload as any).movimientoId;
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
