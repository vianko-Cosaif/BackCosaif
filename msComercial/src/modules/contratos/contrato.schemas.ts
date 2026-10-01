import { z } from "zod";

const reglaInicialContratoSchema = z.object({
  nombre: z.string().trim().min(3).max(200),
  servicio: z.enum(["MOVIMIENTO", "LAVADO", "TORNEADO"]).default("MOVIMIENTO"),
  origenOperacion: z.enum(["NATURAL", "ARRASTRE"]).optional().nullable(),
  unidad: z.enum(["MOVIMIENTO", "VAGON", "SERVICIO", "TARIFA_FIJA"]).default("MOVIMIENTO"),
  periodicidad: z.enum(["UNICO", "SEMANAL", "MENSUAL", "BIMESTRAL", "SEMESTRAL", "ANUAL", "VIGENCIA_COMPLETA"]).default("MENSUAL"),
  localidadId: z.coerce.number().int().positive().optional().nullable(),
  estadosIncluidos: z.array(z.enum(["SOLICITADO", "ASIGNADO", "EN_PROCESO", "DETENIDO", "ESPERA", "MODIFICADO", "CONCLUIDO", "CANCELADO", "AGENDADO"])).min(1).max(9).default(["CONCLUIDO"]),
  cantidadIncluida: z.coerce.number().positive().optional().nullable(),
  montoPaquete: z.coerce.number().min(0).optional().nullable(),
  importeExcedente: z.coerce.number().min(0).optional().nullable(),
  notas: z.string().trim().max(4000).optional().nullable(),
});

const contratoBase = z.object({
  clienteComercialId: z.coerce.number().int().positive(),
  folio: z.string().trim().min(2).max(100),
  nombre: z.string().trim().min(3).max(200),
  ordenCompra: z.string().trim().max(120).optional().nullable(),
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date().optional().nullable(),
  estado: z.enum(["BORRADOR", "VIGENTE", "VENCIDO", "CANCELADO"]).default("BORRADOR"),
  moneda: z.string().trim().toUpperCase().length(3).default("MXN"),
  montoMaximo: z.coerce.number().positive().optional().nullable(),
  diaCorte: z.coerce.number().int().min(1).max(31).optional().nullable(),
  documentoUrl: z.string().trim().url().max(2000).optional().nullable(),
  notas: z.string().trim().max(4000).optional().nullable(),
  reglaInicial: reglaInicialContratoSchema.optional(),
});

export const contratoCreateSchema = contratoBase.superRefine((value, context) => {
  if (value.fechaFin && value.fechaFin < value.fechaInicio) {
    context.addIssue({ code: "custom", path: ["fechaFin"], message: "Debe ser posterior a fechaInicio" });
  }
});

export const contratoUpdateSchema = contratoBase.omit({ clienteComercialId: true, folio: true, reglaInicial: true }).partial();

export const contratoListSchema = z.object({
  clienteComercialId: z.coerce.number().int().positive().optional(),
  estado: z.enum(["BORRADOR", "VIGENTE", "VENCIDO", "CANCELADO"]).optional(),
  q: z.string().trim().max(100).optional(),
});
