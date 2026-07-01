import {
  EstadoRondaMovimientoTorreon,
  EstadoRondaTorreon,
  Prisma,
} from "../../../generated";
import { prismaTorreon } from "../../db/prisma";
import { DomainError } from "../../utils/domainError";

type Tx = Prisma.TransactionClient;

export type MovimientoRondaRefs = {
  id: number;
  empresaId: number;
  localidadId: number;
  viaOrigenId: number | null;
  viaDestinoId: number | null;
  seccionOrigenId: number | null;
  seccionDestinoId: number | null;
  prioridad: "BAJA" | "ALTA";
};

export type IncidenteBloqueoRefs = {
  id: number;
  localidadId: number;
  viaBloqueadaId: number | null;
  seccionBloqueadaId: number | null;
};

const ORDER_SHIFT = 100000;

export class RondaModel {
  static async listar(query: { localidadId?: number; estado?: string }) {
    return prismaTorreon.rondaTorreon.findMany({
      where: {
        ...(query.localidadId ? { localidadId: query.localidadId } : {}),
        ...(query.estado ? { estado: query.estado as EstadoRondaTorreon } : {}),
      },
      include: {
        movimientos: {
          include: {
            movimiento: true,
            bloqueadoPorIncidente: true,
          },
          orderBy: { orden: "asc" },
        },
      },
      orderBy: [{ numeroRonda: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
  }

  static async obtener(id: number) {
    const ronda = await prismaTorreon.rondaTorreon.findUnique({
      where: { id },
      include: {
        movimientos: {
          include: {
            movimiento: true,
            bloqueadoPorIncidente: true,
          },
          orderBy: { orden: "asc" },
        },
      },
    });
    if (!ronda) throw new DomainError(404, "Ronda no encontrada");
    return ronda;
  }

  private static async getOrCreateActiveRonda(tx: Tx, localidadId: number) {
    const active = await tx.rondaTorreon.findFirst({
      where: {
        localidadId,
        estado: { in: [EstadoRondaTorreon.ABIERTA, EstadoRondaTorreon.EN_PROCESO] },
      },
      orderBy: [{ numeroRonda: "desc" }, { createdAt: "desc" }],
    });
    if (active) return active;

    const last = await tx.rondaTorreon.findFirst({
      where: { localidadId },
      orderBy: { numeroRonda: "desc" },
      select: { numeroRonda: true },
    });

    return tx.rondaTorreon.create({
      data: {
        localidadId,
        numeroRonda: (last?.numeroRonda ?? 0) + 1,
        estado: EstadoRondaTorreon.ABIERTA,
      },
    });
  }

  private static async resolveOrdenRonda(tx: Tx, rondaId: number, prioridad: "BAJA" | "ALTA") {
    if (prioridad === "ALTA") {
      const firstLow = await tx.rondaTorreonMovimiento.findFirst({
        where: {
          rondaId,
          prioridad: "BAJA",
          estado: { in: [EstadoRondaMovimientoTorreon.PENDIENTE, EstadoRondaMovimientoTorreon.BLOQUEADO] },
        },
        orderBy: { orden: "asc" },
        select: { orden: true },
      });

      if (firstLow) {
        await tx.rondaTorreonMovimiento.updateMany({
          where: { rondaId, orden: { gte: firstLow.orden } },
          data: { orden: { increment: ORDER_SHIFT } },
        });
        await tx.rondaTorreonMovimiento.updateMany({
          where: { rondaId, orden: { gte: firstLow.orden + ORDER_SHIFT } },
          data: { orden: { decrement: ORDER_SHIFT - 1 } },
        });
        return firstLow.orden;
      }
    }

    const last = await tx.rondaTorreonMovimiento.findFirst({
      where: { rondaId },
      orderBy: { orden: "desc" },
      select: { orden: true },
    });

    return (last?.orden ?? 0) + 1;
  }

  static async insertarMovimiento(
    tx: Tx,
    movimiento: MovimientoRondaRefs,
    bloqueadoPorIncidenteId?: number
  ) {
    const ronda = await this.getOrCreateActiveRonda(tx, movimiento.localidadId);
    const orden = await this.resolveOrdenRonda(tx, ronda.id, movimiento.prioridad);

    return tx.rondaTorreonMovimiento.create({
      data: {
        rondaId: ronda.id,
        movimientoId: movimiento.id,
        empresaId: movimiento.empresaId,
        orden,
        prioridad: movimiento.prioridad,
        estado: bloqueadoPorIncidenteId
          ? EstadoRondaMovimientoTorreon.BLOQUEADO
          : EstadoRondaMovimientoTorreon.PENDIENTE,
        bloqueadoPorIncidenteId,
      },
    });
  }

  static async marcarMovimientoBloqueado(tx: Tx, movimientoId: number, incidenteId: number) {
    return tx.rondaTorreonMovimiento.updateMany({
      where: {
        movimientoId,
        estado: { in: [EstadoRondaMovimientoTorreon.PENDIENTE, EstadoRondaMovimientoTorreon.ACTIVO] },
      },
      data: {
        estado: EstadoRondaMovimientoTorreon.BLOQUEADO,
        bloqueadoPorIncidenteId: incidenteId,
      },
    });
  }

  static async marcarMovimientoActivo(tx: Tx, movimientoId: number, fechaInicio = new Date()) {
    await tx.rondaTorreon.updateMany({
      where: {
        movimientos: { some: { movimientoId } },
        estado: EstadoRondaTorreon.ABIERTA,
      },
      data: { estado: EstadoRondaTorreon.EN_PROCESO },
    });

    return tx.rondaTorreonMovimiento.updateMany({
      where: {
        movimientoId,
        estado: { in: [EstadoRondaMovimientoTorreon.PENDIENTE, EstadoRondaMovimientoTorreon.BLOQUEADO] },
      },
      data: {
        estado: EstadoRondaMovimientoTorreon.ACTIVO,
        bloqueadoPorIncidenteId: null,
        fechaInicio,
      },
    });
  }

  static async marcarMovimientoConcluido(tx: Tx, movimientoId: number, fechaFin = new Date()) {
    return tx.rondaTorreonMovimiento.updateMany({
      where: { movimientoId },
      data: {
        estado: EstadoRondaMovimientoTorreon.CONCLUIDO,
        fechaFin,
        bloqueadoPorIncidenteId: null,
      },
    });
  }

  static async bloquearPorIncidente(tx: Tx, incidente: IncidenteBloqueoRefs) {
    const movimientoFilters: Prisma.MovimientoTorreonFerroWhereInput[] = [];
    if (incidente.viaBloqueadaId) {
      movimientoFilters.push({ viaOrigenId: incidente.viaBloqueadaId });
      movimientoFilters.push({ viaDestinoId: incidente.viaBloqueadaId });
    }
    if (incidente.seccionBloqueadaId) {
      movimientoFilters.push({ seccionOrigenId: incidente.seccionBloqueadaId });
      movimientoFilters.push({ seccionDestinoId: incidente.seccionBloqueadaId });
    }
    if (!movimientoFilters.length) return { count: 0 };

    return tx.rondaTorreonMovimiento.updateMany({
      where: {
        estado: {
          in: [
            EstadoRondaMovimientoTorreon.PENDIENTE,
            EstadoRondaMovimientoTorreon.ACTIVO,
            EstadoRondaMovimientoTorreon.BLOQUEADO,
          ],
        },
        ronda: {
          localidadId: incidente.localidadId,
          estado: { in: [EstadoRondaTorreon.ABIERTA, EstadoRondaTorreon.EN_PROCESO] },
        },
        movimiento: { OR: movimientoFilters },
      },
      data: {
        estado: EstadoRondaMovimientoTorreon.BLOQUEADO,
        bloqueadoPorIncidenteId: incidente.id,
      },
    });
  }

  static async desbloquearPorIncidente(tx: Tx, incidenteId: number) {
    return tx.rondaTorreonMovimiento.updateMany({
      where: {
        bloqueadoPorIncidenteId: incidenteId,
        estado: EstadoRondaMovimientoTorreon.BLOQUEADO,
      },
      data: {
        estado: EstadoRondaMovimientoTorreon.PENDIENTE,
        bloqueadoPorIncidenteId: null,
      },
    });
  }
}
