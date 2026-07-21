import type { Request, Response } from "express";
import { Prisma } from "../../../generated";
import { prismaComercial } from "../../db/prisma";
import { commercialActor } from "../../security/serviceAuth";
import { CommercialDomainError } from "../../utils/domainError";
import { paginated, paginationArgs, paginationSchema } from "../../utils/pagination";
import {
  corteCreateSchema,
  corteListSchema,
  corteUpdateSchema,
  gestionCreateSchema,
  gestionListSchema,
  gestionUpdateSchema,
  pagoCreateSchema,
} from "./cobranza.schemas";

const positiveId = (raw: string, label = "id") => {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new CommercialDomainError(`${label} invalido`);
  return value;
};

const corteInclude = {
  cliente: { select: { id: true, empresaId: true, empresaNombre: true, diasCredito: true } },
  contrato: { select: { id: true, folio: true, nombre: true, diaCorte: true } },
  pagos: { orderBy: { fechaPago: "desc" as const } },
  detalles: { orderBy: [{ fechaServicio: "asc" as const }, { id: "asc" as const }] },
  gestiones: { orderBy: { fechaContacto: "desc" as const }, take: 5 },
};

function money(value: unknown | null | undefined) {
  return value == null ? null : Number(value);
}

function withBalance<T extends { total: unknown | null; fechaVencimiento: Date | null; estado: string; pagos: Array<{ monto: unknown }> }>(corte: T) {
  const pagado = corte.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
  const total = money(corte.total);
  const saldo = total == null ? null : Math.max(0, total - pagado);
  const vencido = Boolean(
    corte.fechaVencimiento &&
    corte.fechaVencimiento.getTime() < Date.now() &&
    saldo !== 0 &&
    corte.estado !== "CANCELADO",
  );
  return { ...corte, cobranza: { total, pagado, saldo, vencido, montoPendienteCaptura: total == null } };
}

async function validateClientContract(clienteComercialId: number, contratoId?: number | null) {
  const [cliente, contrato] = await Promise.all([
    prismaComercial.clienteComercial.findUnique({ where: { id: clienteComercialId }, select: { id: true, activo: true } }),
    contratoId ? prismaComercial.contratoComercial.findUnique({ where: { id: contratoId }, select: { clienteComercialId: true } }) : Promise.resolve(null),
  ]);
  if (!cliente) throw new CommercialDomainError("Cliente comercial no encontrado", 404);
  if (!cliente.activo) throw new CommercialDomainError("El cliente comercial esta inactivo", 409);
  if (contrato && contrato.clienteComercialId !== clienteComercialId) {
    throw new CommercialDomainError("El contrato no pertenece al cliente", 409);
  }
}

export async function listCortes(req: Request, res: Response) {
  const filters = corteListSchema.parse(req.query);
  const page = paginationSchema.parse(req.query);
  const where: Prisma.CorteCobroWhereInput = {
    ...(filters.clienteComercialId ? { clienteComercialId: filters.clienteComercialId } : {}),
    ...(filters.contratoId ? { contratoId: filters.contratoId } : {}),
    ...(filters.estado ? { estado: filters.estado } : {}),
    ...(filters.desde ? { fechaCorte: { gte: filters.desde } } : {}),
    ...(filters.hasta ? { fechaCorte: { lte: filters.hasta } } : {}),
  };
  const [items, total] = await Promise.all([
    prismaComercial.corteCobro.findMany({
      where,
      include: corteInclude,
      orderBy: [{ fechaCorte: "desc" }, { id: "desc" }],
      ...paginationArgs(page),
    }),
    prismaComercial.corteCobro.count({ where }),
  ]);
  return res.json(paginated(items.map(withBalance), total, page.page, page.pageSize));
}

export async function getCorte(req: Request, res: Response) {
  const id = positiveId(req.params.id, "corteId");
  const data = await prismaComercial.corteCobro.findUnique({ where: { id }, include: corteInclude });
  if (!data) throw new CommercialDomainError("Corte de cobro no encontrado", 404);
  return res.json(withBalance(data));
}

export async function createCorte(req: Request, res: Response) {
  const input = corteCreateSchema.parse(req.body);
  await validateClientContract(input.clienteComercialId, input.contratoId);
  const actor = commercialActor(req);
  const { detalles, ...corte } = input;
  const data = await prismaComercial.corteCobro.create({
    data: {
      ...corte,
      ...(input.estado === "APROBADO" ? { aprobadoPorId: actor.id, aprobadoAt: new Date() } : {}),
      createdById: actor.id,
      updatedById: actor.id,
      detalles: {
        create: detalles.map((detalle) => ({
          ...detalle,
          evidencia: detalle.evidencia === null ? Prisma.JsonNull : detalle.evidencia as Prisma.InputJsonValue | undefined,
          createdById: actor.id,
          updatedById: actor.id,
        })),
      },
    },
    include: corteInclude,
  });
  return res.status(201).json(withBalance(data));
}

export async function updateCorte(req: Request, res: Response) {
  const id = positiveId(req.params.id, "corteId");
  const input = corteUpdateSchema.parse(req.body);
  const current = await prismaComercial.corteCobro.findUnique({ where: { id }, include: { pagos: true } });
  if (!current) throw new CommercialDomainError("Corte de cobro no encontrado", 404);
  if (current.estado === "PAGADO" || current.estado === "CANCELADO") {
    throw new CommercialDomainError("Un corte pagado o cancelado ya no puede modificarse", 409);
  }
  if (input.contratoId !== undefined) await validateClientContract(current.clienteComercialId, input.contratoId);
  const periodoInicio = input.periodoInicio ?? current.periodoInicio;
  const periodoFin = input.periodoFin ?? current.periodoFin;
  const fechaCorte = input.fechaCorte ?? current.fechaCorte;
  const fechaVencimiento = input.fechaVencimiento === undefined ? current.fechaVencimiento : input.fechaVencimiento;
  if (periodoFin < periodoInicio) throw new CommercialDomainError("periodoFin debe ser posterior a periodoInicio");
  if (fechaVencimiento && fechaVencimiento < fechaCorte) throw new CommercialDomainError("fechaVencimiento debe ser posterior a fechaCorte");
  const actor = commercialActor(req);
  const data = await prismaComercial.corteCobro.update({
    where: { id },
    data: {
      ...input,
      ...(input.estado === "APROBADO" && current.estado !== "APROBADO" ? { aprobadoPorId: actor.id, aprobadoAt: new Date() } : {}),
      updatedById: actor.id,
    },
    include: corteInclude,
  });
  return res.json(withBalance(data));
}

export async function addPago(req: Request, res: Response) {
  const corteId = positiveId(req.params.id, "corteId");
  const input = pagoCreateSchema.parse(req.body);
  const actor = commercialActor(req);
  const data = await prismaComercial.$transaction(async (tx) => {
    const corte = await tx.corteCobro.findUnique({ where: { id: corteId }, include: { pagos: true } });
    if (!corte) throw new CommercialDomainError("Corte de cobro no encontrado", 404);
    if (corte.estado === "CANCELADO") throw new CommercialDomainError("No se puede registrar pago en un corte cancelado", 409);
    await tx.pagoCobranza.create({ data: { ...input, corteId, registradoPorId: actor.id } });
    const pagado = corte.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0) + input.monto;
    const total = money(corte.total);
    const estado = total != null && pagado >= total ? "PAGADO" : "PARCIAL";
    return tx.corteCobro.update({ where: { id: corteId }, data: { estado, updatedById: actor.id }, include: corteInclude });
  });
  return res.status(201).json(withBalance(data));
}

export async function cobranzaSummary(req: Request, res: Response) {
  const clienteComercialId = req.query.clienteComercialId ? positiveId(String(req.query.clienteComercialId), "clienteId") : undefined;
  const cortes = await prismaComercial.corteCobro.findMany({
    where: {
      ...(clienteComercialId ? { clienteComercialId } : {}),
      estado: { notIn: ["CANCELADO"] },
    },
    include: { pagos: { select: { monto: true } } },
  });
  let facturado = 0;
  let cobrado = 0;
  let porCobrar = 0;
  let vencido = 0;
  let sinMonto = 0;
  for (const corte of cortes) {
    const total = money(corte.total);
    const pagado = corte.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
    cobrado += pagado;
    if (total == null) {
      sinMonto += 1;
      continue;
    }
    facturado += total;
    const saldo = Math.max(0, total - pagado);
    porCobrar += saldo;
    if (corte.fechaVencimiento && corte.fechaVencimiento.getTime() < Date.now()) vencido += saldo;
  }
  const [promesas, gestionesPendientes] = await Promise.all([
    prismaComercial.gestionCobranza.aggregate({
      where: { ...(clienteComercialId ? { clienteComercialId } : {}), estado: "PROMESA_PAGO" },
      _sum: { montoPrometido: true },
      _count: true,
    }),
    prismaComercial.gestionCobranza.count({
      where: { ...(clienteComercialId ? { clienteComercialId } : {}), estado: { not: "RESUELTA" } },
    }),
  ]);
  return res.json({
    facturado,
    cobrado,
    porCobrar,
    vencido,
    cortes: cortes.length,
    cortesSinMonto: sinMonto,
    promesasPago: Number(promesas._sum.montoPrometido ?? 0),
    promesas: promesas._count,
    gestionesPendientes,
  });
}

export async function listGestiones(req: Request, res: Response) {
  const filters = gestionListSchema.parse(req.query);
  const page = paginationSchema.parse(req.query);
  const where: Prisma.GestionCobranzaWhereInput = {
    ...(filters.clienteComercialId ? { clienteComercialId: filters.clienteComercialId } : {}),
    ...(filters.corteId ? { corteId: filters.corteId } : {}),
    ...(filters.estado ? { estado: filters.estado } : {}),
  };
  const [items, total] = await Promise.all([
    prismaComercial.gestionCobranza.findMany({
      where,
      include: {
        cliente: { select: { id: true, empresaNombre: true } },
        corte: { select: { id: true, folio: true, total: true, fechaVencimiento: true } },
      },
      orderBy: [{ fechaCompromiso: "asc" }, { fechaContacto: "desc" }],
      ...paginationArgs(page),
    }),
    prismaComercial.gestionCobranza.count({ where }),
  ]);
  return res.json(paginated(items, total, page.page, page.pageSize));
}

export async function createGestion(req: Request, res: Response) {
  const input = gestionCreateSchema.parse(req.body);
  const corte = input.corteId ? await prismaComercial.corteCobro.findUnique({ where: { id: input.corteId } }) : null;
  if (corte && corte.clienteComercialId !== input.clienteComercialId) {
    throw new CommercialDomainError("El corte no pertenece al cliente", 409);
  }
  await validateClientContract(input.clienteComercialId);
  const actor = commercialActor(req);
  const data = await prismaComercial.gestionCobranza.create({
    data: { ...input, createdById: actor.id, updatedById: actor.id },
  });
  return res.status(201).json(data);
}

export async function updateGestion(req: Request, res: Response) {
  const id = positiveId(req.params.id, "gestionId");
  const input = gestionUpdateSchema.parse(req.body);
  const actor = commercialActor(req);
  const data = await prismaComercial.gestionCobranza.update({
    where: { id },
    data: { ...input, updatedById: actor.id },
  });
  return res.json(data);
}
