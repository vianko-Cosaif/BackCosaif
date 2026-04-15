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

