import { z } from "zod";

const estadoRondaSchema = z.enum(["SOLICITADO", "EN_PROCESO", "CONCLUIDO", "DETENIDO", "CANCELADO"]);

export const rondaServicioCreateSchema = z.object({
  ruedaSolicitudId: z.number().int(),
  // Al crearse normalmente debe quedar SOLICITADO y sin tornero.
  status: z.literal("SOLICITADO").optional(),
});

export const rondaServicioUpdateSchema = z.object({
  status: estadoRondaSchema.optional(),
  torneroId: z.number().int().optional().nullable(),
  inicio: z.coerce.date().optional().nullable(),
  fin: z.coerce.date().optional().nullable(),
  ruedasFinalId: z.number().int().optional().nullable(),
  detenidoPorIncidenteId: z.number().int().optional().nullable(),
  canceladoPorIncidenteId: z.number().int().optional().nullable(),
});

export const rondaServicioIniciarSchema = z.object({
  torneroId: z.number().int(),
  inicio: z.coerce.date().optional().nullable(),
});

export const rondaServicioFinalizarEjeSchema = z.object({
  posicion: z.coerce.number().int().min(1).max(6),
  lados: z.array(z.enum(["L", "R"])).optional(),
  fechaFin: z.coerce.date().optional().nullable(),
});

export const rondaServicioConcluirSchema = z.object({
  ruedasFinalId: z.number().int(),
  fin: z.coerce.date().optional().nullable(),
});

