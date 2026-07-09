import { z } from "zod";
import { fotoInputSchema } from "../movimientos/movimiento.schemas";

const idSchema = z.coerce.number().int().positive();

export const arrastreVagonInputSchema = z.object({
  numeroVagon: z.string().trim().min(1).optional(),
  carga: z.enum(["VACIO", "LLENO"]),
  viaId: idSchema,
  seccionId: idSchema,
  comentario: z.string().trim().min(1).optional(),
  fechaSolicitud: z.coerce.date().optional(),
});

const withCapturas = z.object({
  fotos: z.array(fotoInputSchema).optional(),
  capturas: z.array(fotoInputSchema).optional(),
});

const capacidadArrastre = (vagones: Array<{ carga: "VACIO" | "LLENO" }>) =>
  vagones.reduce((total, vagon) => total + (vagon.carga === "LLENO" ? 2 : 1), 0);

const validarCapacidad = (data: { vagones: Array<{ carga: "VACIO" | "LLENO" }> }, ctx: z.RefinementCtx) => {
  const puntos = capacidadArrastre(data.vagones);
  if (puntos > 8) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Arrastre excede capacidad: maximo 8 vacios equivalentes, cada lleno cuenta como 2",
      path: ["vagones"],
    });
  }
};

export const createArrastreSchema = z.object({
  empresaId: idSchema,
  creadoPorId: idSchema,
  operadorId: idSchema.optional(),
  localidadId: idSchema,
  viaOrigenId: idSchema.optional(),
  viaDestinoId: idSchema.optional(),
  seccionOrigenId: idSchema.optional(),
  seccionDestinoId: idSchema.optional(),
  instrucciones: z.string().trim().min(1).optional(),
  vagones: z.array(arrastreVagonInputSchema).min(1).max(8),
}).superRefine(validarCapacidad);

export const iniciarArrastreSchema = z.object({
  operadorId: idSchema.optional(),
  iniciadoPorId: idSchema,
  fechaInicio: z.coerce.date().optional(),
});

export const finalizarArrastreSchema = z.object({
  finalizadoPorId: idSchema,
  fechaFin: z.coerce.date().optional(),
});

export const cancelarArrastreSchema = z.object({
  canceladoPorId: idSchema,
  motivo: z.string().trim().min(3).optional(),
  fechaCancelacion: z.coerce.date().optional(),
});

export const iniciarVagonArrastreSchema = z.object({
  fechaInicio: z.coerce.date().optional(),
  confirmarIncidente: z.coerce.boolean().optional(),
  comentarioOperacion: z.string().trim().min(1).optional(),
});

export const finalizarVagonArrastreSchema = z.object({
  fechaFin: z.coerce.date().optional(),
  confirmarIncidente: z.coerce.boolean().optional(),
  comentarioOperacion: z.string().trim().min(1).optional(),
});

export const editarVagonArrastreSchema = z.object({
  numeroVagon: z.string().trim().min(1).optional(),
  carga: z.enum(["VACIO", "LLENO"]).optional(),
  viaId: idSchema.optional(),
  seccionId: idSchema.optional(),
  comentario: z.string().trim().min(1).nullable().optional(),
}).refine((data) => Object.values(data).some((value) => value !== undefined), {
  message: "Envia al menos un campo para editar el vagon",
});

export const reordenarVagonesArrastreSchema = z.object({
  vagonIds: z.array(idSchema).min(1).max(8),
}).refine((data) => new Set(data.vagonIds).size === data.vagonIds.length, {
  message: "No repitas vagones",
  path: ["vagonIds"],
});

export const reordenarSolicitudesArrastreSchema = z.object({
  arrastreIds: z.array(idSchema).min(1).max(100),
  empresaId: idSchema.optional(),
}).refine((data) => new Set(data.arrastreIds).size === data.arrastreIds.length, {
  message: "No repitas solicitudes",
  path: ["arrastreIds"],
});

export const crearIncidenteArrastreSchema = withCapturas.extend({
  creadoPorId: idSchema,
  motivo: z.string().trim().min(3),
  vagonId: idSchema.optional(),
  viaBloqueadaId: idSchema.optional(),
  seccionBloqueadaId: idSchema.optional(),
  fechaInicio: z.coerce.date().optional(),
}).transform((data) => ({
  ...data,
  fotos: data.fotos ?? data.capturas ?? [],
})).refine((data) => data.fotos.length >= 1, {
  message: "El incidente de arrastre requiere al menos 1 captura",
}).refine((data) => data.fotos.length <= 4, {
  message: "El incidente de arrastre permite maximo 4 capturas",
});

export const resolverIncidenteArrastreSchema = z.object({
  resueltoPorId: idSchema,
  solucion: z.string().trim().min(3),
  fechaResolucion: z.coerce.date().optional(),
});

export const reanudarArrastreSchema = z.object({
  operadorId: idSchema.optional(),
  fechaReanudacion: z.coerce.date().optional(),
});
