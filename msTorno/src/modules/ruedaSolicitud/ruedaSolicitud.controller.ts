import type { Request, Response } from "express";
import { prismaTorno } from "../../db/prisma";
import { ok, fail } from "../../utils/http";
import { parseIntParam } from "../../utils/parse";
import { getPagination, paginationArgs, respondPaginated } from "../../utils/pagination";
import { ruedaSolicitudCreateSchema, ruedaSolicitudUpdateSchema } from "./ruedaSolicitud.schemas";

const RONDA_FINAL_STATUSES = new Set(["CONCLUIDO", "CANCELADO"]);

async function getRondaNoModificableStatus(ruedaSolicitudId: number) {
  const ronda = await prismaTorno.rondaServicio.findUnique({
    where: { ruedaSolicitudId },
    select: { status: true },
  });
  return ronda?.status && RONDA_FINAL_STATUSES.has(ronda.status) ? ronda.status : null;
}

export async function listRuedaSolicitudes(req: Request, res: Response) {
  const movimientoIdRaw = req.query.movimientoId?.toString();
  const localidadIdRaw = req.query.localidadId?.toString();
  const where: Record<string, unknown> = {};
  if (movimientoIdRaw) where.movimientoId = parseIntParam(movimientoIdRaw, "movimientoId");
  if (localidadIdRaw) {
    where.rondaServicio = {
      is: { localidadId: parseIntParam(localidadIdRaw, "localidadId") },
    };
  }
  const pagination = getPagination(req);
  const [data, total] = await Promise.all([
    prismaTorno.ruedaSolicitud.findMany({
      where: where as never,
      orderBy: { id: "desc" },
      include: { rondaServicio: true },
      ...paginationArgs(pagination),
    }),
    pagination.enabled ? prismaTorno.ruedaSolicitud.count({ where: where as never }) : Promise.resolve(0),
  ]);
  return respondPaginated(res, data, total, pagination);
}

export async function getRuedaSolicitud(req: Request, res: Response) {
  const id = parseIntParam(String(req.params.id), "id");
  const data = await prismaTorno.ruedaSolicitud.findUnique({ where: { id } });
  if (!data) return fail(res, 404, "Not found");
  return ok(res, data);
}

export async function createRuedaSolicitud(req: Request, res: Response) {
  const input = ruedaSolicitudCreateSchema.parse(req.body);
  const data = await prismaTorno.ruedaSolicitud.create({ data: input });
  return ok(res, data);
}

export async function updateRuedaSolicitud(req: Request, res: Response) {
  const id = parseIntParam(String(req.params.id), "id");
  const input = ruedaSolicitudUpdateSchema.parse(req.body);
  const rondaStatus = await getRondaNoModificableStatus(id);
  if (rondaStatus) return fail(res, 409, `Ronda ${rondaStatus} no puede modificarse`);
  const data = await prismaTorno.ruedaSolicitud.update({ where: { id }, data: input });
  return ok(res, data);
}

export async function deleteRuedaSolicitud(req: Request, res: Response) {
  const id = parseIntParam(String(req.params.id), "id");
  const rondaStatus = await getRondaNoModificableStatus(id);
  if (rondaStatus) return fail(res, 409, `Ronda ${rondaStatus} no puede modificarse`);
  await prismaTorno.ruedaSolicitud.delete({ where: { id } });
  return ok(res, { ok: true });
}
