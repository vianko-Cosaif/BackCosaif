// reporteria/modelos/admin-model.ts
// Reporte ADMIN (DIA / SEMANA / MES / BIMESTRE / SEMESTRE / ANUAL)
//
// Métricas (CEO-ready, en español):
// - Tiempos de ejecución: fechaInicio -> fechaFin
// - Rangos de ejecución: 0–9 min, 10–89 min, 90+ min
// - Críticos: <2 min y 90+ min
// - Incidentes: conteo y %mov con incidente
// - Rankings: maquinistas, locomotoras, empresas y clientes
// - Tráfico: movimientos por hora y por día
//
// Nota:
// - Supervisor y Coordinador se infieren al cierre por token más nuevo (si no vienen en movimiento).

import { DateTime } from 'luxon';
import { Prisma, PrismaClient } from '@prisma/client';

export type PeriodoReporte = 'DIA' | 'SEMANA' | 'MES' | 'BIMESTRE' | 'SEMESTRE' | 'ANUAL';

export type AdminReporteFilters = {
  fecha: string; // 'YYYY-MM-DD' (ancla local MX por default)
  tz?: string; // default America/Mexico_City
  localidadId?: number;
  empresaId?: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __PRISMA__: PrismaClient | undefined;
}

const prisma: PrismaClient =
  global.__PRISMA__ ??
  new PrismaClient({
    log: process.env.PRISMA_LOG === '1' ? ['error', 'warn'] : undefined,
  });

if (process.env.NODE_ENV !== 'production') global.__PRISMA__ = prisma;

// -------------------- tiempo / rangos --------------------
const MX_TZ = 'America/Mexico_City';
const safeNum = (n: any) => (Number.isFinite(Number(n)) ? Number(n) : 0);

// Umbrales operativos (ajustables)
const EXEC_BUCKET_FAST_MAX = 10; // 0–9 min
const EXEC_BUCKET_OK_MAX = 90; // 10–89 min
const EXEC_CRIT_LT_MIN = 2; // <2 min
const EXEC_CRIT_GTE_MIN = 90; // >=90 min
const ESPERA_OK_MAX = 15; // solicitud->inicio aceptable (min)
const LEAD_OK_MAX = 120; // solicitud->fin aceptable (min)

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

function rangoPeriodoUTC(fechaLocal: string, tz: string, periodo: PeriodoReporte) {
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
      startLocal = anchor.startOf('week').startOf('day'); // ISO week
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

function minutesBetween(a?: Date | null, b?: Date | null) {
  if (!a || !b) return null;
  const ms = b.getTime() - a.getTime();
  if (!Number.isFinite(ms)) return null;
  return ms / 60000;
}

// -------------------- buckets / stats --------------------
function execBucketFromMinutes(min: number | null): ExecBucketId | null {
  if (min === null || !Number.isFinite(min)) return null;
  if (min < EXEC_BUCKET_FAST_MAX) return 'm0_9';
  if (min < EXEC_BUCKET_OK_MAX) return 'm10_89';
  return 'gte90';
}

function execBucketLabel(id: ExecBucketId) {
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

function percentile(xs: number[], p: number) {
  if (!xs.length) return 0;
  const a = [...xs].sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.max(0, Math.ceil(p * a.length) - 1));
  return a[idx] ?? 0;
}

function fmtMinHuman(n: number) {
  if (!Number.isFinite(n) || n <= 0) return '0m';
  if (n < 60) return `${Math.round(n)}m`;
  const h = Math.floor(n / 60);
  const m = Math.round(n - h * 60);
  return `${h}h ${m}m`;
}


// -------------------- formato MX --------------------
function fmtMXFromDate(d: Date, tz: string) {
  return DateTime.fromJSDate(d, { zone: tz }).toFormat('yyyy-LL-dd HH:mm');
}

// -------------------- tipos --------------------
export type ExecBucketId = 'm0_9' | 'm10_89' | 'gte90';

export type AdminMovimientoDetalle = {
  id: number;
  empresa: string;
  localidad: string;
  estado: string;
  locomotiveNumber: number;

  fechaSolicitudUTC: string;
  fechaInicioUTC: string | null;
  fechaFinUTC: string | null;

  // Fechas auditables en MX (CEO / Auditoría)
  fechaSolicitudMX: string;
  fechaFinMX: string | null;
  diaMX: string; // yyyy-LL-dd (según solicitud en MX)
  tramoMX: string; // "YYYY-MM-DD HH:mm → YYYY-MM-DD HH:mm" o "—"

  // Duraciones en minutos
  minSolicitudAFin: number | null;
  minSolicitudAInicio: number | null;
  minInicioAFin: number | null;
  backlogAgeMin: number | null; // edad al cierre del periodo (si no tiene fin)

  incidentesCount: number;
  incidentesAbiertos: number;
  incidentesResueltos: number;
  incidentesCerrados: number;

  // Señales de tiempo de ejecución
  execBucket: ExecBucketId | null;
  execLt2: boolean;
  execGte90: boolean;

  // Tráfico
  horaMX: number; // 0..23
  diaSemanaMX: string; // Lun..Dom

  usuarios: {
    creadoPor: { id: number; nombre: string; rol: string };
    cliente: { id: number; nombre: string; rol: string } | null;
    operador: { id: number; nombre: string; rol: string } | null;
    supervisor: { id: number; nombre: string; rol: string } | null;
    coordinador: { id: number; nombre: string; rol: string } | null;
  };
};

export type AdminReporte = {
  meta: {
    periodo: PeriodoReporte;
    etiqueta: string;
    fechaLocal: string;
    tz: string;
    rangoUTC: { desde: string; hastaExclusivo: string };
    rangoLocal: { desde: string; hastaExclusivo: string };
  };

  kpis: {
    totalMovimientos: number;

    // solo movimientos con fechaFin
    totalConFin: number;
    totalSinFin: number;
    totalConInicioFin: number;

    // Ejecución (inicio -> fin)
    execMeanMin: number;
    execMedianMin: number;
    execP90Min: number;

    // Espera (solicitud -> inicio)
    esperaMeanMin: number;
    esperaMedianMin: number;
    esperaP90Min: number;
    esperaOkPct: number;

    // Lead (solicitud -> fin)
    leadMeanMin: number;
    leadMedianMin: number;
    leadP90Min: number;
    leadOkPct: number;

    // Incidentes
    totalIncidentes: number;
    movimientosConIncidente: number;
    movimientosConIncidentePct: number;

    // Críticos de ejecución
    criticosLt2: number;
    criticosGte90: number;
    criticosTotal: number;

    // Locomotoras con críticos
    locomotorasCritLt2: number;
    locomotorasCritGte90: number;

    // Backlog (sin fin) a cierre del periodo
    backlogAvgAgeMin: number;
    backlogP90AgeMin: number;
    backlogMaxAgeMin: number;

    // Índice operativo
    variabilidadExecRatio: number;
    indiceOperativo: number;
  };

  ejecucionBuckets: Array<{
    id: ExecBucketId;
    label: string;
    movimientos: number;
    pct: number; // sobre totalConInicioFin
  }>;

  incidentes: {
    porEstado: Record<string, number>;
  };

  movimientosPorHora: Array<{ hora: number; movimientos: number }>;
  movimientosPorDiaSemana: Array<{ dia: string; movimientos: number }>;
  incidentesPorHora: Array<{ hora: number; incidentes: number }>;
  incidentesPorDiaSemana: Array<{ dia: string; incidentes: number }>;

  rankingOperadores: Array<{
    operadorId: number;
    operadorNombre: string;
    operadorRol: string;
    totalMovimientos: number;
    conInicioFin: number;
    m0_9: number;
    m10_89: number;
    gte90: number;
    lt2: number;
    incidentesTotal: number;
    incidentesPct: number;
    criticosTotal: number;
    criticosPct: number;
  }>;

  rankingLocomotoras: Array<{
    locomotiveNumber: number;
    totalMovimientos: number;
    conInicioFin: number;
    m0_9: number;
    m10_89: number;
    gte90: number;
    lt2: number;
    incidentesTotal: number;
    incidentesPct: number;
    criticosTotal: number;
    criticosPct: number;
    empresas: string[];
  }>;

  rankingEmpresas: Array<{
    empresa: string;
    totalMovimientos: number;
    incidentesTotal: number;
    incidentesPct: number;
  }>;

  rankingClientes: Array<{
    clienteId: number;
    clienteNombre: string;
    totalMovimientos: number;
    incidentesTotal: number;
    incidentesPct: number;
  }>;

  rankingSupervisores: Array<{
    supervisorId: number;
    supervisorNombre: string;
    totalMovimientos: number;
    incidentesTotal: number;
    incidentesPct: number;
    criticosTotal: number;
    criticosPct: number;
  }>;

  rankingCoordinadores: Array<{
    coordinadorId: number;
    coordinadorNombre: string;
    totalMovimientos: number;
    incidentesTotal: number;
    incidentesPct: number;
    criticosTotal: number;
    criticosPct: number;
  }>;

  rankingLocalidades: Array<{
    localidad: string;
    totalMovimientos: number;
    incidentesTotal: number;
    incidentesPct: number;
  }>;

  topLocomotorasIncidentes: Array<{
    locomotiveNumber: number;
    incidentesTotal: number;
    movimientos: number;
    empresas: string[];
  }>;

  topCriticos: AdminMovimientoDetalle[];
  topIncidentes: AdminMovimientoDetalle[];

  backlogTop: Array<{
    id: number;
    locomotiveNumber: number;
    empresa: string;
    localidad: string;
    edadMin: number;
    fechaSolicitudMX: string;
    operador?: string;
    supervisor?: string;
    coordinador?: string;
  }>;

  insights: string[];
};

// -------------------- SQL row --------------------
type SqlMovRow = {
  id: number;
  estado: string;
  locomotiveNumber: number;
  fechaSolicitud: Date;
  fechaInicio: Date | null;
  fechaFin: Date | null;

  empresa: string;
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

function buildWhereSql(filters: AdminReporteFilters, start: Date, end: Date) {
  const parts: Prisma.Sql[] = [
    Prisma.sql`m."fechaSolicitud" >= ${start}`,
    Prisma.sql`m."fechaSolicitud" < ${end}`,
  ];

  if (filters.localidadId) parts.push(Prisma.sql`m."localidadId" = ${filters.localidadId}`);
  if (filters.empresaId) parts.push(Prisma.sql`m."empresaId" = ${filters.empresaId}`);

  return Prisma.sql`WHERE ${Prisma.join(parts, ' AND ')}`;
}

export class AdminReporteriaModel {
  /**
   * Motor único: arma reporte para cualquier periodo.
   *
   * Importante:
   * - Se usa supervisor/coordinador del movimiento; si vienen null, se infiere por token más nuevo al cierre.
   * - Rangos de ejecución se calculan con fechaInicio → fechaFin.
   */
  static async reportePorPeriodo(filters: AdminReporteFilters, periodo: PeriodoReporte): Promise<AdminReporte> {
    const tz = filters.tz ?? MX_TZ;
    const { anchor, startLocal, endLocal, startUTC, endUTC } = rangoPeriodoUTC(filters.fecha, tz, periodo);

    // 1) Movimientos del rango
    const whereRange = buildWhereSql(filters, startUTC.toJSDate(), endUTC.toJSDate());

    const rows = await prisma.$queryRaw<SqlMovRow[]>(Prisma.sql`
      SELECT
        m.id,
        m.estado::text as "estado",
        m."locomotiveNumber",
        m."fechaSolicitud",
        m."fechaInicio",
        m."fechaFin",

        e.nombre as "empresa",
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

    // 2) Incidentes (solo para movimientos del rango)
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

    // 3) Detalle por movimiento (rango), con auditoría MX
    const detalles: AdminMovimientoDetalle[] = rows.map((r) => {
      const inc = incByMov.get(r.id) ?? { total: 0, ABIERTO: 0, RESUELTO: 0, CERRADO: 0 };

      const minSolicitudAFin = minutesBetween(r.fechaSolicitud, r.fechaFin);
      const minSolicitudAInicio = minutesBetween(r.fechaSolicitud, r.fechaInicio);
      const minInicioAFin = minutesBetween(r.fechaInicio, r.fechaFin);

      const dtSolMX = DateTime.fromJSDate(r.fechaSolicitud, { zone: tz });
      const fechaSolicitudMX = dtSolMX.toFormat('yyyy-LL-dd HH:mm');
      const diaMX = dtSolMX.toFormat('yyyy-LL-dd');

      const fechaFinMX = r.fechaFin ? fmtMXFromDate(r.fechaFin, tz) : null;
      const tramoMX = r.fechaFin
        ? `${fechaSolicitudMX} → ${fechaFinMX}`
        : '—';

      const execBucket = execBucketFromMinutes(minInicioAFin);
      const execLt2 = minInicioAFin !== null && minInicioAFin < EXEC_CRIT_LT_MIN;
      const execGte90 = minInicioAFin !== null && minInicioAFin >= EXEC_CRIT_GTE_MIN;

      const backlogAgeMin = r.fechaFin ? null : minutesBetween(r.fechaSolicitud, endUTC.toJSDate());

      const baseTime = r.fechaInicio ?? r.fechaSolicitud;
      const dtBase = DateTime.fromJSDate(baseTime, { zone: tz });
      const hour = dtBase.hour;
      const weekdayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      const diaSemana = weekdayNames[dtBase.weekday - 1] ?? '—';

      return {
        id: r.id,
        empresa: r.empresa ?? '—',
        localidad: r.localidad ?? '—',
        estado: String(r.estado),
        locomotiveNumber: safeNum(r.locomotiveNumber),

        fechaSolicitudUTC: r.fechaSolicitud.toISOString(),
        fechaInicioUTC: toISO(r.fechaInicio),
        fechaFinUTC: toISO(r.fechaFin),

        fechaSolicitudMX,
        fechaFinMX,
        diaMX,
        tramoMX,

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

    // 4) KPI base
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

    // Índice operativo 0–100 (penaliza críticos, incidentes, backlog y variabilidad)
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

    // 5) Buckets de ejecución
    const bucketOrder: ExecBucketId[] = ['m0_9', 'm10_89', 'gte90'];
    const bucketAgg = new Map<ExecBucketId, number>();
    for (const id of bucketOrder) bucketAgg.set(id, 0);
    for (const d of conInicioFin) {
      if (!d.execBucket) continue;
      bucketAgg.set(d.execBucket, (bucketAgg.get(d.execBucket) ?? 0) + 1);
    }

    const ejecucionBuckets = bucketOrder.map((id) => {
      const mov = bucketAgg.get(id) ?? 0;
      const pct = totalConInicioFin ? Math.round((mov / totalConInicioFin) * 100) : 0;
      return { id, label: execBucketLabel(id), movimientos: mov, pct };
    });

    // 6) Tráfico por hora / día
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

    const movimientosPorHora = hourCounts.map((movimientos, hora) => ({ hora, movimientos }));
    const movimientosPorDiaSemana = dayLabels.map((dia) => ({ dia, movimientos: dayCounts.get(dia) ?? 0 }));
    const incidentesPorHora = hourIncCounts.map((incidentes, hora) => ({ hora, incidentes }));
    const incidentesPorDiaSemana = dayLabels.map((dia) => ({ dia, incidentes: dayIncCounts.get(dia) ?? 0 }));

    // 7) Rankings
    type AggRow = {
      totalMovimientos: number;
      conInicioFin: number;
      m0_9: number;
      m10_89: number;
      gte90: number;
      lt2: number;
      incidentesTotal: number;
    };

    const initAgg = (): AggRow => ({
      totalMovimientos: 0,
      conInicioFin: 0,
      m0_9: 0,
      m10_89: 0,
      gte90: 0,
      lt2: 0,
      incidentesTotal: 0,
    });

    const opMap = new Map<number, AggRow & { operadorId: number; operadorNombre: string; operadorRol: string }>();
    const supMap = new Map<number, AggRow & { supervisorId: number; supervisorNombre: string }>();
    const coordMap = new Map<number, AggRow & { coordinadorId: number; coordinadorNombre: string }>();
    const locoMap = new Map<number, AggRow & { locomotiveNumber: number; empresas: Set<string> }>();
    const empMap = new Map<string, AggRow & { empresa: string }>();
    const cliMap = new Map<number, AggRow & { clienteId: number; clienteNombre: string }>();
    const locMap = new Map<string, AggRow & { localidad: string }>();

    for (const d of detalles) {
      // Empresa
      const empKey = d.empresa ?? '—';
      let empRow = empMap.get(empKey);
      if (!empRow) {
        empRow = { ...initAgg(), empresa: empKey };
        empMap.set(empKey, empRow);
      }

      // Localidad
      const locKey = d.localidad ?? '—';
      let locRow = locMap.get(locKey);
      if (!locRow) {
        locRow = { ...initAgg(), localidad: locKey };
        locMap.set(locKey, locRow);
      }

      // Cliente
      const cli = d.usuarios.cliente;
      if (cli) {
        let cliRow = cliMap.get(cli.id);
        if (!cliRow) {
          cliRow = { ...initAgg(), clienteId: cli.id, clienteNombre: cli.nombre };
          cliMap.set(cli.id, cliRow);
        }
        cliRow.totalMovimientos += 1;
        cliRow.incidentesTotal += d.incidentesCount;
        if (d.execBucket) {
          cliRow.conInicioFin += 1;
          if (d.execBucket === 'm0_9') cliRow.m0_9 += 1;
          if (d.execBucket === 'm10_89') cliRow.m10_89 += 1;
          if (d.execBucket === 'gte90') cliRow.gte90 += 1;
          if (d.execLt2) cliRow.lt2 += 1;
        }
      }

      // Operador (maquinista)
      const op = d.usuarios.operador;
      if (op) {
        let opRow = opMap.get(op.id);
        if (!opRow) {
          opRow = { ...initAgg(), operadorId: op.id, operadorNombre: op.nombre, operadorRol: op.rol };
          opMap.set(op.id, opRow);
        }
        opRow.totalMovimientos += 1;
        opRow.incidentesTotal += d.incidentesCount;
        if (d.execBucket) {
          opRow.conInicioFin += 1;
          if (d.execBucket === 'm0_9') opRow.m0_9 += 1;
          if (d.execBucket === 'm10_89') opRow.m10_89 += 1;
          if (d.execBucket === 'gte90') opRow.gte90 += 1;
          if (d.execLt2) opRow.lt2 += 1;
        }
      }

      // Supervisor
      const sup = d.usuarios.supervisor;
      if (sup) {
        let supRow = supMap.get(sup.id);
        if (!supRow) {
          supRow = { ...initAgg(), supervisorId: sup.id, supervisorNombre: sup.nombre };
          supMap.set(sup.id, supRow);
        }
        supRow.totalMovimientos += 1;
        supRow.incidentesTotal += d.incidentesCount;
        if (d.execBucket) {
          supRow.conInicioFin += 1;
          if (d.execBucket === 'm0_9') supRow.m0_9 += 1;
          if (d.execBucket === 'm10_89') supRow.m10_89 += 1;
          if (d.execBucket === 'gte90') supRow.gte90 += 1;
          if (d.execLt2) supRow.lt2 += 1;
        }
      }

      // Coordinador
      const coord = d.usuarios.coordinador;
      if (coord) {
        let coordRow = coordMap.get(coord.id);
        if (!coordRow) {
          coordRow = { ...initAgg(), coordinadorId: coord.id, coordinadorNombre: coord.nombre };
          coordMap.set(coord.id, coordRow);
        }
        coordRow.totalMovimientos += 1;
        coordRow.incidentesTotal += d.incidentesCount;
        if (d.execBucket) {
          coordRow.conInicioFin += 1;
          if (d.execBucket === 'm0_9') coordRow.m0_9 += 1;
          if (d.execBucket === 'm10_89') coordRow.m10_89 += 1;
          if (d.execBucket === 'gte90') coordRow.gte90 += 1;
          if (d.execLt2) coordRow.lt2 += 1;
        }
      }

      // Locomotora
      let locoRow = locoMap.get(d.locomotiveNumber);
      if (!locoRow) {
        locoRow = { ...initAgg(), locomotiveNumber: d.locomotiveNumber, empresas: new Set<string>() };
        locoMap.set(d.locomotiveNumber, locoRow);
      }
      locoRow.empresas.add(empKey);

      // Incremento común
      const applyAgg = (row: AggRow) => {
        row.totalMovimientos += 1;
        row.incidentesTotal += d.incidentesCount;
        if (d.execBucket) {
          row.conInicioFin += 1;
          if (d.execBucket === 'm0_9') row.m0_9 += 1;
          if (d.execBucket === 'm10_89') row.m10_89 += 1;
          if (d.execBucket === 'gte90') row.gte90 += 1;
          if (d.execLt2) row.lt2 += 1;
        }
      };

      applyAgg(empRow);
      applyAgg(locRow);
      applyAgg(locoRow);
    }

    const toPct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

    const rankingOperadores = Array.from(opMap.values())
      .map((r) => ({
        operadorId: r.operadorId,
        operadorNombre: r.operadorNombre,
        operadorRol: r.operadorRol,
        totalMovimientos: r.totalMovimientos,
        conInicioFin: r.conInicioFin,
        m0_9: r.m0_9,
        m10_89: r.m10_89,
        gte90: r.gte90,
        lt2: r.lt2,
        incidentesTotal: r.incidentesTotal,
        incidentesPct: toPct(r.incidentesTotal, r.totalMovimientos),
        criticosTotal: r.lt2 + r.gte90,
        criticosPct: toPct(r.lt2 + r.gte90, r.conInicioFin),
      }))
      .sort((a, b) => (b.totalMovimientos - a.totalMovimientos) || (b.criticosTotal - a.criticosTotal));

    const rankingLocomotoras = Array.from(locoMap.values())
      .map((r) => ({
        locomotiveNumber: r.locomotiveNumber,
        totalMovimientos: r.totalMovimientos,
        conInicioFin: r.conInicioFin,
        m0_9: r.m0_9,
        m10_89: r.m10_89,
        gte90: r.gte90,
        lt2: r.lt2,
        incidentesTotal: r.incidentesTotal,
        incidentesPct: toPct(r.incidentesTotal, r.totalMovimientos),
        criticosTotal: r.lt2 + r.gte90,
        criticosPct: toPct(r.lt2 + r.gte90, r.conInicioFin),
        empresas: Array.from(r.empresas),
      }))
      .sort((a, b) => (b.totalMovimientos - a.totalMovimientos) || (b.criticosTotal - a.criticosTotal));

    const rankingEmpresas = Array.from(empMap.values())
      .map((r) => ({
        empresa: r.empresa,
        totalMovimientos: r.totalMovimientos,
        incidentesTotal: r.incidentesTotal,
        incidentesPct: toPct(r.incidentesTotal, r.totalMovimientos),
      }))
      .sort((a, b) => (b.totalMovimientos - a.totalMovimientos) || (b.incidentesTotal - a.incidentesTotal));

    const rankingClientes = Array.from(cliMap.values())
      .map((r) => ({
        clienteId: r.clienteId,
        clienteNombre: r.clienteNombre,
        totalMovimientos: r.totalMovimientos,
        incidentesTotal: r.incidentesTotal,
        incidentesPct: toPct(r.incidentesTotal, r.totalMovimientos),
      }))
      .sort((a, b) => (b.totalMovimientos - a.totalMovimientos) || (b.incidentesTotal - a.incidentesTotal));

    const rankingSupervisores = Array.from(supMap.values())
      .map((r) => ({
        supervisorId: r.supervisorId,
        supervisorNombre: r.supervisorNombre,
        totalMovimientos: r.totalMovimientos,
        incidentesTotal: r.incidentesTotal,
        incidentesPct: toPct(r.incidentesTotal, r.totalMovimientos),
        criticosTotal: r.lt2 + r.gte90,
        criticosPct: toPct(r.lt2 + r.gte90, r.conInicioFin),
      }))
      .sort((a, b) => (b.totalMovimientos - a.totalMovimientos) || (b.criticosTotal - a.criticosTotal));

    const rankingCoordinadores = Array.from(coordMap.values())
      .map((r) => ({
        coordinadorId: r.coordinadorId,
        coordinadorNombre: r.coordinadorNombre,
        totalMovimientos: r.totalMovimientos,
        incidentesTotal: r.incidentesTotal,
        incidentesPct: toPct(r.incidentesTotal, r.totalMovimientos),
        criticosTotal: r.lt2 + r.gte90,
        criticosPct: toPct(r.lt2 + r.gte90, r.conInicioFin),
      }))
      .sort((a, b) => (b.totalMovimientos - a.totalMovimientos) || (b.criticosTotal - a.criticosTotal));

    const rankingLocalidades = Array.from(locMap.values())
      .map((r) => ({
        localidad: r.localidad,
        totalMovimientos: r.totalMovimientos,
        incidentesTotal: r.incidentesTotal,
        incidentesPct: toPct(r.incidentesTotal, r.totalMovimientos),
      }))
      .sort((a, b) => (b.totalMovimientos - a.totalMovimientos) || (b.incidentesTotal - a.incidentesTotal));

    const topLocomotorasIncidentes = [...rankingLocomotoras]
      .sort((a, b) => (b.incidentesTotal - a.incidentesTotal) || (b.totalMovimientos - a.totalMovimientos))
      .slice(0, 20)
      .map((r) => ({
        locomotiveNumber: r.locomotiveNumber,
        incidentesTotal: r.incidentesTotal,
        movimientos: r.totalMovimientos,
        empresas: r.empresas.slice(0, 4),
      }));

    // 8) Tops (críticos / incidentes)
    const topCriticos = [...conInicioFin]
      .filter((d) => d.execLt2 || d.execGte90)
      .sort((a, b) => {
        const aShort = a.execLt2 ? 0 : 1;
        const bShort = b.execLt2 ? 0 : 1;
        if (aShort !== bShort) return aShort - bShort; // primero <2 min
        const da = safeNum(a.minInicioAFin);
        const db = safeNum(b.minInicioAFin);
        return a.execLt2 ? da - db : db - da; // cortos asc, largos desc
      })
      .slice(0, 40);

    const topIncidentes = [...detalles]
      .filter((d) => d.incidentesCount > 0)
      .sort(
        (a, b) =>
          (b.incidentesCount - a.incidentesCount) ||
          (safeNum(b.minInicioAFin) - safeNum(a.minInicioAFin))
      )
      .slice(0, 40);

    const backlogTop = [...detalles]
      .filter((d) => d.backlogAgeMin !== null)
      .sort((a, b) => safeNum(b.backlogAgeMin) - safeNum(a.backlogAgeMin))
      .slice(0, 20)
      .map((d) => ({
        id: d.id,
        locomotiveNumber: d.locomotiveNumber,
        empresa: d.empresa,
        localidad: d.localidad,
        edadMin: Math.round(safeNum(d.backlogAgeMin)),
        fechaSolicitudMX: d.fechaSolicitudMX,
        operador: d.usuarios.operador?.nombre,
        supervisor: d.usuarios.supervisor?.nombre,
        coordinador: d.usuarios.coordinador?.nombre,
      }));

    const insights: string[] = [];
    const picoHora = movimientosPorHora.reduce((a, b) => (b.movimientos > a.movimientos ? b : a), { hora: 0, movimientos: 0 });
    const picoDia = movimientosPorDiaSemana.reduce((a, b) => (b.movimientos > a.movimientos ? b : a), { dia: '—', movimientos: 0 });
    const topEmp = rankingEmpresas[0];
    const topCli = rankingClientes[0];
    const topOpCrit = [...rankingOperadores].sort((a, b) => (b.criticosTotal - a.criticosTotal))[0];
    const topLocoCrit = [...rankingLocomotoras].sort((a, b) => (b.criticosTotal - a.criticosTotal))[0];

    if (topEmp) insights.push(`Empresa con más movimientos: ${topEmp.empresa} (${topEmp.totalMovimientos}).`);
    if (topCli) insights.push(`Cliente con más movimientos: ${topCli.clienteNombre} (${topCli.totalMovimientos}).`);
    if (picoHora.movimientos) insights.push(`Pico horario: ${String(picoHora.hora).padStart(2, '0')}:00 (${picoHora.movimientos} mov).`);
    if (picoDia.movimientos) insights.push(`Día más activo: ${picoDia.dia} (${picoDia.movimientos} mov).`);
    if (topOpCrit && topOpCrit.criticosTotal) {
      insights.push(`Maquinista con más críticos: ${topOpCrit.operadorNombre} (${topOpCrit.criticosTotal}).`);
    }
    if (topLocoCrit && topLocoCrit.criticosTotal) {
      insights.push(`Locomotora con más críticos: L-${topLocoCrit.locomotiveNumber} (${topLocoCrit.criticosTotal}).`);
    }
    if (backlogMaxAgeMin) insights.push(`Backlog más viejo: ${fmtMinHuman(backlogMaxAgeMin)}.`);

    return {
      meta: {
        periodo,
        etiqueta: `ADMIN_${etiquetaPeriodo(periodo, anchor)}`,
        fechaLocal: filters.fecha,
        tz,
        rangoUTC: { desde: startUTC.toISO()!, hastaExclusivo: endUTC.toISO()! },
        rangoLocal: { desde: startLocal.toISO()!, hastaExclusivo: endLocal.toISO()! },
      },

      kpis: {
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

        totalIncidentes: incidentes.length,
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
      },

      ejecucionBuckets,

      incidentes: {
        porEstado: incEstadoGlobal,
      },

      movimientosPorHora,
      movimientosPorDiaSemana,
      incidentesPorHora,
      incidentesPorDiaSemana,

      rankingOperadores,
      rankingLocomotoras,
      rankingEmpresas,
      rankingClientes,
      rankingSupervisores,
      rankingCoordinadores,
      rankingLocalidades,
      topLocomotorasIncidentes,

      topCriticos,
      topIncidentes,

      backlogTop,
      insights,
    };
  }

  // Atajos
  static reporteDia(filters: AdminReporteFilters) {
    return this.reportePorPeriodo(filters, 'DIA');
  }
  static reporteSemana(filters: AdminReporteFilters) {
    return this.reportePorPeriodo(filters, 'SEMANA');
  }
  static reporteMes(filters: AdminReporteFilters) {
    return this.reportePorPeriodo(filters, 'MES');
  }
  static reporteBimestre(filters: AdminReporteFilters) {
    return this.reportePorPeriodo(filters, 'BIMESTRE');
  }
  static reporteSemestre(filters: AdminReporteFilters) {
    return this.reportePorPeriodo(filters, 'SEMESTRE');
  }
  static reporteAnual(filters: AdminReporteFilters) {
    return this.reportePorPeriodo(filters, 'ANUAL');
  }
}
