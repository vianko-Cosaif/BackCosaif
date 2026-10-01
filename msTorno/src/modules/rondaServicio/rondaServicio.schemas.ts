import { z } from "zod";

const estadoRondaSchema = z.enum(["SOLICITADO", "EN_PROCESO", "CONCLUIDO", "DETENIDO", "CANCELADO"]);
const idSchema = z.coerce.number().int();

export const rondaServicioCreateSchema = z.object({
  ruedaSolicitudId: idSchema,
  localidadId: idSchema.optional().nullable(),
  // Al crearse normalmente debe quedar SOLICITADO y sin tornero.
  status: z.literal("SOLICITADO").optional(),
});

export const rondaServicioUpdateSchema = z.object({
  status: estadoRondaSchema.optional(),
  torneroId: idSchema.optional().nullable(),
  localidadId: idSchema.optional().nullable(),
  inicio: z.coerce.date().optional().nullable(),
  fin: z.coerce.date().optional().nullable(),
  ruedasFinalId: idSchema.optional().nullable(),
  detenidoPorIncidenteId: idSchema.optional().nullable(),
  canceladoPorIncidenteId: idSchema.optional().nullable(),
});

export const rondaServicioIniciarSchema = z.object({
  torneroId: idSchema,
  inicio: z.coerce.date().optional().nullable(),
});

export const rondaServicioIniciarEjeSchema = z.object({
  posicion: z.coerce.number().int().min(1).max(6),
  lados: z.array(z.enum(["L", "R"])).optional(),
  fechaInicio: z.coerce.date().optional().nullable(),
});

export const rondaServicioFinalizarEjeSchema = z.object({
  posicion: z.coerce.number().int().min(1).max(6),
  lados: z.array(z.enum(["L", "R"])).optional(),
  fechaFin: z.coerce.date().optional().nullable(),
});

export const rondaServicioConcluirSchema = z.object({
  ruedasFinalId: idSchema.optional().nullable(),
  fin: z.coerce.date().optional().nullable(),
});

export const rondaServicioCancelarExternoSchema = z.object({
  fin: z.coerce.date().optional().nullable(),
  razon: z.string().trim().max(500).optional().nullable(),
});
