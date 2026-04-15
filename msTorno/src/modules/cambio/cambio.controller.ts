import type { Request, Response } from "express";
import { prismaTorno } from "../../db/prisma";
import { ok, fail } from "../../utils/http";
import { parseIntParam } from "../../utils/parse";
import { cambioCreateSchema, cambioUpdateSchema } from "./cambio.schemas";

export async function listCambios(req: Request, res: Response) {
  const localidadIdRaw = req.query.localidadId?.toString();
  const where = localidadIdRaw ? { localidadId: parseIntParam(localidadIdRaw, "localidadId") } : {};
  const data = await prismaTorno.cambio.findMany({ where, orderBy: { id: "desc" } });
  return ok(res, data);
}

export async function getCambio(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const data = await prismaTorno.cambio.findUnique({ where: { id } });
  if (!data) return fail(res, 404, "Not found");
  return ok(res, data);
}

export async function createCambio(req: Request, res: Response) {
  const input = cambioCreateSchema.parse(req.body);
  const data = await prismaTorno.cambio.create({ data: input });
  return ok(res, data);
}

export async function updateCambio(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const input = cambioUpdateSchema.parse(req.body);
  const data = await prismaTorno.cambio.update({ where: { id }, data: input });
  return ok(res, data);
}

export async function deleteCambio(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  await prismaTorno.cambio.delete({ where: { id } });
  return ok(res, { ok: true });
}

