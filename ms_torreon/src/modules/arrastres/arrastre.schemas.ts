import { z } from "zod";
import { fotoInputSchema } from "../movimientos/movimiento.schemas";

const idSchema = z.coerce.number().int().positive();
const textRefSchema = z.union([z.string(), z.number()])
  .transform((value) => String(value ?? "").trim())
  .refine((value) => value.length > 0, { message: "Campo requerido" });

const optionalTextRefSchema = z.union([z.string(), z.number()])
  .optional()
  .transform((value) => value == null ? undefined : String(value).trim())
  .refine((value) => value === undefined || value.length > 0, { message: "Campo requerido" });

function parsePositiveId(value?: string) {
  if (!value || !/^\d+$/.test(value)) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

const arrastreVagonBaseSchema = z.object({
  numeroVagon: z.string().trim().min(1).optional(),
  carga: z.enum(["VACIO", "LLENO"]),
  viaOrigen: textRefSchema.optional(),
  seccionOrigen: textRefSchema.optional(),
  viaDestino: textRefSchema.optional(),
  seccionDestino: textRefSchema.optional(),
  viaOrigenNombre: textRefSchema.optional(),
  seccionOrigenNombre: textRefSchema.optional(),
  viaDestinoNombre: textRefSchema.optional(),
  seccionDestinoNombre: textRefSchema.optional(),
  viaOrigenId: textRefSchema.optional(),
  seccionOrigenId: textRefSchema.optional(),
  viaId: textRefSchema.optional(),
  seccionId: textRefSchema.optional(),
  comentario: z.string().trim().min(1).optional(),
  fechaSolicitud: z.coerce.date().optional(),
});

function normalizeVagonRefs(data: z.infer<typeof arrastreVagonBaseSchema>) {
  const viaOrigen = data.viaOrigen ?? data.viaOrigenNombre ?? data.viaOrigenId;
  const seccionOrigen = data.seccionOrigen ?? data.seccionOrigenNombre ?? data.seccionOrigenId;
  const viaDestino = data.viaDestino ?? data.viaDestinoNombre ?? data.viaId;
  const seccionDestino = data.seccionDestino ?? data.seccionDestinoNombre ?? data.seccionId;

  return {
    ...data,
    viaOrigenId: parsePositiveId(viaOrigen),
    seccionOrigenId: parsePositiveId(seccionOrigen),
    viaId: parsePositiveId(viaDestino),
    seccionId: parsePositiveId(seccionDestino),
    viaOrigenNombre: viaOrigen,
    seccionOrigenNombre: seccionOrigen,
    viaDestinoNombre: viaDestino,
    seccionDestinoNombre: seccionDestino,
  };
}

export const arrastreVagonInputSchema = arrastreVagonBaseSchema
  .refine((data) => Boolean(data.viaOrigen ?? data.viaOrigenNombre ?? data.viaOrigenId), {
    message: "Via origen requerida",
    path: ["viaOrigen"],
  })
  .refine((data) => Boolean(data.seccionOrigen ?? data.seccionOrigenNombre ?? data.seccionOrigenId), {
    message: "Seccion origen requerida",
    path: ["seccionOrigen"],
  })
  .refine((data) => Boolean(data.viaDestino ?? data.viaDestinoNombre ?? data.viaId), {
    message: "Via destino requerida",
    path: ["viaDestino"],
  })
  .refine((data) => Boolean(data.seccionDestino ?? data.seccionDestinoNombre ?? data.seccionId), {
    message: "Seccion destino requerida",
    path: ["seccionDestino"],
  })
  .transform(normalizeVagonRefs);

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
  supervisorId: idSchema.optional(),
  coordinadorId: idSchema.optional(),
  operadorId: idSchema.optional(),
  localidadId: idSchema,
  instrucciones: z.string().trim().min(3),
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
  operadorId: idSchema.optional(),
  iniciadoPorId: idSchema.optional(),
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
  viaOrigen: optionalTextRefSchema,
  seccionOrigen: optionalTextRefSchema,
  viaDestino: optionalTextRefSchema,
  seccionDestino: optionalTextRefSchema,
  viaOrigenNombre: optionalTextRefSchema,
  seccionOrigenNombre: optionalTextRefSchema,
  viaDestinoNombre: optionalTextRefSchema,
  seccionDestinoNombre: optionalTextRefSchema,
  viaOrigenId: optionalTextRefSchema,
  seccionOrigenId: optionalTextRefSchema,
  viaId: optionalTextRefSchema,
  seccionId: optionalTextRefSchema,
  comentario: z.string().trim().min(1).nullable().optional(),
}).refine((data) => Object.values(data).some((value) => value !== undefined), {
  message: "Envia al menos un campo para editar el vagon",
}).transform((data) => {
  const normalized = normalizeVagonRefs({
    numeroVagon: data.numeroVagon,
    carga: data.carga ?? "VACIO",
    viaOrigen: data.viaOrigen,
    seccionOrigen: data.seccionOrigen,
    viaDestino: data.viaDestino,
    seccionDestino: data.seccionDestino,
    viaOrigenNombre: data.viaOrigenNombre,
    seccionOrigenNombre: data.seccionOrigenNombre,
    viaDestinoNombre: data.viaDestinoNombre,
    seccionDestinoNombre: data.seccionDestinoNombre,
    viaOrigenId: data.viaOrigenId,
    seccionOrigenId: data.seccionOrigenId,
    viaId: data.viaId,
    seccionId: data.seccionId,
    comentario: data.comentario ?? undefined,
  });

  return {
    ...data,
    viaOrigenId: data.viaOrigen !== undefined || data.viaOrigenNombre !== undefined || data.viaOrigenId !== undefined
      ? normalized.viaOrigenId
      : undefined,
    seccionOrigenId: data.seccionOrigen !== undefined || data.seccionOrigenNombre !== undefined || data.seccionOrigenId !== undefined
      ? normalized.seccionOrigenId
      : undefined,
    viaId: data.viaDestino !== undefined || data.viaDestinoNombre !== undefined || data.viaId !== undefined
      ? normalized.viaId
      : undefined,
    seccionId: data.seccionDestino !== undefined || data.seccionDestinoNombre !== undefined || data.seccionId !== undefined
      ? normalized.seccionId
      : undefined,
    viaOrigenNombre: data.viaOrigen !== undefined || data.viaOrigenNombre !== undefined || data.viaOrigenId !== undefined
      ? normalized.viaOrigenNombre
      : undefined,
    seccionOrigenNombre: data.seccionOrigen !== undefined || data.seccionOrigenNombre !== undefined || data.seccionOrigenId !== undefined
      ? normalized.seccionOrigenNombre
      : undefined,
    viaDestinoNombre: data.viaDestino !== undefined || data.viaDestinoNombre !== undefined || data.viaId !== undefined
      ? normalized.viaDestinoNombre
      : undefined,
    seccionDestinoNombre: data.seccionDestino !== undefined || data.seccionDestinoNombre !== undefined || data.seccionId !== undefined
      ? normalized.seccionDestinoNombre
      : undefined,
  };
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
