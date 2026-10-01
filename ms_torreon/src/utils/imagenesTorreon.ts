import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { DomainError } from "./domainError";

type FotoCapturaInput = {
  url?: string;
  storageKey?: string;
  base64?: string;
  contenidoBase64?: string;
  dataUrl?: string;
  mimeType?: string;
};

type GuardarFotoParams = {
  entidad: string;
  referenciaId: number;
  tipo?: string;
  orden: number;
};

const CONFIG_IMAGENES_TORREON = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 85,
  carpetaBase: path.join(process.cwd(), "uploads", "incidentes"),
  maxFileSize: 10 * 1024 * 1024,
  allowedMimeTypes: new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
  allowedSharpFormats: new Set(["jpeg", "jpg", "png", "webp"]),
};

const sanitizePart = (value: string | number) => {
  const sanitized = String(value)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return sanitized || "foto";
};

const getCarpetaDestino = async (fecha = new Date()) => {
  const ano = String(fecha.getFullYear());
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  const carpetaDestino = path.join(CONFIG_IMAGENES_TORREON.carpetaBase, ano, mes, dia);
  await fs.mkdir(carpetaDestino, { recursive: true });
  return carpetaDestino;
};

const extraerCapturaBase64 = (foto: FotoCapturaInput) => {
  const raw = foto.dataUrl ?? foto.contenidoBase64 ?? foto.base64;
  if (!raw) return undefined;

  const value = raw.trim();
  const dataUrlMatch = value.match(/^data:([^;,]+);base64,([\s\S]+)$/i);
  if (value.startsWith("data:") && !dataUrlMatch) {
    throw new DomainError(400, "dataUrl de captura invalido");
  }

  return {
    base64: dataUrlMatch ? dataUrlMatch[2] : value,
    mimeType: (dataUrlMatch ? dataUrlMatch[1] : foto.mimeType)?.toLowerCase(),
  };
};

const decodeBase64 = (value: string) => {
  const normalized = value.replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    throw new DomainError(400, "Captura no es base64 valida");
  }

  const buffer = Buffer.from(normalized, "base64");
  if (!buffer.byteLength) throw new DomainError(400, "Captura vacia");
  return buffer;
};

const buildNombreArchivo = (params: GuardarFotoParams) => {
  const parts = [
    "torreon",
    params.entidad,
    params.referenciaId,
    params.tipo,
    params.orden,
    Date.now(),
  ].filter((part): part is string | number => part !== undefined);

  return `${parts.map(sanitizePart).join("_")}.jpeg`;
};

export const guardarFotoTorreon = async (
  foto: FotoCapturaInput,
  params: GuardarFotoParams
): Promise<{ url: string; storageKey?: string }> => {
  const captura = extraerCapturaBase64(foto);
  if (!captura) {
    if (!foto.url) throw new DomainError(400, "La captura requiere url, base64 o dataUrl");
    return { url: foto.url, storageKey: foto.storageKey };
  }

  if (captura.mimeType && !CONFIG_IMAGENES_TORREON.allowedMimeTypes.has(captura.mimeType)) {
    throw new DomainError(400, `Tipo de imagen no permitido: ${captura.mimeType}`);
  }

  const buffer = decodeBase64(captura.base64);
  if (buffer.byteLength > CONFIG_IMAGENES_TORREON.maxFileSize) {
    throw new DomainError(400, "Captura excede el tamano maximo de 10MB");
  }

  const metadata = await sharp(buffer).metadata().catch(() => {
    throw new DomainError(400, "Captura no es una imagen valida");
  });

  if (!metadata.format || !CONFIG_IMAGENES_TORREON.allowedSharpFormats.has(metadata.format)) {
    throw new DomainError(400, `Formato de imagen no permitido: ${metadata.format ?? "desconocido"}`);
  }

  const carpetaDestino = await getCarpetaDestino();
  const nombreArchivo = buildNombreArchivo(params);
  const rutaCompleta = path.join(carpetaDestino, nombreArchivo);

  await sharp(buffer)
    .resize(CONFIG_IMAGENES_TORREON.maxWidth, CONFIG_IMAGENES_TORREON.maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({
      quality: CONFIG_IMAGENES_TORREON.quality,
      progressive: true,
      mozjpeg: true,
    })
    .toFile(rutaCompleta);

  const rutaRelativa = path.relative(CONFIG_IMAGENES_TORREON.carpetaBase, rutaCompleta).split(path.sep).join("/");
  return { url: rutaRelativa, storageKey: rutaRelativa };
};
