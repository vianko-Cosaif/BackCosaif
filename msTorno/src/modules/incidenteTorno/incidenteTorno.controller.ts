import type { Request, Response } from "express";
import { prismaTorno } from "../../db/prisma";
import { ok, fail } from "../../utils/http";
import { sincronizarStatusRonda } from "../../utils/sincronizarStatusRonda";
import { parseIntParam } from "../../utils/parse";
import { incidenteTornoCreateSchema, incidenteTornoUpdateSchema } from "./incidenteTorno.schemas";
import { incidenteTornoHijoCreateSchema } from "../incidenteTornoHijo/incidenteTornoHijo.schemas";
import { rondaServicioUpdateSchema } from "../rondaServicio/rondaServicio.schemas";
import { guardarImagenesTorno } from "../../utils/tornoImagenes";

async function rondaEstaCancelada(rondaServicioId?: number | null) {
  if (!rondaServicioId) return false;
  const ronda = await prismaTorno.rondaServicio.findUnique({
    where: { id: rondaServicioId },
    select: { status: true },
  });
  return ronda?.status === "CANCELADO";
}

async function incidenteApuntaARondaCancelada(input: {
  rondaServicioId?: number | null;
}) {
  return await rondaEstaCancelada(input.rondaServicioId);
}


export async function listIncidentes(req: Request, res: Response) {
  const ruedaSolicitudIdRaw = req.query.ruedaSolicitudId?.toString();
  const rondaServicioIdRaw = req.query.rondaServicioId?.toString();
  const numeroLocomotoraRaw = req.query.numeroLocomotora?.toString() ?? req.query.locomotiveNumber?.toString();

  const where: Record<string, unknown> = {};
  if (ruedaSolicitudIdRaw) where.ruedaSolicitudId = parseIntParam(ruedaSolicitudIdRaw, "ruedaSolicitudId");
  if (rondaServicioIdRaw) where.rondaServicioId = parseIntParam(rondaServicioIdRaw, "rondaServicioId");
  if (numeroLocomotoraRaw) where.numeroLocomotora = parseIntParam(numeroLocomotoraRaw, "numeroLocomotora");
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
  if (await incidenteApuntaARondaCancelada(input)) {
    return fail(res, 409, "Ronda CANCELADO no puede modificarse");
  }
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
  const current = await prismaTorno.incidenteTorno.findUnique({ where: { id } });
  if (!current) return fail(res, 404, "Not found");
  if (await incidenteApuntaARondaCancelada(current)) {
    return fail(res, 409, "Ronda CANCELADO no puede modificarse");
  }
  if (await incidenteApuntaARondaCancelada(input)) {
    return fail(res, 409, "Ronda CANCELADO no puede modificarse");
  }
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
  sincronizarStatusRonda(data.rondaServicioId ?? current.rondaServicioId).catch(() => {});
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
  const parent = await prismaTorno.incidenteTorno.findUnique({
    where: { id: incidenteTornoId },
    select: { rondaServicioId: true, ruedaSolicitudId: true },
  });
  if (!parent) return fail(res, 404, "Not found");
  if (await incidenteApuntaARondaCancelada(parent)) {
    return fail(res, 409, "Ronda CANCELADO no puede modificarse");
  }
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


export async function updateRondaStatusFromIncidente(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const input = rondaServicioUpdateSchema.parse(req.body);
  if (!input.status) return fail(res, 400, "status requerido");

  const incidente = await prismaTorno.incidenteTorno.findUnique({
    where: { id },
    include: { rondaServicio: true },
  });
  if (!incidente) return fail(res, 404, "Incidente no encontrado");

  const rondaServicio =
    incidente.rondaServicio ??
    (incidente.ruedaSolicitudId
      ? await prismaTorno.rondaServicio.findUnique({
          where: { ruedaSolicitudId: incidente.ruedaSolicitudId },
        })
      : null);
  const rondaServicioId = incidente.rondaServicioId ?? rondaServicio?.id ?? null;
  if (!rondaServicioId || !rondaServicio) {
    return fail(res, 400, "Incidente sin ronda asociada");
  }

  const current = rondaServicio;
  if (current.status === "CANCELADO") {
    return fail(res, 409, "Ronda CANCELADO no puede modificarse");
  }

  if (input.status === "EN_PROCESO") {
    const torneroId = input.torneroId ?? current.torneroId;
    if (!torneroId) return fail(res, 400, "torneroId requerido para EN_PROCESO");
  }

  if (input.status === "CONCLUIDO") {
    const ruedasFinalId = input.ruedasFinalId ?? current.ruedasFinalId;
    if (!ruedasFinalId) return fail(res, 400, "ruedasFinalId requerido para CONCLUIDO");
  }

  const data = await prismaTorno.rondaServicio.update({
    where: { id: rondaServicioId },
    data: {
      ...input,
      torneroId: input.torneroId ?? undefined,
      inicio: input.inicio ?? undefined,
      fin: input.fin ?? undefined,
      ruedasFinalId: input.ruedasFinalId ?? undefined,
      detenidoPorIncidenteId:
        input.status === "DETENIDO" ? id : input.detenidoPorIncidenteId ?? undefined,
      canceladoPorIncidenteId:
        input.status === "CANCELADO" ? id : input.canceladoPorIncidenteId ?? undefined,
    },
  });

  return ok(res, data);
}
