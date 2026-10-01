import type { Request, Response } from "express";
import { Prisma } from "../../../generated";
import { z } from "zod";
import { prismaComercial } from "../../db/prisma";
import { commercialActor } from "../../security/serviceAuth";
import { CommercialDomainError } from "../../utils/domainError";
import { paginated, paginationArgs, paginationSchema } from "../../utils/pagination";
import { calculatePlanAmount, validatePlanCanBeApproved, validatePlanTransition } from "./plan.rules";
import {
  planCreateSchema,
  planDetalleCreateSchema,
  planDetalleUpdateSchema,
  planListSchema,
  planUpdateSchema,
} from "./plan.schemas";

const positiveId = (value: string, name = "id") => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new CommercialDomainError(`${name} invalido`);
  return id;
};

const planInclude = {
  cliente: { select: { id: true, empresaId: true, empresaNombre: true, requiereOrdenCompra: true } },
  contrato: { select: { id: true, folio: true, nombre: true, estado: true } },
  detalles: {
    include: { tarifa: { select: { id: true, concepto: true, importeUnitario: true, moneda: true } } },
    orderBy: [{ fechaProgramada: "asc" as const }, { id: "asc" as const }],
  },
};

function withSummary<T extends { detalles: Array<{ cantidad: unknown; importeUnitarioAcordado: unknown | null }> }>(plan: T) {
  const pendientesTarifa = plan.detalles.filter((item) => item.importeUnitarioAcordado == null).length;
  return {
    ...plan,
    resumen: {
      conceptos: plan.detalles.length,
      pendientesTarifa,
      importePlaneado: calculatePlanAmount(plan.detalles).toFixed(2),
    },
  };
}

async function ensureClientContract(clienteComercialId: number, contratoId?: number | null) {
  const [cliente, contrato] = await Promise.all([
    prismaComercial.clienteComercial.findUnique({ where: { id: clienteComercialId } }),
    contratoId ? prismaComercial.contratoComercial.findUnique({ where: { id: contratoId } }) : Promise.resolve(null),
  ]);
  if (!cliente) throw new CommercialDomainError("Cliente comercial no encontrado", 404);
  if (!cliente.activo) throw new CommercialDomainError("El cliente comercial esta inactivo", 409);
  if (contrato && contrato.clienteComercialId !== clienteComercialId) {
    throw new CommercialDomainError("El contrato no pertenece al cliente seleccionado", 409);
  }
  return cliente;
}

async function resolveDetailPrice(
  clienteComercialId: number,
  input: z.infer<typeof planDetalleCreateSchema>,
) {
  if (!input.tarifaId) return input;
  const tarifa = await prismaComercial.tarifaCliente.findUnique({ where: { id: input.tarifaId } });
  if (!tarifa) throw new CommercialDomainError(`Tarifa ${input.tarifaId} no encontrada`, 404);
  if (!tarifa.activo || tarifa.clienteComercialId !== clienteComercialId) {
    throw new CommercialDomainError(`Tarifa ${input.tarifaId} no pertenece al cliente o esta inactiva`, 409);
  }
  if (tarifa.servicio !== input.servicio) {
    throw new CommercialDomainError(`Tarifa ${input.tarifaId} no corresponde al servicio ${input.servicio}`, 409);
  }
  if (input.fechaProgramada < tarifa.vigenciaInicio || (tarifa.vigenciaFin && input.fechaProgramada > tarifa.vigenciaFin)) {
    throw new CommercialDomainError(`Tarifa ${input.tarifaId} fuera de vigencia para la fecha programada`, 409);
  }
  return {
    ...input,
    importeUnitarioAcordado: input.importeUnitarioAcordado ?? Number(tarifa.importeUnitario),
  };
}

export async function listPlanes(req: Request, res: Response) {
  const filters = planListSchema.parse(req.query);
  const page = paginationSchema.parse(req.query);
  const where: Prisma.PlanComercialWhereInput = {
    ...(filters.clienteComercialId ? { clienteComercialId: filters.clienteComercialId } : {}),
    ...(filters.estado ? { estado: filters.estado } : {}),
    ...(filters.desde ? { fechaFin: { gte: filters.desde } } : {}),
    ...(filters.hasta ? { fechaInicio: { lte: filters.hasta } } : {}),
    ...(filters.q
      ? {
          OR: [
            { folio: { contains: filters.q, mode: "insensitive" } },
            { nombre: { contains: filters.q, mode: "insensitive" } },
            { cliente: { empresaNombre: { contains: filters.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prismaComercial.planComercial.findMany({
      where,
      include: planInclude,
      orderBy: [{ fechaInicio: "desc" }, { id: "desc" }],
      ...paginationArgs(page),
    }),
    prismaComercial.planComercial.count({ where }),
  ]);
  return res.json(paginated(items.map(withSummary), total, page.page, page.pageSize));
}

export async function getPlan(req: Request, res: Response) {
  const id = positiveId(req.params.id, "planId");
  const data = await prismaComercial.planComercial.findUnique({ where: { id }, include: planInclude });
  if (!data) throw new CommercialDomainError("Plan comercial no encontrado", 404);
  return res.json(withSummary(data));
}

export async function createPlan(req: Request, res: Response) {
  const input = planCreateSchema.parse(req.body);
  const cliente = await ensureClientContract(input.clienteComercialId, input.contratoId);
  if (cliente.requiereOrdenCompra && input.estado === "APROBADO" && !input.ordenCompra?.trim()) {
    throw new CommercialDomainError("Este cliente requiere orden de compra para aprobar el plan", 409);
  }
  const detalles = await Promise.all(input.detalles.map((item) => resolveDetailPrice(input.clienteComercialId, item)));
  if (input.estado === "APROBADO") {
    validatePlanCanBeApproved({ cliente, ordenCompra: input.ordenCompra, detalles });
  }
  const actor = commercialActor(req);
  const { detalles: _ignored, ...planData } = input;
  const data = await prismaComercial.planComercial.create({
    data: {
      ...planData,
      ...(input.estado === "APROBADO" ? { aprobadoPorId: actor.id, aprobadoAt: new Date() } : {}),
      createdById: actor.id,
      updatedById: actor.id,
      detalles: {
        create: detalles.map((detalle) => ({ ...detalle, createdById: actor.id, updatedById: actor.id })),
      },
    },
    include: planInclude,
  });
  return res.status(201).json(withSummary(data));
}

export async function updatePlan(req: Request, res: Response) {
  const id = positiveId(req.params.id, "planId");
  const input = planUpdateSchema.parse(req.body);
  const current = await prismaComercial.planComercial.findUnique({
    where: { id },
    include: { cliente: true, detalles: true },
  });
  if (!current) throw new CommercialDomainError("Plan comercial no encontrado", 404);
  if (current.estado === "COMPLETADO" || current.estado === "CANCELADO") {
    throw new CommercialDomainError("Un plan completado o cancelado ya no puede editarse", 409);
  }
  if (current.estado !== "BORRADOR") {
    const invalidFields = Object.keys(input).filter((key) => key !== "estado" && key !== "notas");
    if (invalidFields.length) {
      throw new CommercialDomainError(
        "Despues de aprobarse, el plan solo permite cambiar su estado o agregar notas",
        409,
        { camposBloqueados: invalidFields },
      );
    }
  }
  if (input.estado) validatePlanTransition(current.estado, input.estado);
  const fechaInicio = input.fechaInicio ?? current.fechaInicio;
  const fechaFin = input.fechaFin ?? current.fechaFin;
  if (fechaFin < fechaInicio) throw new CommercialDomainError("fechaFin debe ser posterior a fechaInicio");
  if (input.contratoId !== undefined) await ensureClientContract(current.clienteComercialId, input.contratoId);

  const ordenCompra = input.ordenCompra === undefined ? current.ordenCompra : input.ordenCompra;
  if (input.estado === "APROBADO") {
    validatePlanCanBeApproved({ cliente: current.cliente, ordenCompra, detalles: current.detalles });
  }
  const actor = commercialActor(req);
  const data = await prismaComercial.planComercial.update({
    where: { id },
    data: {
      ...input,
      ...(input.estado === "APROBADO" && current.estado !== "APROBADO"
        ? { aprobadoPorId: actor.id, aprobadoAt: new Date() }
        : {}),
      updatedById: actor.id,
    },
    include: planInclude,
  });
  return res.json(withSummary(data));
}

export async function addPlanDetail(req: Request, res: Response) {
  const planId = positiveId(req.params.id, "planId");
  const input = planDetalleCreateSchema.parse(req.body);
  const plan = await prismaComercial.planComercial.findUnique({ where: { id: planId } });
  if (!plan) throw new CommercialDomainError("Plan comercial no encontrado", 404);
  if (plan.estado !== "BORRADOR") {
    throw new CommercialDomainError("Solo se pueden agregar conceptos a planes en borrador", 409);
  }
  const resolved = await resolveDetailPrice(plan.clienteComercialId, input);
  const actor = commercialActor(req);
  const data = await prismaComercial.planComercialDetalle.create({
    data: { ...resolved, planId, createdById: actor.id, updatedById: actor.id },
  });
  return res.status(201).json(data);
}

export async function updatePlanDetail(req: Request, res: Response) {
  const planId = positiveId(req.params.id, "planId");
  const detailId = positiveId(req.params.detailId, "detailId");
  const input = planDetalleUpdateSchema.parse(req.body);
  const current = await prismaComercial.planComercialDetalle.findFirst({
    where: { id: detailId, planId },
    include: { plan: true },
  });
  if (!current) throw new CommercialDomainError("Concepto del plan no encontrado", 404);
  if (current.plan.estado !== "BORRADOR") {
    throw new CommercialDomainError("Solo se pueden editar conceptos de planes en borrador", 409);
  }

  const merged = planDetalleCreateSchema.parse({
    tarifaId: input.tarifaId === undefined ? current.tarifaId : input.tarifaId,
    servicio: input.servicio ?? current.servicio,
    locomotoraNumero: input.locomotoraNumero === undefined ? current.locomotoraNumero : input.locomotoraNumero,
    localidadId: input.localidadId === undefined ? current.localidadId : input.localidadId,
    viaOrigen: input.viaOrigen === undefined ? current.viaOrigen : input.viaOrigen,
    viaDestino: input.viaDestino === undefined ? current.viaDestino : input.viaDestino,
    fechaProgramada: input.fechaProgramada ?? current.fechaProgramada,
    cantidad: input.cantidad ?? Number(current.cantidad),
    importeUnitarioAcordado: input.importeUnitarioAcordado === undefined
      ? input.tarifaId !== undefined && input.tarifaId !== current.tarifaId
        ? null
        : current.importeUnitarioAcordado == null
          ? null
          : Number(current.importeUnitarioAcordado)
      : input.importeUnitarioAcordado,
    estado: input.estado ?? current.estado,
    movimientoId: input.movimientoId === undefined ? current.movimientoId : input.movimientoId,
    notas: input.notas === undefined ? current.notas : input.notas,
  });
  const resolved = await resolveDetailPrice(current.plan.clienteComercialId, merged);
  const actor = commercialActor(req);
  const data = await prismaComercial.planComercialDetalle.update({
    where: { id: detailId },
    data: { ...resolved, updatedById: actor.id },
  });
  return res.json(data);
}

export async function deletePlanDetail(req: Request, res: Response) {
  const planId = positiveId(req.params.id, "planId");
  const detailId = positiveId(req.params.detailId, "detailId");
  const current = await prismaComercial.planComercialDetalle.findFirst({
    where: { id: detailId, planId },
    include: { plan: { select: { estado: true } } },
  });
  if (!current) throw new CommercialDomainError("Concepto del plan no encontrado", 404);
  if (current.plan.estado !== "BORRADOR") {
    throw new CommercialDomainError("Solo se pueden eliminar conceptos de planes en borrador", 409);
  }
  await prismaComercial.planComercialDetalle.delete({ where: { id: detailId } });
  return res.status(204).send();
}
