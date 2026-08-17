import { z } from "zod";

export const corteDetalleSchema = z.object({
  fuente: z.enum(["NATURAL", "ARRASTRE"]),
  fuenteId: z.union([z.string(), z.number()]).transform(String),
  servicio: z.enum(["MOVIMIENTO", "LAVADO", "TORNEADO", "DETENCION", "CANCELACION", "OTRO"]),
  localidadId: z.coerce.number().int().positive().optional().nullable(),
  locomotoraNumero: z.coerce.number().int().positive().optional().nullable(),
  referencia: z.string().trim().max(200).optional().nullable(),
  fechaServicio: z.coerce.date(),
  cantidad: z.coerce.number().positive().default(1),
  importeUnitario: z.coerce.number().min(0).optional().nullable(),
  subtotal: z.coerce.number().min(0).optional().nullable(),
  estadoCobro: z.enum(["PENDIENTE_VALIDACION", "COBRABLE", "NO_COBRABLE", "EN_ACLARACION", "APROBADO", "FACTURADO", "PAGADO", "VENCIDO"]).default("PENDIENTE_VALIDACION"),
  motivoNoCobro: z.string().trim().max(1000).optional().nullable(),
  evidencia: z.unknown().optional().nullable(),
});

const corteBase = z.object({
  clienteComercialId: z.coerce.number().int().positive(),
  contratoId: z.coerce.number().int().positive().optional().nullable(),
  folio: z.string().trim().min(3).max(100),
  periodoInicio: z.coerce.date(),
  periodoFin: z.coerce.date(),
  fechaCorte: z.coerce.date(),
  fechaVencimiento: z.coerce.date().optional().nullable(),
  estado: z.enum(["BORRADOR", "EN_REVISION", "APROBADO", "FACTURADO", "PARCIAL", "PAGADO", "VENCIDO", "CANCELADO"]).default("BORRADOR"),
  subtotal: z.coerce.number().min(0).optional().nullable(),
  iva: z.coerce.number().min(0).optional().nullable(),
  total: z.coerce.number().min(0).optional().nullable(),
  moneda: z.string().trim().toUpperCase().length(3).default("MXN"),
  facturaFolio: z.string().trim().max(100).optional().nullable(),
  facturaUuid: z.string().uuid().optional().nullable(),
  facturaPdfUrl: z.string().trim().url().max(2000).optional().nullable(),
  facturaXmlUrl: z.string().trim().url().max(2000).optional().nullable(),
  notas: z.string().trim().max(4000).optional().nullable(),
});

export const corteCreateSchema = corteBase.extend({
  detalles: z.array(corteDetalleSchema).max(2000).default([]),
}).superRefine((value, context) => {
  if (value.periodoFin < value.periodoInicio) {
    context.addIssue({ code: "custom", path: ["periodoFin"], message: "Debe ser posterior a periodoInicio" });
  }
  if (value.fechaVencimiento && value.fechaVencimiento < value.fechaCorte) {
    context.addIssue({ code: "custom", path: ["fechaVencimiento"], message: "Debe ser posterior a fechaCorte" });
  }
});

export const corteUpdateSchema = corteBase.omit({ clienteComercialId: true, folio: true }).partial();

export const corteListSchema = z.object({
  clienteComercialId: z.coerce.number().int().positive().optional(),
  contratoId: z.coerce.number().int().positive().optional(),
  estado: z.enum(["BORRADOR", "EN_REVISION", "APROBADO", "FACTURADO", "PARCIAL", "PAGADO", "VENCIDO", "CANCELADO"]).optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
});

export const pagoCreateSchema = z.object({
  monto: z.coerce.number().positive(),
  fechaPago: z.coerce.date(),
  referencia: z.string().trim().max(160).optional().nullable(),
  metodo: z.string().trim().max(100).optional().nullable(),
  comprobanteUrl: z.string().trim().url().max(2000).optional().nullable(),
  notas: z.string().trim().max(2000).optional().nullable(),
});

export const gestionCreateSchema = z.object({
  clienteComercialId: z.coerce.number().int().positive(),
  corteId: z.coerce.number().int().positive().optional().nullable(),
  estado: z.enum(["PENDIENTE", "PROMESA_PAGO", "EN_ACLARACION", "RESUELTA"]).default("PENDIENTE"),
  asunto: z.string().trim().min(3).max(200),
  nota: z.string().trim().min(3).max(4000),
  fechaContacto: z.coerce.date().default(() => new Date()),
  fechaCompromiso: z.coerce.date().optional().nullable(),
  montoPrometido: z.coerce.number().positive().optional().nullable(),
  contactoNombre: z.string().trim().max(160).optional().nullable(),
});

export const gestionUpdateSchema = gestionCreateSchema.omit({ clienteComercialId: true, corteId: true }).partial();

export const gestionListSchema = z.object({
  clienteComercialId: z.coerce.number().int().positive().optional(),
  corteId: z.coerce.number().int().positive().optional(),
  estado: z.enum(["PENDIENTE", "PROMESA_PAGO", "EN_ACLARACION", "RESUELTA"]).optional(),
});
