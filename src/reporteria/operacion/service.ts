import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { analyze, prepareRow, ZONE, MovementInput, duration, summarize } from './analytics';
import { analyzeIncidents } from './incident-analytics';
import { analyzeRetries } from './retries';
import { analyzeDestinations, destinationKind } from './destinations';

export class ReportError extends Error { constructor(message: string, public status = 400) { super(message); } }
const id = z.preprocess(v => v === '' ? undefined : v, z.coerce.number().int().positive().optional());
const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  companyId: id, localityId: id, clientId: z.union([z.literal('unassigned'), id]), type: z.enum(['ALL', 'REMOLCADA', 'MD_TRABAJANDO']).default('ALL'),
  target: z.coerce.number().int().min(1).max(1440).default(60),
}).strict();
export function parseFilters(query: unknown, now = new Date()) {
  const parsed = querySchema.safeParse(query);
  if (!parsed.success) throw new ReportError('Revisa las fechas, empresa, localidad y objetivo (1 a 1440 minutos).');
  const f = parsed.data;
  const start = DateTime.fromISO(f.from, { zone: ZONE }).startOf('day');
  const endDay = DateTime.fromISO(f.to, { zone: ZONE }).startOf('day').plus({ days: 1 });
  const today = DateTime.fromJSDate(now, { zone: ZONE });
  if (!start.isValid || !endDay.isValid || start >= endDay || start > today || endDay > today.startOf('day').plus({ days: 1 })) throw new ReportError('Elige un rango válido que termine hoy o antes.');
  const days = endDay.diff(start, 'days').days;
  if (days > 366) throw new ReportError('Consulta hasta 366 días por reporte.');
  const end = endDay > today ? today : endDay;
  const previousStart = start.minus({ days });
  const previousEnd = previousStart.plus({ milliseconds: end.toMillis() - start.toMillis() });
  return { ...f, start: start.toJSDate(), end: end.toJSDate(), previousStart: previousStart.toJSDate(), previousEnd: previousEnd.toJSDate(), partialDay: endDay > today };
}
export type Filters = ReturnType<typeof parseFilters>;
const person = { select: { id: true, nombre: true } } as const;
const movementSelect = {
  id: true, empresaId: true, localidadId: true, locomotiveNumber: true, estado: true, tipoMovimiento: true,
  finalizado: true, fechaSolicitud: true, fechaInicio: true, fechaFin: true, fechaPausa: true, instrucciones: true, torno: true, lavado: true,
  empresa: { select: { nombre: true } }, localidad: { select: { nombre: true } },
  viaOrigen: person, viaDestino: person, operador: person, supervisor: person, coordinador: person, cliente: person,
  incidentes: { select: { id: true, descripcion: true, estado: true, fechaInicio: true, fechaFin: true, usuario: person }, orderBy: { id: 'asc' as const } },
} satisfies Prisma.MovimientoSelect;
const MAX_ROWS = 50_000;
const TTL = 15 * 60_000;
export const snapshots = new Map<string, { owner: number; expires: number; data: Snapshot }>();

export async function buildReport(query: unknown, now = new Date()) {
  const f = parseFilters(query, now);
  const scope: Prisma.MovimientoWhereInput = { empresaId: f.companyId, localidadId: f.localityId, clienteId: f.clientId === 'unassigned' ? null : f.clientId, ...(f.type !== 'ALL' ? { tipoMovimiento: f.type } : {}) };
  // Consistent read: counts, detail, comparison and source coverage share one PostgreSQL snapshot.
  const source = await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const bounds = { ...scope, fechaSolicitud: { gte: f.previousStart, lt: f.end } };
    const count = await tx.movimiento.count({ where: bounds });
    if (count > MAX_ROWS) throw new ReportError('El periodo y su comparación superan 50,000 movimientos. Reduce el rango o selecciona una empresa.', 413);
    const movements = await tx.movimiento.findMany({ where: bounds, select: movementSelect, orderBy: [{ fechaSolicitud: 'asc' }, { id: 'asc' }] });
    const coverage = await tx.movimiento.aggregate({ where: scope, _min: { fechaSolicitud: true }, _max: { fechaSolicitud: true } });
    const companies = await tx.empresa.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } });
    const localities = await tx.localidad.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } });
    const users = await tx.usuario.findMany({ where: { movimientos: { some: {} } }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } });
    const pairs = await tx.movimiento.groupBy({ by: ['empresaId', 'clienteId'] });
    const clients = users.map(u => ({ ...u, companyIds: pairs.filter(p => p.clienteId === u.id).map(p => p.empresaId) }));
    return { movements, coverage, companies, localities, clients };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30_000 });
  const current = source.movements.filter(m => m.fechaSolicitud >= f.start && m.fechaSolicitud < f.end) as MovementInput[];
  const previous = source.movements.filter(m => m.fechaSolicitud >= f.previousStart && m.fechaSolicitud < f.previousEnd).map(m => prepareRow(m, now));
  const rows = current.map(m => prepareRow(m, now));
  const result = analyze(rows, previous, f.target);
  const dayMap = new Map(result.days.map(d => [d.key, d]));
  for (let d = DateTime.fromISO(f.from, { zone: ZONE }); d.toISODate()! <= f.to; d = d.plus({ days: 1 })) {
    const day = d.toISODate()!;
    if (!dayMap.has(day)) result.days.push({ key: day, label: day, ...summarize([], f.target), smallSample: true });
  }
  result.days.sort((a, b) => a.key.localeCompare(b.key));
  // Exact normalized descriptions, not an inferred classification or causal model.
  const incidentRows = current.flatMap(m => m.incidentes.map(i => ({
    id: i.id, movementId: m.id, company: m.empresa.nombre, companyId: m.empresaId, client: m.cliente?.nombre || 'Sin cliente asociado', locomotive: m.locomotiveNumber,
    description: i.descripcion, state: i.estado, startedAt: i.fechaInicio.toISOString(), endedAt: i.fechaFin?.toISOString() ?? null,
    duration: duration(i.fechaInicio, i.fechaFin),
    reporterId: i.usuario?.id ?? null, reporter: i.usuario?.nombre || 'Sin informante registrado',
    openAge: i.estado === 'ABIERTO' ? duration(i.fechaInicio, now) : null,
  })));
  const first = source.coverage._min.fechaSolicitud, last = source.coverage._max.fechaSolicitud;
  const warnings: string[] = [];
  if (f.partialDay) warnings.push('Hoy está en curso. La comparación anterior termina a la misma hora transcurrida.');
  if (!first || first > f.previousStart) warnings.push('El historial observable no cubre el inicio del periodo anterior. El comparativo puede estar incompleto.');
  if (last && last < new Date(f.end.getTime() - 86400_000)) warnings.push('La última solicitud registrada es anterior al final seleccionado. Confirma si hubo inactividad o si falta información.');
  if (!first) warnings.push('No hay historial con estos filtros.');
  return {
    ...result,
    retries: analyzeRetries(rows),
    destinations: analyzeDestinations(rows, f.target),
    meta: {
      id: randomUUID(), generatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + TTL).toISOString(), zone: ZONE,
      from: f.from, to: f.to, start: f.start.toISOString(), endExclusive: f.end.toISOString(),
      previousStart: f.previousStart.toISOString(), previousEndExclusive: f.previousEnd.toISOString(), partialDay: f.partialDay,
      target: f.target, companyId: f.companyId ?? null, localityId: f.localityId ?? null, type: f.type,
      clientId: f.clientId ?? null, client: f.clientId === 'unassigned' ? 'Sin cliente asociado' : f.clientId ? source.clients.find(c => c.id === f.clientId)?.nombre || 'Cliente sin registros' : 'Todos los clientes',
      company: f.companyId ? source.companies.find(c => c.id === f.companyId)?.nombre || 'Empresa sin registros' : 'Todas las empresas',
      locality: f.localityId ? source.localities.find(c => c.id === f.localityId)?.nombre || 'Localidad sin registros' : 'Todas las localidades',
      firstRequest: first?.toISOString() ?? null, lastRequest: last?.toISOString() ?? null,
      comparisonCovered: !!first && first <= f.previousStart, warnings,
    },
    catalogs: { companies: source.companies, localities: source.localities, clients: source.clients },
    incidents: analyzeIncidents(incidentRows),
    rows, incidentRows,
  };
}
export type Snapshot = Awaited<ReturnType<typeof buildReport>>;
export type PublicReport = Omit<Snapshot, 'rows' | 'incidentRows'>;
export function publicReport(data: Snapshot): PublicReport { const { rows, incidentRows, ...report } = data; return report; }
export function storeSnapshot(owner: number, data: Snapshot) {
  const now = Date.now();
  for (const [id, value] of snapshots) if (value.expires <= now) snapshots.delete(id);
  // Bound server memory and keep exports local to the requesting administrator.
  while (snapshots.size >= 12) snapshots.delete(snapshots.keys().next().value!);
  snapshots.set(data.meta.id, { owner, expires: now + TTL, data });
}
export function getSnapshot(owner: number, id: string): Snapshot {
  const item = snapshots.get(id);
  if (!item || item.owner !== owner || item.expires <= Date.now()) throw new ReportError('Este reporte venció o ya no está disponible. Pulsa Actualizar reporte para volver a descargarlo.', 410);
  return item.data;
}
const detailSchema = z.object({ page: z.coerce.number().int().min(1).default(1), q: z.string().max(150).default(''),
  filter: z.enum(['all', 'late', 'incident', 'pending', 'timing', 'quality', 'short', 'acceptable', 'long', 'unassessed', 'not_concluded', 'duration_data', 'client_delay', 'client_delay_missing', 'cancelled_limit', 'destination_service']).default('all'),
  issue: z.string().max(50).optional(), state: z.string().max(30).default(''),
  group: z.enum(['company', 'client', 'operator', 'route', 'locomotive', 'via', 'reporter', 'retry', 'destination', 'destination_client']).optional(), groupKey: z.string().max(100).optional(),
  sort: z.enum(['wait', 'recent', 'incidents', 'execution', 'shortest', 'impact']).default('recent'),
}).strict();
export function detailPage(report: Snapshot, query: unknown) {
  const parsed = detailSchema.safeParse(query);
  if (!parsed.success) throw new ReportError('Revisa los filtros del detalle.');
  const f = parsed.data, q = f.q.trim().toLocaleLowerCase('es-MX');
  if (!!f.group !== !!f.groupKey) throw new ReportError('El grupo del detalle está incompleto.');
  const reporterIds = f.group === 'reporter' ? new Set(report.incidentRows.filter(i => String(i.reporterId ?? 'unassigned') === f.groupKey).map(i => i.movementId)) : null;
  const retryIds = f.group === 'retry' ? new Set(report.retries.find(r => r.key === f.groupKey)?.ids || []) : null;
  const rows = report.rows.filter(r => {
    if (f.group === 'destination' && destinationKind(r) !== f.groupKey) return false;
    if (f.group === 'destination_client' && `${destinationKind(r)}:${r.clientKey}` !== f.groupKey) return false;
    if (f.group === 'company' && String(r.companyId) !== f.groupKey) return false;
    if (f.group === 'client' && r.clientKey !== f.groupKey) return false;
    if (f.group === 'operator' && String(r.operatorId ?? 'unassigned') !== f.groupKey) return false;
    if (f.group === 'route' && r.routeKey !== f.groupKey) return false;
    if (f.group === 'locomotive' && `${r.companyId}:${r.locomotive}` !== f.groupKey) return false;
    if (f.group === 'via' && ![r.originId, r.destinationId].some(id => id !== null && String(id) === f.groupKey)) return false;
    if (reporterIds && !reporterIds.has(r.id)) return false;
    if (retryIds && !retryIds.has(r.id)) return false;
    if (['short', 'acceptable', 'long', 'unassessed'].includes(f.filter) && r.durationBand !== f.filter) return false;
    if (f.filter === 'not_concluded' && (r.durationBand !== 'unassessed' || !r.pending)) return false;
    if (f.filter === 'duration_data' && (r.durationBand !== 'unassessed' || r.pending)) return false;
    if (f.filter === 'client_delay' && r.clientDelay === null) return false;
    if (f.filter === 'client_delay_missing' && (!['DETENIDO', 'CANCELADO'].includes(r.state) || r.clientDelay !== null)) return false;
    if (f.filter === 'destination_service' && r.destinationEvidence !== 'service') return false;
    if (f.filter === 'cancelled_limit' && !r.cancelledByIncidentLimit) return false;
    if (f.state && r.state !== f.state) return false;
    if (f.issue && !r.issues.includes(f.issue)) return false;
    if (f.filter === 'late' && (r.wait === null || r.wait <= report.meta.target)) return false;
    if (f.filter === 'incident' && !r.incidentCount) return false;
    if (f.filter === 'pending' && !r.pending) return false;
    if (f.filter === 'quality' && !r.issues.length) return false;
    if (f.filter === 'timing' && !r.issues.some(i => ['invalidWait', 'invalidExecution', 'missingEnd', 'missingStart', 'stateMismatch'].includes(i))) return false;
    return !q || [r.id, r.locomotive, r.company, r.client, r.locality, r.operator, r.origin, r.destination].join(' ').toLocaleLowerCase('es-MX').includes(q);
  }).sort((a, b) => {
    if (f.sort === 'wait') return (b.wait ?? -1) - (a.wait ?? -1) || b.id - a.id;
    if (f.sort === 'execution') return (b.execution ?? -1) - (a.execution ?? -1) || b.id - a.id;
    if (f.sort === 'shortest') return (a.execution ?? Infinity) - (b.execution ?? Infinity) || b.id - a.id;
    if (f.sort === 'impact') return (b.incidentMinutes ?? -1) - (a.incidentMinutes ?? -1) || b.id - a.id;
    if (f.sort === 'incidents') return b.incidentCount - a.incidentCount || b.id - a.id;
    return b.requestedAt.localeCompare(a.requestedAt) || b.id - a.id;
  });
  const pageSize = 25, pages = Math.max(1, Math.ceil(rows.length / pageSize)), page = Math.min(f.page, pages);
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);
  const ids = new Set(visible.map(r => r.id));
  const incidents = new Map<number, Snapshot['incidentRows']>();
  for (const incident of report.incidentRows) if (ids.has(incident.movementId)) {
    if (!incidents.has(incident.movementId)) incidents.set(incident.movementId, []);
    incidents.get(incident.movementId)!.push(incident);
  }
  return { total: rows.length, page, pages, pageSize, rows: visible.map(r => ({ ...r, incidents: incidents.get(r.id) || [] })) };
}
