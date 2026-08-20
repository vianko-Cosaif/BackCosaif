import { z } from "zod";

const paqueteBase = z.object({
  clienteComercialId: z.coerce.number().int().positive(),
  contratoId: z.coerce.number().int().positive().optional().nullable(),
  tarifaExcedenteId: z.coerce.number().int().positive().optional().nullable(),
  nombre: z.string().trim().min(3).max(200),
  servicio: z.enum(["MOVIMIENTO", "LAVADO", "TORNEADO", "DETENCION", "CANCELACION", "OTRO"]),
  origenOperacion: z.enum(["NATURAL", "ARRASTRE"]).optional().nullable(),
  unidad: z.enum(["EVENTO", "MOVIMIENTO", "VAGON", "SERVICIO", "HORA", "DIA", "LOCOMOTORA", "TARIFA_FIJA"]).default("EVENTO"),
  periodicidad: z.enum(["UNICO", "SEMANAL", "MENSUAL", "BIMESTRAL", "SEMESTRAL", "ANUAL", "VIGENCIA_COMPLETA"]).default("MENSUAL"),
  localidadId: z.coerce.number().int().positive().optional().nullable(),
  estadosIncluidos: z.array(z.enum(["SOLICITADO", "ASIGNADO", "EN_PROCESO", "DETENIDO", "ESPERA", "MODIFICADO", "CONCLUIDO", "CANCELADO", "AGENDADO"])).min(1).max(9).default(["CONCLUIDO"]),
  cantidadIncluida: z.coerce.number().positive().optional().nullable(),
  montoPaquete: z.coerce.number().min(0).optional().nullable(),
  importeExcedente: z.coerce.number().min(0).optional().nullable(),
  moneda: z.string().trim().toUpperCase().length(3).default("MXN"),
  vigenciaInicio: z.coerce.date(),
  vigenciaFin: z.coerce.date().optional().nullable(),
  activo: z.boolean().default(true),
  notas: z.string().trim().max(4000).optional().nullable(),
});

export const paqueteCreateSchema = paqueteBase.superRefine((value, context) => {
  if (value.vigenciaFin && value.vigenciaFin < value.vigenciaInicio) {
    context.addIssue({ code: "custom", path: ["vigenciaFin"], message: "Debe ser posterior a vigenciaInicio" });
  }
});

export const paqueteUpdateSchema = paqueteBase.omit({ clienteComercialId: true }).partial();

export const paqueteListSchema = z.object({
  clienteComercialId: z.coerce.number().int().positive().optional(),
  contratoId: z.coerce.number().int().positive().optional(),
  servicio: z.enum(["MOVIMIENTO", "LAVADO", "TORNEADO", "DETENCION", "CANCELACION", "OTRO"]).optional(),
  origenOperacion: z.enum(["NATURAL", "ARRASTRE"]).optional(),
  localidadId: z.coerce.number().int().positive().optional(),
  activo: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  vigenteEn: z.coerce.date().optional(),
});
