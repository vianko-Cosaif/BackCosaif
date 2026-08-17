import { z } from "zod";

const base = z.object({
  clienteComercialId: z.coerce.number().int().positive(),
  contratoId: z.coerce.number().int().positive().optional().nullable(),
  servicio: z.enum(["MOVIMIENTO", "LAVADO", "TORNEADO", "DETENCION", "CANCELACION", "OTRO"]),
  concepto: z.string().trim().min(3).max(240),
  unidad: z.enum(["EVENTO", "MOVIMIENTO", "VAGON", "SERVICIO", "HORA", "DIA", "LOCOMOTORA", "TARIFA_FIJA"]).default("EVENTO"),
  localidadId: z.coerce.number().int().positive().optional().nullable(),
  tipoMovimiento: z.string().trim().max(80).optional().nullable(),
  importeUnitario: z.coerce.number().min(0).max(999_999_999_999),
  porcentajeIva: z.coerce.number().min(0).max(100).default(16),
  moneda: z.string().trim().toUpperCase().length(3).default("MXN"),
  vigenciaInicio: z.coerce.date(),
  vigenciaFin: z.coerce.date().optional().nullable(),
  cantidadMinima: z.coerce.number().positive().optional().nullable(),
  importeMinimo: z.coerce.number().min(0).optional().nullable(),
  activo: z.boolean().default(true),
  notas: z.string().trim().max(4000).optional().nullable(),
});

export const tarifaCreateSchema = base.superRefine((value, context) => {
  if (value.vigenciaFin && value.vigenciaFin < value.vigenciaInicio) {
    context.addIssue({ code: "custom", path: ["vigenciaFin"], message: "Debe ser posterior a vigenciaInicio" });
  }
});

export const tarifaUpdateSchema = base.partial().superRefine((value, context) => {
  if (value.vigenciaInicio && value.vigenciaFin && value.vigenciaFin < value.vigenciaInicio) {
    context.addIssue({ code: "custom", path: ["vigenciaFin"], message: "Debe ser posterior a vigenciaInicio" });
  }
});

export const tarifaListSchema = z.object({
  clienteComercialId: z.coerce.number().int().positive().optional(),
  contratoId: z.coerce.number().int().positive().optional(),
  servicio: z.enum(["MOVIMIENTO", "LAVADO", "TORNEADO", "DETENCION", "CANCELACION", "OTRO"]).optional(),
  localidadId: z.coerce.number().int().positive().optional(),
  activo: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  vigenteEn: z.coerce.date().optional(),
});
