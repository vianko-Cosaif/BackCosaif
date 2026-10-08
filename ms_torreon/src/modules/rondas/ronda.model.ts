import {
  EstadoIncidenteTorreon,
  EstadoMovimientoTorreon,
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
  movimientoId?: number;
  localidadId: number;
  viaBloqueadaId: number | null;
  seccionBloqueadaId: number | null;
  origen: "NATURAL" | "ARRASTRE";
};

const ESTADOS_RONDA_ACTIVA: EstadoRondaTorreon[] = [EstadoRondaTorreon.ABIERTA, EstadoRondaTorreon.EN_PROCESO];
const ESTADOS_MOVIMIENTO_RECALCULABLE: EstadoRondaMovimientoTorreon[] = [
  EstadoRondaMovimientoTorreon.PENDIENTE,
  EstadoRondaMovimientoTorreon.ACTIVO,
  EstadoRondaMovimientoTorreon.BLOQUEADO,
];

type MovimientoRondaQueueItem = Prisma.RondaTorreonMovimientoGetPayload<{
  include: {
    movimiento: {
      select: {
        id: true;
        fechaSolicitud: true;
        estado: true;
      };
    };
  };
}>;

const compareQueueItems = (left: MovimientoRondaQueueItem, right: MovimientoRondaQueueItem) => {
  const solicitudDiff = left.movimiento.fechaSolicitud.getTime() - right.movimiento.fechaSolicitud.getTime();
  if (solicitudDiff !== 0) return solicitudDiff;
  return left.movimiento.id - right.movimiento.id || left.id - right.id;
};

function movimientoEstaBloqueadoPorIncidente(
  movimiento: MovimientoRondaRefs,
  incidente: IncidenteBloqueoRefs
) {
  const viasMovimiento = [movimiento.viaOrigenId, movimiento.viaDestinoId].filter(
    (value): value is number => typeof value === "number"
  );
  const seccionesMovimiento = [movimiento.seccionOrigenId, movimiento.seccionDestinoId].filter(
    (value): value is number => typeof value === "number"
  );

  const bloqueaVia =
    typeof incidente.viaBloqueadaId === "number" && viasMovimiento.includes(incidente.viaBloqueadaId);
  const bloqueaSeccion =
    typeof incidente.seccionBloqueadaId === "number" &&
    seccionesMovimiento.includes(incidente.seccionBloqueadaId);

  return incidente.movimientoId === movimiento.id || bloqueaVia || bloqueaSeccion;
}

export class RondaModel {
  static async listar(query: { localidadId?: number; estado?: string }) {
    const estado = query.estado ? query.estado as EstadoRondaTorreon : undefined;
    const activeQuery = !estado || ESTADOS_RONDA_ACTIVA.includes(estado);

    return prismaTorreon.rondaTorreon.findMany({
      where: {
        ...(query.localidadId ? { localidadId: query.localidadId } : {}),
        estado: estado ?? { in: ESTADOS_RONDA_ACTIVA },
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
      orderBy: activeQuery
        ? [{ numeroRonda: "asc" }, { createdAt: "asc" }]
        : [{ numeroRonda: "desc" }, { createdAt: "desc" }],
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
      orderBy: [{ numeroRonda: "asc" }, { createdAt: "asc" }],
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

  private static async resolveOrdenRonda(tx: Tx, rondaId: number) {
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
    bloqueadoPorIncidenteId?: number | null,
    bloqueado = Boolean(bloqueadoPorIncidenteId)
  ) {
    const ronda = await this.getOrCreateActiveRonda(tx, movimiento.localidadId);
    const orden = await this.resolveOrdenRonda(tx, ronda.id);

    return tx.rondaTorreonMovimiento.create({
      data: {
        rondaId: ronda.id,
        movimientoId: movimiento.id,
        empresaId: movimiento.empresaId,
        orden,
        prioridad: movimiento.prioridad,
        estado: bloqueado
          ? EstadoRondaMovimientoTorreon.BLOQUEADO
          : EstadoRondaMovimientoTorreon.PENDIENTE,
        bloqueadoPorIncidenteId: bloqueadoPorIncidenteId ?? null,
      },
    });
  }

  private static async normalizarRondasActivas(tx: Tx, localidadId: number) {
    const activeRondas = await tx.rondaTorreon.findMany({
      where: {
        localidadId,
        estado: { in: ESTADOS_RONDA_ACTIVA },
      },
      orderBy: [{ numeroRonda: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        numeroRonda: true,
        estado: true,
      },
    });

    if (!activeRondas.length) {
      return { rondasActivas: 0, movimientosEnCola: 0, slots: 0 };
    }

    const activeRondaIds = activeRondas.map((ronda) => ronda.id);
    const movimientos = await tx.rondaTorreonMovimiento.findMany({
      where: {
        rondaId: { in: activeRondaIds },
        estado: { in: ESTADOS_MOVIMIENTO_RECALCULABLE },
      },
      include: {
        movimiento: {
          select: {
            id: true,
            fechaSolicitud: true,
            estado: true,
          },
        },
      },
      orderBy: [{ orden: "asc" }, { id: "asc" }],
    });

    if (!movimientos.length) {
      await tx.rondaTorreon.updateMany({
        where: {
          id: { in: activeRondaIds },
          movimientos: {
            none: {
              estado: { in: ESTADOS_MOVIMIENTO_RECALCULABLE },
            },
          },
        },
        data: {
          estado: EstadoRondaTorreon.CERRADA,
          fechaCierre: new Date(),
        },
      });
      return { rondasActivas: 0, movimientosEnCola: 0, slots: 0 };
    }

    const ordenados = [...movimientos].sort(compareQueueItems);
    // La ronda existente es solo el contenedor compatible de una cola por localidad.
    const destino = activeRondas[0];
    const estadoDestino = ordenados.some((movimiento) => movimiento.estado === EstadoRondaMovimientoTorreon.ACTIVO)
      ? EstadoRondaTorreon.EN_PROCESO : EstadoRondaTorreon.ABIERTA;
    const yaOrdenada = activeRondas.length === 1 && ordenados.every((movimiento, index) => (
      movimiento.rondaId === destino.id && movimiento.ordenManual === null &&
      (index === 0 || ordenados[index - 1].orden < movimiento.orden)
    ));
    if (yaOrdenada) {
      if (destino.estado !== estadoDestino || destino.numeroRonda !== 1) {
        await tx.rondaTorreon.update({
          where: { id: destino.id },
          data: { numeroRonda: 1, estado: estadoDestino, fechaCierre: null },
        });
      }
      return { rondasActivas: 1, movimientosEnCola: ordenados.length, slots: ordenados.length };
    }

    const ultimo = await tx.rondaTorreonMovimiento.findFirst({
      where: { rondaId: { in: activeRondaIds } },
      orderBy: { orden: "desc" },
      select: { orden: true },
    });
    await tx.rondaTorreonMovimiento.updateMany({
      where: { rondaId: { in: activeRondaIds } },
      data: { orden: { increment: (ultimo?.orden ?? 0) + 1 } },
    });

    for (let start = 0; start < ordenados.length; start += 250) {
      await Promise.all(ordenados.slice(start, start + 250).map((movimiento, offset) =>
        tx.rondaTorreonMovimiento.update({
          where: { id: movimiento.id },
          data: { rondaId: destino.id, orden: start + offset + 1, ordenManual: null, fechaReordenManual: null },
        })
      ));
    }

    await tx.rondaTorreon.update({
      where: { id: destino.id },
      data: {
        numeroRonda: 1,
        estado: estadoDestino,
        fechaCierre: null,
      },
    });

    const rondasSobrantes = activeRondaIds.filter((id) => id !== destino.id);
    if (rondasSobrantes.length) {
      await tx.rondaTorreon.updateMany({
        where: { id: { in: rondasSobrantes } },
        data: {
          estado: EstadoRondaTorreon.CERRADA,
          fechaCierre: new Date(),
        },
      });
    }

    return {
      rondasActivas: 1,
      movimientosEnCola: ordenados.length,
      slots: ordenados.length,
    };
  }

  static async recalcularBloqueosLocalidad(tx: Tx, localidadId: number) {
    const incidentesNaturales = await tx.incidenteTorreonFerro.findMany({
      where: {
        localidadId,
        estado: EstadoIncidenteTorreon.ABIERTO,
      },
      orderBy: [{ fechaInicio: "asc" }, { id: "asc" }],
      select: {
        id: true,
        localidadId: true,
        viaBloqueadaId: true,
        seccionBloqueadaId: true,
        movimientoId: true,
      },
    });
    const incidentesAbiertos: IncidenteBloqueoRefs[] = incidentesNaturales.map((incidente) => ({
      ...incidente,
      origen: "NATURAL" as const,
    }));

    const rondas = await tx.rondaTorreon.findMany({
      where: {
        localidadId,
        estado: { in: ESTADOS_RONDA_ACTIVA },
      },
      select: { id: true },
    });

    if (!rondas.length) {
      return { rondas: 0, evaluados: 0, bloqueados: 0, liberados: 0 };
    }

    const rondaIds = rondas.map((ronda) => ronda.id);
    const movimientos = await tx.rondaTorreonMovimiento.findMany({
      where: {
        rondaId: { in: rondaIds },
        estado: { in: ESTADOS_MOVIMIENTO_RECALCULABLE },
      },
      include: { movimiento: true },
      orderBy: [{ rondaId: "asc" }, { orden: "asc" }],
    });

    let bloqueados = 0;
    let liberados = 0;

    for (const item of movimientos) {
      const incidenteBloqueante = incidentesAbiertos.find((incidente) =>
        movimientoEstaBloqueadoPorIncidente(item.movimiento, incidente)
      );

      if (incidenteBloqueante) {
        const incidenteNaturalId =
          incidenteBloqueante.origen === "NATURAL" ? incidenteBloqueante.id : null;
        if (
          item.estado !== EstadoRondaMovimientoTorreon.BLOQUEADO ||
          item.bloqueadoPorIncidenteId !== incidenteNaturalId
        ) {
          await tx.rondaTorreonMovimiento.update({
            where: { id: item.id },
            data: {
              estado: EstadoRondaMovimientoTorreon.BLOQUEADO,
              bloqueadoPorIncidenteId: incidenteNaturalId,
            },
          });
        }
        bloqueados += 1;
        continue;
      }

      if (item.estado === EstadoRondaMovimientoTorreon.BLOQUEADO) {
        await tx.rondaTorreonMovimiento.update({
          where: { id: item.id },
          data: {
            estado: item.movimiento.estado === EstadoMovimientoTorreon.EN_PROCESO
              ? EstadoRondaMovimientoTorreon.ACTIVO : EstadoRondaMovimientoTorreon.PENDIENTE,
            bloqueadoPorIncidenteId: null,
          },
        });
        liberados += 1;
      }
    }

    const normalizacion = await this.normalizarRondasActivas(tx, localidadId);

    return {
      rondas: normalizacion.rondasActivas,
      evaluados: movimientos.length,
      bloqueados,
      liberados,
      slots: normalizacion.slots,
      movimientosEnCola: normalizacion.movimientosEnCola,
    };
  }

  static async marcarMovimientoBloqueado(tx: Tx, movimientoId: number, incidenteId?: number | null) {
    const movimiento = await tx.movimientoTorreonFerro.findUnique({
      where: { id: movimientoId },
      select: { localidadId: true },
    });
    const result = await tx.rondaTorreonMovimiento.updateMany({
      where: {
        movimientoId,
        estado: { in: [EstadoRondaMovimientoTorreon.PENDIENTE, EstadoRondaMovimientoTorreon.ACTIVO] },
      },
      data: {
        estado: EstadoRondaMovimientoTorreon.BLOQUEADO,
        bloqueadoPorIncidenteId: incidenteId ?? null,
      },
    });
    if (movimiento) await this.normalizarRondasActivas(tx, movimiento.localidadId);
    return result;
  }

  static async intercambiar(_input: { rondaAId: number; rondaBId: number; empresaId?: number }) {
    throw new DomainError(409, "La cola de movimientos naturales se ordena por llegada");
  }

  static async reordenarMovimiento(_input: { rondaMovimientoId: number; orden: number; empresaId?: number }) {
    throw new DomainError(409, "La cola de movimientos naturales se ordena por llegada");
  }

  static async marcarMovimientoActivo(tx: Tx, movimientoId: number, fechaInicio = new Date()) {
    const movimiento = await tx.movimientoTorreonFerro.findUnique({
      where: { id: movimientoId },
      select: { localidadId: true },
    });

    await tx.rondaTorreon.updateMany({
      where: {
        movimientos: { some: { movimientoId } },
        estado: EstadoRondaTorreon.ABIERTA,
      },
      data: { estado: EstadoRondaTorreon.EN_PROCESO },
    });

    const result = await tx.rondaTorreonMovimiento.updateMany({
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
    if (movimiento) await this.normalizarRondasActivas(tx, movimiento.localidadId);
    return result;
  }

  static async marcarMovimientoConcluido(tx: Tx, movimientoId: number, fechaFin = new Date()) {
    const movimiento = await tx.movimientoTorreonFerro.findUnique({
      where: { id: movimientoId },
      select: { localidadId: true },
    });
    const result = await tx.rondaTorreonMovimiento.updateMany({
      where: { movimientoId },
      data: {
        estado: EstadoRondaMovimientoTorreon.CONCLUIDO,
        fechaFin,
        bloqueadoPorIncidenteId: null,
      },
    });
    if (movimiento) await this.normalizarRondasActivas(tx, movimiento.localidadId);
    return result;
  }

  static async marcarMovimientoCancelado(tx: Tx, movimientoId: number, fechaFin = new Date()) {
    const movimiento = await tx.movimientoTorreonFerro.findUnique({
      where: { id: movimientoId },
      select: { localidadId: true },
    });
    const result = await tx.rondaTorreonMovimiento.updateMany({
      where: {
        movimientoId,
        estado: { not: EstadoRondaMovimientoTorreon.CONCLUIDO },
      },
      data: {
        estado: EstadoRondaMovimientoTorreon.CANCELADO,
        fechaFin,
        bloqueadoPorIncidenteId: null,
      },
    });
    if (movimiento) await this.normalizarRondasActivas(tx, movimiento.localidadId);
    return result;
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

    const result = await tx.rondaTorreonMovimiento.updateMany({
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
    await this.normalizarRondasActivas(tx, incidente.localidadId);
    return result;
  }

  static async desbloquearPorIncidente(tx: Tx, incidenteId: number) {
    const result = await tx.rondaTorreonMovimiento.updateMany({
      where: {
        bloqueadoPorIncidenteId: incidenteId,
        estado: EstadoRondaMovimientoTorreon.BLOQUEADO,
      },
      data: {
        estado: EstadoRondaMovimientoTorreon.PENDIENTE,
        bloqueadoPorIncidenteId: null,
      },
    });
    return result;
  }
}
