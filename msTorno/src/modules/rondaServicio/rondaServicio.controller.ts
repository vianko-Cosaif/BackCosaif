import type { Request, Response } from "express";
import { prismaTorno } from "../../db/prisma";
import { ok, fail } from "../../utils/http";
import { parseIntParam } from "../../utils/parse";
import { rondaServicioCreateSchema, rondaServicioUpdateSchema } from "./rondaServicio.schemas";

const HISTORIAL_STATUSES = ["EN_PROCESO", "CONCLUIDO", "DETENIDO", "CANCELADO"];
const MEDIDA_KEYS = ["l1", "l2", "l3", "l4", "l5", "l6", "r1", "r2", "r3", "r4", "r5", "r6"] as const;

function parseStatusFilter(value: unknown) {
  if (!value) return HISTORIAL_STATUSES;
  const raw = Array.isArray(value) ? value.join(",") : String(value);
  const statuses = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return statuses.length ? statuses : HISTORIAL_STATUSES;
}

function pickMedidas(source: Record<string, unknown> | null | undefined) {
  if (!source) return null;
  return MEDIDA_KEYS.reduce<Record<(typeof MEDIDA_KEYS)[number], unknown>>((acc, key) => {
    acc[key] = source[key];
    return acc;
  }, {} as Record<(typeof MEDIDA_KEYS)[number], unknown>);
}

export async function listRondasServicio(req: Request, res: Response) {
  const ruedaSolicitudIdRaw = req.query.ruedaSolicitudId?.toString();
  const torneroIdRaw = req.query.torneroId?.toString();
  const statusRaw = req.query.status?.toString();

  const where: Record<string, unknown> = {};
  if (ruedaSolicitudIdRaw) where.ruedaSolicitudId = parseIntParam(ruedaSolicitudIdRaw, "ruedaSolicitudId");
  if (torneroIdRaw) where.torneroId = parseIntParam(torneroIdRaw, "torneroId");
  if (statusRaw) where.status = statusRaw;

  const data = await prismaTorno.rondaServicio.findMany({
    where: where as never,
    orderBy: { id: "desc" },
    include: { tornoG: true },
  });
  return ok(res, data);
}

export async function historialRondasServicio(req: Request, res: Response) {
  const statusFilter = parseStatusFilter(req.query.status);
  const torneroIdRaw = req.query.torneroId?.toString();
  const movimientoIdRaw = req.query.movimientoId?.toString();
  const servicioIdRaw = req.query.servicioId?.toString() ?? req.query.rondaServicioId?.toString();

  const where: Record<string, unknown> = {
    status: { in: statusFilter },
  };

  if (servicioIdRaw) where.id = parseIntParam(servicioIdRaw, "servicioId");
  if (torneroIdRaw) where.torneroId = parseIntParam(torneroIdRaw, "torneroId");
  if (movimientoIdRaw) {
    where.ruedaSolicitud = {
      movimientoId: parseIntParam(movimientoIdRaw, "movimientoId"),
    };
  }

  const data = await prismaTorno.rondaServicio.findMany({
    where: where as never,
    orderBy: { updatedAt: "desc" },
    include: {
      ruedaSolicitud: true,
      ruedasFinal: true,
      tornoG: { include: { detalleRuedas: true } },
      incidentes: { include: { hijos: true } },
    },
  });

  const historial = data.map((ronda) => {
    // Calcular estado real basado en incidentes activos:
    // - Si hay incidentes NO RESUELTOS → EN_PROCESO (independiente del estado almacenado)
    // - Si TODOS están RESUELTOS pero status=DETENIDO/CANCELADO → volver a SOLICITADO
    const incidentesActivos = ronda.incidentes.filter(
      (inc) => inc.resuelto === false || inc.status === 'EN_PROCESO'
    );

    let statusReal = ronda.status;
    if (incidentesActivos.length > 0) {
      statusReal = 'EN_PROCESO';
    } else if (
      (ronda.status === 'DETENIDO' || ronda.status === 'CANCELADO') &&
      ronda.incidentes.length > 0
    ) {
      // Si fue detenido por un incidente pero ya todos están resueltos → volver a SOLICITADO
      statusReal = 'SOLICITADO';
    }

    return {
      servicioId: ronda.id,
      rondaServicioId: ronda.id,
      movimientoId: ronda.ruedaSolicitud?.movimientoId ?? null,
      status: statusReal,
      statusAlmacenado: ronda.status,
      torneroId: ronda.torneroId,
      inicio: ronda.inicio,
      fin: ronda.fin,
      creadoEn: ronda.createdAt,
      actualizadoEn: ronda.updatedAt,
      medidasSolicitadas: pickMedidas(ronda.ruedaSolicitud as Record<string, unknown> | null),
      medidasFinales: pickMedidas(ronda.ruedasFinal as Record<string, unknown> | null),
      torno: ronda.tornoG
        ? {
            id: ronda.tornoG.id,
            estado: ronda.tornoG.estado,
            cantidadRuedas: ronda.tornoG.cantidadRuedas,
            ruedasTerminadas: ronda.tornoG.ruedasTerminadas,
            fechaInicio: ronda.tornoG.fechaInicio,
            fechaFin: ronda.tornoG.fechaFin,
            detalleRuedas: ronda.tornoG.detalleRuedas,
          }
        : null,
      tieneIncidente: ronda.incidentes.length > 0,
      incidentesActivos: incidentesActivos.length,
      incidentes: ronda.incidentes,
    };
  });

  return ok(res, historial);
}

export async function getRondaServicio(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const data = await prismaTorno.rondaServicio.findUnique({
    where: { id },
    include: {
      ruedaSolicitud: true,
      ruedasFinal: true,
      tornoG: { include: { detalleRuedas: true } },
      incidentes: { include: { hijos: true } },
    },
  });
  if (!data) return fail(res, 404, "Not found");
  return ok(res, data);
}

export async function createRondaServicio(req: Request, res: Response) {
  const input = rondaServicioCreateSchema.parse(req.body);

  const data = await prismaTorno.rondaServicio.create({
    data: {
      ruedaSolicitudId: input.ruedaSolicitudId,
      status: "SOLICITADO",
    },
  });

  return ok(res, data);
}

export async function updateRondaServicio(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const input = rondaServicioUpdateSchema.parse(req.body);

  const current = await prismaTorno.rondaServicio.findUnique({
    where: { id },
    include: { incidentes: true },
  });
  if (!current) return fail(res, 404, "Not found");

  if (current.status === "CANCELADO") {
    return fail(res, 409, "Ronda CANCELADO no puede modificarse");
  }

  // Reglas mínimas: DETENIDO/CANCELADO deben ir amarrados a un incidente padre
  if (input.status === "DETENIDO") {
    if (!input.detenidoPorIncidenteId) return fail(res, 400, "detenidoPorIncidenteId requerido");
    const inc = await prismaTorno.incidenteTorno.findUnique({ where: { id: input.detenidoPorIncidenteId } });
    if (!inc || inc.rondaServicioId !== id) return fail(res, 400, "Incidente no pertenece a esta ronda");
  }
  if (input.status === "CANCELADO") {
    if (!input.canceladoPorIncidenteId) return fail(res, 400, "canceladoPorIncidenteId requerido");
    const inc = await prismaTorno.incidenteTorno.findUnique({ where: { id: input.canceladoPorIncidenteId } });
    if (!inc || inc.rondaServicioId !== id) return fail(res, 400, "Incidente no pertenece a esta ronda");
  }

  // EN_PROCESO requiere torneroId
  if (input.status === "EN_PROCESO") {
    const torneroId = input.torneroId ?? current.torneroId;
    if (!torneroId) return fail(res, 400, "torneroId requerido para EN_PROCESO");
  }

  // CONCLUIDO requiere ruedasFinalId
  if (input.status === "CONCLUIDO") {
    const ruedasFinalId = input.ruedasFinalId ?? current.ruedasFinalId;
    if (!ruedasFinalId) return fail(res, 400, "ruedasFinalId requerido para CONCLUIDO");
  }

  const data = await prismaTorno.rondaServicio.update({
    where: { id },
    data: {
      ...input,
      torneroId: input.torneroId ?? undefined,
      inicio: input.inicio ?? undefined,
      fin: input.fin ?? undefined,
      ruedasFinalId: input.ruedasFinalId ?? undefined,
      detenidoPorIncidenteId: input.detenidoPorIncidenteId ?? undefined,
      canceladoPorIncidenteId: input.canceladoPorIncidenteId ?? undefined,
    },
  });

  return ok(res, data);
}

export async function deleteRondaServicio(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  await prismaTorno.rondaServicio.delete({ where: { id } });
  return ok(res, { ok: true });
}
