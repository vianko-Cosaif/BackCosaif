import { EstadoIncidenteTorreon, Prisma, PrismaClient } from "../../../generated";
import { prismaTorreon } from "../../db/prisma";
import { DomainError } from "../../utils/domainError";
import { guardarFotoTorreon } from "../../utils/imagenesTorreon";
import { RondaModel } from "../rondas/ronda.model";
import { fotoInputSchema } from "../movimientos/movimiento.schemas";
import { resolverIncidenteSchema } from "./incidente.schemas";
import { z } from "zod";

type Tx = Prisma.TransactionClient;
type FotoInput = z.infer<typeof fotoInputSchema>;

type ListarIncidentesQuery = {
  localidadId?: number;
  empresaId?: number;
  estado?: string;
  page?: number;
  pageSize?: number;
};

export type MovimientoIncidenteRefs = {
  id: number;
  localidadId: number;
  viaOrigenId: number | null;
  viaDestinoId: number | null;
  seccionOrigenId: number | null;
  seccionDestinoId: number | null;
};

export type CrearIncidenteInput = {
  creadoPorId: number;
  motivo: string;
  viaBloqueadaId?: number;
  seccionBloqueadaId?: number;
  fechaInicio?: Date;
  fotos: FotoInput[];
};

const normalizeIdList = (...values: Array<number | null | undefined>) => {
  return [...new Set(values.filter((value): value is number => typeof value === "number"))];
};

const includeIncidenteDetalle = {
  movimiento: true,
  fotos: {
    orderBy: { orden: "asc" as const },
  },
};

const compact = <T extends Record<string, unknown>>(data: T): T => {
  Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
  return data;
};

const normalizeEstado = (estado?: string) => {
  const value = String(estado ?? "").trim().toUpperCase();
  if (value === "PASADOS") return EstadoIncidenteTorreon.RESUELTO;
  if (value === EstadoIncidenteTorreon.ABIERTO) return EstadoIncidenteTorreon.ABIERTO;
  if (value === EstadoIncidenteTorreon.RESUELTO) return EstadoIncidenteTorreon.RESUELTO;
  return undefined;
};

function buildMovimientoResourceFilters(refs: MovimientoIncidenteRefs): Prisma.IncidenteTorreonFerroWhereInput[] {
  const viaIds = normalizeIdList(refs.viaOrigenId, refs.viaDestinoId);
  const seccionIds = normalizeIdList(refs.seccionOrigenId, refs.seccionDestinoId);
  const filters: Prisma.IncidenteTorreonFerroWhereInput[] = [];

  if (viaIds.length) filters.push({ viaBloqueadaId: { in: viaIds } });
  if (seccionIds.length) filters.push({ seccionBloqueadaId: { in: seccionIds } });

  return filters;
}

async function createIncidenteFotos(
  tx: Tx,
  incidenteId: number,
  fotos: FotoInput[],
  actorFallbackId: number
) {
  const last = await tx.incidenteTorreonFoto.findFirst({
    where: { incidenteId },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });
  const start = (last?.orden ?? 0) + 1;

  return Promise.all(
    fotos.map(async (foto, index) => {
      const orden = start + index;
      const archivo = await guardarFotoTorreon(foto, {
        entidad: "incidente_movimiento",
        referenciaId: incidenteId,
        orden,
      });

      return tx.incidenteTorreonFoto.create({
        data: {
          incidenteId,
          orden,
          url: archivo.url,
          storageKey: archivo.storageKey,
          tomadaPorId: foto.tomadaPorId ?? actorFallbackId,
          comentario: foto.comentario,
          tomadaAt: foto.tomadaAt ?? new Date(),
        },
      });
    })
  );
}

export class IncidenteModel {
  static async listar(query: ListarIncidentesQuery) {
    const page = Math.max(1, Math.trunc(query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Math.trunc(query.pageSize ?? 20)));
    const skip = (page - 1) * pageSize;
    const estado = normalizeEstado(query.estado);

    const where: Prisma.IncidenteTorreonFerroWhereInput = compact({
      localidadId: query.localidadId,
      estado,
      movimiento: query.empresaId ? { empresaId: query.empresaId } : undefined,
    });

    const [data, total] = await Promise.all([
      prismaTorreon.incidenteTorreonFerro.findMany({
        where,
        include: includeIncidenteDetalle,
        orderBy: [{ fechaInicio: "desc" }, { id: "desc" }],
        skip,
        take: pageSize,
      }),
      prismaTorreon.incidenteTorreonFerro.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        estadoFiltro: estado ?? null,
      },
    };
  }

  static async obtener(id: number) {
    const incidente = await prismaTorreon.incidenteTorreonFerro.findUnique({
      where: { id },
      include: includeIncidenteDetalle,
    });
    if (!incidente) throw new DomainError(404, "Incidente no encontrado");
    return incidente;
  }

  static async obtenerActivoDeMovimiento(tx: Tx | PrismaClient, movimientoId: number) {
    return tx.incidenteTorreonFerro.findFirst({
      where: { movimientoId, estado: EstadoIncidenteTorreon.ABIERTO },
      orderBy: { fechaInicio: "desc" },
    });
  }

  static async findIncidenteBloqueante(
    tx: Tx | PrismaClient,
    refs: MovimientoIncidenteRefs,
    excludeIncidentId?: number
  ) {
    const filters = buildMovimientoResourceFilters(refs);
    if (!filters.length) return null;

    return tx.incidenteTorreonFerro.findFirst({
      where: {
        estado: EstadoIncidenteTorreon.ABIERTO,
        localidadId: refs.localidadId,
        ...(excludeIncidentId ? { id: { not: excludeIncidentId } } : {}),
        OR: filters,
      },
      orderBy: { fechaInicio: "asc" },
    });
  }

  static async crearParaMovimiento(
    tx: Tx,
    movimiento: MovimientoIncidenteRefs,
    input: CrearIncidenteInput
  ) {
    const incidenteAbierto = await this.obtenerActivoDeMovimiento(tx, movimiento.id);
    if (incidenteAbierto) {
      throw new DomainError(409, "El movimiento ya tiene incidente abierto", {
        incidenteId: incidenteAbierto.id,
      });
    }

    const viaBloqueadaId = input.viaBloqueadaId ?? movimiento.viaDestinoId ?? movimiento.viaOrigenId;
    const seccionBloqueadaId = input.seccionBloqueadaId ?? movimiento.seccionDestinoId ?? movimiento.seccionOrigenId;

    if (!viaBloqueadaId && !seccionBloqueadaId) {
      throw new DomainError(400, "Debe existir via o seccion para bloquear");
    }

    const incidente = await tx.incidenteTorreonFerro.create({
      data: {
        movimientoId: movimiento.id,
        creadoPorId: input.creadoPorId,
        motivo: input.motivo,
        localidadId: movimiento.localidadId,
        viaBloqueadaId,
        seccionBloqueadaId,
        fechaInicio: input.fechaInicio ?? new Date(),
      },
    });

    await createIncidenteFotos(tx, incidente.id, input.fotos, input.creadoPorId);
    await RondaModel.bloquearPorIncidente(tx, incidente);

    return incidente;
  }

  static async resolverTx(
    tx: Tx,
    incidenteId: number,
    input: z.infer<typeof resolverIncidenteSchema>
  ) {
    const incidente = await tx.incidenteTorreonFerro.findUnique({
      where: { id: incidenteId },
      include: { movimiento: true },
    });
    if (!incidente) throw new DomainError(404, "Incidente no encontrado");

    if (incidente.estado === EstadoIncidenteTorreon.RESUELTO) return incidente;

    const updated = await tx.incidenteTorreonFerro.update({
      where: { id: incidenteId },
      data: {
        estado: EstadoIncidenteTorreon.RESUELTO,
        solucion: input.solucion,
        resueltoPorId: input.resueltoPorId,
        fechaResolucion: input.fechaResolucion ?? new Date(),
      },
    });

    await RondaModel.desbloquearPorIncidente(tx, incidenteId);
    return updated;
  }

  static async resolver(id: number, input: z.infer<typeof resolverIncidenteSchema>) {
    return prismaTorreon.$transaction((tx) => this.resolverTx(tx, id, input));
  }
}
