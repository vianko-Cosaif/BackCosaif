import { z } from "zod";

const idSchema = z.coerce.number().int().positive();

export const fotoInputSchema = z.object({
  url: z.string().trim().min(1).optional(),
  storageKey: z.string().min(1).optional(),
  base64: z.string().trim().min(1).optional(),
  contenidoBase64: z.string().trim().min(1).optional(),
  dataUrl: z.string().trim().min(1).optional(),
  mimeType: z.string().trim().min(1).optional(),
  tomadaPorId: idSchema.optional(),
  comentario: z.string().min(1).optional(),
  tomadaAt: z.coerce.date().optional(),
}).superRefine((data, ctx) => {
  if (!data.url && !data.base64 && !data.contenidoBase64 && !data.dataUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La captura requiere url, base64, contenidoBase64 o dataUrl",
      path: ["url"],
    });
  }
});

const withCapturas = z.object({
  fotos: z.array(fotoInputSchema).optional(),
  capturas: z.array(fotoInputSchema).optional(),
});

const maxCuatroCapturas = (data: { fotos: unknown[] }) => data.fotos.length <= 4;

export const createMovimientoSchema = z.object({
  clientRequestId: z.string().trim().min(8).max(120).optional(),
  empresaId: idSchema,
  creadoPorId: idSchema,
  clienteId: idSchema.optional(),
  supervisorId: idSchema.optional(),
  coordinadorId: idSchema.optional(),
  operadorId: idSchema.optional(),
  localidadId: idSchema,
  viaOrigenId: idSchema.optional(),
  viaDestinoId: idSchema.optional(),
  seccionOrigenId: idSchema.optional(),
  seccionDestinoId: idSchema.optional(),
  locomotiveNumber: idSchema,
  prioridad: z.enum(["BAJA", "ALTA"]).default("BAJA"),
  tipoMovimiento: z.enum(["MD_TRABAJANDO", "REMOLCADA"]).optional(),
  instrucciones: z.string().min(1).optional(),
  posicionChimenea: z.enum(["Sin_Solicitar", "DENTRO", "AFUERA"]).optional(),
  posicionCabina: z.enum(["Sin_Solicitar", "DENTRO", "AFUERA"]).optional(),
  direccionEmpuje: z.enum(["Sin_Solicitar", "EMPUJAR", "JALAR"]).optional(),
  empresaNombreSnapshot: z.string().min(1).optional(),
  localidadNombreSnapshot: z.string().min(1).optional(),
  viaOrigenNombreSnapshot: z.string().min(1).optional(),
  viaDestinoNombreSnapshot: z.string().min(1).optional(),
  seccionOrigenNombreSnapshot: z.string().min(1).optional(),
  seccionDestinoNombreSnapshot: z.string().min(1).optional(),
}).refine((data) => (
  Boolean(data.viaOrigenId || data.viaDestinoId || data.seccionOrigenId || data.seccionDestinoId)
), {
  message: "Debe especificar al menos una via o seccion origen/destino",
});

export const iniciarMovimientoSchema = withCapturas.extend({
  operadorId: idSchema.optional(),
  iniciadoPorId: idSchema,
  fechaInicio: z.coerce.date().optional(),
}).transform((data) => ({
  ...data,
  fotos: data.fotos ?? data.capturas ?? [],
})).refine((data) => data.fotos.length >= 1, {
  message: "Iniciar movimiento requiere al menos una captura",
}).refine(maxCuatroCapturas, {
  message: "Iniciar movimiento permite maximo 4 capturas",
});

export const registrarFotosMovimientoSchema = withCapturas.extend({
  tipo: z.enum(["ANTES_MOVIMIENTO", "PROCESO_MOVIMIENTO", "FIN_MOVIMIENTO"]),
  tomadaPorId: idSchema,
}).transform((data) => ({
  ...data,
  fotos: data.fotos ?? data.capturas ?? [],
})).refine((data) => data.fotos.length >= 1, {
  message: "Debe enviar al menos una captura",
}).refine(maxCuatroCapturas, {
  message: "Cada etapa del movimiento permite maximo 4 capturas",
});

export const finalizarMovimientoSchema = withCapturas.extend({
  finalizadoPorId: idSchema,
  fechaFin: z.coerce.date().optional(),
}).transform((data) => ({
  ...data,
  fotos: data.fotos ?? data.capturas ?? [],
})).refine((data) => data.fotos.length >= 1, {
  message: "Finalizar movimiento requiere al menos una captura",
}).refine(maxCuatroCapturas, {
  message: "Finalizar movimiento permite maximo 4 capturas",
});

export const reanudarMovimientoSchema = withCapturas.extend({
  incidenteId: idSchema.optional(),
  operadorId: idSchema.optional(),
  resueltoPorId: idSchema.optional(),
  solucion: z.string().min(3).optional(),
  fechaResolucion: z.coerce.date().optional(),
}).transform((data) => ({
  ...data,
  fotos: data.fotos ?? data.capturas ?? [],
})).refine(maxCuatroCapturas, {
  message: "Proceso de movimiento permite maximo 4 capturas",
});
