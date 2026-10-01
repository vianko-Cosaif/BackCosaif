import { relationCounts } from '../../lib/relationCounts';
import { createHash } from 'crypto';
import { EstadoMovimiento, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

const positiveId = z.union([z.number(), z.string().regex(/^\d+$/)]).pipe(z.coerce.number().int().positive().max(2147483647));
const timestamp = z.string().datetime({ offset: true });
export const movementFiltersSchema = z.object({
  empresaId: positiveId.optional(), localidadId: positiveId.optional(),
  locomotiveNumber: positiveId.optional(), estado: z.nativeEnum(EstadoMovimiento).optional(),
  prioridad: z.enum(['ALTA', 'BAJA']).optional(),
  finalizado: z.union([z.boolean(), z.enum(['true', 'false']).transform(v => v === 'true')]).optional(),
  desde: timestamp.optional(), hasta: timestamp.optional(),
}).strict().refine(v => !v.desde || !v.hasta || Date.parse(v.desde) < Date.parse(v.hasta), 'desde debe ser anterior a hasta');
export type MovementFilters = z.infer<typeof movementFiltersSchema>;
export function movementWhere(filters: MovementFilters): Prisma.MovimientoWhereInput {
  const { desde, hasta, ...where } = filters;
  return { ...where, ...(desde || hasta ? { createdAt: { ...(desde ? { gte: new Date(desde) } : {}), ...(hasta ? { lt: new Date(hasta) } : {}) } } : {}) };
}
export function boundedReportFilters(value: unknown) {
  const filters = movementFiltersSchema.parse(value);
  if (!filters.desde || !filters.hasta || Date.parse(filters.hasta) - Date.parse(filters.desde) > 366 * 86400000) {
    throw new z.ZodError([{ code: 'custom', path: ['hasta'], message: 'Los reportes requieren desde y hasta, con un máximo de 366 días' }]);
  }
  return filters;
}

export const movementListSelect = {
  id: true, empresaId: true, localidadId: true, locomotiveNumber: true, estado: true,
  prioridad: true, tipoMovimiento: true, finalizado: true, lavado: true, torno: true,
  fechaSolicitud: true, fechaInicio: true, fechaFin: true, createdAt: true, updatedAt: true,
  empresa: { select: { id: true, nombre: true } }, localidad: { select: { id: true, nombre: true } },
  operador: { select: { id: true, nombre: true } },
  viaOrigen: { select: { id: true, nombre: true } }, viaDestino: { select: { id: true, nombre: true } },
  ronda: { select: { rondaNumero: true, orden: true, concluido: true } },
} as const satisfies Prisma.MovimientoSelect;

const cursorSchema = z.object({ v: z.literal(1), id: positiveId, at: timestamp, asOf: timestamp, filter: z.string().length(64) }).strict();
const cursorOptions = z.object({ pageSize: positiveId.pipe(z.number().max(50)).default(20), cursor: z.string().max(600).optional(), includeTotal: z.enum(['true', 'false']).default('false') });
export function readMovementListQuery(query: Record<string, unknown>) {
  const { pageSize, cursor, includeTotal, ...filter } = query;
  return { filters: movementFiltersSchema.parse(filter), ...cursorOptions.parse({ pageSize, cursor, includeTotal }) };
}
export async function listCompactMovements(input: ReturnType<typeof readMovementListQuery>) {
  const filter = createHash('sha256').update(JSON.stringify(input.filters)).digest('hex');
  let after: z.infer<typeof cursorSchema> | undefined;
  if (input.cursor) {
    try {
      if (!/^[A-Za-z0-9_-]+$/.test(input.cursor)) throw new Error();
      after = cursorSchema.parse(JSON.parse(Buffer.from(input.cursor, 'base64url').toString('utf8')));
      if (after.filter !== filter || Date.parse(after.at) > Date.parse(after.asOf)) throw new Error();
    } catch { throw new z.ZodError([{ code: 'custom', path: ['cursor'], message: 'Cursor inválido o incompatible con los filtros' }]); }
  }
  const asOf = after?.asOf ?? new Date().toISOString();
  const where: Prisma.MovimientoWhereInput = { AND: [movementWhere(input.filters), { createdAt: { lte: new Date(asOf) } }] };
  const pageWhere: Prisma.MovimientoWhereInput = after ? { AND: [where, { createdAt: { lte: new Date(after.at) } }, { OR: [
    { createdAt: { lt: new Date(after.at) } }, { createdAt: new Date(after.at), id: { lt: after.id } },
  ] }] } : where;
  const [rows, total] = await Promise.all([
    prisma.movimiento.findMany({ where: pageWhere, select: movementListSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: input.pageSize + 1 }),
    input.includeTotal === 'true' ? prisma.movimiento.count({ where }) : Promise.resolve(null),
  ]);
  const hasNextPage = rows.length > input.pageSize;
  const selected = rows.slice(0, input.pageSize);
  const counts = await relationCounts(prisma.incidente, 'movimientoId', selected.map(row => row.id));
  const data = selected.map(row => ({ ...row, _count: { incidentes: counts.get(row.id) ?? 0 } }));
  const last = data[data.length - 1];
  const nextCursor = hasNextPage && last ? Buffer.from(JSON.stringify({ v: 1, id: last.id, at: last.createdAt.toISOString(), asOf, filter })).toString('base64url') : null;
  return { data, meta: { pageSize: input.pageSize, hasNextPage, nextCursor, total, asOf } };
}
