import type { Request, Response } from "express";
import { prismaTorno } from "../../db/prisma";
import { ok, fail } from "../../utils/http";
import { parseIntParam } from "../../utils/parse";
import {
  tornoAgendadoActivableQuerySchema,
  tornoAgendadoCreateSchema,
  tornoAgendadoListQuerySchema,
} from "./tornoAgendado.schemas";

async function attachRuedaSolicitud<T extends { idMovimiento: number }>(item: T | null) {
  if (!item) return null;
  const ruedaSolicitud = await prismaTorno.ruedaSolicitud.findFirst({
    where: { movimientoId: item.idMovimiento },
    orderBy: { id: "desc" },
  });
  return { ...item, ruedaSolicitud, medidasTorno: ruedaSolicitud };
}

export async function createTornoAgendado(req: Request, res: Response) {
  const input = tornoAgendadoCreateSchema.parse(req.body);
  if (input.fechaLimiteActivacion <= input.fechaProgramada) {
    return fail(res, 400, "fechaLimiteActivacion debe ser mayor a fechaProgramada");
  }

  const data = await prismaTorno.tornoAgendado.upsert({
    where: { idMovimiento: input.idMovimiento },
    update: {
      locomotive: input.locomotive,
      tipo: input.tipo,
      localidad: input.localidad ?? null,
      fechaProgramada: input.fechaProgramada,
      fechaLimiteActivacion: input.fechaLimiteActivacion,
      activo: input.activo ?? true,
    },
    create: {
      locomotive: input.locomotive,
      tipo: input.tipo,
      localidad: input.localidad ?? null,
      idMovimiento: input.idMovimiento,
      fechaProgramada: input.fechaProgramada,
      fechaLimiteActivacion: input.fechaLimiteActivacion,
      activo: input.activo ?? true,
    },
  });

  return ok(res, await attachRuedaSolicitud(data));
}

export async function getTornoAgendadoActivable(req: Request, res: Response) {
  const query = tornoAgendadoActivableQuerySchema.parse(req.query);
  const now = new Date();
  const data = await prismaTorno.tornoAgendado.findFirst({
    where: {
      locomotive: query.locomotive,
      tipo: query.tipo,
      activo: true,
      fechaLimiteActivacion: { gte: now },
      ...(query.localidad ? { localidad: query.localidad } : {}),
    },
    orderBy: { fechaProgramada: "asc" },
  });

  if (!data) return ok(res, { activable: false, scheduled: null });
  return ok(res, { activable: true, scheduled: await attachRuedaSolicitud(data) });
}

export async function listTornoAgendados(req: Request, res: Response) {
  const query = tornoAgendadoListQuerySchema.parse(req.query);
  const data = await prismaTorno.tornoAgendado.findMany({
    where: {
      ...(query.locomotive ? { locomotive: query.locomotive } : {}),
      ...(query.tipo ? { tipo: query.tipo } : {}),
      ...(query.localidad ? { localidad: query.localidad } : {}),
      ...(query.activo !== undefined ? { activo: query.activo } : { activo: true }),
    },
    orderBy: { fechaProgramada: "asc" },
    take: 100,
  });

  const items = await Promise.all(data.map(attachRuedaSolicitud));
  return ok(res, { items });
}

export async function deleteTornoAgendadoByMovimiento(req: Request, res: Response) {
  const idMovimiento = parseIntParam(String(req.params.idMovimiento), "idMovimiento");
  await prismaTorno.tornoAgendado.deleteMany({ where: { idMovimiento } });
  return ok(res, { ok: true });
}

export async function deleteTornoAgendadosVencidos(_req: Request, res: Response) {
  const now = new Date();
  const expired = await prismaTorno.tornoAgendado.findMany({
    where: {
      activo: true,
      fechaLimiteActivacion: { lt: now },
    },
    orderBy: { fechaLimiteActivacion: "asc" },
  });

  if (expired.length) {
    await prismaTorno.tornoAgendado.deleteMany({
      where: { id: { in: expired.map((item) => item.id) } },
    });
  }

  return ok(res, { items: expired, count: expired.length });
}
