import { z } from "zod";

export const navaCreateSchema = z.object({
  localidadId: z.number().int(),
  cantidad: z.number().int(),
});

export const navaUpdateSchema = z.object({
  cantidad: z.number().int(),
});

