import type { Request, Response } from "express";
import { prismaTorno } from "../../db/prisma";
import { ok, fail } from "../../utils/http";
import { parseIntParam } from "../../utils/parse";
import { getPagination, paginationArgs, respondPaginated } from "../../utils/pagination";
import { ruedasFinalCreateSchema, ruedasFinalUpdateSchema } from "./ruedasFinal.schemas";

export async function listRuedasFinal(req: Request, res: Response) {
  const ruedaSolicitudIdRaw = req.query.ruedaSolicitudId?.toString();
  const where = ruedaSolicitudIdRaw
    ? { ruedaSolicitudId: parseIntParam(ruedaSolicitudIdRaw, "ruedaSolicitudId") }
    : {};
  const pagination = getPagination(req);
  const [data, total] = await Promise.all([
    prismaTorno.ruedasFinal.findMany({
      where,
      orderBy: { id: "desc" },
      ...paginationArgs(pagination),
    }),
    pagination.enabled ? prismaTorno.ruedasFinal.count({ where }) : Promise.resolve(0),
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
  const data = await prismaTorno.ruedasFinal.update({ where: { id }, data: input });
  return ok(res, data);
}

export async function deleteRuedasFinal(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  await prismaTorno.ruedasFinal.delete({ where: { id } });
  return ok(res, { ok: true });
}
