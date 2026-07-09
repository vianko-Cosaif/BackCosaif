import {
  EstadoIncidenteArrastreTorreon,
  EstadoIncidenteTorreon,
  EstadoMovimientoTorreon,
  EstadoRondaMovimientoTorreon,
  EstadoRondaTorreon,
  Prisma,
} from "../../../generated";
import { prismaTorreon } from "../../db/prisma";
import { DomainError } from "../../utils/domainError";
import { reordenarRondaMovimientoSchema } from "./ronda.schemas";
import { z } from "zod";

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
  origen: "NATURAL" | "ARRASTRE";
};

const ORDER_SHIFT = 100000;
const MAX_MOVIMIENTOS_POR_RONDA = 3;
const ESTADOS_RONDA_ACTIVA: EstadoRondaTorreon[] = [EstadoRondaTorreon.ABIERTA, EstadoRondaTorreon.EN_PROCESO];
const ESTADOS_MOVIMIENTO_RECALCULABLE: EstadoRondaMovimientoTorreon[] = [
  EstadoRondaMovimientoTorreon.PENDIENTE,
  EstadoRondaMovimientoTorreon.ACTIVO,
  EstadoRondaMovimientoTorreon.BLOQUEADO,
];
const ESTADOS_RONDA_MOVIMIENTO_REORDENABLE: EstadoRondaMovimientoTorreon[] = [
  EstadoRondaMovimientoTorreon.PENDIENTE,
  EstadoRondaMovimientoTorreon.BLOQUEADO,
];
const ESTADOS_MOVIMIENTO_NO_EDITABLE: EstadoMovimientoTorreon[] = [
  EstadoMovimientoTorreon.EN_PROCESO,
  EstadoMovimientoTorreon.DETENIDO,
  EstadoMovimientoTorreon.CONCLUIDO,
  EstadoMovimientoTorreon.CANCELADO,
];

type RondaActivaRef = {
  id: number;
  numeroRonda: number;
  estado: EstadoRondaTorreon;
};

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

const estadoOrdenRank = (estado: EstadoRondaMovimientoTorreon) => {
  if (estado === EstadoRondaMovimientoTorreon.ACTIVO) return 0;
  if (estado === EstadoRondaMovimientoTorreon.PENDIENTE) return 1;
  if (estado === EstadoRondaMovimientoTorreon.BLOQUEADO) return 2;
  if (estado === EstadoRondaMovimientoTorreon.CONCLUIDO) return 3;
  return 4;
};

const prioridadOrdenRank = (prioridad: "BAJA" | "ALTA") => (prioridad === "ALTA" ? 0 : 1);

const manualOrderValue = (item: Pick<MovimientoRondaQueueItem, "ordenManual">) => (
  typeof item.ordenManual === "number" ? item.ordenManual : Number.MAX_SAFE_INTEGER
);

const compareQueueItems = (left: MovimientoRondaQueueItem, right: MovimientoRondaQueueItem) => {
  const estadoDiff = estadoOrdenRank(left.estado) - estadoOrdenRank(right.estado);
  if (estadoDiff !== 0) return estadoDiff;

  const manualDiff = manualOrderValue(left) - manualOrderValue(right);
  if (manualDiff !== 0) return manualDiff;

  const solicitudDiff = left.movimiento.fechaSolicitud.getTime() - right.movimiento.fechaSolicitud.getTime();
  if (solicitudDiff !== 0) return solicitudDiff;

  const ordenDiff = left.orden - right.orden;
  if (ordenDiff !== 0) return ordenDiff;

  const prioridadDiff = prioridadOrdenRank(left.prioridad) - prioridadOrdenRank(right.prioridad);
  if (prioridadDiff !== 0) return prioridadDiff;

  const asignadoDiff = left.fechaAsignado.getTime() - right.fechaAsignado.getTime();
  return asignadoDiff || left.id - right.id;
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

  return bloqueaVia || bloqueaSeccion;
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
    bloqueadoPorIncidenteId?: number | null,
    bloqueado = Boolean(bloqueadoPorIncidenteId)
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
        estado: bloqueado
          ? EstadoRondaMovimientoTorreon.BLOQUEADO
          : EstadoRondaMovimientoTorreon.PENDIENTE,
        bloqueadoPorIncidenteId: bloqueadoPorIncidenteId ?? null,
      },
    });
  }

  private static async reordenarRonda(tx: Tx, rondaId: number) {
    const movimientos = await tx.rondaTorreonMovimiento.findMany({
      where: { rondaId },
      orderBy: [{ orden: "asc" }, { id: "asc" }],
      select: {
        id: true,
        orden: true,
        prioridad: true,
        estado: true,
        fechaAsignado: true,
      },
    });

    if (movimientos.length <= 1) return;

    const ordenados = [...movimientos].sort((left, right) => {
      const estadoDiff = estadoOrdenRank(left.estado) - estadoOrdenRank(right.estado);
      if (estadoDiff !== 0) return estadoDiff;

      const prioridadDiff = prioridadOrdenRank(left.prioridad) - prioridadOrdenRank(right.prioridad);
      if (prioridadDiff !== 0) return prioridadDiff;

      const ordenDiff = left.orden - right.orden;
      if (ordenDiff !== 0) return ordenDiff;

      const asignadoDiff = left.fechaAsignado.getTime() - right.fechaAsignado.getTime();
      return asignadoDiff || left.id - right.id;
    });

    await tx.rondaTorreonMovimiento.updateMany({
      where: { rondaId },
      data: { orden: { increment: ORDER_SHIFT } },
    });

    await Promise.all(
      ordenados.map((movimiento, index) =>
        tx.rondaTorreonMovimiento.update({
          where: { id: movimiento.id },
          data: { orden: index + 1 },
        })
      )
    );
  }

  private static async ensureActiveRondas(
    tx: Tx,
    localidadId: number,
    cantidad: number,
    existentes: RondaActivaRef[]
  ) {
    if (cantidad <= 0) return [];

    const rondas = [...existentes].sort((left, right) => (
      left.numeroRonda - right.numeroRonda || left.id - right.id
    ));

    if (rondas.length >= cantidad) return rondas.slice(0, cantidad);

    const last = await tx.rondaTorreon.findFirst({
      where: { localidadId },
      orderBy: { numeroRonda: "desc" },
      select: { numeroRonda: true },
    });
    let nextNumero = Math.max(last?.numeroRonda ?? 0, ...rondas.map((ronda) => ronda.numeroRonda)) + 1;

    while (rondas.length < cantidad) {
      const created = await tx.rondaTorreon.create({
        data: {
          localidadId,
          numeroRonda: nextNumero,
          estado: EstadoRondaTorreon.ABIERTA,
        },
        select: {
          id: true,
          numeroRonda: true,
          estado: true,
        },
      });
      rondas.push(created);
      nextNumero += 1;
    }

    return rondas;
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
      return { rondasActivas: activeRondaIds.length, movimientosEnCola: 0, slots: 0 };
    }

    const ordenados = [...movimientos].sort(compareQueueItems);
    const rondasNecesarias = Math.ceil(ordenados.length / MAX_MOVIMIENTOS_POR_RONDA);
    const rondasDestino = await this.ensureActiveRondas(tx, localidadId, rondasNecesarias, activeRondas);
    const destinoIds = new Set(rondasDestino.map((ronda) => ronda.id));

    await tx.rondaTorreonMovimiento.updateMany({
      where: { rondaId: { in: activeRondaIds } },
      data: { orden: { increment: ORDER_SHIFT } },
    });

    await Promise.all(
      ordenados.map((movimiento, index) => {
        const rondaDestino = rondasDestino[Math.floor(index / MAX_MOVIMIENTOS_POR_RONDA)];
        return tx.rondaTorreonMovimiento.update({
          where: { id: movimiento.id },
          data: {
            rondaId: rondaDestino.id,
            orden: (index % MAX_MOVIMIENTOS_POR_RONDA) + 1,
          },
        });
      })
    );

    await Promise.all(
      rondasDestino.map((ronda, index) => {
        const inicio = index * MAX_MOVIMIENTOS_POR_RONDA;
        const fin = inicio + MAX_MOVIMIENTOS_POR_RONDA;
        const tieneActivo = ordenados
          .slice(inicio, fin)
          .some((movimiento) => movimiento.estado === EstadoRondaMovimientoTorreon.ACTIVO);

        return tx.rondaTorreon.update({
          where: { id: ronda.id },
          data: {
            estado: tieneActivo ? EstadoRondaTorreon.EN_PROCESO : EstadoRondaTorreon.ABIERTA,
            fechaCierre: null,
          },
        });
      })
    );

    const rondasSobrantes = activeRondaIds.filter((id) => !destinoIds.has(id));
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
      rondasActivas: rondasDestino.length,
      movimientosEnCola: ordenados.length,
      slots: MAX_MOVIMIENTOS_POR_RONDA,
    };
  }

  static async recalcularBloqueosLocalidad(tx: Tx, localidadId: number) {
    const [incidentesNaturales, incidentesArrastre] = await Promise.all([
      tx.incidenteTorreonFerro.findMany({
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
        },
      }),
      tx.incidenteArrastreTorreon.findMany({
        where: {
          localidadId,
          estado: EstadoIncidenteArrastreTorreon.ABIERTO,
        },
        orderBy: [{ fechaInicio: "asc" }, { id: "asc" }],
        select: {
          id: true,
          localidadId: true,
          viaBloqueadaId: true,
          seccionBloqueadaId: true,
        },
      }),
    ]);
    const incidentesAbiertos: IncidenteBloqueoRefs[] = [
      ...incidentesNaturales.map((incidente) => ({ ...incidente, origen: "NATURAL" as const })),
      ...incidentesArrastre.map((incidente) => ({ ...incidente, origen: "ARRASTRE" as const })),
    ];

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
            estado: EstadoRondaMovimientoTorreon.PENDIENTE,
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

  static async reordenarMovimiento(input: z.infer<typeof reordenarRondaMovimientoSchema>) {
    const rondaId = await prismaTorreon.$transaction(async (tx) => {
      const detail = await tx.rondaTorreonMovimiento.findUnique({
        where: { id: input.rondaMovimientoId },
        include: {
          ronda: true,
          movimiento: true,
        },
      });

      if (!detail) throw new DomainError(404, "Movimiento de ronda no encontrado");
      if (input.empresaId && detail.empresaId !== input.empresaId) {
        throw new DomainError(403, "Solo puedes modificar movimientos de tu empresa");
      }
      if (!ESTADOS_RONDA_ACTIVA.includes(detail.ronda.estado)) {
        throw new DomainError(409, `Ronda no puede editarse en estado ${detail.ronda.estado}`);
      }
      if (!ESTADOS_RONDA_MOVIMIENTO_REORDENABLE.includes(detail.estado)) {
        throw new DomainError(409, `Movimiento de ronda no puede editarse en estado ${detail.estado}`);
      }
      if (ESTADOS_MOVIMIENTO_NO_EDITABLE.includes(detail.movimiento.estado)) {
        throw new DomainError(409, `Movimiento no puede editarse en estado ${detail.movimiento.estado}`);
      }

      const movimientos = await tx.rondaTorreonMovimiento.findMany({
        where: {
          estado: { in: ESTADOS_MOVIMIENTO_RECALCULABLE },
          ronda: {
            localidadId: detail.ronda.localidadId,
            estado: { in: ESTADOS_RONDA_ACTIVA },
          },
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
      const ordenados = [...movimientos].sort(compareQueueItems);

      const isEditableScoped = (item: typeof movimientos[number]) => {
        const sameScope = input.empresaId ? item.empresaId === input.empresaId : true;
        return sameScope
          && ESTADOS_RONDA_MOVIMIENTO_REORDENABLE.includes(item.estado)
          && !ESTADOS_MOVIMIENTO_NO_EDITABLE.includes(item.movimiento.estado);
      };

      const editable = ordenados.filter(isEditableScoped);
      const target = editable.find((item) => item.id === input.rondaMovimientoId);
      if (!target) {
        throw new DomainError(409, "Movimiento no disponible para reordenar");
      }

      const nextIndex = Math.min(Math.max(input.orden - 1, 0), editable.length - 1);
      const reorderedEditable = editable.filter((item) => item.id !== target.id);
      reorderedEditable.splice(nextIndex, 0, target);

      const editableIds = new Set(editable.map((item) => item.id));
      let editableCursor = 0;
      const finalOrder = ordenados.map((item) => (
        editableIds.has(item.id) ? reorderedEditable[editableCursor++] : item
      ));
      const fechaReordenManual = new Date();

      await Promise.all(
        finalOrder.map((item, index) =>
          tx.rondaTorreonMovimiento.update({
            where: { id: item.id },
            data: {
              ordenManual: index + 1,
              fechaReordenManual,
            },
          })
        )
      );

      await this.normalizarRondasActivas(tx, detail.ronda.localidadId);

      const moved = await tx.rondaTorreonMovimiento.findUnique({
        where: { id: input.rondaMovimientoId },
        select: { rondaId: true },
      });

      return moved?.rondaId ?? detail.rondaId;
    });

    return this.obtener(rondaId);
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
