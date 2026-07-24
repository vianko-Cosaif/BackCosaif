import { z } from "zod";
import {
  ESTADOS_LAVADO_PROCESO,
  TIPOS_LAVADO,
} from "../types/lavado.types";

const positiveInt = z.coerce.number().int().positive();
const uuid = z.string().uuid();

export const createLavadoSchema = z.object({
  movimientoId: positiveInt,
  tipoLavado: z.enum(TIPOS_LAVADO),
  duracionEstimadaMinutos: positiveInt.optional(),
  locomotiveNumber: positiveInt,
  empresaId: positiveInt,
  empresaNombreSnapshot: z.string().trim().min(1).max(200),
  localidadId: positiveInt,
  localidadNombreSnapshot: z.string().trim().min(1).max(200),
  creadoPorId: positiveInt,
}).strict();

export const updateLavadoSchema = z.object({
  tipoLavado: z.enum(TIPOS_LAVADO).optional(),
  duracionEstimadaMinutos: positiveInt.nullable().optional(),
  actorId: positiveInt,
}).strict().superRefine((data, ctx) => {
  if (data.tipoLavado === undefined && data.duracionEstimadaMinutos === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Debe enviar tipoLavado o duracionEstimadaMinutos",
    });
  }
});

export const iniciarFaseSchema = z.object({
  actorId: positiveInt,
}).strict();

export const finalizarFaseSchema = z.object({
  observaciones: z.string().trim().min(1).max(2000).optional(),
  actorId: positiveInt,
}).strict();

export const listarLavadosSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  estado: z.enum(ESTADOS_LAVADO_PROCESO).optional(),
  tipoLavado: z.enum(TIPOS_LAVADO).optional(),
  localidadId: positiveInt.optional(),
  empresaId: positiveInt.optional(),
  movimientoId: positiveInt.optional(),
  locomotiveNumber: positiveInt.optional(),
}).strict();

export const lavadoIdParamsSchema = z.object({
  id: uuid,
});

export const lavadoFaseParamsSchema = z.object({
  id: uuid,
  faseId: uuid,
});
