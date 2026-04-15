import type { Request, Response } from "express";
import { prismaTorno } from "../../db/prisma";
import { ok, fail } from "../../utils/http";
import { parseIntParam } from "../../utils/parse";
import { rondaServicioCreateSchema, rondaServicioUpdateSchema } from "./rondaServicio.schemas";

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

  const current = await prismaTorno.rondaServicio.findUnique({ where: { id } });
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

