import { z } from "zod";

export const cambioCreateSchema = z.object({
  localidadId: z.number().int(),
  numeroNavaja: z.number().int(),
});

export const cambioUpdateSchema = z.object({
  numeroNavaja: z.number().int(),
});

