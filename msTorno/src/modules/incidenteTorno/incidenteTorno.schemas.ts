import { z } from "zod";

const tipoFallaSchema = z.enum(["FALLO_SISTEMA", "NAVAJAS"]);
const estadoPadreSchema = z.enum(["EN_PROCESO", "RESUELTO"]);
const idSchema = z.coerce.number().int();

export const incidenteTornoCreateSchema = z.object({
  tipoFalla: tipoFallaSchema,
  status: estadoPadreSchema.optional(),
  resuelto: z.boolean().optional(),
  comentario: z.string().optional().nullable(),
  creadoPorId: idSchema,
  atendidoPorId: idSchema.optional().nullable(),
  localidadId: idSchema.optional().nullable(),
  numeroLocomotora: idSchema.optional().nullable(),
  imagen1: z.string().optional().nullable(),
  imagen2: z.string().optional().nullable(),
  imagen3: z.string().optional().nullable(),
  fechaAtencion: z.coerce.date().optional().nullable(),
  fechaTerminacion: z.coerce.date().optional().nullable(),
  ruedaSolicitudId: idSchema.optional().nullable(),
  rondaServicioId: idSchema.optional().nullable(),
});

export const incidenteTornoUpdateSchema = incidenteTornoCreateSchema.partial().omit({ creadoPorId: true });
