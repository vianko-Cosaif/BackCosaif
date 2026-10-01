import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const TORNO_IMAGEN_CONFIG = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 85,
  format: "jpeg" as const,
  carpetaBase: path.join(process.cwd(), "uploads", "torno"),
  maxFileSize: 10 * 1024 * 1024,
};

const DATA_IMAGE_RE = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/;

function datePath() {
  const fecha = new Date();
  const ano = String(fecha.getFullYear());
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return { ano, mes, dia };
}

function decodeBase64Image(value: string) {
  const match = value.match(DATA_IMAGE_RE);
  if (!match) return null;

  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length) {
    throw new Error("Imagen vacia");
  }
  if (buffer.length > TORNO_IMAGEN_CONFIG.maxFileSize) {
    throw new Error("Imagen demasiado grande. Maximo 10MB");
  }

  return buffer;
}

export function getTornoImagenPath(rutaRelativa: string) {
  return path.join(TORNO_IMAGEN_CONFIG.carpetaBase, rutaRelativa);
}

export async function guardarImagenesTorno(
  imagenes: Array<string | null | undefined>,
  prefix: string,
  maxFiles = 3
) {
  const { ano, mes, dia } = datePath();
  const carpetaDestino = path.join(TORNO_IMAGEN_CONFIG.carpetaBase, ano, mes, dia);
  await fs.mkdir(carpetaDestino, { recursive: true });

  const rutas: string[] = [];
  for (let i = 0; i < imagenes.length && rutas.length < maxFiles; i += 1) {
    const imagen = imagenes[i]?.trim();
    if (!imagen) continue;

    const buffer = decodeBase64Image(imagen);
    if (!buffer) {
      rutas.push(imagen);
      continue;
    }

    const nombreArchivo = `${prefix}_imagen_${rutas.length + 1}_${Date.now()}.${TORNO_IMAGEN_CONFIG.format}`;
    const rutaCompleta = path.join(carpetaDestino, nombreArchivo);

    await sharp(buffer)
      .resize(TORNO_IMAGEN_CONFIG.maxWidth, TORNO_IMAGEN_CONFIG.maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: TORNO_IMAGEN_CONFIG.quality,
        progressive: true,
        mozjpeg: true,
      })
      .toFile(rutaCompleta);

    rutas.push(path.relative(TORNO_IMAGEN_CONFIG.carpetaBase, rutaCompleta));
  }

  return {
    imagen1: rutas[0] ?? null,
    imagen2: rutas[1] ?? null,
    imagen3: rutas[2] ?? null,
  };
}
