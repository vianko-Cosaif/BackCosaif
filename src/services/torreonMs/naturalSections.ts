import { prisma } from '../../lib/prisma';

const positiveInt = (value: unknown): number | null => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
};
const normalized = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();

/** Section IDs are technical keys. Only the authoritative catalogue supplies its number. */
export function naturalSectionLabel(section: { numero: number; nombre?: string | null }) {
  const label = `Sección ${section.numero}`;
  const name = String(section.nombre ?? '').trim();
  if (!name || name === String(section.numero) || normalized(name) === normalized(label)) return label;
  const suffix = name.replace(new RegExp(`^secci[oó]n\\s+${section.numero}\\s*[·:-]\\s*`, 'i'), '');
  return `${label} · ${suffix}`;
}

function isMovement(value: Record<string, any>) {
  return 'locomotiveNumber' in value && 'localidadId' in value
    && ('viaOrigenId' in value || 'viaDestinoId' in value);
}

/**
 * Enrich only natural-movement DTOs, after caller scope/redaction. One lookup covers
 * a queue, a search page, or a detail envelope; legacy snapshots need no migration.
 * Missing or mismatched catalogue references remain unverified (number = null).
 */
export async function enrichNaturalSections<T>(value: T): Promise<T> {
  const sectionIds = new Set<number>();
  function collect(node: unknown) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(collect); return; }
    const record = node as Record<string, any>;
    if (isMovement(record)) {
      for (const side of ['Origen', 'Destino']) {
        const id = positiveInt(record[`seccion${side}Id`]);
        if (id) sectionIds.add(id);
      }
    }
    Object.values(record).forEach(collect);
  }
  collect(value);
  const sections = sectionIds.size ? await prisma.seccionVia.findMany({
    where: { id: { in: [...sectionIds] } },
    select: {
      id: true, viaId: true, numero: true, nombre: true,
      via: { select: { localidadId: true, localidad: { select: { nombre: true } } } },
    },
  }) : [];
  const byId = new Map(sections.map(section => [section.id, section]));
  function enrich(node: any): any {
    if (!node || typeof node !== 'object' || node instanceof Date) return node;
    if (Array.isArray(node)) return node.map(enrich);
    const result = Object.fromEntries(Object.entries(node).map(([key, child]) => [key, enrich(child)]));
    if (!isMovement(result)) return result;
    for (const side of ['Origen', 'Destino']) {
      result[`seccion${side}Numero`] = null;
      const section = byId.get(positiveInt(result[`seccion${side}Id`]) ?? -1);
      if (!section || section.viaId !== positiveInt(result[`via${side}Id`])
        || section.via.localidadId !== positiveInt(result.localidadId)
        || normalized(section.via.localidad.nombre) !== 'TORREON'
        || !positiveInt(section.numero)) continue;
      result[`seccion${side}Numero`] = section.numero;
      result[`seccion${side}NombreSnapshot`] = naturalSectionLabel(section);
    }
    return result;
  }
  return enrich(value);
}
