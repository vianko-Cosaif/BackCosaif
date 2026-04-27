import type { Request, Response } from "express";
import { prismaTorno } from "../../db/prisma";
import { ok, fail } from "../../utils/http";
import { parseIntParam } from "../../utils/parse";
import { incidenteTornoHijoCreateSchema, incidenteTornoHijoUpdateSchema } from "./incidenteTornoHijo.schemas";
import { guardarImagenesTorno } from "../../utils/tornoImagenes";

export async function listIncidentesHijos(req: Request, res: Response) {
  const incidenteTornoIdRaw = req.query.incidenteTornoId?.toString();
  const where = incidenteTornoIdRaw
    ? { incidenteTornoId: parseIntParam(incidenteTornoIdRaw, "incidenteTornoId") }
    : {};
  const data = await prismaTorno.incidenteTornoHijo.findMany({ where, orderBy: { id: "desc" } });
  return ok(res, data);
}

export async function getIncidenteHijo(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const data = await prismaTorno.incidenteTornoHijo.findUnique({ where: { id } });
  if (!data) return fail(res, 404, "Not found");
  return ok(res, data);
}

export async function createIncidenteHijo(req: Request, res: Response) {
  const input = incidenteTornoHijoCreateSchema.parse(req.body);
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

export async function updateIncidenteHijo(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const input = incidenteTornoHijoUpdateSchema.parse(req.body);
  const shouldUpdateImages = input.imagen1 !== undefined || input.imagen2 !== undefined || input.imagen3 !== undefined;
  const imagenes = shouldUpdateImages
    ? await guardarImagenesTorno([input.imagen1, input.imagen2, input.imagen3], `incidente_torno_hijo_${id}`)
    : {};
  const data = await prismaTorno.incidenteTornoHijo.update({
    where: { id },
    data: {
      ...input,
      comentario: input.comentario ?? undefined,
      ...imagenes,
    },
  });
  return ok(res, data);
}

export async function deleteIncidenteHijo(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  await prismaTorno.incidenteTornoHijo.delete({ where: { id } });
  return ok(res, { ok: true });
}
