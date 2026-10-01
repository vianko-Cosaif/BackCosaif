import { z } from "zod";

const optionalEmail = z.string().trim().email().optional().nullable().or(z.literal(""));

export const clienteCreateSchema = z.object({
  empresaId: z.coerce.number().int().positive(),
  empresaNombre: z.string().trim().min(2).max(160),
  razonSocial: z.string().trim().max(200).optional().nullable(),
  rfc: z.string().trim().toUpperCase().min(12).max(13).optional().nullable(),
  moneda: z.string().trim().toUpperCase().length(3).default("MXN"),
  diasCredito: z.coerce.number().int().min(0).max(365).default(0),
  correoFacturacion: optionalEmail,
  correoCobranza: optionalEmail,
  requiereOrdenCompra: z.boolean().default(false),
  notas: z.string().trim().max(4000).optional().nullable(),
  activo: z.boolean().default(true),
});

export const clienteUpdateSchema = clienteCreateSchema
  .omit({ empresaId: true, empresaNombre: true })
  .partial();

export const clienteListSchema = z.object({
  q: z.string().trim().max(100).optional(),
  activo: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
});

export const contactoCreateSchema = z.object({
  nombre: z.string().trim().min(2).max(160),
  puesto: z.string().trim().max(120).optional().nullable(),
  tipo: z.enum(["COMERCIAL", "FACTURACION", "COBRANZA", "OPERATIVO", "OTRO"]).default("COMERCIAL"),
  email: optionalEmail,
  telefono: z.string().trim().max(40).optional().nullable(),
  principal: z.boolean().default(false),
  activo: z.boolean().default(true),
});

export const contactoUpdateSchema = contactoCreateSchema.partial();
