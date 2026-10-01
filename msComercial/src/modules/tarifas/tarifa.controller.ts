import type { Request, Response } from "express";
import { Prisma } from "../../../generated";
import { prismaComercial } from "../../db/prisma";
import { commercialActor } from "../../security/serviceAuth";
import { CommercialDomainError } from "../../utils/domainError";
import { paginated, paginationArgs, paginationSchema } from "../../utils/pagination";
import { tarifaCreateSchema, tarifaListSchema, tarifaUpdateSchema } from "./tarifa.schemas";

const idParam = (value: string) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new CommercialDomainError("Tarifa invalida");
  return id;
};

async function validateOwnership(input: { clienteComercialId: number; contratoId?: number | null }) {
  const [cliente, contrato] = await Promise.all([
    prismaComercial.clienteComercial.findUnique({ where: { id: input.clienteComercialId }, select: { id: true, activo: true } }),
    input.contratoId
      ? prismaComercial.contratoComercial.findUnique({ where: { id: input.contratoId }, select: { clienteComercialId: true } })
      : Promise.resolve(null),
  ]);
  if (!cliente) throw new CommercialDomainError("Cliente comercial no encontrado", 404);
  if (!cliente.activo) throw new CommercialDomainError("El cliente comercial esta inactivo", 409);
  if (contrato && contrato.clienteComercialId !== input.clienteComercialId) {
    throw new CommercialDomainError("El contrato no pertenece al cliente seleccionado", 409);
  }
}

type TariffIdentity = {
  id?: number;
  clienteComercialId: number;
  contratoId?: number | null;
  servicio: Prisma.EnumTipoServicioComercialFilter["equals"];
  concepto: string;
  unidad: Prisma.EnumUnidadCobroFilter["equals"];
  localidadId?: number | null;
  tipoMovimiento?: string | null;
  vigenciaInicio: Date;
  vigenciaFin?: Date | null;
  activo: boolean;
};

async function ensureNoOverlappingTariff(input: TariffIdentity) {
  if (!input.activo) return;
  const overlapping = await prismaComercial.tarifaCliente.findFirst({
    where: {
      ...(input.id ? { id: { not: input.id } } : {}),
      clienteComercialId: input.clienteComercialId,
      contratoId: input.contratoId ?? null,
      servicio: input.servicio,
      concepto: { equals: input.concepto, mode: "insensitive" },
      unidad: input.unidad,
      localidadId: input.localidadId ?? null,
      tipoMovimiento: input.tipoMovimiento ?? null,
      activo: true,
      ...(input.vigenciaFin ? { vigenciaInicio: { lte: input.vigenciaFin } } : {}),
      OR: [{ vigenciaFin: null }, { vigenciaFin: { gte: input.vigenciaInicio } }],
    },
    select: { id: true, vigenciaInicio: true, vigenciaFin: true },
  });
  if (overlapping) {
    throw new CommercialDomainError(
      "Ya existe una tarifa activa del mismo concepto con vigencia traslapada",
      409,
      { tarifaId: overlapping.id },
    );
  }
}

export async function listTarifas(req: Request, res: Response) {
  const filters = tarifaListSchema.parse(req.query);
  const page = paginationSchema.parse(req.query);
  const where: Prisma.TarifaClienteWhereInput = {
    ...(filters.clienteComercialId ? { clienteComercialId: filters.clienteComercialId } : {}),
    ...(filters.contratoId ? { contratoId: filters.contratoId } : {}),
    ...(filters.servicio ? { servicio: filters.servicio } : {}),
    ...(filters.localidadId ? { localidadId: filters.localidadId } : {}),
    ...(filters.activo !== undefined ? { activo: filters.activo } : {}),
    ...(filters.vigenteEn
      ? {
          vigenciaInicio: { lte: filters.vigenteEn },
          OR: [{ vigenciaFin: null }, { vigenciaFin: { gte: filters.vigenteEn } }],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prismaComercial.tarifaCliente.findMany({
      where,
      include: {
        cliente: { select: { id: true, empresaId: true, empresaNombre: true } },
        contrato: { select: { id: true, folio: true, nombre: true, estado: true } },
      },
      orderBy: [{ activo: "desc" }, { vigenciaInicio: "desc" }, { id: "desc" }],
      ...paginationArgs(page),
    }),
    prismaComercial.tarifaCliente.count({ where }),
  ]);
  return res.json(paginated(items, total, page.page, page.pageSize));
}

export async function createTarifa(req: Request, res: Response) {
  const input = tarifaCreateSchema.parse(req.body);
  await validateOwnership(input);
  await ensureNoOverlappingTariff(input);
  const actor = commercialActor(req);
  const data = await prismaComercial.tarifaCliente.create({
    data: { ...input, createdById: actor.id, updatedById: actor.id },
  });
  return res.status(201).json(data);
}

export async function updateTarifa(req: Request, res: Response) {
  const id = idParam(req.params.id);
  const input = tarifaUpdateSchema.parse(req.body);
  const current = await prismaComercial.tarifaCliente.findUnique({ where: { id } });
  if (!current) throw new CommercialDomainError("Tarifa no encontrada", 404);
  const clienteComercialId = input.clienteComercialId ?? current.clienteComercialId;
  const contratoId = input.contratoId === undefined ? current.contratoId : input.contratoId;
  await validateOwnership({ clienteComercialId, contratoId });

  const vigenciaInicio = input.vigenciaInicio ?? current.vigenciaInicio;
  const vigenciaFin = input.vigenciaFin === undefined ? current.vigenciaFin : input.vigenciaFin;
  if (vigenciaFin && vigenciaFin < vigenciaInicio) {
    throw new CommercialDomainError("vigenciaFin debe ser posterior a vigenciaInicio");
  }

  const protectedFields = new Set([
    "clienteComercialId",
    "contratoId",
    "servicio",
    "concepto",
    "unidad",
    "localidadId",
    "tipoMovimiento",
    "importeUnitario",
    "porcentajeIva",
    "moneda",
    "vigenciaInicio",
    "vigenciaFin",
    "cantidadMinima",
    "importeMinimo",
  ]);
  const changesProtectedData = Object.keys(input).some((key) => protectedFields.has(key));
  if (changesProtectedData) {
    const usedInApprovedPlan = await prismaComercial.planComercialDetalle.findFirst({
      where: { tarifaId: id, plan: { estado: { not: "BORRADOR" } } },
      select: { id: true, planId: true },
    });
    if (usedInApprovedPlan) {
      throw new CommercialDomainError(
        "La tarifa ya se uso en un plan aprobado; desactivala y crea una nueva version",
        409,
        { planId: usedInApprovedPlan.planId },
      );
    }
  }

  await ensureNoOverlappingTariff({
    id,
    clienteComercialId,
    contratoId,
    servicio: input.servicio ?? current.servicio,
    concepto: input.concepto ?? current.concepto,
    unidad: input.unidad ?? current.unidad,
    localidadId: input.localidadId === undefined ? current.localidadId : input.localidadId,
    tipoMovimiento: input.tipoMovimiento === undefined ? current.tipoMovimiento : input.tipoMovimiento,
    vigenciaInicio,
    vigenciaFin,
    activo: input.activo ?? current.activo,
  });

  const actor = commercialActor(req);
  const data = await prismaComercial.tarifaCliente.update({
    where: { id },
    data: { ...input, updatedById: actor.id },
  });
  return res.json(data);
}
