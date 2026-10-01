import type { Request, Response } from "express";
import { prismaTorno } from "../../db/prisma";
import { ok, fail } from "../../utils/http";
import { parseIntParam } from "../../utils/parse";
import { getPagination, paginationArgs, respondPaginated } from "../../utils/pagination";
import { tornoGCreateSchema, tornoGUpdateSchema } from "./tornoG.schemas";

const RONDA_FINAL_STATUSES = new Set(["CONCLUIDO", "CANCELADO"]);

function isRondaFinal(status?: string | null) {
  return Boolean(status && RONDA_FINAL_STATUSES.has(status));
}

async function getRondaNoModificableStatus(rondaServicioId?: number | null) {
  if (!rondaServicioId) return null;
  const ronda = await prismaTorno.rondaServicio.findUnique({
    where: { id: rondaServicioId },
    select: { status: true },
  });
  return isRondaFinal(ronda?.status) ? ronda?.status ?? null : null;
}

export async function listTornoG(req: Request, res: Response) {
  const torneroIdRaw = req.query.torneroId?.toString();
  const rondaServicioIdRaw = req.query.rondaServicioId?.toString();
  const localidadIdRaw = req.query.localidadId?.toString();

  const where: Record<string, unknown> = {};
  if (torneroIdRaw) where.torneroId = parseIntParam(torneroIdRaw, "torneroId");
  if (rondaServicioIdRaw) where.rondaServicioId = parseIntParam(rondaServicioIdRaw, "rondaServicioId");
  if (localidadIdRaw) {
    where.rondaServicio = {
      is: { localidadId: parseIntParam(localidadIdRaw, "localidadId") },
    };
  }
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
  const rondaStatus = await getRondaNoModificableStatus(input.rondaServicioId);
  if (rondaStatus) return fail(res, 409, `Ronda ${rondaStatus} no puede modificarse`);
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
  const current = await prismaTorno.tornoG.findUnique({
    where: { id },
    include: { rondaServicio: { select: { status: true } } },
  });
  if (!current) return fail(res, 404, "Not found");
  if (isRondaFinal(current.rondaServicio?.status)) {
    return fail(res, 409, `Ronda ${current.rondaServicio?.status} no puede modificarse`);
  }
  const inputRondaStatus = await getRondaNoModificableStatus(input.rondaServicioId);
  if (inputRondaStatus) return fail(res, 409, `Ronda ${inputRondaStatus} no puede modificarse`);
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
  const current = await prismaTorno.tornoG.findUnique({
    where: { id },
    include: { rondaServicio: { select: { status: true } } },
  });
  if (!current) return fail(res, 404, "Not found");
  if (isRondaFinal(current.rondaServicio?.status)) {
    return fail(res, 409, `Ronda ${current.rondaServicio?.status} no puede modificarse`);
  }
  await prismaTorno.tornoG.delete({ where: { id } });
  return ok(res, { ok: true });
}
