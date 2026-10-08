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
  fotosPorMovimiento: z.array(z.object({ movimientoId: idSchema, fotos: z.array(fotoInputSchema).min(1).max(4) })).optional(),
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
  locomotoraRemolque: idSchema.optional(),
  polo: z.enum(["Sin_Solicitar", "NORTE", "SUR"]).optional(),
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
  Boolean(data.viaOrigenId && data.viaDestinoId && data.tipoMovimiento)
), {
  message: "Cada solicitud requiere vía de origen, vía de destino y tipo de movimiento",
});

export const createLoteSchema = z.object({
  clientRequestId: z.string().trim().min(8).max(100),
  movimientos: z.array(createMovimientoSchema).min(1).max(5),
}).refine(data => new Set(data.movimientos.map(m => m.localidadId)).size === 1, "El envío debe pertenecer a una sola localidad");

export function validarCondicionesNaturales(data: { tipoMovimiento?: string | null; locomotiveNumber: number; locomotoraRemolque?: number | null; direccionEmpuje?: string | null; polo?: string | null; posicionCabina?: string | null; posicionChimenea?: string | null }) {
  if (!data.tipoMovimiento) return "Indica el tipo de movimiento";
  if (data.tipoMovimiento === "REMOLCADA" && (!data.locomotoraRemolque || !["EMPUJAR", "JALAR"].includes(data.direccionEmpuje ?? ""))) return "La solicitud remolcada requiere máquina de remolque y Empujar/Jalar";
  if (data.tipoMovimiento === "REMOLCADA" && data.locomotoraRemolque === data.locomotiveNumber) return "La locomotora remolcada y la máquina que remolca deben ser distintas";
  if (!["NORTE", "SUR"].includes(data.polo ?? "") && !["DENTRO", "AFUERA"].includes(data.posicionChimenea ?? "")) return "Selecciona polo o posición de chimenea, conforme a las reglas de Cosaif";
  return null;
}

export const editMovimientoSchema = z.object({
  viaOrigenId: idSchema.nullable().optional(),
  viaDestinoId: idSchema.nullable().optional(),
  seccionOrigenId: idSchema.nullable().optional(),
  seccionDestinoId: idSchema.nullable().optional(),
  viaOrigenNombreSnapshot: z.string().nullable().optional(),
  viaDestinoNombreSnapshot: z.string().nullable().optional(),
  seccionOrigenNombreSnapshot: z.string().nullable().optional(),
  seccionDestinoNombreSnapshot: z.string().nullable().optional(),
  locomotiveNumber: idSchema.optional(),
  locomotoraRemolque: idSchema.nullable().optional(),
  polo: z.enum(["Sin_Solicitar", "NORTE", "SUR"]).optional(),
  prioridad: z.enum(["BAJA", "ALTA"]).optional(),
  tipoMovimiento: z.enum(["MD_TRABAJANDO", "REMOLCADA"]).optional(),
  instrucciones: z.string().trim().max(2000).nullable().optional(),
  posicionChimenea: z.enum(["Sin_Solicitar", "DENTRO", "AFUERA"]).optional(),
  posicionCabina: z.enum(["Sin_Solicitar", "DENTRO", "AFUERA"]).optional(),
  direccionEmpuje: z.enum(["Sin_Solicitar", "EMPUJAR", "JALAR"]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Indica al menos un dato para editar");

export const cancelarMovimientoSchema = z.object({ razon: z.string().trim().min(1).max(1000).default("Cancelado por cliente") });

export const iniciarMovimientoSchema = withCapturas.extend({
  operadorId: idSchema.optional(),
  supervisorId: idSchema.optional(),
  coordinadorId: idSchema.optional(),
  iniciadoPorId: idSchema,
  fechaInicio: z.coerce.date().optional(),
}).transform((data) => ({
  ...data,
  fotos: data.fotos ?? data.capturas ?? [],
})).refine(maxCuatroCapturas, {
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
})).refine(maxCuatroCapturas, {
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
