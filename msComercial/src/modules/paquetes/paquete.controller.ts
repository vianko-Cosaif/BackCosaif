import type { Request, Response } from "express";
import { Prisma } from "../../../generated";
import { prismaComercial } from "../../db/prisma";
import { commercialActor } from "../../security/serviceAuth";
import { CommercialDomainError } from "../../utils/domainError";
import { paginated, paginationArgs, paginationSchema } from "../../utils/pagination";
import { paqueteCreateSchema, paqueteListSchema, paqueteUpdateSchema } from "./paquete.schemas";

const positiveId = (raw: string, label = "paqueteId") => {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new CommercialDomainError(`${label} invalido`);
  return value;
};

async function validateReferences(input: {
  clienteComercialId: number;
  contratoId?: number | null;
  tarifaExcedenteId?: number | null;
}) {
  const [cliente, contrato, tarifa] = await Promise.all([
    prismaComercial.clienteComercial.findUnique({ where: { id: input.clienteComercialId }, select: { id: true, activo: true } }),
    input.contratoId
      ? prismaComercial.contratoComercial.findUnique({ where: { id: input.contratoId }, select: { clienteComercialId: true } })
      : Promise.resolve(null),
    input.tarifaExcedenteId
      ? prismaComercial.tarifaCliente.findUnique({ where: { id: input.tarifaExcedenteId }, select: { clienteComercialId: true, activo: true } })
      : Promise.resolve(null),
  ]);
  if (!cliente) throw new CommercialDomainError("Cliente comercial no encontrado", 404);
  if (!cliente.activo) throw new CommercialDomainError("El cliente comercial esta inactivo", 409);
  if (contrato && contrato.clienteComercialId !== input.clienteComercialId) {
    throw new CommercialDomainError("El contrato no pertenece al cliente", 409);
  }
  if (tarifa && (!tarifa.activo || tarifa.clienteComercialId !== input.clienteComercialId)) {
    throw new CommercialDomainError("La tarifa de excedente no pertenece al cliente o esta inactiva", 409);
  }
}

const include = {
  cliente: { select: { id: true, empresaId: true, empresaNombre: true } },
  contrato: { select: { id: true, folio: true, nombre: true, estado: true } },
  tarifaExcedente: { select: { id: true, concepto: true, importeUnitario: true, moneda: true } },
};

export async function listPaquetes(req: Request, res: Response) {
  const filters = paqueteListSchema.parse(req.query);
  const page = paginationSchema.parse(req.query);
  const where: Prisma.PaqueteComercialWhereInput = {
    ...(filters.clienteComercialId ? { clienteComercialId: filters.clienteComercialId } : {}),
    ...(filters.contratoId ? { contratoId: filters.contratoId } : {}),
    ...(filters.servicio ? { servicio: filters.servicio } : {}),
    ...(filters.origenOperacion ? { origenOperacion: filters.origenOperacion } : {}),
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
    prismaComercial.paqueteComercial.findMany({
      where,
      include,
      orderBy: [{ activo: "desc" }, { vigenciaInicio: "desc" }, { id: "desc" }],
      ...paginationArgs(page),
    }),
    prismaComercial.paqueteComercial.count({ where }),
  ]);
  return res.json(paginated(items, total, page.page, page.pageSize));
}

export async function getPaquete(req: Request, res: Response) {
  const id = positiveId(req.params.id);
  const data = await prismaComercial.paqueteComercial.findUnique({ where: { id }, include });
  if (!data) throw new CommercialDomainError("Paquete no encontrado", 404);
  return res.json(data);
}

export async function createPaquete(req: Request, res: Response) {
  const input = paqueteCreateSchema.parse(req.body);
  await validateReferences(input);
  const actor = commercialActor(req);
  const data = await prismaComercial.paqueteComercial.create({
    data: { ...input, createdById: actor.id, updatedById: actor.id },
    include,
  });
  return res.status(201).json(data);
}

export async function updatePaquete(req: Request, res: Response) {
  const id = positiveId(req.params.id);
  const input = paqueteUpdateSchema.parse(req.body);
  const current = await prismaComercial.paqueteComercial.findUnique({ where: { id } });
  if (!current) throw new CommercialDomainError("Paquete no encontrado", 404);
  const contratoId = input.contratoId === undefined ? current.contratoId : input.contratoId;
  const tarifaExcedenteId = input.tarifaExcedenteId === undefined ? current.tarifaExcedenteId : input.tarifaExcedenteId;
  await validateReferences({ clienteComercialId: current.clienteComercialId, contratoId, tarifaExcedenteId });
  const vigenciaInicio = input.vigenciaInicio ?? current.vigenciaInicio;
  const vigenciaFin = input.vigenciaFin === undefined ? current.vigenciaFin : input.vigenciaFin;
  if (vigenciaFin && vigenciaFin < vigenciaInicio) {
    throw new CommercialDomainError("vigenciaFin debe ser posterior a vigenciaInicio");
  }
  const actor = commercialActor(req);
  const data = await prismaComercial.paqueteComercial.update({
    where: { id },
    data: { ...input, updatedById: actor.id },
    include,
  });
  return res.json(data);
}
