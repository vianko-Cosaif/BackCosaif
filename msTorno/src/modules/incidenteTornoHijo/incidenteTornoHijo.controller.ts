import type { Request, Response } from "express";
import { prismaTorno } from "../../db/prisma";
import { ok, fail } from "../../utils/http";
import { parseIntParam } from "../../utils/parse";
import { incidenteTornoHijoCreateSchema, incidenteTornoHijoUpdateSchema } from "./incidenteTornoHijo.schemas";
import { guardarImagenesTorno } from "../../utils/tornoImagenes";
import { getPagination, paginationArgs, respondPaginated } from "../../utils/pagination";
import { incidenteTornoService, TornoIncidentDomainError } from "../incidenteTorno/incidenteTorno.service";

const RONDA_FINAL_STATUSES = new Set(["CONCLUIDO", "CANCELADO"]);

function handleDomainError(res: Response, error: unknown) {
  if (error instanceof TornoIncidentDomainError) {
    return fail(res, error.statusCode, error.message, error.details);
  }
  throw error;
}

async function getRondaNoModificableStatusDelHijo(hijoId?: number, incidenteTornoId?: number) {
  const parentId = hijoId
    ? (await prismaTorno.incidenteTornoHijo.findUnique({
        where: { id: hijoId },
        select: { incidenteTornoId: true },
      }))?.incidenteTornoId
    : incidenteTornoId;
  if (!parentId) return null;

  const parent = await prismaTorno.incidenteTorno.findUnique({
    where: { id: parentId },
    select: { rondaServicioId: true },
  });
  if (!parent?.rondaServicioId) return null;

  const ronda = await prismaTorno.rondaServicio.findUnique({
    where: { id: parent.rondaServicioId },
    select: { status: true },
  });
  return ronda?.status && RONDA_FINAL_STATUSES.has(ronda.status) ? ronda.status : null;
}

export async function listIncidentesHijos(req: Request, res: Response) {
  const incidenteTornoIdRaw = req.query.incidenteTornoId?.toString();
  const localidadIdRaw = req.query.localidadId?.toString();
  const where: Record<string, unknown> = {};
  if (incidenteTornoIdRaw) where.incidenteTornoId = parseIntParam(incidenteTornoIdRaw, "incidenteTornoId");
  if (localidadIdRaw) {
    where.incidenteTorno = {
      is: { localidadId: parseIntParam(localidadIdRaw, "localidadId") },
    };
  }
  const pagination = getPagination(req);
  const [data, total] = await Promise.all([
    prismaTorno.incidenteTornoHijo.findMany({
      where: where as never,
      orderBy: { id: "desc" },
      include: { incidenteTorno: true },
      ...paginationArgs(pagination),
    }),
    pagination.enabled ? prismaTorno.incidenteTornoHijo.count({ where: where as never }) : Promise.resolve(0),
  ]);
  return respondPaginated(res, data, total, pagination);
}

export async function getIncidenteHijo(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const data = await prismaTorno.incidenteTornoHijo.findUnique({ where: { id } });
  if (!data) return fail(res, 404, "Not found");
  return ok(res, data);
}

export async function createIncidenteHijo(req: Request, res: Response) {
  const input = incidenteTornoHijoCreateSchema.parse(req.body);
  const rondaStatus = await getRondaNoModificableStatusDelHijo(undefined, input.incidenteTornoId);
  if (rondaStatus) {
    return fail(res, 409, `Ronda ${rondaStatus} no puede modificarse`);
  }

  let data;
  try {
    data = await incidenteTornoService.createChild({
      incidenteTornoId: input.incidenteTornoId,
      status: input.status,
      resuelto: input.resuelto,
      comentario: input.comentario ?? undefined,
    });
  } catch (error) {
    return handleDomainError(res, error);
  }

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
  const rondaStatus = await getRondaNoModificableStatusDelHijo(id);
  if (rondaStatus) {
    return fail(res, 409, `Ronda ${rondaStatus} no puede modificarse`);
  }

  const shouldUpdateImages = input.imagen1 !== undefined || input.imagen2 !== undefined || input.imagen3 !== undefined;
  const imagenes = shouldUpdateImages
    ? await guardarImagenesTorno([input.imagen1, input.imagen2, input.imagen3], `incidente_torno_hijo_${id}`)
    : {};

  let data;
  try {
    data = await incidenteTornoService.updateChild(id, {
      status: input.status,
      resuelto: input.resuelto,
      comentario: input.comentario ?? undefined,
    });
  } catch (error) {
    return handleDomainError(res, error);
  }

  if (Object.keys(imagenes).length) {
    data = await prismaTorno.incidenteTornoHijo.update({
      where: { id },
      data: imagenes,
    });
  }

  return ok(res, data);
}

export async function resolveIncidenteHijo(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const input = incidenteTornoHijoUpdateSchema
    .pick({ comentario: true })
    .partial()
    .parse(req.body ?? {});
  const rondaStatus = await getRondaNoModificableStatusDelHijo(id);
  if (rondaStatus) return fail(res, 409, `Ronda ${rondaStatus} no puede modificarse`);

  try {
    const data = await incidenteTornoService.resolveChild(id, {
      comentario: input.comentario ?? undefined,
    });
    return ok(res, data);
  } catch (error) {
    return handleDomainError(res, error);
  }
}

export async function deleteIncidenteHijo(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const rondaStatus = await getRondaNoModificableStatusDelHijo(id);
  if (rondaStatus) return fail(res, 409, `Ronda ${rondaStatus} no puede modificarse`);
  await prismaTorno.incidenteTornoHijo.delete({ where: { id } });
  return ok(res, { ok: true });
}
