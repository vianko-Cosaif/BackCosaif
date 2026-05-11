import type { Request, Response } from "express";
import { prismaTorno } from "../../db/prisma";
import { ok, fail } from "../../utils/http";
import { parseIntParam } from "../../utils/parse";
<<<<<<< Updated upstream
import {
  rondaServicioConcluirSchema,
  rondaServicioCreateSchema,
  rondaServicioFinalizarEjeSchema,
  rondaServicioIniciarSchema,
  rondaServicioUpdateSchema,
} from "./rondaServicio.schemas";
=======
import { getPagination, paginationArgs, respondPaginated } from "../../utils/pagination";
import { rondaServicioCreateSchema, rondaServicioUpdateSchema } from "./rondaServicio.schemas";
>>>>>>> Stashed changes

const HISTORIAL_STATUSES = ["SOLICITADO", "EN_PROCESO", "CONCLUIDO", "DETENIDO", "CANCELADO"];
const MEDIDA_KEYS = ["l1", "l2", "l3", "l4", "l5", "l6", "r1", "r2", "r3", "r4", "r5", "r6"] as const;
const EMPTY_MEASURE_VALUES = new Set(["", "0", "0.0", "0.00", "0.000", "N/A", "NA", "NO APLICA", "SIN DATO", "NULL", "UNDEFINED"]);

function parseStatusFilter(value: unknown) {
  if (!value) return HISTORIAL_STATUSES;
  const raw = Array.isArray(value) ? value.join(",") : String(value);
  const statuses = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return statuses.length ? statuses : HISTORIAL_STATUSES;
}

function pickMedidas(source: Record<string, unknown> | null | undefined) {
  if (!source) return null;
  return MEDIDA_KEYS.reduce<Record<(typeof MEDIDA_KEYS)[number], unknown>>((acc, key) => {
    acc[key] = source[key];
    return acc;
  }, {} as Record<(typeof MEDIDA_KEYS)[number], unknown>);
}

function hasMeasureValue(value: unknown) {
  if (value == null) return false;
  return !EMPTY_MEASURE_VALUES.has(String(value).trim().toUpperCase());
}

function getActiveWheelPositions(ruedaSolicitud: Record<string, unknown>) {
  const active: Array<{ lado: "L" | "R"; posicion: number }> = [];
  for (const key of MEDIDA_KEYS) {
    if (!hasMeasureValue(ruedaSolicitud[key])) continue;
    active.push({
      lado: key.startsWith("l") ? "L" : "R",
      posicion: Number(key.slice(1)),
    });
  }
  return active;
}

async function ensureTornoGForRonda(
  tx: any,
  args: {
    rondaServicioId: number;
    ruedaSolicitudId: number;
    torneroId: number;
    fechaInicio: Date;
  }
) {
  const ronda = await tx.rondaServicio.findUnique({
    where: { id: args.rondaServicioId },
    include: { ruedaSolicitud: true, tornoG: { include: { detalleRuedas: true } } },
  });
  if (!ronda) throw new Error("RondaServicio no encontrada");

  const activeWheels = getActiveWheelPositions(ronda.ruedaSolicitud as Record<string, unknown>);
  const wheels = activeWheels.length > 0
    ? activeWheels
    : MEDIDA_KEYS.map((key) => ({
        lado: key.startsWith("l") ? "L" as const : "R" as const,
        posicion: Number(key.slice(1)),
      }));

  const tornoG = ronda.tornoG
    ? await tx.tornoG.update({
        where: { id: ronda.tornoG.id },
        data: {
          estado: "EN_PROCESO",
          torneroId: args.torneroId,
          ruedaSolicitudId: args.ruedaSolicitudId,
          cantidadRuedas: wheels.length,
          fechaInicio: ronda.tornoG.fechaInicio ?? args.fechaInicio,
        },
      })
    : await tx.tornoG.create({
        data: {
          rondaServicioId: args.rondaServicioId,
          ruedaSolicitudId: args.ruedaSolicitudId,
          torneroId: args.torneroId,
          estado: "EN_PROCESO",
          cantidadRuedas: wheels.length,
          fechaInicio: args.fechaInicio,
        },
      });

  for (const wheel of wheels) {
    await tx.tornoRuedaTrabajo.upsert({
      where: {
        tornoGId_lado_posicion: {
          tornoGId: tornoG.id,
          lado: wheel.lado,
          posicion: wheel.posicion,
        },
      },
      create: {
        tornoGId: tornoG.id,
        lado: wheel.lado,
        posicion: wheel.posicion,
        estado: "PENDIENTE",
      },
      update: {},
    });
  }

  return tx.tornoG.findUnique({
    where: { id: tornoG.id },
    include: { detalleRuedas: true },
  });
}

export async function listRondasServicio(req: Request, res: Response) {
  const ruedaSolicitudIdRaw = req.query.ruedaSolicitudId?.toString();
  const torneroIdRaw = req.query.torneroId?.toString();
  const statusRaw = req.query.status?.toString();

  const where: Record<string, unknown> = {};
  if (ruedaSolicitudIdRaw) where.ruedaSolicitudId = parseIntParam(ruedaSolicitudIdRaw, "ruedaSolicitudId");
  if (torneroIdRaw) where.torneroId = parseIntParam(torneroIdRaw, "torneroId");
  if (statusRaw) where.status = statusRaw;

  const pagination = getPagination(req);
  const [data, total] = await Promise.all([
    prismaTorno.rondaServicio.findMany({
      where: where as never,
      orderBy: { id: "desc" },
      include: { tornoG: true },
      ...paginationArgs(pagination),
    }),
    pagination.enabled ? prismaTorno.rondaServicio.count({ where: where as never }) : Promise.resolve(0),
  ]);
  return respondPaginated(res, data, total, pagination);
}

export async function historialRondasServicio(req: Request, res: Response) {
  const statusFilter = parseStatusFilter(req.query.status);
  const torneroIdRaw = req.query.torneroId?.toString();
  const movimientoIdRaw = req.query.movimientoId?.toString();
  const servicioIdRaw = req.query.servicioId?.toString() ?? req.query.rondaServicioId?.toString();

  const where: Record<string, unknown> = {
    status: { in: statusFilter },
  };

  if (servicioIdRaw) where.id = parseIntParam(servicioIdRaw, "servicioId");
  if (torneroIdRaw) where.torneroId = parseIntParam(torneroIdRaw, "torneroId");
  if (movimientoIdRaw) {
    where.ruedaSolicitud = {
      movimientoId: parseIntParam(movimientoIdRaw, "movimientoId"),
    };
  }

  const pagination = getPagination(req);
  const [data, total] = await Promise.all([
    prismaTorno.rondaServicio.findMany({
      where: where as never,
      orderBy: { updatedAt: "desc" },
      include: {
        ruedaSolicitud: true,
        ruedasFinal: true,
        tornoG: { include: { detalleRuedas: true } },
        incidentes: { include: { hijos: true } },
      },
      ...paginationArgs(pagination),
    }),
    pagination.enabled ? prismaTorno.rondaServicio.count({ where: where as never }) : Promise.resolve(0),
  ]);

  const historial = data.map((ronda) => {
    // Calcular estado real basado en incidentes activos:
    // - Si hay incidentes NO RESUELTOS → EN_PROCESO (independiente del estado almacenado)
    // - Sin incidentes activos se respeta el estado almacenado del Torneado.
    const incidentesActivos = ronda.incidentes.filter(
      (inc) => inc.resuelto === false || inc.status === 'EN_PROCESO'
    );

    let statusReal = ronda.status;
    if (incidentesActivos.length > 0) {
      statusReal = 'DETENIDO';
    }

    return {
      servicioId: ronda.id,
      rondaServicioId: ronda.id,
      movimientoId: ronda.ruedaSolicitud?.movimientoId ?? null,
      status: statusReal,
      statusAlmacenado: ronda.status,
      torneroId: ronda.torneroId,
      inicio: ronda.inicio,
      fin: ronda.fin,
      creadoEn: ronda.createdAt,
      actualizadoEn: ronda.updatedAt,
      medidasSolicitadas: pickMedidas(ronda.ruedaSolicitud as Record<string, unknown> | null),
      medidasFinales: pickMedidas(ronda.ruedasFinal as Record<string, unknown> | null),
      torno: ronda.tornoG
        ? {
            id: ronda.tornoG.id,
            estado: ronda.tornoG.estado,
            cantidadRuedas: ronda.tornoG.cantidadRuedas,
            ruedasTerminadas: ronda.tornoG.ruedasTerminadas,
            fechaInicio: ronda.tornoG.fechaInicio,
            fechaFin: ronda.tornoG.fechaFin,
            detalleRuedas: ronda.tornoG.detalleRuedas,
          }
        : null,
      tieneIncidente: ronda.incidentes.length > 0,
      incidentesActivos: incidentesActivos.length,
      incidentes: ronda.incidentes,
    };
  });

  return respondPaginated(res, historial, total, pagination);
}

export async function getRondaServicio(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const data = await prismaTorno.rondaServicio.findUnique({
    where: { id },
    include: {
      ruedaSolicitud: true,
      ruedasFinal: true,
      tornoG: { include: { detalleRuedas: true } },
      incidentes: { include: { hijos: true } },
    },
  });
  if (!data) return fail(res, 404, "Not found");
  return ok(res, data);
}

export async function createRondaServicio(req: Request, res: Response) {
  const input = rondaServicioCreateSchema.parse(req.body);

  const data = await prismaTorno.rondaServicio.create({
    data: {
      ruedaSolicitudId: input.ruedaSolicitudId,
      status: "SOLICITADO",
    },
  });

  return ok(res, data);
}

export async function updateRondaServicio(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const input = rondaServicioUpdateSchema.parse(req.body);

  const current = await prismaTorno.rondaServicio.findUnique({
    where: { id },
    include: { incidentes: true },
  });
  if (!current) return fail(res, 404, "Not found");

  if (current.status === "CANCELADO") {
    return fail(res, 409, "Ronda CANCELADO no puede modificarse");
  }

  // Reglas mínimas: DETENIDO/CANCELADO deben ir amarrados a un incidente padre
  if (input.status === "DETENIDO") {
    if (!input.detenidoPorIncidenteId) return fail(res, 400, "detenidoPorIncidenteId requerido");
    const inc = await prismaTorno.incidenteTorno.findUnique({ where: { id: input.detenidoPorIncidenteId } });
    if (!inc || inc.rondaServicioId !== id) return fail(res, 400, "Incidente no pertenece a esta ronda");
  }
  if (input.status === "CANCELADO") {
    if (!input.canceladoPorIncidenteId) return fail(res, 400, "canceladoPorIncidenteId requerido");
    const inc = await prismaTorno.incidenteTorno.findUnique({ where: { id: input.canceladoPorIncidenteId } });
    if (!inc || inc.rondaServicioId !== id) return fail(res, 400, "Incidente no pertenece a esta ronda");
  }

  // EN_PROCESO requiere torneroId
  if (input.status === "EN_PROCESO") {
    const torneroId = input.torneroId ?? current.torneroId;
    if (!torneroId) return fail(res, 400, "torneroId requerido para EN_PROCESO");
  }

  // CONCLUIDO requiere ruedasFinalId
  if (input.status === "CONCLUIDO") {
    const ruedasFinalId = input.ruedasFinalId ?? current.ruedasFinalId;
    if (!ruedasFinalId) return fail(res, 400, "ruedasFinalId requerido para CONCLUIDO");
  }

  const data = await prismaTorno.rondaServicio.update({
    where: { id },
    data: {
      ...input,
      torneroId: input.torneroId ?? undefined,
      inicio: input.inicio ?? undefined,
      fin: input.fin ?? undefined,
      ruedasFinalId: input.ruedasFinalId ?? undefined,
      detenidoPorIncidenteId: input.detenidoPorIncidenteId ?? undefined,
      canceladoPorIncidenteId: input.canceladoPorIncidenteId ?? undefined,
    },
  });

  return ok(res, data);
}

export async function iniciarRondaServicio(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const input = rondaServicioIniciarSchema.parse(req.body);
  const inicio = input.inicio ?? new Date();

  const data = await prismaTorno.$transaction(async (tx) => {
    const current = await tx.rondaServicio.findUnique({
      where: { id },
      include: { ruedaSolicitud: true, incidentes: true },
    });
    if (!current) throw new Error("RondaServicio no encontrada");
    if (current.status === "CANCELADO" || current.status === "CONCLUIDO") {
      throw new Error(`Ronda ${current.status} no puede iniciarse`);
    }

    const ronda = await tx.rondaServicio.update({
      where: { id },
      data: {
        status: "EN_PROCESO",
        torneroId: input.torneroId,
        inicio: current.inicio ?? inicio,
      },
      include: { ruedaSolicitud: true, ruedasFinal: true, incidentes: true },
    });

    const tornoG = await ensureTornoGForRonda(tx, {
      rondaServicioId: id,
      ruedaSolicitudId: current.ruedaSolicitudId,
      torneroId: input.torneroId,
      fechaInicio: current.inicio ?? inicio,
    });

    return { ...ronda, tornoG };
  });

  return ok(res, data);
}

export async function finalizarEjeRondaServicio(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const body = rondaServicioFinalizarEjeSchema.parse({
    ...req.body,
    posicion: req.params.posicion ?? req.body?.posicion,
  });
  const fechaFin = body.fechaFin ?? new Date();

  const data = await prismaTorno.$transaction(async (tx) => {
    const ronda = await tx.rondaServicio.findUnique({
      where: { id },
      include: { tornoG: { include: { detalleRuedas: true } }, ruedaSolicitud: true },
    });
    if (!ronda) throw new Error("RondaServicio no encontrada");
    if (!ronda.tornoG) throw new Error("Torneado no iniciado");
    if (ronda.status === "CANCELADO" || ronda.status === "CONCLUIDO") {
      throw new Error(`Ronda ${ronda.status} no puede modificar ejes`);
    }

    const requestedSides = body.lados?.length ? body.lados : (["L", "R"] as const);
    const updatedIds: number[] = [];

    for (const lado of requestedSides) {
      const work = await tx.tornoRuedaTrabajo.upsert({
        where: {
          tornoGId_lado_posicion: {
            tornoGId: ronda.tornoG.id,
            lado,
            posicion: body.posicion,
          },
        },
        create: {
          tornoGId: ronda.tornoG.id,
          lado,
          posicion: body.posicion,
          estado: "TERMINADO",
          fechaInicio: fechaFin,
          fechaFin,
          duracionSegundos: 0,
        },
        update: {
          estado: "TERMINADO",
          fechaFin,
          duracionSegundos: undefined,
        },
      });
      updatedIds.push(work.id);
    }

    const ruedasTerminadas = await tx.tornoRuedaTrabajo.count({
      where: { tornoGId: ronda.tornoG.id, estado: "TERMINADO" },
    });

    const tornoG = await tx.tornoG.update({
      where: { id: ronda.tornoG.id },
      data: { ruedasTerminadas },
      include: { detalleRuedas: true },
    });

    return { tornoG, updatedIds };
  });

  return ok(res, data);
}

export async function concluirRondaServicio(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const input = rondaServicioConcluirSchema.parse(req.body);
  const fin = input.fin ?? new Date();

  const data = await prismaTorno.$transaction(async (tx) => {
    const current = await tx.rondaServicio.findUnique({
      where: { id },
      include: { tornoG: true },
    });
    if (!current) throw new Error("RondaServicio no encontrada");
    if (current.status === "CANCELADO") throw new Error("Ronda CANCELADO no puede concluirse");

    const ronda = await tx.rondaServicio.update({
      where: { id },
      data: {
        status: "CONCLUIDO",
        ruedasFinalId: input.ruedasFinalId,
        fin,
      },
      include: { ruedaSolicitud: true, ruedasFinal: true, incidentes: true },
    });

    let tornoG = current.tornoG;
    if (tornoG) {
      await tx.tornoRuedaTrabajo.updateMany({
        where: { tornoGId: tornoG.id, estado: { not: "TERMINADO" } },
        data: { estado: "TERMINADO", fechaFin: fin },
      });
      const ruedasTerminadas = await tx.tornoRuedaTrabajo.count({
        where: { tornoGId: tornoG.id, estado: "TERMINADO" },
      });
      tornoG = await tx.tornoG.update({
        where: { id: tornoG.id },
        data: {
          estado: "TERMINADO",
          ruedasFinalId: input.ruedasFinalId,
          ruedasTerminadas,
          fechaFin: fin,
        },
        include: { detalleRuedas: true },
      });
    }

    return { ...ronda, tornoG };
  });

  return ok(res, data);
}

export async function deleteRondaServicio(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  await prismaTorno.rondaServicio.delete({ where: { id } });
  return ok(res, { ok: true });
}
