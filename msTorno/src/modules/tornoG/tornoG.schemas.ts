import { z } from "zod";

const estadoTornoGSchema = z.enum(["PENDIENTE", "EN_PROCESO", "PAUSADO", "TERMINADO"]);

export const tornoGCreateSchema = z.object({
  rondaServicioId: z.number().int().optional().nullable(),
  ruedaSolicitudId: z.number().int().optional().nullable(),
  ruedasFinalId: z.number().int().optional().nullable(),
  torneroId: z.number().int(),
  estado: estadoTornoGSchema.optional(),
  cantidadRuedas: z.number().int(),
  ruedasTerminadas: z.number().int().optional(),
  fechaInicio: z.coerce.date().optional().nullable(),
  fechaFin: z.coerce.date().optional().nullable(),
});

export const tornoGUpdateSchema = tornoGCreateSchema.partial().omit({ torneroId: true });
