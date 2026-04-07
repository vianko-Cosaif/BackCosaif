// reporteria/modelos/ceo-base.ts
// Base de datos para reportes CEO (JSON/PDF)

import { DateTime } from 'luxon';
import { Prisma, PrismaClient } from '@prisma/client';
import type { AdminReporteFilters, PeriodoReporte } from './admin-model';

const MX_TZ = 'America/Mexico_City';
const safeNum = (n: any) => (Number.isFinite(Number(n)) ? Number(n) : 0);

// Umbrales operativos (mismos que admin)
const EXEC_BUCKET_FAST_MAX = 10; // 0–9 min
const EXEC_BUCKET_OK_MAX = 90; // 10–89 min
const EXEC_CRIT_LT_MIN = 2; // <2 min
const EXEC_CRIT_GTE_MIN = 90; // >=90 min
const ESPERA_OK_MAX = 15; // solicitud->inicio aceptable (min)
const LEAD_OK_MAX = 120; // solicitud->fin aceptable (min)

export const ESTADOS_MOV = [
  'SOLICITADO',
  'EN_PROCESO',
  'DETENIDO',
  'ESPERA',
  'MODIFICADO',
  'CONCLUIDO',
  'CANCELADO',
] as const;
export type EstadoMovimientoId = (typeof ESTADOS_MOV)[number];

export type ExecBucketId = 'm0_9' | 'm10_89' | 'gte90';

export type TurnoId = 'T1' | 'T2' | 'T3';
export type TurnoInfo = { id: TurnoId; label: string; rango: string };

export const TURNOS: TurnoInfo[] = [
  { id: 'T1', label: 'Turno 1', rango: '07:00–15:00' },
  { id: 'T2', label: 'Turno 2', rango: '15:00–23:00' },
  { id: 'T3', label: 'Turno 3', rango: '23:00–07:00' },
];

function turnoFromHour(hour: number): TurnoInfo {
  if (hour >= 7 && hour < 15) return TURNOS[0];
  if (hour >= 15 && hour < 23) return TURNOS[1];
  return TURNOS[2];
}

function parseFechaLocal(fechaLocal: string, tz: string) {
  const dt = DateTime.fromISO(fechaLocal, { zone: tz });
  if (!dt.isValid) throw new Error('Fecha inválida, usa YYYY-MM-DD');
  return dt;
}

function etiquetaPeriodo(periodo: PeriodoReporte, dtLocal: DateTime) {
  const y = dtLocal.year;
  const m = dtLocal.month;

  if (periodo === 'DIA') return dtLocal.toFormat('yyyy-LL-dd');

  if (periodo === 'SEMANA') {
    const wy = dtLocal.weekYear;
    const w = dtLocal.weekNumber;
    return `${wy}-W${String(w).padStart(2, '0')}`;
  }

  if (periodo === 'MES') return dtLocal.toFormat('yyyy-LL');

  if (periodo === 'BIMESTRE') {
    const b = Math.floor((m - 1) / 2) + 1;
    return `${y}-B${String(b).padStart(2, '0')}`;
  }

  if (periodo === 'SEMESTRE') {
    const s = m <= 6 ? 1 : 2;
    return `${y}-S${s}`;
  }

  return `${y}`;
}

export function rangoPeriodoUTC(fechaLocal: string, tz: string, periodo: PeriodoReporte) {
  const anchor = parseFechaLocal(fechaLocal, tz);

  let startLocal: DateTime;
  let endLocal: DateTime;

  switch (periodo) {
    case 'DIA': {
      startLocal = anchor.startOf('day');
      endLocal = startLocal.plus({ days: 1 });
      break;
    }
    case 'SEMANA': {
      startLocal = anchor.startOf('week').startOf('day');
      endLocal = startLocal.plus({ weeks: 1 });
      break;
    }
    case 'MES': {
      startLocal = anchor.startOf('month').startOf('day');
      endLocal = startLocal.plus({ months: 1 });
      break;
    }
    case 'BIMESTRE': {
      const bIndex = Math.floor((anchor.month - 1) / 2);
      const startMonth = bIndex * 2 + 1;
      startLocal = anchor.set({ month: startMonth, day: 1 }).startOf('day');
      endLocal = startLocal.plus({ months: 2 });
      break;
    }
    case 'SEMESTRE': {
      const startMonth = anchor.month <= 6 ? 1 : 7;
      startLocal = anchor.set({ month: startMonth, day: 1 }).startOf('day');
      endLocal = startLocal.plus({ months: 6 });
      break;
    }
    case 'ANUAL': {
      startLocal = anchor.startOf('year').startOf('day');
      endLocal = startLocal.plus({ years: 1 });
      break;
    }
    default:
      throw new Error(`Periodo no soportado: ${periodo}`);
  }

  return {
    anchor,
    startLocal,
    endLocal,
    startUTC: startLocal.toUTC(),
    endUTC: endLocal.toUTC(),
  };
}

export function rangoAnteriorFromCurrent(startLocal: DateTime, periodo: PeriodoReporte) {
  let prevStart = startLocal;
  switch (periodo) {
    case 'DIA':
      prevStart = startLocal.minus({ days: 1 });
      break;
    case 'SEMANA':
      prevStart = startLocal.minus({ weeks: 1 });
      break;
    case 'MES':
      prevStart = startLocal.minus({ months: 1 });
      break;
    case 'BIMESTRE':
      prevStart = startLocal.minus({ months: 2 });
      break;
    case 'SEMESTRE':
      prevStart = startLocal.minus({ months: 6 });
      break;
    case 'ANUAL':
      prevStart = startLocal.minus({ years: 1 });
      break;
  }
  const prevEnd = startLocal;
  return {
    startLocal: prevStart,
    endLocal: prevEnd,
    startUTC: prevStart.toUTC(),
    endUTC: prevEnd.toUTC(),
  };
}

function minutesBetween(a?: Date | null, b?: Date | null) {
  if (!a || !b) return null;
  const ms = b.getTime() - a.getTime();
  if (!Number.isFinite(ms)) return null;
  return ms / 60000;
}

function execBucketFromMinutes(min: number | null): ExecBucketId | null {
  if (min === null || !Number.isFinite(min)) return null;
  if (min < EXEC_BUCKET_FAST_MAX) return 'm0_9';
  if (min < EXEC_BUCKET_OK_MAX) return 'm10_89';
  return 'gte90';
}

export function execBucketLabel(id: ExecBucketId) {
  switch (id) {
    case 'm0_9':
      return '0–9 min';
    case 'm10_89':
      return '10–89 min';
    case 'gte90':
      return '90+ min';
  }
}

function mean(xs: number[]) {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs: number[]) {
  if (!xs.length) return 0;
  const a = [...xs].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

export function percentile(xs: number[], p: number) {
  if (!xs.length) return 0;
  const a = [...xs].sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.max(0, Math.ceil(p * a.length) - 1));
  return a[idx] ?? 0;
}

function fmtMXFromDate(d: Date, tz: string) {
  return DateTime.fromJSDate(d, { zone: tz }).toFormat('yyyy-LL-dd HH:mm');
}

export type CeoMovimientoDetalle = {
  id: number;
  estado: EstadoMovimientoId | string;
  empresaId: number;
  empresa: string;
  localidadId: number;
  localidad: string;
  locomotiveNumber: number;

  fechaSolicitudUTC: string;
  fechaInicioUTC: string | null;
  fechaFinUTC: string | null;

  fechaSolicitudMX: string;
  fechaInicioMX: string | null;
  fechaFinMX: string | null;
  diaMX: string;

  minSolicitudAFin: number | null;
  minSolicitudAInicio: number | null;
  minInicioAFin: number | null;
  backlogAgeMin: number | null;

  incidentesCount: number;
  incidentesAbiertos: number;
  incidentesResueltos: number;
  incidentesCerrados: number;

  execBucket: ExecBucketId | null;
  execLt2: boolean;
  execGte90: boolean;

  horaMX: number;
  diaSemanaMX: string;
  turnoId: TurnoId;
  turnoLabel: string;
  turnoRango: string;

  canceladoConIncidente: boolean;

  usuarios: {
    creadoPor: { id: number; nombre: string; rol: string };
    cliente: { id: number; nombre: string; rol: string } | null;
    operador: { id: number; nombre: string; rol: string } | null;
    supervisor: { id: number; nombre: string; rol: string } | null;
    coordinador: { id: number; nombre: string; rol: string } | null;
  };
};

export type CeoBaseMeta = {
  periodo: PeriodoReporte;
  etiqueta: string;
  fechaLocal: string;
  tz: string;
  rangoUTC: { desde: string; hastaExclusivo: string };
  rangoLocal: { desde: string; hastaExclusivo: string };
};

export type CeoBase = {
  meta: CeoBaseMeta;
  detalles: CeoMovimientoDetalle[];
  incidentesPorEstado: Record<string, number>;
};

export type EstadoCounts = Record<EstadoMovimientoId, number>;

export function initEstadoCounts(): EstadoCounts {
  return ESTADOS_MOV.reduce((acc, k) => {
    acc[k] = 0;
    return acc;
  }, {} as EstadoCounts);
}

export function buildEstadoCounts(detalles: CeoMovimientoDetalle[]): EstadoCounts {
  const counts = initEstadoCounts();
  for (const d of detalles) {
    const st = String(d.estado) as EstadoMovimientoId;
    if (counts[st] === undefined) continue;
    counts[st] += 1;
  }
  return counts;
}

export type ExecBucketRow = { id: ExecBucketId; label: string; movimientos: number; pct: number };

export function buildExecBuckets(detalles: CeoMovimientoDetalle[]) {
  const conInicioFin = detalles.filter((d) => d.minInicioAFin !== null);
  const total = conInicioFin.length;
  const order: ExecBucketId[] = ['m0_9', 'm10_89', 'gte90'];
  const agg = new Map<ExecBucketId, number>();
  for (const id of order) agg.set(id, 0);
  for (const d of conInicioFin) {
    if (d.execBucket) agg.set(d.execBucket, (agg.get(d.execBucket) ?? 0) + 1);
  }
  const rows: ExecBucketRow[] = order.map((id) => {
    const mov = agg.get(id) ?? 0;
    const pct = total ? Math.round((mov / total) * 100) : 0;
    return { id, label: execBucketLabel(id), movimientos: mov, pct };
  });
  return { rows, totalConInicioFin: total };
}

export function buildTraffic(detalles: CeoMovimientoDetalle[]) {
  const hourCounts = Array.from({ length: 24 }, () => 0);
  const hourIncCounts = Array.from({ length: 24 }, () => 0);
  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const dayCounts = new Map<string, number>(dayLabels.map((d) => [d, 0]));
  const dayIncCounts = new Map<string, number>(dayLabels.map((d) => [d, 0]));

  for (const d of detalles) {
    if (d.horaMX >= 0 && d.horaMX <= 23) hourCounts[d.horaMX] += 1;
    if (d.horaMX >= 0 && d.horaMX <= 23) hourIncCounts[d.horaMX] += d.incidentesCount;
    dayCounts.set(d.diaSemanaMX, (dayCounts.get(d.diaSemanaMX) ?? 0) + 1);
    dayIncCounts.set(d.diaSemanaMX, (dayIncCounts.get(d.diaSemanaMX) ?? 0) + d.incidentesCount);
  }

  return {
    movimientosPorHora: hourCounts.map((movimientos, hora) => ({ hora, movimientos })),
    movimientosPorDiaSemana: dayLabels.map((dia) => ({ dia, movimientos: dayCounts.get(dia) ?? 0 })),
    incidentesPorHora: hourIncCounts.map((incidentes, hora) => ({ hora, incidentes })),
    incidentesPorDiaSemana: dayLabels.map((dia) => ({ dia, incidentes: dayIncCounts.get(dia) ?? 0 })),
  };
}

export type BaseKpis = {
  totalMovimientos: number;
  totalConFin: number;
  totalSinFin: number;
  totalConInicioFin: number;

  execMeanMin: number;
  execMedianMin: number;
  execP90Min: number;

  esperaMeanMin: number;
  esperaMedianMin: number;
  esperaP90Min: number;
  esperaOkPct: number;

  leadMeanMin: number;
  leadMedianMin: number;
  leadP90Min: number;
  leadOkPct: number;

  totalIncidentes: number;
  movimientosConIncidente: number;
  movimientosConIncidentePct: number;

  criticosLt2: number;
  criticosGte90: number;
  criticosTotal: number;

  locomotorasCritLt2: number;
  locomotorasCritGte90: number;

  backlogAvgAgeMin: number;
  backlogP90AgeMin: number;
  backlogMaxAgeMin: number;

  variabilidadExecRatio: number;
  indiceOperativo: number;

  cancelados: number;
  canceladosConIncidente: number;
};

export function computeKpis(detalles: CeoMovimientoDetalle[]): BaseKpis {
  const totalMov = detalles.length;

  const conFin = detalles.filter((d) => d.minSolicitudAFin !== null);
  const totalConFin = conFin.length;
  const totalSinFin = totalMov - totalConFin;

  const conInicioFin = detalles.filter((d) => d.minInicioAFin !== null);
  const totalConInicioFin = conInicioFin.length;

  const execAll = conInicioFin.map((d) => safeNum(d.minInicioAFin));
  const execMeanMin = mean(execAll);
  const execMedianMin = median(execAll);
  const execP90Min = percentile(execAll, 0.9);

  const esperaAll = detalles
    .filter((d) => d.minSolicitudAInicio !== null)
    .map((d) => safeNum(d.minSolicitudAInicio));
  const esperaMeanMin = mean(esperaAll);
  const esperaMedianMin = median(esperaAll);
  const esperaP90Min = percentile(esperaAll, 0.9);
  const esperaOkPct = esperaAll.length
    ? Math.round((esperaAll.filter((x) => x <= ESPERA_OK_MAX).length / esperaAll.length) * 100)
    : 0;

  const leadAll = conFin.map((d) => safeNum(d.minSolicitudAFin));
  const leadMeanMin = mean(leadAll);
  const leadMedianMin = median(leadAll);
  const leadP90Min = percentile(leadAll, 0.9);
  const leadOkPct = leadAll.length
    ? Math.round((leadAll.filter((x) => x <= LEAD_OK_MAX).length / leadAll.length) * 100)
    : 0;

  const backlogAges = detalles
    .filter((d) => d.backlogAgeMin !== null)
    .map((d) => safeNum(d.backlogAgeMin));
  const backlogAvgAgeMin = mean(backlogAges);
  const backlogP90AgeMin = percentile(backlogAges, 0.9);
  const backlogMaxAgeMin = backlogAges.length ? Math.max(...backlogAges) : 0;

  const movConInc = detalles.filter((d) => d.incidentesCount > 0).length;
  const movConIncPct = totalMov ? Math.round((movConInc / totalMov) * 100) : 0;

  const critLt2 = conInicioFin.filter((d) => d.execLt2).length;
  const critGte90 = conInicioFin.filter((d) => d.execGte90).length;
  const critTotal = conInicioFin.filter((d) => d.execLt2 || d.execGte90).length;

  const locoCritLt2 = new Set<number>();
  const locoCritGte90 = new Set<number>();
  for (const d of conInicioFin) {
    if (d.execLt2) locoCritLt2.add(d.locomotiveNumber);
    if (d.execGte90) locoCritGte90.add(d.locomotiveNumber);
  }

  const variabilidadExecRatio = execMedianMin ? Math.round((execP90Min / execMedianMin) * 100) / 100 : 0;

  const criticalRate = totalConInicioFin ? critTotal / totalConInicioFin : 0;
  const incidentRate = totalMov ? movConInc / totalMov : 0;
  const backlogRate = totalMov ? totalSinFin / totalMov : 0;
  const variabilityPenalty = execMedianMin ? Math.min(1, Math.max(0, (variabilidadExecRatio - 1) / 2)) : 0;

  const indiceOperativo = Math.max(
    0,
    Math.round(
      100 *
        (1 -
          (criticalRate * 0.4 +
            incidentRate * 0.25 +
            backlogRate * 0.2 +
            variabilityPenalty * 0.15))
    )
  );

  const cancelados = detalles.filter((d) => String(d.estado) === 'CANCELADO').length;
  const canceladosConIncidente = detalles.filter((d) => d.canceladoConIncidente).length;

  return {
    totalMovimientos: totalMov,
    totalConFin,
    totalSinFin,
    totalConInicioFin,

    execMeanMin,
    execMedianMin,
    execP90Min,

    esperaMeanMin,
    esperaMedianMin,
    esperaP90Min,
    esperaOkPct,

    leadMeanMin,
    leadMedianMin,
    leadP90Min,
    leadOkPct,

    totalIncidentes: detalles.reduce((acc, d) => acc + d.incidentesCount, 0),
    movimientosConIncidente: movConInc,
    movimientosConIncidentePct: movConIncPct,

    criticosLt2: critLt2,
    criticosGte90: critGte90,
    criticosTotal: critTotal,

    locomotorasCritLt2: locoCritLt2.size,
    locomotorasCritGte90: locoCritGte90.size,

    backlogAvgAgeMin,
    backlogP90AgeMin,
    backlogMaxAgeMin,

    variabilidadExecRatio,
    indiceOperativo,

    cancelados,
    canceladosConIncidente,
  };
}

// Prisma singleton
// eslint-disable-next-line no-var
declare global { var __PRISMA__: PrismaClient | undefined; }
const prisma: PrismaClient =
  global.__PRISMA__ ??
  new PrismaClient({
    log: process.env.PRISMA_LOG === '1' ? ['error', 'warn'] : undefined,
  });
if (process.env.NODE_ENV !== 'production') global.__PRISMA__ = prisma;

function buildWhereSql(filters: AdminReporteFilters, start: Date, end: Date) {
  const parts: Prisma.Sql[] = [
    Prisma.sql`m."fechaSolicitud" >= ${start}`,
    Prisma.sql`m."fechaSolicitud" < ${end}`,
  ];

  if (filters.localidadId) parts.push(Prisma.sql`m."localidadId" = ${filters.localidadId}`);
  if (filters.empresaId) parts.push(Prisma.sql`m."empresaId" = ${filters.empresaId}`);

  return Prisma.sql`WHERE ${Prisma.join(parts, ' AND ')}`;
}

// -------------------- SQL row --------------------
type SqlMovRow = {
  id: number;
  estado: string;
  locomotiveNumber: number;
  fechaSolicitud: Date;
  fechaInicio: Date | null;
  fechaFin: Date | null;

  empresaId: number;
  empresa: string;
  localidadId: number;
  localidad: string;

  creadoPorId: number;
  creadoPorNombre: string;
  creadoPorRol: string;

  clienteId: number | null;
  clienteNombre: string | null;
  clienteRol: string | null;

  operadorId: number | null;
  operadorNombre: string | null;
  operadorRol: string | null;

  supervisorId: number | null;
  supervisorNombre: string | null;
  supervisorRol: string | null;

  coordinadorId: number | null;
  coordinadorNombre: string | null;
  coordinadorRol: string | null;
};

function toISO(d?: Date | null) {
  return d ? d.toISOString() : null;
}

export async function loadMovimientosBase(filters: AdminReporteFilters, periodo: PeriodoReporte): Promise<CeoBase> {
  const tz = filters.tz ?? MX_TZ;
  const { anchor, startLocal, endLocal, startUTC, endUTC } = rangoPeriodoUTC(filters.fecha, tz, periodo);

  const whereRange = buildWhereSql(filters, startUTC.toJSDate(), endUTC.toJSDate());

  const rows = await prisma.$queryRaw<SqlMovRow[]>(Prisma.sql`
    SELECT
      m.id,
      m.estado::text as "estado",
      m."locomotiveNumber",
      m."fechaSolicitud",
      m."fechaInicio",
      m."fechaFin",

      m."empresaId" as "empresaId",
      e.nombre as "empresa",
      m."localidadId" as "localidadId",
      l.nombre as "localidad",

      ucp.id as "creadoPorId",
      ucp.nombre as "creadoPorNombre",
      ucp.rol::text as "creadoPorRol",

      uc.id as "clienteId",
      uc.nombre as "clienteNombre",
      uc.rol::text as "clienteRol",

      uo.id as "operadorId",
      uo.nombre as "operadorNombre",
      uo.rol::text as "operadorRol",

      COALESCE(usup.id, supTok.id) as "supervisorId",
      COALESCE(usup.nombre, supTok.nombre) as "supervisorNombre",
      COALESCE(usup.rol::text, supTok.rol::text) as "supervisorRol",

      COALESCE(uco.id, coorTok.id) as "coordinadorId",
      COALESCE(uco.nombre, coorTok.nombre) as "coordinadorNombre",
      COALESCE(uco.rol::text, coorTok.rol::text) as "coordinadorRol"
    FROM "Movimiento" m
    JOIN "Empresa" e ON e.id = m."empresaId"
    JOIN "Localidad" l ON l.id = m."localidadId"
    JOIN "Usuario" ucp ON ucp.id = m."creadoPorId"
    LEFT JOIN "Usuario" uc ON uc.id = m."clienteId"
    LEFT JOIN "Usuario" uo ON uo.id = m."operadorId"

    LEFT JOIN "Usuario" usup ON usup.id = m."supervisorId"
    LEFT JOIN "Usuario" uco ON uco.id = m."coordinadorId"

    LEFT JOIN LATERAL (
      SELECT u.id, u.nombre, u.rol
      FROM "Token" t
      JOIN "Usuario" u ON u.id = t."usuarioId"
      WHERE u.rol = 'SUPERVISOR'
        AND m."fechaFin" IS NOT NULL
        AND t."issuedAt" <= m."fechaFin"
        AND (t."revokedAt" IS NULL OR t."revokedAt" > m."fechaFin")
        AND t."expiresAt" > m."fechaFin"
      ORDER BY t."issuedAt" DESC
      LIMIT 1
    ) supTok ON TRUE

    LEFT JOIN LATERAL (
      SELECT u.id, u.nombre, u.rol
      FROM "Token" t
      JOIN "Usuario" u ON u.id = t."usuarioId"
      WHERE u.rol = 'COORDINADOR'
        AND m."fechaFin" IS NOT NULL
        AND t."issuedAt" <= m."fechaFin"
        AND (t."revokedAt" IS NULL OR t."revokedAt" > m."fechaFin")
        AND t."expiresAt" > m."fechaFin"
      ORDER BY t."issuedAt" DESC
      LIMIT 1
    ) coorTok ON TRUE

    ${whereRange}
    ORDER BY m."fechaSolicitud" ASC, m.id ASC;
  `);

  const movimientoIds = rows.map((r) => r.id);

  const incidentes = movimientoIds.length
    ? await prisma.incidente.findMany({
        where: { movimientoId: { in: movimientoIds } },
        select: { movimientoId: true, estado: true },
      })
    : [];

  const incByMov = new Map<number, { total: number; ABIERTO: number; RESUELTO: number; CERRADO: number }>();
  const incEstadoGlobal: Record<string, number> = {};

  for (const i of incidentes) {
    const st = String(i.estado);
    incEstadoGlobal[st] = (incEstadoGlobal[st] ?? 0) + 1;

    const cur = incByMov.get(i.movimientoId) ?? { total: 0, ABIERTO: 0, RESUELTO: 0, CERRADO: 0 };
    cur.total += 1;
    if (st === 'ABIERTO') cur.ABIERTO += 1;
    if (st === 'RESUELTO') cur.RESUELTO += 1;
    if (st === 'CERRADO') cur.CERRADO += 1;
    incByMov.set(i.movimientoId, cur);
  }

  const detalles: CeoMovimientoDetalle[] = rows.map((r) => {
    const inc = incByMov.get(r.id) ?? { total: 0, ABIERTO: 0, RESUELTO: 0, CERRADO: 0 };

    const minSolicitudAFin = minutesBetween(r.fechaSolicitud, r.fechaFin);
    const minSolicitudAInicio = minutesBetween(r.fechaSolicitud, r.fechaInicio);
    const minInicioAFin = minutesBetween(r.fechaInicio, r.fechaFin);

    const dtSolMX = DateTime.fromJSDate(r.fechaSolicitud, { zone: tz });
    const fechaSolicitudMX = dtSolMX.toFormat('yyyy-LL-dd HH:mm');
    const diaMX = dtSolMX.toFormat('yyyy-LL-dd');
    const fechaInicioMX = r.fechaInicio ? fmtMXFromDate(r.fechaInicio, tz) : null;
    const fechaFinMX = r.fechaFin ? fmtMXFromDate(r.fechaFin, tz) : null;

    const execBucket = execBucketFromMinutes(minInicioAFin);
    const execLt2 = minInicioAFin !== null && minInicioAFin < EXEC_CRIT_LT_MIN;
    const execGte90 = minInicioAFin !== null && minInicioAFin >= EXEC_CRIT_GTE_MIN;

    const backlogAgeMin = r.fechaFin ? null : minutesBetween(r.fechaSolicitud, endUTC.toJSDate());

    const baseTime = r.fechaInicio ?? r.fechaSolicitud;
    const dtBase = DateTime.fromJSDate(baseTime, { zone: tz });
    const hour = dtBase.hour;
    const weekdayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const diaSemana = weekdayNames[dtBase.weekday - 1] ?? '—';

    const turno = turnoFromHour(hour);

    const canceladoConIncidente = String(r.estado) === 'CANCELADO' && inc.total > 0;

    return {
      id: r.id,
      estado: String(r.estado) as EstadoMovimientoId,
      empresaId: r.empresaId,
      empresa: r.empresa ?? '—',
      localidadId: r.localidadId,
      localidad: r.localidad ?? '—',
      locomotiveNumber: safeNum(r.locomotiveNumber),

      fechaSolicitudUTC: r.fechaSolicitud.toISOString(),
      fechaInicioUTC: toISO(r.fechaInicio),
      fechaFinUTC: toISO(r.fechaFin),

      fechaSolicitudMX,
      fechaInicioMX,
      fechaFinMX,
      diaMX,

      minSolicitudAFin,
      minSolicitudAInicio,
      minInicioAFin,
      backlogAgeMin,

      incidentesCount: inc.total,
      incidentesAbiertos: inc.ABIERTO,
      incidentesResueltos: inc.RESUELTO,
      incidentesCerrados: inc.CERRADO,

      execBucket,
      execLt2,
      execGte90,

      horaMX: hour,
      diaSemanaMX: diaSemana,
      turnoId: turno.id,
      turnoLabel: turno.label,
      turnoRango: turno.rango,

      canceladoConIncidente,

      usuarios: {
        creadoPor: { id: r.creadoPorId, nombre: r.creadoPorNombre, rol: String(r.creadoPorRol) },
        cliente: r.clienteId
          ? { id: r.clienteId, nombre: r.clienteNombre ?? '—', rol: String(r.clienteRol ?? '—') }
          : null,
        operador: r.operadorId
          ? { id: r.operadorId, nombre: r.operadorNombre ?? '—', rol: String(r.operadorRol ?? '—') }
          : null,
        supervisor: r.supervisorId
          ? { id: r.supervisorId, nombre: r.supervisorNombre ?? '—', rol: String(r.supervisorRol ?? '—') }
          : null,
        coordinador: r.coordinadorId
          ? { id: r.coordinadorId, nombre: r.coordinadorNombre ?? '—', rol: String(r.coordinadorRol ?? '—') }
          : null,
      },
    };
  });

  return {
    meta: {
      periodo,
      etiqueta: `CEO_${etiquetaPeriodo(periodo, anchor)}`,
      fechaLocal: filters.fecha,
      tz,
      rangoUTC: { desde: startUTC.toISO()!, hastaExclusivo: endUTC.toISO()! },
      rangoLocal: { desde: startLocal.toISO()!, hastaExclusivo: endLocal.toISO()! },
    },
    detalles,
    incidentesPorEstado: incEstadoGlobal,
  };
}
