import { z } from "zod";
import { fotoInputSchema } from "../movimientos/movimiento.schemas";

const idSchema = z.coerce.number().int().positive();

const withCapturas = z.object({
  fotos: z.array(fotoInputSchema).optional(),
  capturas: z.array(fotoInputSchema).optional(),
});

export const crearIncidenteMovimientoSchema = withCapturas.extend({
  creadoPorId: idSchema,
  motivo: z.string().min(3),
  viaBloqueadaId: idSchema.optional(),
  seccionBloqueadaId: idSchema.optional(),
  fechaInicio: z.coerce.date().optional(),
}).transform((data) => ({
  ...data,
  fotos: data.fotos ?? data.capturas ?? [],
})).refine((data) => data.fotos.length >= 1, {
  message: "El incidente requiere minimo 1 captura",
}).refine((data) => data.fotos.length <= 4, {
  message: "El incidente permite maximo 4 capturas",
});

export const resolverIncidenteSchema = z.object({
  resueltoPorId: idSchema,
  solucion: z.string().min(3),
  fechaResolucion: z.coerce.date().optional(),
});
