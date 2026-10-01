import { z } from "zod";

export const tornoAgendadoCreateSchema = z.object({
  locomotive: z.coerce.number().int().positive(),
  tipo: z.string().trim().min(1).default("TORNO"),
  localidad: z.coerce.number().int().positive().optional().nullable(),
  idMovimiento: z.coerce.number().int().positive(),
  fechaProgramada: z.coerce.date(),
  fechaLimiteActivacion: z.coerce.date(),
  activo: z.boolean().optional(),
});

export const tornoAgendadoActivableQuerySchema = z.object({
  locomotive: z.coerce.number().int().positive(),
  tipo: z.string().trim().min(1).default("TORNO"),
  localidad: z.coerce.number().int().positive().optional().nullable(),
});

export const tornoAgendadoListQuerySchema = z.object({
  locomotive: z.coerce.number().int().positive().optional(),
  tipo: z.string().trim().min(1).optional(),
  localidad: z.coerce.number().int().positive().optional(),
  activo: z
    .preprocess((value) => {
      if (value === undefined) return undefined;
      if (value === "true" || value === true) return true;
      if (value === "false" || value === false) return false;
      return value;
    }, z.boolean())
    .optional(),
});
