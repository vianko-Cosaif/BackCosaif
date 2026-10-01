import { Prisma } from '@prisma/client';

export type RoundPosition = { id: number; orden: number; rondaNumero: number };
export function firstFreeRound(occupied: Iterable<number>, start: number, limit: number) {
  const taken = new Set(occupied);
  const first = Math.max(1, start);
  for (let n = first; n < first + limit; n++) if (!taken.has(n)) return n;
  return first + limit;
}
export function duplicateRoundIds(rows: readonly { id: number; movimientoId: number }[]) {
  const seen = new Set<number>();
  const duplicates: number[] = [];
  for (const row of rows) {
    if (seen.has(row.movimientoId)) duplicates.push(row.id);
    else seen.add(row.movimientoId);
  }
  return duplicates;
}
// Input is ordered by round, order, id. Only changed positions are persisted.
export function compactRoundPlan(rows: readonly RoundPosition[]): RoundPosition[] {
  const changes: RoundPosition[] = [];
  let previous: number | undefined, round = 0, order = 0;
  for (const row of rows) {
    if (row.rondaNumero !== previous) { previous = row.rondaNumero; round++; order = 0; }
    order++;
    if (row.rondaNumero !== round || row.orden !== order) changes.push({ id: row.id, rondaNumero: round, orden: order });
  }
  return changes;
}
export function companySlotPlan(rows: readonly (RoundPosition & { empresaId: number; prioridad: string; fecha: number })[], limit: number) {
  const sizes = new Map<number, number>();
  const occupied = new Map<number, Set<number>>();
  const groups = new Map<string, typeof rows[number][]>();
  for (const row of rows) {
    sizes.set(row.rondaNumero, (sizes.get(row.rondaNumero) ?? 0) + 1);
    if (row.prioridad === 'ALTA') continue;
    const company = occupied.get(row.empresaId) ?? new Set<number>();
    company.add(row.rondaNumero); occupied.set(row.empresaId, company);
    const key = `${row.rondaNumero}:${row.empresaId}`;
    const group = groups.get(key) ?? []; group.push(row); groups.set(key, group);
  }
  const changes: RoundPosition[] = [];
  for (const group of groups.values()) {
    group.sort((a, b) => a.fecha - b.fecha);
    for (const row of group.slice(1)) {
      const company = occupied.get(row.empresaId)!;
      const target = firstFreeRound(company, row.rondaNumero + 1, limit);
      const order = (sizes.get(target) ?? 0) + 1;
      sizes.set(target, order);
      sizes.set(row.rondaNumero, sizes.get(row.rondaNumero)! - 1);
      company.add(target);
      changes.push({ id: row.id, rondaNumero: target, orden: order });
    }
  }
  return changes;
}
export async function persistRoundPlan(tx: Prisma.TransactionClient, locality: number, changes: readonly RoundPosition[]) {
  for (let offset = 0; offset < changes.length; offset += 250) {
    const values = changes.slice(offset, offset + 250).map(row => Prisma.sql`(${row.id}::int, ${row.rondaNumero}::int, ${row.orden}::int)`);
    await tx.$executeRaw(Prisma.sql`UPDATE "Ronda" AS r SET "rondaNumero" = p.round, orden = p.position, "updatedAt" = NOW()
      FROM (VALUES ${Prisma.join(values)}) AS p(id, round, position)
      WHERE r.id = p.id AND r."localidadId" = ${locality} AND r.concluido = false
        AND (r."rondaNumero" <> p.round OR r.orden <> p.position)`);
  }
}
