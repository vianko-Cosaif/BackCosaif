import { z } from "zod";

const idSchema = z.coerce.number().int().positive();

export const reordenarRondaMovimientoSchema = z.object({
  rondaMovimientoId: idSchema,
  orden: z.coerce.number().int().positive(),
  empresaId: idSchema.optional(),
});
