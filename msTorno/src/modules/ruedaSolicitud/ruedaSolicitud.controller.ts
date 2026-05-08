import type { Request, Response } from "express";
import { prismaTorno } from "../../db/prisma";
import { ok, fail } from "../../utils/http";
import { parseIntParam } from "../../utils/parse";
import { ruedaSolicitudCreateSchema, ruedaSolicitudUpdateSchema } from "./ruedaSolicitud.schemas";

export async function listRuedaSolicitudes(req: Request, res: Response) {
  const movimientoIdRaw = req.query.movimientoId?.toString();
  const where = movimientoIdRaw ? { movimientoId: parseIntParam(movimientoIdRaw, "movimientoId") } : {};
  const data = await prismaTorno.ruedaSolicitud.findMany({
    where,
    orderBy: { id: "desc" },
  });
  return ok(res, data);
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
  const data = await prismaTorno.ruedaSolicitud.update({ where: { id }, data: input });
  return ok(res, data);
}

export async function deleteRuedaSolicitud(req: Request, res: Response) {
  const id = parseIntParam(String(req.params.id), "id");
  await prismaTorno.ruedaSolicitud.delete({ where: { id } });
  return ok(res, { ok: true });
}

