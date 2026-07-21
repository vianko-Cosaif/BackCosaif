import type { Request, Response } from "express";
import { Prisma } from "../../../generated";
import { prismaComercial } from "../../db/prisma";
import { commercialActor } from "../../security/serviceAuth";
import { CommercialDomainError } from "../../utils/domainError";
import { paginated, paginationArgs, paginationSchema } from "../../utils/pagination";
import {
  clienteCreateSchema,
  clienteListSchema,
  clienteUpdateSchema,
  contactoCreateSchema,
  contactoUpdateSchema,
} from "./cliente.schemas";

const positiveId = (value: string, name = "id") => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new CommercialDomainError(`${name} invalido`);
  return id;
};

export async function listClientes(req: Request, res: Response) {
  const filters = clienteListSchema.parse(req.query);
  const page = paginationSchema.parse(req.query);
  const where: Prisma.ClienteComercialWhereInput = {
    ...(filters.activo !== undefined ? { activo: filters.activo } : {}),
    ...(filters.q
      ? {
          OR: [
            { empresaNombre: { contains: filters.q, mode: "insensitive" } },
            { razonSocial: { contains: filters.q, mode: "insensitive" } },
            { rfc: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prismaComercial.clienteComercial.findMany({
      where,
      orderBy: [{ activo: "desc" }, { empresaNombre: "asc" }],
      include: {
        contactos: { where: { activo: true }, orderBy: [{ principal: "desc" }, { nombre: "asc" }] },
        _count: { select: { contratos: true, tarifas: true, planes: true } },
      },
      ...paginationArgs(page),
    }),
    prismaComercial.clienteComercial.count({ where }),
  ]);

  return res.json(paginated(items, total, page.page, page.pageSize));
}

export async function getCliente(req: Request, res: Response) {
  const id = positiveId(req.params.id);
  const data = await prismaComercial.clienteComercial.findUnique({
    where: { id },
    include: {
      contactos: { orderBy: [{ principal: "desc" }, { nombre: "asc" }] },
      contratos: { orderBy: { fechaInicio: "desc" } },
      tarifas: { orderBy: [{ activo: "desc" }, { vigenciaInicio: "desc" }] },
      _count: { select: { planes: true } },
    },
  });
  if (!data) throw new CommercialDomainError("Cliente comercial no encontrado", 404);
  return res.json(data);
}

export async function createCliente(req: Request, res: Response) {
  const input = clienteCreateSchema.parse(req.body);
  const actor = commercialActor(req);
  const data = await prismaComercial.clienteComercial.create({
    data: { ...input, createdById: actor.id, updatedById: actor.id },
  });
  return res.status(201).json(data);
}

export async function updateCliente(req: Request, res: Response) {
  const id = positiveId(req.params.id);
  const input = clienteUpdateSchema.parse(req.body);
  const actor = commercialActor(req);
  const data = await prismaComercial.clienteComercial.update({
    where: { id },
    data: { ...input, updatedById: actor.id },
  });
  return res.json(data);
}

export async function createContacto(req: Request, res: Response) {
  const clienteComercialId = positiveId(req.params.id, "clienteId");
  const input = contactoCreateSchema.parse(req.body);
  const actor = commercialActor(req);

  const data = await prismaComercial.$transaction(async (tx) => {
    const cliente = await tx.clienteComercial.findUnique({ where: { id: clienteComercialId }, select: { id: true } });
    if (!cliente) throw new CommercialDomainError("Cliente comercial no encontrado", 404);
    if (input.principal) {
      await tx.contactoCliente.updateMany({
        where: { clienteComercialId, tipo: input.tipo, principal: true },
        data: { principal: false, updatedById: actor.id },
      });
    }
    return tx.contactoCliente.create({
      data: { ...input, clienteComercialId, createdById: actor.id, updatedById: actor.id },
    });
  });
  return res.status(201).json(data);
}

export async function updateContacto(req: Request, res: Response) {
  const clienteComercialId = positiveId(req.params.id, "clienteId");
  const contactoId = positiveId(req.params.contactoId, "contactoId");
  const input = contactoUpdateSchema.parse(req.body);
  const actor = commercialActor(req);

  const data = await prismaComercial.$transaction(async (tx) => {
    const contacto = await tx.contactoCliente.findFirst({ where: { id: contactoId, clienteComercialId } });
    if (!contacto) throw new CommercialDomainError("Contacto no encontrado", 404);
    const finalTipo = input.tipo ?? contacto.tipo;
    if (input.principal) {
      await tx.contactoCliente.updateMany({
        where: { clienteComercialId, tipo: finalTipo, principal: true, id: { not: contactoId } },
        data: { principal: false, updatedById: actor.id },
      });
    }
    return tx.contactoCliente.update({
      where: { id: contactoId },
      data: { ...input, updatedById: actor.id },
    });
  });
  return res.json(data);
}
