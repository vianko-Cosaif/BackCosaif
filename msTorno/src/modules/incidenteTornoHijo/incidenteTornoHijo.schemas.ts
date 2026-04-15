import { z } from "zod";

const estadoHijoSchema = z.enum(["EN_PROCESO", "RESUELTO"]);

export const incidenteTornoHijoCreateSchema = z.object({
  incidenteTornoId: z.number().int(),
  status: estadoHijoSchema.optional(),
  resuelto: z.boolean().optional(),
  comentario: z.string().optional().nullable(),
  imagen1: z.string().optional().nullable(),
  imagen2: z.string().optional().nullable(),
  imagen3: z.string().optional().nullable(),
});

export const incidenteTornoHijoUpdateSchema = incidenteTornoHijoCreateSchema.partial().omit({
  incidenteTornoId: true,
});

