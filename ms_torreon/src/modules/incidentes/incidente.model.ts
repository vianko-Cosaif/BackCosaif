import {
  EstadoIncidenteArrastreTorreon,
  EstadoIncidenteTorreon,
  EstadoMovimientoTorreon,
  Prisma,
  PrismaClient,
} from "../../../generated";
import { prismaTorreon } from "../../db/prisma";
import { DomainError } from "../../utils/domainError";
import { guardarFotoTorreon } from "../../utils/imagenesTorreon";
import { RondaModel } from "../rondas/ronda.model";
import { ArrastreModel } from "../arrastres/arrastre.model";
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
  includeFotos?: boolean;
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

const includeIncidenteArrastreDetalle = {
  arrastre: true,
  vagon: true,
  fotos: {
    orderBy: { orden: "asc" as const },
  },
};

const buildIncidenteNaturalListInclude = (includeFotos: boolean) => ({
  movimiento: true,
  _count: { select: { fotos: true } },
  ...(includeFotos ? { fotos: { orderBy: { orden: "asc" as const } } } : {}),
}) satisfies Prisma.IncidenteTorreonFerroInclude;

const buildIncidenteArrastreListInclude = (includeFotos: boolean) => ({
  arrastre: true,
  vagon: true,
  _count: { select: { fotos: true } },
  ...(includeFotos ? { fotos: { orderBy: { orden: "asc" as const } } } : {}),
}) satisfies Prisma.IncidenteArrastreTorreonInclude;

const compact = <T extends Record<string, unknown>>(data: T): T => {
  Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
  return data;
};

const normalizeEstado = (estado?: string) => {
  const value = String(estado ?? "").trim().toUpperCase();
  if (value === "PASADOS") return "RESUELTO";
  if (value === EstadoIncidenteTorreon.ABIERTO) return "ABIERTO";
  if (value === EstadoIncidenteTorreon.RESUELTO) return "RESUELTO";
  return undefined;
};

const normalizeTipo = (tipo?: string) => {
  const value = String(tipo ?? "").trim().toUpperCase();
  if (["ARRASTRE", "INCIDENTE_ARRASTRE", "ARRASTRE_TORREON"].includes(value)) return "ARRASTRE";
  if (["NATURAL", "MOVIMIENTO", "FERRO"].includes(value)) return "NATURAL";
  return undefined;
};

const withNaturalMeta = <T extends Record<string, unknown>>(incidente: T) => ({
  ...incidente,
  _torreonTipo: "NATURAL" as const,
  tipoIncidente: "NATURAL" as const,
});

const withArrastreMeta = <T extends Record<string, unknown>>(incidente: T) => ({
  ...incidente,
  _torreonTipo: "ARRASTRE" as const,
  tipoIncidente: "ARRASTRE" as const,
});

const compareIncidentesDesc = (
  a: { fechaInicio: Date; id: number },
  b: { fechaInicio: Date; id: number }
) => {
  const byDate = b.fechaInicio.getTime() - a.fechaInicio.getTime();
  return byDate || b.id - a.id;
};

type BloqueoResourceFilter = {
  viaBloqueadaId?: { in: number[] };
  seccionBloqueadaId?: { in: number[] };
};

export type IncidenteBloqueanteResult = {
  id: number;
  fechaInicio: Date;
  origen: "NATURAL" | "ARRASTRE";
};

function buildMovimientoResourceFilters(refs: MovimientoIncidenteRefs): BloqueoResourceFilter[] {
  const viaIds = normalizeIdList(refs.viaOrigenId, refs.viaDestinoId);
  const seccionIds = normalizeIdList(refs.seccionOrigenId, refs.seccionDestinoId);
  const filters: BloqueoResourceFilter[] = [];

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
      estado: estado as EstadoIncidenteTorreon | undefined,
      movimiento: query.empresaId ? { empresaId: query.empresaId } : undefined,
    });
    const whereArrastre: Prisma.IncidenteArrastreTorreonWhereInput = compact({
      localidadId: query.localidadId,
      estado: estado as EstadoIncidenteArrastreTorreon | undefined,
      arrastre: query.empresaId ? { empresaId: query.empresaId } : undefined,
    });
    const takeForMerge = skip + pageSize;

    const [naturales, arrastres, totalNaturales, totalArrastres] = await Promise.all([
      prismaTorreon.incidenteTorreonFerro.findMany({
        where,
        include: buildIncidenteNaturalListInclude(query.includeFotos === true),
        orderBy: [{ fechaInicio: "desc" }, { id: "desc" }],
        take: takeForMerge,
      }),
      prismaTorreon.incidenteArrastreTorreon.findMany({
        where: whereArrastre,
        include: buildIncidenteArrastreListInclude(query.includeFotos === true),
        orderBy: [{ fechaInicio: "desc" }, { id: "desc" }],
        take: takeForMerge,
      }),
      prismaTorreon.incidenteTorreonFerro.count({ where }),
      prismaTorreon.incidenteArrastreTorreon.count({ where: whereArrastre }),
    ]);
    const total = totalNaturales + totalArrastres;
    const data = [
      ...naturales.map((incidente) => withNaturalMeta(incidente)),
      ...arrastres.map((incidente) => withArrastreMeta(incidente)),
    ].sort(compareIncidentesDesc).slice(skip, skip + pageSize);

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

  static async obtener(id: number, tipo?: string) {
    const normalized = normalizeTipo(tipo);

    if (normalized !== "ARRASTRE") {
      const incidente = await prismaTorreon.incidenteTorreonFerro.findUnique({
        where: { id },
        include: includeIncidenteDetalle,
      });
      if (incidente) return withNaturalMeta(incidente);
      if (normalized === "NATURAL") throw new DomainError(404, "Incidente natural no encontrado");
    }

    const incidenteArrastre = await prismaTorreon.incidenteArrastreTorreon.findUnique({
      where: { id },
      include: includeIncidenteArrastreDetalle,
    });
    if (!incidenteArrastre) throw new DomainError(404, "Incidente no encontrado");
    return withArrastreMeta(incidenteArrastre);
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
  ): Promise<IncidenteBloqueanteResult | null> {
    const filters = buildMovimientoResourceFilters(refs);
    if (!filters.length) return null;

    const [natural, arrastre] = await Promise.all([
      tx.incidenteTorreonFerro.findFirst({
        where: {
          estado: EstadoIncidenteTorreon.ABIERTO,
          localidadId: refs.localidadId,
          ...(excludeIncidentId ? { id: { not: excludeIncidentId } } : {}),
          OR: filters,
        },
        orderBy: { fechaInicio: "asc" },
        select: { id: true, fechaInicio: true },
      }),
      tx.incidenteArrastreTorreon.findFirst({
        where: {
          estado: EstadoIncidenteArrastreTorreon.ABIERTO,
          localidadId: refs.localidadId,
          OR: filters,
        },
        orderBy: { fechaInicio: "asc" },
        select: { id: true, fechaInicio: true },
      }),
    ]);

    const naturalResult = natural ? { ...natural, origen: "NATURAL" as const } : null;
    const arrastreResult = arrastre ? { ...arrastre, origen: "ARRASTRE" as const } : null;
    if (!naturalResult) return arrastreResult;
    if (!arrastreResult) return naturalResult;
    return naturalResult.fechaInicio <= arrastreResult.fechaInicio ? naturalResult : arrastreResult;
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
    await RondaModel.recalcularBloqueosLocalidad(tx, movimiento.localidadId);
    await ArrastreModel.recalcularBloqueosLocalidad(tx, movimiento.localidadId);

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

    if (incidente.movimiento.estado === EstadoMovimientoTorreon.DETENIDO) {
      await tx.movimientoTorreonFerro.update({
        where: { id: incidente.movimientoId },
        data: {
          estado: EstadoMovimientoTorreon.SOLICITADO,
          operadorId: null,
          fechaInicio: null,
          fechaPausa: null,
        },
      });
    }

    await RondaModel.recalcularBloqueosLocalidad(tx, incidente.localidadId);
    await ArrastreModel.recalcularBloqueosLocalidad(tx, incidente.localidadId);
    return updated;
  }

  static async resolver(id: number, input: z.infer<typeof resolverIncidenteSchema>, tipo?: string) {
    const normalized = normalizeTipo(tipo);

    if (normalized !== "ARRASTRE") {
      const natural = await prismaTorreon.incidenteTorreonFerro.findUnique({
        where: { id },
        select: { id: true },
      });
      if (natural) return prismaTorreon.$transaction((tx) => this.resolverTx(tx, id, input));
      if (normalized === "NATURAL") throw new DomainError(404, "Incidente natural no encontrado");
    }

    const arrastre = await prismaTorreon.incidenteArrastreTorreon.findUnique({
      where: { id },
      select: { arrastreId: true },
    });
    if (!arrastre) throw new DomainError(404, "Incidente no encontrado");

    await ArrastreModel.resolverIncidente(arrastre.arrastreId, id, input);
    return this.obtener(id, "ARRASTRE");
  }
}
