import { z } from "zod";

export const planDetalleCreateSchema = z.object({
  tarifaId: z.coerce.number().int().positive().optional().nullable(),
  servicio: z.enum(["MOVIMIENTO", "LAVADO", "TORNEADO", "DETENCION", "CANCELACION", "OTRO"]),
  locomotoraNumero: z.coerce.number().int().positive().optional().nullable(),
  localidadId: z.coerce.number().int().positive().optional().nullable(),
  viaOrigen: z.string().trim().max(100).optional().nullable(),
  viaDestino: z.string().trim().max(100).optional().nullable(),
  fechaProgramada: z.coerce.date(),
  cantidad: z.coerce.number().positive().max(999_999).default(1),
  importeUnitarioAcordado: z.coerce.number().min(0).max(999_999_999_999).optional().nullable(),
  estado: z.enum(["PLANEADO", "ASIGNADO", "EJECUTADO", "CANCELADO", "NO_REALIZADO"]).default("PLANEADO"),
  movimientoId: z.coerce.number().int().positive().optional().nullable(),
  notas: z.string().trim().max(2000).optional().nullable(),
});

const planBase = z.object({
  clienteComercialId: z.coerce.number().int().positive(),
  contratoId: z.coerce.number().int().positive().optional().nullable(),
  folio: z.string().trim().min(3).max(80),
  nombre: z.string().trim().min(3).max(200),
  periodicidad: z.enum(["UNICO", "SEMANAL", "MENSUAL", "ANUAL"]).default("UNICO"),
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date(),
  estado: z.enum(["BORRADOR", "APROBADO", "EN_EJECUCION", "COMPLETADO", "CANCELADO"]).default("BORRADOR"),
  ordenCompra: z.string().trim().max(120).optional().nullable(),
  notas: z.string().trim().max(4000).optional().nullable(),
});

export const planCreateSchema = planBase.extend({
  detalles: z.array(planDetalleCreateSchema).max(500).default([]),
}).superRefine((value, context) => {
  if (value.fechaFin < value.fechaInicio) {
    context.addIssue({ code: "custom", path: ["fechaFin"], message: "Debe ser posterior a fechaInicio" });
  }
});

export const planUpdateSchema = planBase.omit({ clienteComercialId: true, folio: true }).partial();

export const planDetalleUpdateSchema = planDetalleCreateSchema.partial();

export const planListSchema = z.object({
  clienteComercialId: z.coerce.number().int().positive().optional(),
  estado: z.enum(["BORRADOR", "APROBADO", "EN_EJECUCION", "COMPLETADO", "CANCELADO"]).optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
  q: z.string().trim().max(100).optional(),
});
