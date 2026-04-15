import type { Request, Response } from "express";
import { prismaTorno } from "../../db/prisma";
import { ok, fail } from "../../utils/http";
import { parseIntParam } from "../../utils/parse";
import { navaCreateSchema, navaUpdateSchema } from "./nava.schemas";

export async function listNavas(req: Request, res: Response) {
  const localidadIdRaw = req.query.localidadId?.toString();
  const where = localidadIdRaw ? { localidadId: parseIntParam(localidadIdRaw, "localidadId") } : {};
  const data = await prismaTorno.nava.findMany({ where, orderBy: { id: "desc" }, include: { cambios: true } });
  return ok(res, data);
}

export async function getNava(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const data = await prismaTorno.nava.findUnique({ where: { id }, include: { cambios: true } });
  if (!data) return fail(res, 404, "Not found");
  return ok(res, data);
}

export async function createNava(req: Request, res: Response) {
  const input = navaCreateSchema.parse(req.body);
  const data = await prismaTorno.nava.create({ data: input });
  return ok(res, data);
}

export async function updateNava(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const input = navaUpdateSchema.parse(req.body);
  const data = await prismaTorno.nava.update({ where: { id }, data: input });
  return ok(res, data);
}

export async function deleteNava(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  await prismaTorno.nava.delete({ where: { id } });
  return ok(res, { ok: true });
}

