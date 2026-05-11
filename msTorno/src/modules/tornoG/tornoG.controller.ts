import type { Request, Response } from "express";
import { prismaTorno } from "../../db/prisma";
import { ok, fail } from "../../utils/http";
import { parseIntParam } from "../../utils/parse";
import { getPagination, paginationArgs, respondPaginated } from "../../utils/pagination";
import { tornoGCreateSchema, tornoGUpdateSchema } from "./tornoG.schemas";

export async function listTornoG(req: Request, res: Response) {
  const torneroIdRaw = req.query.torneroId?.toString();
  const rondaServicioIdRaw = req.query.rondaServicioId?.toString();

  const where: Record<string, unknown> = {};
  if (torneroIdRaw) where.torneroId = parseIntParam(torneroIdRaw, "torneroId");
  if (rondaServicioIdRaw) where.rondaServicioId = parseIntParam(rondaServicioIdRaw, "rondaServicioId");
  const pagination = getPagination(req);
  const [data, total] = await Promise.all([
    prismaTorno.tornoG.findMany({
      where: where as never,
      orderBy: { id: "desc" },
      include: { detalleRuedas: true, rondaServicio: true },
      ...paginationArgs(pagination),
    }),
    pagination.enabled ? prismaTorno.tornoG.count({ where: where as never }) : Promise.resolve(0),
  ]);
  return respondPaginated(res, data, total, pagination);
}

export async function getTornoG(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const data = await prismaTorno.tornoG.findUnique({
    where: { id },
    include: { detalleRuedas: true, rondaServicio: true },
  });
  if (!data) return fail(res, 404, "Not found");
  return ok(res, data);
}

export async function createTornoG(req: Request, res: Response) {
  const input = tornoGCreateSchema.parse(req.body);
  const data = await prismaTorno.tornoG.create({
    data: {
      ...input,
      rondaServicioId: input.rondaServicioId ?? undefined,
      ruedaSolicitudId: input.ruedaSolicitudId ?? undefined,
      ruedasFinalId: input.ruedasFinalId ?? undefined,
      fechaInicio: input.fechaInicio ?? undefined,
      fechaFin: input.fechaFin ?? undefined,
    },
  });
  return ok(res, data);
}

export async function updateTornoG(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const input = tornoGUpdateSchema.parse(req.body);
  const data = await prismaTorno.tornoG.update({
    where: { id },
    data: {
      ...input,
      rondaServicioId: input.rondaServicioId ?? undefined,
      ruedaSolicitudId: input.ruedaSolicitudId ?? undefined,
      ruedasFinalId: input.ruedasFinalId ?? undefined,
      fechaInicio: input.fechaInicio ?? undefined,
      fechaFin: input.fechaFin ?? undefined,
    },
  });
  return ok(res, data);
}

export async function deleteTornoG(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  await prismaTorno.tornoG.delete({ where: { id } });
  return ok(res, { ok: true });
}
