import type { Request, Response } from "express";
import type { Prisma } from "../../../generated";
import { prismaTorno } from "../../db/prisma";
import { ok, fail } from "../../utils/http";
import { parseIntParam } from "../../utils/parse";
import { guardarImagenesTorno } from "../../utils/tornoImagenes";
import { getPagination, paginationArgs, respondPaginated } from "../../utils/pagination";
import { cambioCreateSchema, cambioStatusSchema, cambioUpdateSchema } from "./cambio.schemas";

async function validarNavaja(localidadId: number, numeroNavaja: number) {
  const nava = await prismaTorno.nava.findUnique({
    where: { localidadId },
    select: { cantidad: true },
  });

  if (!nava) return "No existe configuracion de navajas para la localidad";
  if (numeroNavaja < 1 || numeroNavaja > nava.cantidad) {
    return `numeroNavaja debe estar entre 1 y ${nava.cantidad}`;
  }

  return null;
}

export async function listCambios(req: Request, res: Response) {
  const localidadIdRaw = req.query.localidadId?.toString();
  const numeroNavajaRaw = req.query.numeroNavaja?.toString();
  const statusRaw = req.query.status?.toString();
  const fechaInicioRaw = req.query.fechaInicio?.toString();
  const fechaFinRaw = req.query.fechaFin?.toString();
  const where: Record<string, unknown> = {};

  if (localidadIdRaw) where.localidadId = parseIntParam(localidadIdRaw, "localidadId");
  if (numeroNavajaRaw) where.numeroNavaja = parseIntParam(numeroNavajaRaw, "numeroNavaja");
  if (statusRaw) {
    const parsedStatus = cambioStatusSchema.safeParse(statusRaw.trim().toUpperCase());
    if (!parsedStatus.success) return fail(res, 400, "status invalido");
    where.status = parsedStatus.data;
  }
  if (fechaInicioRaw || fechaFinRaw) {
    where.fechaCambio = {
      ...(fechaInicioRaw ? { gte: new Date(fechaInicioRaw) } : {}),
      ...(fechaFinRaw ? { lte: new Date(fechaFinRaw) } : {}),
    };
  }

  const pagination = getPagination(req);
  const [data, total] = await Promise.all([
    prismaTorno.cambio.findMany({
      where: where as never,
      orderBy: { id: "desc" },
      include: { nava: true },
      ...paginationArgs(pagination),
    }),
    pagination.enabled ? prismaTorno.cambio.count({ where: where as never }) : Promise.resolve(0),
  ]);
  return respondPaginated(res, data, total, pagination);
}

export async function getCambioStats(req: Request, res: Response) {
  const localidadIdRaw = req.query.localidadId?.toString();
  const baseWhere: Prisma.CambioWhereInput = localidadIdRaw
    ? { localidadId: parseIntParam(localidadIdRaw, "localidadId") }
    : {};
  const now = new Date();
  const ultimos30Dias = new Date(now);
  ultimos30Dias.setUTCDate(ultimos30Dias.getUTCDate() - 30);
  const inicioTendencia = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

  const [
    totalCambios,
    concluidos,
    pendientes,
    cambiosUltimos30Dias,
    conEvidencia,
    rango,
    gruposNavaja,
    fechasTendencia,
    configuraciones,
  ] = await Promise.all([
    prismaTorno.cambio.count({ where: baseWhere }),
    prismaTorno.cambio.count({ where: { ...baseWhere, status: "CONCLUIDO" } }),
    prismaTorno.cambio.count({ where: { ...baseWhere, status: "PENDIENTE" } }),
    prismaTorno.cambio.count({ where: { ...baseWhere, fechaCambio: { gte: ultimos30Dias } } }),
    prismaTorno.cambio.count({
      where: {
        ...baseWhere,
        OR: [{ imagen1: { not: null } }, { imagen2: { not: null } }, { imagen3: { not: null } }],
      },
    }),
    prismaTorno.cambio.aggregate({
      where: baseWhere,
      _min: { fechaCambio: true },
      _max: { fechaCambio: true },
    }),
    prismaTorno.cambio.groupBy({
      by: ["localidadId", "numeroNavaja"],
      where: baseWhere,
      _count: { _all: true },
      _max: { fechaCambio: true },
    }),
    prismaTorno.cambio.findMany({
      where: { ...baseWhere, fechaCambio: { gte: inicioTendencia } },
      select: { fechaCambio: true },
    }),
    prismaTorno.nava.findMany({
      where: localidadIdRaw ? { localidadId: parseIntParam(localidadIdRaw, "localidadId") } : {},
      select: { localidadId: true, cantidad: true },
    }),
  ]);

  const topNavajas = gruposNavaja
    .map((grupo) => ({
      localidadId: grupo.localidadId,
      numeroNavaja: grupo.numeroNavaja,
      total: grupo._count._all,
      ultimaFechaCambio: grupo._max.fechaCambio,
    }))
    .sort((a, b) => b.total - a.total || a.numeroNavaja - b.numeroNavaja)
    .slice(0, 5);

  const conteoMensual = new Map<string, number>();
  for (const item of fechasTendencia) {
    const key = `${item.fechaCambio.getUTCFullYear()}-${String(item.fechaCambio.getUTCMonth() + 1).padStart(2, "0")}`;
    conteoMensual.set(key, (conteoMensual.get(key) ?? 0) + 1);
  }
  const tendenciaMensual = Array.from({ length: 6 }, (_, index) => {
    const fecha = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
    const periodo = `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
    return { periodo, total: conteoMensual.get(periodo) ?? 0 };
  });
  const navajasConfiguradas = configuraciones.reduce((total, item) => total + item.cantidad, 0);

  return ok(res, {
    totalCambios,
    concluidos,
    pendientes,
    cambiosUltimos30Dias,
    navajasDistintas: gruposNavaja.length,
    navajasConfiguradas,
    coberturaNavajas: navajasConfiguradas > 0 ? Math.round((gruposNavaja.length / navajasConfiguradas) * 1000) / 10 : 0,
    conEvidencia,
    coberturaEvidencia: totalCambios > 0 ? Math.round((conEvidencia / totalCambios) * 1000) / 10 : 0,
    primeraFechaCambio: rango._min.fechaCambio,
    ultimaFechaCambio: rango._max.fechaCambio,
    topNavajas,
    tendenciaMensual,
  });
}

export async function getCambio(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const data = await prismaTorno.cambio.findUnique({ where: { id }, include: { nava: true } });
  if (!data) return fail(res, 404, "Not found");
  return ok(res, data);
}

export async function createCambio(req: Request, res: Response) {
  const input = cambioCreateSchema.parse(req.body);
  const errorNavaja = await validarNavaja(input.localidadId, input.numeroNavaja);
  if (errorNavaja) return fail(res, 400, errorNavaja);

  const { imagen1, imagen2, imagen3, ...dataInput } = input;
  const data = await prismaTorno.cambio.create({ data: dataInput });
  const imagenes = await guardarImagenesTorno([imagen1, imagen2, imagen3], `cambio_navaja_${data.id}`);
  const dataConImagenes = await prismaTorno.cambio.update({
    where: { id: data.id },
    data: imagenes as Prisma.CambioUncheckedUpdateInput,
    include: { nava: true },
  });
  return ok(res, dataConImagenes);
}

export async function updateCambio(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  const input = cambioUpdateSchema.parse(req.body);
  const current = await prismaTorno.cambio.findUnique({ where: { id } });
  if (!current) return fail(res, 404, "Not found");

  const localidadId = input.localidadId ?? current.localidadId;
  const numeroNavaja = input.numeroNavaja ?? current.numeroNavaja;
  const errorNavaja = await validarNavaja(localidadId, numeroNavaja);
  if (errorNavaja) return fail(res, 400, errorNavaja);

  const shouldUpdateImages = input.imagen1 !== undefined || input.imagen2 !== undefined || input.imagen3 !== undefined;
  const imagenes = shouldUpdateImages
    ? await guardarImagenesTorno([input.imagen1, input.imagen2, input.imagen3], `cambio_navaja_${id}`)
    : {};
  const { imagen1, imagen2, imagen3, ...dataInput } = input;
  const data = await prismaTorno.cambio.update({
    where: { id },
    data: {
      ...dataInput,
      ...imagenes,
    } as Prisma.CambioUncheckedUpdateInput,
    include: { nava: true },
  });
  return ok(res, data);
}

export async function deleteCambio(req: Request, res: Response) {
  const id = parseIntParam(req.params.id, "id");
  await prismaTorno.cambio.delete({ where: { id } });
  return ok(res, { ok: true });
}
