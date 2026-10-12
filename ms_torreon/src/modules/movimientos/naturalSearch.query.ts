import { z } from 'zod';
import { Prisma } from '../../../generated';

const states = ['SOLICITADO', 'ASIGNADO', 'EN_PROCESO', 'DETENIDO', 'CONCLUIDO', 'CANCELADO', 'ESPERA', 'AGENDADO'] as const;
export const naturalSearchQuery = z.object({
  localidadId: z.coerce.number().int().positive(),
  empresaId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  vista: z.enum(['ACTIVOS', 'PASADOS']).optional(),
  estados: z.string().default('').transform(value => value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean))
    .refine(values => values.every(value => states.includes(value as typeof states[number])), 'Estado inválido'),
  q: z.string().trim().max(120).default(''),
  locomotiveNumber: z.coerce.number().int().positive().optional(),
  locomotivePrefix: z.string().regex(/^\d+$/).max(20).optional(),
  prioridad: z.enum(['ALTA', 'BAJA']).optional(),
  fechaCampo: z.enum(['solicitud', 'inicio', 'fin', 'creacion']).default('solicitud'),
  fechaDesde: z.string().datetime({ offset: true }).optional(),
  fechaHasta: z.string().datetime({ offset: true }).optional(),
  sortBy: z.enum(['id', 'locomotora', 'solicitud', 'inicio', 'fin', 'estado', 'prioridad', 'tipo', 'localidad', 'empresa']).default('id'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
}).refine(q => !q.fechaDesde || !q.fechaHasta || Date.parse(q.fechaDesde) <= Date.parse(q.fechaHasta), {
  message: 'La fecha inicial no puede ser posterior a la final', path: ['fechaDesde'],
});
export type NaturalSearchQuery = z.infer<typeof naturalSearchQuery>;

const dateColumns = { solicitud: 'm.fecha_solicitud', inicio: 'm.fecha_inicio', fin: 'm.fecha_fin', creacion: 'm.created_at' } as const;
const sortColumns = { id: 'm.id', locomotora: 'm.locomotive_number', solicitud: dateColumns.solicitud,
  inicio: dateColumns.inicio, fin: dateColumns.fin, estado: 'm.estado', prioridad: 'm.prioridad',
  tipo: 'm.tipo_movimiento', localidad: 'm.localidad_nombre_snapshot', empresa: 'm.empresa_nombre_snapshot' } as const;

/** Values stay bound parameters; SQL identifiers come exclusively from these fixed maps. */
export function naturalSearchSql(query: NaturalSearchQuery) {
  const clauses: Prisma.Sql[] = [Prisma.sql`m.localidad_id = ${query.localidadId}`];
  if (query.empresaId !== undefined) clauses.push(Prisma.sql`m.empresa_id = ${query.empresaId}`);
  if (query.vista === 'PASADOS') clauses.push(Prisma.sql`m.estado::text IN ('CONCLUIDO', 'CANCELADO')`);
  if (query.vista === 'ACTIVOS') clauses.push(Prisma.sql`m.estado::text NOT IN ('CONCLUIDO', 'CANCELADO')`);
  if (query.estados.length) clauses.push(Prisma.sql`m.estado::text IN (${Prisma.join(query.estados)})`);
  if (query.locomotiveNumber !== undefined) clauses.push(Prisma.sql`m.locomotive_number = ${query.locomotiveNumber}`);
  if (query.locomotivePrefix) clauses.push(Prisma.sql`LEFT(m.locomotive_number::text, ${query.locomotivePrefix.length}::int) = ${query.locomotivePrefix}`);
  if (query.prioridad) clauses.push(Prisma.sql`m.prioridad::text = ${query.prioridad}`);
  const date = Prisma.raw(dateColumns[query.fechaCampo]);
  // Prisma stores these fields as UTC timestamp without time zone. Bind normalized UTC
  // text explicitly so a non-UTC PostgreSQL session cannot shift the search boundary.
  if (query.fechaDesde) clauses.push(Prisma.sql`${date} >= ${new Date(query.fechaDesde).toISOString()}::timestamp`);
  if (query.fechaHasta) clauses.push(Prisma.sql`${date} <= ${new Date(query.fechaHasta).toISOString()}::timestamp`);
  if (query.q) {
    const columns = ['m.id', 'm.locomotive_number', 'm.estado', 'm.prioridad', 'm.tipo_movimiento', 'm.instrucciones',
      'm.empresa_nombre_snapshot', 'm.localidad_nombre_snapshot', 'm.via_origen_nombre_snapshot', 'm.via_destino_nombre_snapshot',
      'm.seccion_origen_nombre_snapshot', 'm.seccion_destino_nombre_snapshot'];
    const matches = columns.map(column => Prisma.sql`STRPOS(LOWER(COALESCE(${Prisma.raw(column)}::text, '')), LOWER(${query.q})) > 0`);
    const requestedId = Number(query.q.slice(1));
    if (/^#\d+$/.test(query.q) && Number.isSafeInteger(requestedId) && requestedId <= 2147483647)
      matches.push(Prisma.sql`m.id = ${requestedId}`);
    clauses.push(Prisma.sql`(${Prisma.join(matches, ' OR ')})`);
  }
  const where = Prisma.join(clauses, ' AND ');
  const direction = Prisma.raw(query.sortDir === 'asc' ? 'ASC' : 'DESC');
  const order = Prisma.sql`${Prisma.raw(sortColumns[query.sortBy])} ${direction} NULLS LAST, m.id ${direction}`;
  return {
    count: Prisma.sql`SELECT COUNT(*)::int AS total FROM movimiento_torreon_ferro m WHERE ${where}`,
    ids: Prisma.sql`SELECT m.id FROM movimiento_torreon_ferro m WHERE ${where} ORDER BY ${order} LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`,
  };
}
