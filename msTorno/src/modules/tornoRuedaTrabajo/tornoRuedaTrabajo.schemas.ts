import { z } from "zod";

const ladoSchema = z.enum(["L", "R"]);
const estadoSchema = z.enum(["PENDIENTE", "EN_PROCESO", "PAUSADO", "TERMINADO"]);

export const tornoRuedaTrabajoCreateSchema = z.object({
  tornoGId: z.number().int(),
  lado: ladoSchema,
  posicion: z.number().int(),
  estado: estadoSchema.optional(),
  fechaInicio: z.coerce.date().optional().nullable(),
  fechaFin: z.coerce.date().optional().nullable(),
  duracionSegundos: z.number().int().optional().nullable(),
});

export const tornoRuedaTrabajoUpdateSchema = tornoRuedaTrabajoCreateSchema
  .partial()
  .omit({ tornoGId: true, lado: true, posicion: true });

