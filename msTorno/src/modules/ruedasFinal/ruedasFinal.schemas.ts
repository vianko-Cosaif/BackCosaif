import { z } from "zod";

const medidaSchema = z.preprocess((v) => (typeof v === "number" ? String(v) : v), z.string().min(1));

export const ruedasFinalCreateSchema = z.object({
  ruedaSolicitudId: z.number().int(),
  torneroId: z.number().int(),
  l1: medidaSchema,
  l2: medidaSchema,
  l3: medidaSchema,
  l4: medidaSchema,
  l5: medidaSchema,
  l6: medidaSchema,
  r1: medidaSchema,
  r2: medidaSchema,
  r3: medidaSchema,
  r4: medidaSchema,
  r5: medidaSchema,
  r6: medidaSchema,
});

export const ruedasFinalUpdateSchema = ruedasFinalCreateSchema.partial().omit({
  ruedaSolicitudId: true,
  torneroId: true,
});
