import type { Request, Response } from "express";
import { prismaTorno } from "../../db/prisma";
import { ok, fail } from "../../utils/http";
import { parseIntParam } from "../../utils/parse";
import { incidenteTornoCreateSchema, incidenteTornoUpdateSchema } from "./incidenteTorno.schemas";
import { incidenteTornoHijoCreateSchema } from "../incidenteTornoHijo/incidenteTornoHijo.schemas";
import { guardarImagenesTorno } from "../../utils/tornoImagenes";

export async function listIncidentes(req: Request, res: Response) {
  const ruedaSolicitudIdRaw = req.query.ruedaSolicitudId?.toString();
  const rondaServicioIdRaw = req.query.rondaServicioId?.toString();

  const where: Record<string, unknown> = {};
  if (ruedaSolicitudIdRaw) where.ruedaSolicitudId = parseIntParam(ruedaSolicitudIdRaw, "ruedaSolicitudId");
  if (rondaServicioIdRaw) where.rondaServicioId = parseIntParam(rondaServicioIdRaw, "rondaServicioId");
  const data = await prismaTorno.incidenteTorno.findMany({
    where: where as never,
    orderBy: { id: "desc" },
    include: { hijos: true, rondaServicio: true },
  });
  return ok(res, data);
}

export async function getIncidente(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const data = await prismaTorno.incidenteTorno.findUnique({
    where: { id },
    include: { hijos: true, ruedaSolicitud: true, rondaServicio: true },
  });
  if (!data) return fail(res, 404, "Not found");
  return ok(res, data);
}

export async function createIncidente(req: Request, res: Response) {
  const input = incidenteTornoCreateSchema.parse(req.body);
  const data = await prismaTorno.incidenteTorno.create({
    data: {
      ...input,
      comentario: input.comentario ?? undefined,
      atendidoPorId: input.atendidoPorId ?? undefined,
      imagen1: undefined,
      imagen2: undefined,
      imagen3: undefined,
      fechaAtencion: input.fechaAtencion ?? undefined,
      fechaTerminacion: input.fechaTerminacion ?? undefined,
      ruedaSolicitudId: input.ruedaSolicitudId ?? undefined,
      rondaServicioId: input.rondaServicioId ?? undefined,
    },
  });

  const imagenes = await guardarImagenesTorno(
    [input.imagen1, input.imagen2, input.imagen3],
    `incidente_torno_${data.id}`
  );
  const dataConImagenes = await prismaTorno.incidenteTorno.update({
    where: { id: data.id },
    data: imagenes,
  });

  return ok(res, dataConImagenes);
}

export async function updateIncidente(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const input = incidenteTornoUpdateSchema.parse(req.body);
  const shouldUpdateImages = input.imagen1 !== undefined || input.imagen2 !== undefined || input.imagen3 !== undefined;
  const imagenes = shouldUpdateImages
    ? await guardarImagenesTorno([input.imagen1, input.imagen2, input.imagen3], `incidente_torno_${id}`)
    : {};
  const data = await prismaTorno.incidenteTorno.update({
    where: { id },
    data: {
      ...input,
      comentario: input.comentario ?? undefined,
      atendidoPorId: input.atendidoPorId ?? undefined,
      ...imagenes,
      fechaAtencion: input.fechaAtencion ?? undefined,
      fechaTerminacion: input.fechaTerminacion ?? undefined,
      ruedaSolicitudId: input.ruedaSolicitudId ?? undefined,
      rondaServicioId: input.rondaServicioId ?? undefined,
    },
  });
  return ok(res, data);
}

export async function deleteIncidente(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  await prismaTorno.incidenteTorno.delete({ where: { id } });
  return ok(res, { ok: true });
}

export async function listHijos(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const data = await prismaTorno.incidenteTornoHijo.findMany({
    where: { incidenteTornoId: id },
    orderBy: { id: "desc" },
  });
  return ok(res, data);
}

export async function createHijo(req: Request, res: Response) {
  const incidenteTornoId = parseIntParam(req.params.id, "id");
  const input = incidenteTornoHijoCreateSchema.parse({ ...req.body, incidenteTornoId });
  const data = await prismaTorno.incidenteTornoHijo.create({
    data: {
      ...input,
      comentario: input.comentario ?? undefined,
      imagen1: undefined,
      imagen2: undefined,
      imagen3: undefined,
    },
  });
  const imagenes = await guardarImagenesTorno(
    [input.imagen1, input.imagen2, input.imagen3],
    `incidente_torno_hijo_${data.id}`
  );
  const dataConImagenes = await prismaTorno.incidenteTornoHijo.update({
    where: { id: data.id },
    data: imagenes,
  });
  return ok(res, dataConImagenes);
}
