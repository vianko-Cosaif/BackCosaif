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

const CUT_AUDIT_SUBJECT_PREFIX = "__AUDITORIA_CORTE__:";

const corteInclude = {
  cliente: { select: { id: true, empresaId: true, empresaNombre: true, diasCredito: true } },
  contrato: { select: { id: true, folio: true, nombre: true, diaCorte: true } },
  pagos: { orderBy: { fechaPago: "desc" as const } },
  detalles: { orderBy: [{ fechaServicio: "asc" as const }, { id: "asc" as const }] },
  gestiones: {
    where: { NOT: { asunto: { startsWith: CUT_AUDIT_SUBJECT_PREFIX } } },
    orderBy: { fechaContacto: "desc" as const },
    take: 5,
  },
};

const AUDITED_CUT_FIELDS = [
  "contratoId",
  "periodoInicio",
  "periodoFin",
  "fechaCorte",
  "fechaVencimiento",
  "estado",
  "subtotal",
  "iva",
  "total",
  "moneda",
  "facturaFolio",
  "facturaUuid",
  "facturaPdfUrl",
  "facturaXmlUrl",
  "notas",
] as const;

function auditValue(value: unknown): string | number | boolean | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") return value.toNumber();
  return String(value);
}

function cutChanges(current: Record<string, unknown>, input: Record<string, unknown>) {
  const changes: Record<string, { anterior: ReturnType<typeof auditValue>; nuevo: ReturnType<typeof auditValue> }> = {};
  for (const field of AUDITED_CUT_FIELDS) {
    if (!(field in input) || input[field] === undefined) continue;
    const previous = auditValue(current[field]);
    const next = auditValue(input[field]);
    if (previous !== next) changes[field] = { anterior: previous, nuevo: next };
  }
  return changes;
}

function actionForTransition(previous: string | null, next: string | null) {
  if (!next || previous === next) return "EDITADO";
  if (next === "EN_REVISION") return "ENVIADO_A_REVISION";
  if (next === "APROBADO") return "APROBADO";
  if (next === "FACTURADO") return "FACTURADO";
  if (next === "PAGADO") return "COBRADO";
  if (next === "PARCIAL") return "PAGO_PARCIAL";
  if (next === "CANCELADO") return "CANCELADO";
  return "CAMBIO_DE_ESTADO";
}

function historyActor(actor: ReturnType<typeof commercialActor>) {
  return { actorId: actor.id, actorNombre: actor.name || null, actorRol: actor.role };
}

type CutAuditInput = {
  corteId: number;
  clienteComercialId: number;
  accion: string;
  estadoAnterior?: string | null;
  estadoNuevo?: string | null;
  cambios?: Record<string, unknown>;
  actor: ReturnType<typeof commercialActor>;
};

function serializeAudit(input: CutAuditInput) {
  const payload = {
    accion: input.accion,
    estadoAnterior: input.estadoAnterior ?? null,
    estadoNuevo: input.estadoNuevo ?? null,
    ...historyActor(input.actor),
    cambios: input.cambios ?? {},
  };
  const full = JSON.stringify(payload);
  if (full.length <= 3900) return full;
  const compactChanges = Object.fromEntries(Object.entries(input.cambios ?? {}).map(([field, value]) => [
    field,
    JSON.parse(JSON.stringify(value, (_key, nested) => typeof nested === "string" && nested.length > 180 ? `${nested.slice(0, 177)}…` : nested)),
  ]));
  const compact = JSON.stringify({ ...payload, cambios: compactChanges });
  return compact.length <= 3900 ? compact : JSON.stringify({ ...payload, cambios: { resumen: { anterior: null, nuevo: "Cambio amplio registrado; consulte el corte para el valor vigente." } } });
}

async function writeCorteAudit(tx: Prisma.TransactionClient, input: CutAuditInput) {
  return tx.gestionCobranza.create({
    data: {
      clienteComercialId: input.clienteComercialId,
      corteId: input.corteId,
      estado: "RESUELTA",
      asunto: `${CUT_AUDIT_SUBJECT_PREFIX}${input.accion}`,
      nota: serializeAudit(input),
      fechaContacto: new Date(),
      createdById: input.actor.id,
      updatedById: input.actor.id,
    },
  });
}

function storedHistoryItem(item: { id: number; corteId: number | null; asunto: string; nota: string; createdById: number; fechaContacto: Date }) {
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(item.nota) as Record<string, unknown>;
  } catch {
    payload = {};
  }
  return {
    id: item.id,
    corteId: Number(item.corteId),
    accion: String(payload.accion || item.asunto.slice(CUT_AUDIT_SUBJECT_PREFIX.length) || "EDITADO"),
    estadoAnterior: typeof payload.estadoAnterior === "string" ? payload.estadoAnterior : null,
    estadoNuevo: typeof payload.estadoNuevo === "string" ? payload.estadoNuevo : null,
    actorId: Number(payload.actorId || item.createdById),
    actorNombre: typeof payload.actorNombre === "string" ? payload.actorNombre : null,
    actorRol: typeof payload.actorRol === "string" ? payload.actorRol : "USUARIO",
    cambios: payload.cambios && typeof payload.cambios === "object" ? payload.cambios : {},
    createdAt: item.fechaContacto,
  };
}

function corteHistory(corte: { id: number; estado: string; folio: string; total: unknown; createdById: number; createdAt: Date }, rows: Array<ReturnType<typeof storedHistoryItem>>) {
  const stored = rows.filter((item) => item.corteId === corte.id);
  const data = stored.some((item) => item.accion === "CREADO" || item.accion === "REGISTRO_INICIAL") ? stored : [
    ...stored,
    {
      id: -corte.id,
      corteId: corte.id,
      accion: "REGISTRO_INICIAL",
      estadoAnterior: null,
      estadoNuevo: null,
      actorId: corte.createdById,
      actorNombre: null,
      actorRol: "REGISTRO_PREVIO",
      cambios: {
        folio: { anterior: null, nuevo: corte.folio },
        estadoActual: { anterior: null, nuevo: corte.estado },
        total: { anterior: null, nuevo: money(corte.total) },
      },
      createdAt: corte.createdAt,
    },
  ];
  return data.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime() || right.id - left.id);
}

function money(value: unknown | null | undefined) {
  return value == null ? null : Number(value);
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

function automaticDueDate(periodoFin: Date, diasCredito: unknown) {
  const date = new Date(periodoFin);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + Math.max(0, Number(diasCredito || 0)));
  return date;
}

function withBalance<T extends { total: unknown | null; periodoFin: Date; fechaVencimiento: Date | null; estado: string; pagos: Array<{ monto: unknown }>; cliente?: { diasCredito?: unknown } }>(corte: T) {
  const pagado = corte.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
  const total = money(corte.total);
  const saldo = total == null ? null : Math.max(0, total - pagado);
  const dueDate = corte.fechaVencimiento ?? automaticDueDate(corte.periodoFin, corte.cliente?.diasCredito);
  const hasOpenBalance = saldo != null && saldo > 0 && corte.estado !== "CANCELADO";
  const today = startOfToday();
  const vencido = Boolean(
    dueDate &&
    dueDate.getTime() < today &&
    hasOpenBalance,
  );
  const porVencer = Boolean(
    dueDate &&
    dueDate.getTime() >= today &&
    hasOpenBalance,
  );
  return { ...corte, cobranza: { total, pagado, saldo, vencido, porVencer, montoPendienteCaptura: total == null } };
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
  const includeHistorial = ["1", "true", "si"].includes(String(req.query.includeHistorial || "").toLowerCase());
  const [items, total] = await Promise.all([
    prismaComercial.corteCobro.findMany({
      where,
      include: corteInclude,
      orderBy: [{ fechaCorte: "desc" }, { id: "desc" }],
      ...paginationArgs(page),
    }),
    prismaComercial.corteCobro.count({ where }),
  ]);
  const historyRows = includeHistorial && items.length
    ? (await prismaComercial.gestionCobranza.findMany({
        where: { corteId: { in: items.map((item) => item.id) }, asunto: { startsWith: CUT_AUDIT_SUBJECT_PREFIX } },
        orderBy: [{ fechaContacto: "desc" }, { id: "desc" }],
      })).map(storedHistoryItem)
    : [];
  return res.json(paginated(items.map((item) => ({
    ...withBalance(item),
    ...(includeHistorial ? { historial: corteHistory(item, historyRows) } : {}),
  })), total, page.page, page.pageSize));
}

export async function getCorte(req: Request, res: Response) {
  const id = positiveId(req.params.id, "corteId");
  const data = await prismaComercial.corteCobro.findUnique({ where: { id }, include: corteInclude });
  if (!data) throw new CommercialDomainError("Corte de cobro no encontrado", 404);
  return res.json(withBalance(data));
}

export async function listCorteHistorial(req: Request, res: Response) {
  const corteId = positiveId(req.params.id, "corteId");
  const corte = await prismaComercial.corteCobro.findUnique({ where: { id: corteId }, select: { id: true, estado: true, folio: true, total: true, createdById: true, createdAt: true } });
  if (!corte) throw new CommercialDomainError("Corte de cobro no encontrado", 404);
  const storedRows = await prismaComercial.gestionCobranza.findMany({
    where: { corteId, asunto: { startsWith: CUT_AUDIT_SUBJECT_PREFIX } },
    orderBy: [{ fechaContacto: "desc" }, { id: "desc" }],
    take: 200,
  });
  const data = corteHistory(corte, storedRows.map(storedHistoryItem));
  return res.json({ data, total: data.length });
}

export async function createCorte(req: Request, res: Response) {
  const input = corteCreateSchema.parse(req.body);
  await validateClientContract(input.clienteComercialId, input.contratoId);
  if (!["BORRADOR", "EN_REVISION"].includes(input.estado)) {
    throw new CommercialDomainError("Un corte nuevo debe iniciar como borrador o en revisión", 409);
  }
  const actor = commercialActor(req);
  const { detalles, ...corte } = input;
  const data = await prismaComercial.$transaction(async (tx) => {
    const created = await tx.corteCobro.create({
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
    await writeCorteAudit(tx, {
      corteId: created.id,
      clienteComercialId: created.clienteComercialId,
      accion: "CREADO",
      estadoNuevo: created.estado,
      actor,
      cambios: {
        folio: { anterior: null, nuevo: created.folio },
        periodoInicio: { anterior: null, nuevo: created.periodoInicio.toISOString() },
        periodoFin: { anterior: null, nuevo: created.periodoFin.toISOString() },
        total: { anterior: null, nuevo: money(created.total) },
      },
    });
    return created;
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
  const nextTotal = input.total === undefined ? money(current.total) : input.total;
  const nextInvoice = input.facturaFolio === undefined ? current.facturaFolio : input.facturaFolio;
  const paid = current.pagos.reduce((sum, payment) => sum + Number(payment.monto), 0);
  if (nextTotal != null && nextTotal + 0.005 < paid) {
    throw new CommercialDomainError("El total no puede ser menor que el monto ya cobrado", 409);
  }
  if (input.estado && input.estado !== current.estado) {
    const allowedTransitions: Record<string, string[]> = {
      BORRADOR: ["EN_REVISION", "APROBADO", "CANCELADO"],
      EN_REVISION: ["BORRADOR", "APROBADO", "CANCELADO"],
      APROBADO: ["FACTURADO", "CANCELADO"],
      FACTURADO: ["VENCIDO", "PAGADO", "CANCELADO"],
      VENCIDO: ["FACTURADO", "PAGADO", "CANCELADO"],
      PARCIAL: ["VENCIDO"],
    };
    if (!(allowedTransitions[current.estado] || []).includes(input.estado)) {
      throw new CommercialDomainError(`El corte no puede pasar de ${current.estado} a ${input.estado}`, 409);
    }
  }
  if (input.estado && ["FACTURADO", "PARCIAL", "PAGADO"].includes(input.estado) && !nextInvoice) {
    throw new CommercialDomainError("Capture el folio de factura antes de marcar el corte como facturado", 409);
  }
  const actor = commercialActor(req);
  const changes = cutChanges(current as unknown as Record<string, unknown>, input as unknown as Record<string, unknown>);
  const data = await prismaComercial.$transaction(async (tx) => {
    const updated = await tx.corteCobro.update({
      where: { id },
      data: {
        ...input,
        ...(input.estado === "APROBADO" && current.estado !== "APROBADO" ? { aprobadoPorId: actor.id, aprobadoAt: new Date() } : {}),
        updatedById: actor.id,
      },
      include: corteInclude,
    });
    const detailState = input.estado === "APROBADO" ? "APROBADO" : input.estado === "FACTURADO" ? "FACTURADO" : input.estado === "PAGADO" ? "PAGADO" : null;
    if (detailState) {
      await tx.corteCobroDetalle.updateMany({
        where: { corteId: id, estadoCobro: { not: "NO_COBRABLE" } },
        data: { estadoCobro: detailState, updatedById: actor.id },
      });
    }
    await writeCorteAudit(tx, {
      corteId: id,
      clienteComercialId: updated.clienteComercialId,
      accion: actionForTransition(current.estado, updated.estado),
      estadoAnterior: current.estado,
      estadoNuevo: updated.estado,
      actor,
      cambios: changes,
    });
    return updated;
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
    const total = money(corte.total);
    if (total == null) throw new CommercialDomainError("Capture y apruebe el total antes de registrar un pago", 409);
    if (!["FACTURADO", "PARCIAL", "VENCIDO"].includes(corte.estado)) {
      throw new CommercialDomainError("El corte debe estar facturado antes de registrar un pago", 409);
    }
    const previo = corte.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
    if (previo + input.monto > total + 0.005) {
      throw new CommercialDomainError("El pago supera el saldo pendiente del corte", 409);
    }
    const payment = await tx.pagoCobranza.create({ data: { ...input, corteId, registradoPorId: actor.id } });
    const pagado = previo + input.monto;
    const estado = total != null && pagado >= total ? "PAGADO" : "PARCIAL";
    const updated = await tx.corteCobro.update({ where: { id: corteId }, data: { estado, updatedById: actor.id }, include: corteInclude });
    if (estado === "PAGADO") {
      await tx.corteCobroDetalle.updateMany({
        where: { corteId, estadoCobro: { not: "NO_COBRABLE" } },
        data: { estadoCobro: "PAGADO", updatedById: actor.id },
      });
    }
    await writeCorteAudit(tx, {
      corteId,
      clienteComercialId: updated.clienteComercialId,
      accion: estado === "PAGADO" ? "COBRADO" : "PAGO_PARCIAL",
      estadoAnterior: corte.estado,
      estadoNuevo: estado,
      actor,
      cambios: {
        pago: {
          id: payment.id,
          monto: input.monto,
          fechaPago: input.fechaPago.toISOString(),
          referencia: input.referencia || null,
          metodo: input.metodo || null,
        },
        cobradoAcumulado: { anterior: previo, nuevo: pagado },
        saldo: { anterior: Math.max(0, total - previo), nuevo: Math.max(0, total - pagado) },
      },
    });
    return updated;
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
    include: {
      cliente: { select: { diasCredito: true } },
      pagos: { select: { monto: true } },
    },
  });
  let facturado = 0;
  let cobrado = 0;
  let porCobrar = 0;
  let vencido = 0;
  let porVencer = 0;
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
    const dueDate = corte.fechaVencimiento ?? automaticDueDate(corte.periodoFin, corte.cliente.diasCredito);
    if (dueDate.getTime() < startOfToday()) vencido += saldo;
    else porVencer += saldo;
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
    porVencer,
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
    NOT: { asunto: { startsWith: CUT_AUDIT_SUBJECT_PREFIX } },
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
