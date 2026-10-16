import fs from 'fs/promises';
import path from 'path';
import { prismaTorreon } from '../../db/prisma';
import { DomainError } from '../../utils/domainError';

export async function evidenciaNatural(incidenteId: number, fotoId: number, tipo: 'NATURAL' | 'ARRASTRE' = 'NATURAL') {
  const foto = tipo === 'ARRASTRE'
    ? await prismaTorreon.incidenteArrastreFoto.findFirst({ where: { id: fotoId, incidenteId }, include: { incidente: { include: { arrastre: true } } } })
    : await prismaTorreon.incidenteTorreonFoto.findFirst({ where: { id: fotoId, incidenteId }, include: { incidente: { include: { movimiento: true } } } });
  if (!foto) throw new DomainError(404, 'Evidencia no encontrada');
  const entity = 'arrastre' in foto.incidente ? foto.incidente.arrastre : foto.incidente.movimiento;
  const key = foto.storageKey ?? foto.url;
  if (!/^\d{4}\/\d{2}\/\d{2}\/torreon_[a-z0-9_-]+\.(?:jpeg|jpg|png|webp)$/i.test(key)) throw new DomainError(404, 'Esta evidencia no está almacenada localmente');
  const root = path.resolve(process.cwd(), 'uploads/incidentes');
  const target = await fs.realpath(path.resolve(root, key)).catch(() => null);
  if (!target || !target.startsWith(`${await fs.realpath(root)}${path.sep}`)) throw new DomainError(404, 'Evidencia no encontrada');
  const buffer = await fs.readFile(target);
  if (buffer.length > 10 * 1024 * 1024) throw new DomainError(413, 'La evidencia excede el tamaño permitido');
  const extension = path.extname(target).slice(1).toLowerCase();
  return { empresaId: entity.empresaId, localidadId: foto.incidente.localidadId, dataUrl: `data:image/${extension === 'jpg' ? 'jpeg' : extension};base64,${buffer.toString('base64')}` };
}
