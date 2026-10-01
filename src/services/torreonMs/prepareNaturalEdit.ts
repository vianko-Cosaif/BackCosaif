import { prisma } from '../../lib/prisma';
import { prismaTorreon } from '../../lib/servicePrisma';

export async function prepareNaturalEdit(id: number, body: Record<string, any>) {
  const movement = await prismaTorreon.movimientoTorreonFerro.findUnique({ where: { id } });
  if (!movement) throw Object.assign(new Error('Movimiento no encontrado'), { status: 404 });
  body = { ...body };
  // Both shared forms encode section numbers in these tags, not database IDs.
  if (typeof body.instrucciones === 'string') {
    for (const side of ['Origen', 'Destino'] as const) {
      const tag = side === 'Origen' ? 'ORIGEN' : 'DESTINO';
      const match = body.instrucciones.match(new RegExp(`\\[META ${tag}:(\\d+)\\]`, 'i'));
      const viaId = `via${side}Id` in body ? body[`via${side}Id`] : movement[`via${side}Id`];
      if (match) {
        const numero = Number(match[1]);
        if (!Number.isSafeInteger(numero) || numero <= 0 || !Number.isSafeInteger(viaId) || viaId <= 0) throw Object.assign(new Error('Vía o sección inválida'), { status: 400 });
        const section = await prisma.seccionVia.findUnique({ where: { viaId_numero: { viaId, numero } } });
        if (!section) throw Object.assign(new Error('La sección no pertenece a la vía seleccionada'), { status: 400 });
        body[`seccion${side}Id`] = section.id;
      } else if (!(`seccion${side}Id` in body)) {
        body[`seccion${side}Id`] = null;
      }
    }
  }
  const result = { ...body };
  for (const side of ['Origen', 'Destino'] as const) {
    const viaKey = `via${side}Id` as const;
    const sectionKey = `seccion${side}Id` as const;
    const viaName = `via${side}NombreSnapshot`;
    const sectionName = `seccion${side}NombreSnapshot`;
    delete result[viaName]; delete result[sectionName];
    if (!(viaKey in body) && !(sectionKey in body)) continue;
    const viaId = viaKey in body ? body[viaKey] : movement[viaKey];
    if (viaId != null && (!Number.isSafeInteger(viaId) || viaId <= 0)) throw Object.assign(new Error('Vía inválida'), { status: 400 });
    const via = viaId == null ? null : await prisma.via.findUnique({ where: { id: viaId } });
    if (viaId != null && (!via || via.localidadId !== movement.localidadId)) throw Object.assign(new Error('La vía no pertenece a la localidad del movimiento'), { status: 403 });
    result[viaName] = via?.nombre ?? null;
    const sectionId = sectionKey in body ? body[sectionKey] : viaId === movement[viaKey] ? movement[sectionKey] : null;
    if (sectionId != null && (!Number.isSafeInteger(sectionId) || sectionId <= 0)) throw Object.assign(new Error('Sección inválida'), { status: 400 });
    const section = sectionId == null ? null : await prisma.seccionVia.findUnique({ where: { id: sectionId } });
    if (sectionId != null && (!section || section.viaId !== viaId)) throw Object.assign(new Error('La sección no pertenece a la vía seleccionada'), { status: 403 });
    result[sectionKey] = sectionId;
    result[sectionName] = section ? section.nombre ?? String(section.numero) : null;
  }
  return result;
}

/** Expose canonical section numbers to the shared web/mobile form. */
export async function enrichNaturalEdit(value: any) {
  if (!value?.movimiento || !Array.isArray(value.editableKeys)) return value;
  const movement = { ...value.movimiento };
  let instructions = String(movement.instrucciones ?? '').replace(/\[META (?:ORIGEN|DESTINO):\d+\]/gi, '').trim();
  const tags: string[] = [];
  for (const side of ['Origen', 'Destino'] as const) {
    const id = movement[`seccion${side}Id`];
    const section = id ? await prisma.seccionVia.findUnique({ where: { id } }) : null;
    if (section && section.viaId === movement[`via${side}Id`]) tags.push(`[META ${side === 'Origen' ? 'ORIGEN' : 'DESTINO'}:${section.numero}]`);
  }
  movement.instrucciones = [...tags, instructions].filter(Boolean).join(' ');
  return { ...value, movimiento: movement };
}
