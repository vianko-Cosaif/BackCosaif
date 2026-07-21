import type { Request, Response } from "express";
import { Prisma } from "../../../generated";
import { prismaComercial } from "../../db/prisma";
import { commercialActor } from "../../security/serviceAuth";
import { CommercialDomainError } from "../../utils/domainError";
import { paginated, paginationArgs, paginationSchema } from "../../utils/pagination";
import { contratoCreateSchema, contratoListSchema, contratoUpdateSchema } from "./contrato.schemas";

const contractId = (raw: string) => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new CommercialDomainError("Contrato invalido");
  return id;
};

export async function listContratos(req: Request, res: Response) {
  const filters = contratoListSchema.parse(req.query);
  const page = paginationSchema.parse(req.query);
  const where: Prisma.ContratoComercialWhereInput = {
    ...(filters.clienteComercialId ? { clienteComercialId: filters.clienteComercialId } : {}),
    ...(filters.estado ? { estado: filters.estado } : {}),
    ...(filters.q
      ? {
          OR: [
            { folio: { contains: filters.q, mode: "insensitive" } },
            { nombre: { contains: filters.q, mode: "insensitive" } },
            { ordenCompra: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prismaComercial.contratoComercial.findMany({
      where,
      include: {
        cliente: { select: { id: true, empresaId: true, empresaNombre: true } },
        paquetes: {
          where: { activo: true },
          select: { id: true, nombre: true, unidad: true, periodicidad: true, cantidadIncluida: true },
          orderBy: [{ vigenciaInicio: "desc" as const }, { id: "desc" as const }],
          take: 3,
        },
        _count: { select: { tarifas: true, planes: true, paquetes: true } },
      },
      orderBy: [{ fechaInicio: "desc" }, { id: "desc" }],
      ...paginationArgs(page),
    }),
    prismaComercial.contratoComercial.count({ where }),
  ]);
  return res.json(paginated(items, total, page.page, page.pageSize));
}

export async function getContrato(req: Request, res: Response) {
  const id = contractId(req.params.id);
  const data = await prismaComercial.contratoComercial.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, empresaId: true, empresaNombre: true } },
      tarifas: { orderBy: { vigenciaInicio: "desc" } },
      planes: { orderBy: { fechaInicio: "desc" } },
      paquetes: { orderBy: [{ activo: "desc" }, { vigenciaInicio: "desc" }] },
    },
  });
  if (!data) throw new CommercialDomainError("Contrato no encontrado", 404);
  return res.json(data);
}

export async function createContrato(req: Request, res: Response) {
  const input = contratoCreateSchema.parse(req.body);
  const cliente = await prismaComercial.clienteComercial.findUnique({
    where: { id: input.clienteComercialId },
    select: { id: true, activo: true },
  });
  if (!cliente) throw new CommercialDomainError("Cliente comercial no encontrado", 404);
  if (!cliente.activo) throw new CommercialDomainError("El cliente comercial esta inactivo", 409);
  const actor = commercialActor(req);
  const { reglaInicial, ...contratoData } = input;
  const data = await prismaComercial.$transaction(async (tx) => {
    const contrato = await tx.contratoComercial.create({
      data: { ...contratoData, createdById: actor.id, updatedById: actor.id },
    });

    if (reglaInicial) {
      await tx.paqueteComercial.create({
        data: {
          clienteComercialId: contrato.clienteComercialId,
          contratoId: contrato.id,
          nombre: reglaInicial.nombre,
          servicio: reglaInicial.servicio,
          origenOperacion: reglaInicial.origenOperacion,
          unidad: reglaInicial.unidad,
          periodicidad: reglaInicial.periodicidad,
          localidadId: reglaInicial.localidadId,
          estadosIncluidos: reglaInicial.estadosIncluidos,
          cantidadIncluida: reglaInicial.unidad === "TARIFA_FIJA" ? null : reglaInicial.cantidadIncluida,
          vigenciaInicio: contrato.fechaInicio,
          vigenciaFin: contrato.fechaFin,
          notas: reglaInicial.notas,
          createdById: actor.id,
          updatedById: actor.id,
        },
      });
    }

    return tx.contratoComercial.findUniqueOrThrow({
      where: { id: contrato.id },
      include: {
        cliente: { select: { id: true, empresaId: true, empresaNombre: true } },
        paquetes: {
          where: { activo: true },
          select: { id: true, nombre: true, unidad: true, periodicidad: true, cantidadIncluida: true },
          orderBy: [{ vigenciaInicio: "desc" }, { id: "desc" }],
        },
        _count: { select: { tarifas: true, planes: true, paquetes: true } },
      },
    });
  });
  return res.status(201).json(data);
}

export async function updateContrato(req: Request, res: Response) {
  const id = contractId(req.params.id);
  const input = contratoUpdateSchema.parse(req.body);
  const current = await prismaComercial.contratoComercial.findUnique({ where: { id } });
  if (!current) throw new CommercialDomainError("Contrato no encontrado", 404);
  if (current.estado === "CANCELADO") {
    throw new CommercialDomainError("Un contrato cancelado ya no puede editarse", 409);
  }
  const fechaInicio = input.fechaInicio ?? current.fechaInicio;
  const fechaFin = input.fechaFin === undefined ? current.fechaFin : input.fechaFin;
  if (fechaFin && fechaFin < fechaInicio) {
    throw new CommercialDomainError("fechaFin debe ser posterior a fechaInicio");
  }
  const actor = commercialActor(req);
  const data = await prismaComercial.contratoComercial.update({
    where: { id },
    data: { ...input, updatedById: actor.id },
  });
  return res.json(data);
}
