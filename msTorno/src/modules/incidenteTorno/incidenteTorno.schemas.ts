import { z } from "zod";

const tipoFallaSchema = z.enum(["FALLO_SISTEMA", "NAVAJAS"]);
const estadoPadreSchema = z.enum(["EN_PROCESO", "RESUELTO"]);

export const incidenteTornoCreateSchema = z.object({
  tipoFalla: tipoFallaSchema,
  status: estadoPadreSchema.optional(),
  resuelto: z.boolean().optional(),
  comentario: z.string().optional().nullable(),
  creadoPorId: z.number().int(),
  atendidoPorId: z.number().int().optional().nullable(),
  numeroLocomotora: z.number().int().optional().nullable(),
  imagen1: z.string().optional().nullable(),
  imagen2: z.string().optional().nullable(),
  imagen3: z.string().optional().nullable(),
  fechaAtencion: z.coerce.date().optional().nullable(),
  fechaTerminacion: z.coerce.date().optional().nullable(),
  ruedaSolicitudId: z.number().int().optional().nullable(),
  rondaServicioId: z.number().int().optional().nullable(),
});

export const incidenteTornoUpdateSchema = incidenteTornoCreateSchema.partial().omit({ creadoPorId: true });
