import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import type { PrismaClient } from '@prisma/client';
import { IMAGEN_CONFIG } from '../config/imagenes.config';

export const incidentImagePaths = (incident: { imagen1?: string | null; imagen2?: string | null; imagen3?: string | null; imagen4?: string | null } | null | undefined) =>
  [incident?.imagen1, incident?.imagen2, incident?.imagen3, incident?.imagen4].filter((value): value is string => Boolean(value));
const imageFields = (paths: string[]) => ({ imagen1: paths[0] ?? null, imagen2: paths[1] ?? null, imagen3: paths[2] ?? null, imagen4: paths[3] ?? null });
const invalidImage = (message: string) => Object.assign(new Error(message), { status: 400 });

export async function removeIncidentImages(paths: string[]) {
  const root = path.resolve(IMAGEN_CONFIG.carpetaBase);
  for (const relative of paths) {
    const absolute = path.resolve(root, relative);
    if (!absolute.startsWith(root + path.sep)) continue;
    await fs.unlink(absolute).catch(() => undefined);
  }
}

// Process files before opening a DB transaction. A failed batch leaves no partial files.
export async function saveIncidentImages(images: Buffer[] = [], incidentId?: number): Promise<string[]> {
  if (images.length > 4) throw invalidImage('Se permiten máximo 4 imágenes');
  if (!images.length) return [];
  const now = new Date();
  const directory = [String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')];
  const target = path.join(IMAGEN_CONFIG.carpetaBase, ...directory);
  const paths: string[] = [];
  try {
    for (const [index, image] of images.entries()) {
      if (!Buffer.isBuffer(image) || !image.length || image.length > IMAGEN_CONFIG.maxFileSize) throw invalidImage('Imagen vacía o mayor a 10MB');
      const metadata = await sharp(image).metadata().catch(() => { throw invalidImage('La captura no es una imagen válida'); });
      if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) throw invalidImage('Formato de imagen no permitido');
      await fs.mkdir(target, { recursive: true });
      const relative = [...directory, `incidente_${incidentId ?? 'nuevo'}_imagen_${index + 1}_${randomUUID()}.jpeg`].join('/');
      paths.push(relative);
      await sharp(image).rotate().resize(IMAGEN_CONFIG.maxWidth, IMAGEN_CONFIG.maxHeight, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: IMAGEN_CONFIG.quality, progressive: true, mozjpeg: true }).toFile(path.join(IMAGEN_CONFIG.carpetaBase, relative));
    }
    return paths;
  } catch (error) { await removeIncidentImages(paths); throw error; }
}

export async function createIncidentWithEvidence(db: Pick<PrismaClient, '$transaction'>,
  data: { descripcion: string; movimientoId: number; usuarioId: number; imagenes?: Buffer[] }) {
  const paths = await saveIncidentImages(data.imagenes);
  let discardPrepared = false;
  try {
    const result = await db.$transaction(async tx => {
      // Same report retries serialize without leaving an image-less incident on failure.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(782916, ${data.movimientoId}::integer)::text`;
      let existing = await tx.incidente.findFirst({ where: { movimientoId: data.movimientoId, usuarioId: data.usuarioId, descripcion: data.descripcion, estado: 'ABIERTO' }, orderBy: { fechaInicio: 'desc' } });
      if (existing) {
        // Share the same row lock as editing before repairing a legacy empty report.
        await tx.$queryRaw`SELECT id FROM "Incidente" WHERE id = ${existing.id} FOR UPDATE`;
        existing = await tx.incidente.findUnique({ where: { id: existing.id } });
      }
      if (existing) {
        const previous = incidentImagePaths(existing);
        if (paths.length && !previous.length) {
          return { incidente: await tx.incidente.update({ where: { id: existing.id }, data: imageFields(paths) }), isNew: false, kept: true };
        }
        if (paths.length && paths.length !== previous.length) throw Object.assign(new Error('El incidente existente tiene otra cantidad de fotos; actualiza el incidente para modificarlas'), { status: 409 });
        return { incidente: existing, isNew: false, kept: false };
      }
      const incidente = await tx.incidente.create({ data: { descripcion: data.descripcion, movimientoId: data.movimientoId, usuarioId: data.usuarioId, estado: 'ABIERTO', fechaInicio: new Date(), ...imageFields(paths) } });
      return { incidente, isNew: true, kept: true };
    });
    discardPrepared = !result.kept;
    return result;
  } finally {
    // An uncertain COMMIT must never delete files that the DB may already reference.
    // Only a confirmed duplicate discards its unused, uniquely named batch.
    if (discardPrepared) await removeIncidentImages(paths);
  }
}
