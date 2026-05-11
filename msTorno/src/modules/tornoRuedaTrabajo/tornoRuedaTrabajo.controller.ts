import type { Request, Response } from "express";
import { prismaTorno } from "../../db/prisma";
import { ok, fail } from "../../utils/http";
import { parseIntParam } from "../../utils/parse";
import { getPagination, paginationArgs, respondPaginated } from "../../utils/pagination";
import { tornoRuedaTrabajoCreateSchema, tornoRuedaTrabajoUpdateSchema } from "./tornoRuedaTrabajo.schemas";

export async function listTornoRuedas(req: Request, res: Response) {
  const tornoGIdRaw = req.query.tornoGId?.toString();
  const where = tornoGIdRaw ? { tornoGId: parseIntParam(tornoGIdRaw, "tornoGId") } : {};
  const pagination = getPagination(req);
  const [data, total] = await Promise.all([
    prismaTorno.tornoRuedaTrabajo.findMany({
      where,
      orderBy: { id: "desc" },
      ...paginationArgs(pagination),
    }),
    pagination.enabled ? prismaTorno.tornoRuedaTrabajo.count({ where }) : Promise.resolve(0),
  ]);
  return respondPaginated(res, data, total, pagination);
}

export async function getTornoRueda(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const data = await prismaTorno.tornoRuedaTrabajo.findUnique({ where: { id } });
  if (!data) return fail(res, 404, "Not found");
  return ok(res, data);
}

export async function createTornoRueda(req: Request, res: Response) {
  const input = tornoRuedaTrabajoCreateSchema.parse(req.body);
  const data = await prismaTorno.tornoRuedaTrabajo.create({
    data: {
      ...input,
      fechaInicio: input.fechaInicio ?? undefined,
      fechaFin: input.fechaFin ?? undefined,
      duracionSegundos: input.duracionSegundos ?? undefined,
    },
  });
  return ok(res, data);
}

export async function updateTornoRueda(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const input = tornoRuedaTrabajoUpdateSchema.parse(req.body);
  const data = await prismaTorno.tornoRuedaTrabajo.update({
    where: { id },
    data: {
      ...input,
      fechaInicio: input.fechaInicio ?? undefined,
      fechaFin: input.fechaFin ?? undefined,
      duracionSegundos: input.duracionSegundos ?? undefined,
    },
  });
  return ok(res, data);
}

export async function deleteTornoRueda(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  await prismaTorno.tornoRuedaTrabajo.delete({ where: { id } });
  return ok(res, { ok: true });
}
