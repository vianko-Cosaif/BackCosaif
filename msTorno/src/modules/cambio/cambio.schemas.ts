import { z } from "zod";

export const cambioCreateSchema = z.object({
  localidadId: z.number().int(),
  numeroNavaja: z.number().int(),
  comentario: z.string().optional().nullable(),
  creadoPorId: z.number().int().optional().nullable(),
  imagen1: z.string().optional().nullable(),
  imagen2: z.string().optional().nullable(),
  imagen3: z.string().optional().nullable(),
  fechaCambio: z.coerce.date().optional(),
});

export const cambioUpdateSchema = cambioCreateSchema.partial();
