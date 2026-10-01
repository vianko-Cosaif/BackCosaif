import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { MovementFilters } from './movementQuery';

export function movementSqlFilter(filters: MovementFilters) {
  const parts: Prisma.Sql[] = [Prisma.sql`TRUE`];
  if (filters.empresaId !== undefined) parts.push(Prisma.sql`"empresaId" = ${filters.empresaId}`);
  if (filters.localidadId !== undefined) parts.push(Prisma.sql`"localidadId" = ${filters.localidadId}`);
  if (filters.locomotiveNumber !== undefined) parts.push(Prisma.sql`"locomotiveNumber" = ${filters.locomotiveNumber}`);
  if (filters.estado !== undefined) parts.push(Prisma.sql`estado = ${filters.estado}::"EstadoMovimiento"`);
  if (filters.prioridad !== undefined) parts.push(Prisma.sql`prioridad = ${filters.prioridad}::"Prioridad"`);
  if (filters.finalizado !== undefined) parts.push(Prisma.sql`finalizado = ${filters.finalizado}`);
  if (filters.desde) parts.push(Prisma.sql`"createdAt" >= ${new Date(filters.desde)}`);
  if (filters.hasta) parts.push(Prisma.sql`"createdAt" < ${new Date(filters.hasta)}`);
  return Prisma.join(parts, ' AND ');
}
type SummaryRow = { estado: string; cantidad: number; duracionMediaSegundos: number | null };
type Summary = { data: SummaryRow[]; total: number; asOf: string; cacheSeconds: number; dateField: string };
const cache = new Map<string, { until: number; result: Promise<Summary> }>();
export function summarizeMovements(filters: MovementFilters): Promise<Summary> {
  const key = JSON.stringify(filters);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.until > now) return cached.result;
  // Bound memory and collapse simultaneous refreshes of the same dashboard.
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  const result = prisma.$queryRaw<SummaryRow[]>(Prisma.sql`
    SELECT estado::text AS estado, COUNT(*)::int AS cantidad,
      AVG(EXTRACT(EPOCH FROM ("fechaFin" - "fechaInicio"))) FILTER (
        WHERE estado = 'CONCLUIDO' AND "fechaFin" >= "fechaInicio"
      )::float8 AS "duracionMediaSegundos"
    FROM "Movimiento" WHERE ${movementSqlFilter(filters)} GROUP BY estado ORDER BY estado
  `).then(data => ({ data, total: data.reduce((sum, row) => sum + row.cantidad, 0), asOf: new Date(now).toISOString(), cacheSeconds: 5, dateField: 'createdAt' }));
  cache.set(key, { until: now + 5000, result });
  void result.catch(() => { if (cache.get(key)?.result === result) cache.delete(key); });
  return result;
}
