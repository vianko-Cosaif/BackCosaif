import type { Request, Response } from "express";
import { prismaTorno } from "../../db/prisma";
import { ok, fail } from "../../utils/http";
import { parseIntParam } from "../../utils/parse";
import { getPagination, paginationArgs, respondPaginated } from "../../utils/pagination";
import { ruedasFinalCreateSchema, ruedasFinalUpdateSchema } from "./ruedasFinal.schemas";

const RONDA_FINAL_STATUSES = new Set(["CONCLUIDO", "CANCELADO"]);

function isRondaFinal(status?: string | null) {
  return Boolean(status && RONDA_FINAL_STATUSES.has(status));
}

async function getRondaNoModificableStatusBySolicitud(ruedaSolicitudId: number) {
  const ronda = await prismaTorno.rondaServicio.findUnique({
    where: { ruedaSolicitudId },
    select: { status: true },
  });
  return isRondaFinal(ronda?.status) ? ronda?.status ?? null : null;
}

export async function listRuedasFinal(req: Request, res: Response) {
  const ruedaSolicitudIdRaw = req.query.ruedaSolicitudId?.toString();
  const localidadIdRaw = req.query.localidadId?.toString();
  const where: Record<string, unknown> = {};
  if (ruedaSolicitudIdRaw) where.ruedaSolicitudId = parseIntParam(ruedaSolicitudIdRaw, "ruedaSolicitudId");
  if (localidadIdRaw) {
    where.rondaServicio = {
      is: { localidadId: parseIntParam(localidadIdRaw, "localidadId") },
    };
  }
  const pagination = getPagination(req);
  const [data, total] = await Promise.all([
    prismaTorno.ruedasFinal.findMany({
      where: where as never,
      orderBy: { id: "desc" },
      include: { rondaServicio: true },
      ...paginationArgs(pagination),
    }),
    pagination.enabled ? prismaTorno.ruedasFinal.count({ where: where as never }) : Promise.resolve(0),
  ]);
  return respondPaginated(res, data, total, pagination);
}

export async function getRuedasFinal(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const data = await prismaTorno.ruedasFinal.findUnique({ where: { id } });
  if (!data) return fail(res, 404, "Not found");
  return ok(res, data);
}

export async function createRuedasFinal(req: Request, res: Response) {
  const input = ruedasFinalCreateSchema.parse(req.body);
  const rondaStatus = await getRondaNoModificableStatusBySolicitud(input.ruedaSolicitudId);
  if (rondaStatus) return fail(res, 409, `Ronda ${rondaStatus} no puede modificarse`);
  const data = await prismaTorno.ruedasFinal.upsert({
    where: { ruedaSolicitudId: input.ruedaSolicitudId },
    create: input,
    update: input,
  });
  return ok(res, data);
}

export async function updateRuedasFinal(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const input = ruedasFinalUpdateSchema.parse(req.body);
  const current = await prismaTorno.ruedasFinal.findUnique({
    where: { id },
    include: { rondaServicio: { select: { status: true } } },
  });
  if (!current) return fail(res, 404, "Not found");
  if (isRondaFinal(current.rondaServicio?.status)) {
    return fail(res, 409, `Ronda ${current.rondaServicio?.status} no puede modificarse`);
  }
  const data = await prismaTorno.ruedasFinal.update({ where: { id }, data: input });
  return ok(res, data);
}

export async function deleteRuedasFinal(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const current = await prismaTorno.ruedasFinal.findUnique({
    where: { id },
    include: { rondaServicio: { select: { status: true } } },
  });
  if (!current) return fail(res, 404, "Not found");
  if (isRondaFinal(current.rondaServicio?.status)) {
    return fail(res, 409, `Ronda ${current.rondaServicio?.status} no puede modificarse`);
  }
  await prismaTorno.ruedasFinal.delete({ where: { id } });
  return ok(res, { ok: true });
}
