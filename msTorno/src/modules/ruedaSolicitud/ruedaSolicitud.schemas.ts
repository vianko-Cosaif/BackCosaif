import { z } from "zod";

const medidaSchema = z.preprocess((v) => (typeof v === "number" ? String(v) : v), z.string().min(1));

export const ruedaSolicitudCreateSchema = z.object({
  movimientoId: z.number().int(),
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

export const ruedaSolicitudUpdateSchema = ruedaSolicitudCreateSchema.partial().omit({
  movimientoId: true,
});
