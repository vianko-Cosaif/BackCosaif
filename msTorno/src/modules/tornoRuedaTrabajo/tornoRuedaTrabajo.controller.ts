import type { Request, Response } from "express";
import { prismaTorno } from "../../db/prisma";
import { ok, fail } from "../../utils/http";
import { parseIntParam } from "../../utils/parse";
import { getPagination, paginationArgs, respondPaginated } from "../../utils/pagination";
import { tornoRuedaTrabajoCreateSchema, tornoRuedaTrabajoUpdateSchema } from "./tornoRuedaTrabajo.schemas";

const RONDA_FINAL_STATUSES = new Set(["CONCLUIDO", "CANCELADO"]);

function isRondaFinal(status?: string | null) {
  return Boolean(status && RONDA_FINAL_STATUSES.has(status));
}

async function getRondaNoModificableStatusByTornoG(tornoGId: number) {
  const tornoG = await prismaTorno.tornoG.findUnique({
    where: { id: tornoGId },
    include: { rondaServicio: { select: { status: true } } },
  });
  return isRondaFinal(tornoG?.rondaServicio?.status) ? tornoG?.rondaServicio?.status ?? null : null;
}

async function getRondaNoModificableStatusByRueda(id: number) {
  const rueda = await prismaTorno.tornoRuedaTrabajo.findUnique({
    where: { id },
    include: { tornoG: { include: { rondaServicio: { select: { status: true } } } } },
  });
  return isRondaFinal(rueda?.tornoG.rondaServicio?.status) ? rueda?.tornoG.rondaServicio?.status ?? null : null;
}

export async function listTornoRuedas(req: Request, res: Response) {
  const tornoGIdRaw = req.query.tornoGId?.toString();
  const localidadIdRaw = req.query.localidadId?.toString();
  const where: Record<string, unknown> = {};
  if (tornoGIdRaw) where.tornoGId = parseIntParam(tornoGIdRaw, "tornoGId");
  if (localidadIdRaw) {
    where.tornoG = {
      rondaServicio: {
        is: { localidadId: parseIntParam(localidadIdRaw, "localidadId") },
      },
    };
  }
  const pagination = getPagination(req);
  const [data, total] = await Promise.all([
    prismaTorno.tornoRuedaTrabajo.findMany({
      where: where as never,
      orderBy: { id: "desc" },
      include: { tornoG: { include: { rondaServicio: true } } },
      ...paginationArgs(pagination),
    }),
    pagination.enabled ? prismaTorno.tornoRuedaTrabajo.count({ where: where as never }) : Promise.resolve(0),
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
  const rondaStatus = await getRondaNoModificableStatusByTornoG(input.tornoGId);
  if (rondaStatus) return fail(res, 409, `Ronda ${rondaStatus} no puede modificarse`);
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
  const rondaStatus = await getRondaNoModificableStatusByRueda(id);
  if (rondaStatus) return fail(res, 409, `Ronda ${rondaStatus} no puede modificarse`);
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
  const rondaStatus = await getRondaNoModificableStatusByRueda(id);
  if (rondaStatus) return fail(res, 409, `Ronda ${rondaStatus} no puede modificarse`);
  await prismaTorno.tornoRuedaTrabajo.delete({ where: { id } });
  return ok(res, { ok: true });
}
