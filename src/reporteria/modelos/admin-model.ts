// reporteria/modelos/admin-model.ts
// Reporte ADMIN (DIA / SEMANA / MES / BIMESTRE / SEMESTRE / ANUAL)
//
// Métricas (CEO-ready, en español):
// - Duraciones entre fechaSolicitud -> fechaFin (lead time)
// - Buckets por minutos: <10, 10-20, 20-30, 30-60, 60-120, 120+ + Sin fin
// - Promedios por umbral: >=1, >=10, >=20, >=30 minutos
// - Incidentes: conteo, %mov con incidente por bucket, tiempo promedio con/sin incidentes
// - Correlación (Pearson) entre duración (min) y #incidentes (solo movimientos con fin)
// - Anomalías operativas: movimientos concluidos con duración < 10 min (baseline esperado 10–15)
// - Bono operador (regla 09:00–09:00 MX):
//    * Día operativo = [09:00 MX, 09:00 MX del día siguiente)
//    * Por locomotora: el PRIMER movimiento del día operativo genera bono; los demás NO.
// - Tablas para auditoría: Top lentos + Top con incidentes + Top anomalías + Top bonos + ranking por operador
//
// Nota: Se eliminan supervisor/coordinador. Solo: creadoPor, cliente, operador, locomotora, movimiento, fechas.

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
type DurBucketId = 'lt10' | 'm10_20' | 'm20_30' | 'm30_60' | 'm60_120' | 'gte120' | 'sinFin';

function bucketFromMinutes(min: number | null): DurBucketId {
  if (min === null) return 'sinFin';
  if (min < 10) return 'lt10';
  if (min < 20) return 'm10_20';
  if (min < 30) return 'm20_30';
  if (min < 60) return 'm30_60';
  if (min < 120) return 'm60_120';
  return 'gte120';
}

function bucketLabel(id: DurBucketId) {
  switch (id) {
    case 'lt10': return '< 10 min';
    case 'm10_20': return '10–20 min';
    case 'm20_30': return '20–30 min';
    case 'm30_60': return '30–60 min';
    case 'm60_120': return '60–120 min';
    case 'gte120': return '120+ min';
    case 'sinFin': return 'Sin fin';
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

function stddev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = mean(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}

// Pearson r
function pearson(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const xs = x.slice(0, n);
  const ys = y.slice(0, n);

  const mx = mean(xs);
  const my = mean(ys);

  let num = 0;
  let dx = 0;
  let dy = 0;

  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }

  const den = Math.sqrt(dx * dy);
  return den ? num / den : 0;
}

// -------------------- formato MX / día operativo 09:00 --------------------
function fmtMXFromDate(d: Date, tz: string) {
  return DateTime.fromJSDate(d, { zone: tz }).toFormat('yyyy-LL-dd HH:mm');
}

// día operativo = [09:00, 09:00 siguiente)
// key = yyyy-LL-dd del "inicio" de ventana (MX)
function diaOperativoKey(fechaSolicitud: Date, tz: string) {
  const dt = DateTime.fromJSDate(fechaSolicitud, { zone: tz });
  const nueve = dt.set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
  const start = dt < nueve ? nueve.minus({ days: 1 }) : nueve;
  return start.toFormat('yyyy-LL-dd');
}

// -------------------- tipos --------------------
export type BonoMotivo = 'PRIMER_MOV_DIA_OPERATIVO' | 'YA_BONIFICADA_EN_VENTANA' | 'NO_TERMINO' | 'SIN_OPERADOR';

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

  // Bandera operativa
  esAnomalia: boolean; // concluyó y duró < 10 min

  incidentesCount: number;
  incidentesAbiertos: number;
  incidentesResueltos: number;
  incidentesCerrados: number;

  // Bono 09:00–09:00
  diaOperativoMX: string; // key del inicio de ventana 09:00 (MX)
  bonoElegible: boolean;
  bonoMotivo: BonoMotivo;

  usuarios: {
    creadoPor: { id: number; nombre: string; rol: string };
    cliente: { id: number; nombre: string; rol: string } | null;
    operador: { id: number; nombre: string; rol: string } | null;
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

    // Duración solicitud->fin
    durMeanMin: number;
    durMedianMin: number;
    durStdMin: number;

    // Umbrales: promedio de los que están >= X
    avgGte1Min: number;
    avgGte10Min: number;
    avgGte20Min: number;
    avgGte30Min: number;

    // Incidentes
    totalIncidentes: number;
    movimientosConIncidente: number;
    movimientosConIncidentePct: number;

    // comparación de tiempos con/sin incidentes
    durMeanConIncidenteMin: number;
    durMeanSinIncidenteMin: number;

    // correlación
    corrDurMin_vs_Incidentes: number;

    // Anomalías (<10 min)
    anomalias: number;
    anomaliasPct: number; // sobre movimientos con fin

    // Bono
    bonosElegibles: number;
    bonosElegiblesPct: number; // sobre movimientos con operador y con fin
  };

  duracionBuckets: Array<{
    id: DurBucketId;
    label: string;
    movimientos: number;
    pct: number; // sobre totalMovimientos
    incidentes: number;
    incidentRate: number; // incidentes / movimientos
  }>;

  incidentes: {
    porEstado: Record<string, number>;
    // % de movimientos con incidente en cada bucket
    movConIncidentePctPorBucket: Array<{ bucketId: DurBucketId; bucketLabel: string; movConIncidentePct: number }>;
  };

  anomalias: {
    porOperador: Array<{ operadorId: number; operadorNombre: string; total: number; pctSobreAnomalias: number }>;
    porCliente: Array<{ clienteId: number; clienteNombre: string; total: number; pctSobreAnomalias: number }>;
    porEmpresa: Array<{ empresa: string; total: number; pctSobreAnomalias: number }>;
    porLocomotora: Array<{ locomotiveNumber: number; total: number; pctSobreAnomalias: number }>;
    porDiaMX: Array<{ diaMX: string; total: number }>;
  };

  bonos: {
    porOperador: Array<{
      operadorId: number;
      operadorNombre: string;
      operadorRol: string;
      movimientos: number;
      conFin: number;
      elegibles: number;
      elegiblesPct: number; // sobre conFin
      leadMeanMin: number; // solicitud->fin promedio (solo con fin)
      incidentesTotal: number;
      anomalias: number;
    }>;
  };

  topLentos: AdminMovimientoDetalle[]; // top por duración
  topConIncidentes: AdminMovimientoDetalle[]; // top por incidentesCount
  topAnomalias: AdminMovimientoDetalle[]; // auditoría anomalías
  topBonosElegibles: AdminMovimientoDetalle[]; // auditoría bonos
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
   * - No existen movimiento.supervisorId / coordinadorId (según lo que dijiste), por eso NO se usan.
   * - Bono se calcula con ventana 09:00–09:00 (MX) por locomotora.
   * - Para bono correcto al inicio del rango, hacemos "lookback" de 1 día (24h) en solicitud.
   */
  static async reportePorPeriodo(filters: AdminReporteFilters, periodo: PeriodoReporte): Promise<AdminReporte> {
    const tz = filters.tz ?? MX_TZ;
    const { anchor, startLocal, endLocal, startUTC, endUTC } = rangoPeriodoUTC(filters.fecha, tz, periodo);

    // Lookback: cubre el tramo previo de la ventana 09:00–09:00 para no regalar bonos falsos
    const lookbackStartUTC = startUTC.minus({ days: 1 });

    // 1) Movimientos (lookback + rango) para calcular bonos; luego filtramos a rango para métricas
    const whereLookback = buildWhereSql(filters, lookbackStartUTC.toJSDate(), endUTC.toJSDate());

    const rowsAll = await prisma.$queryRaw<SqlMovRow[]>(Prisma.sql`
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
        uo.rol::text as "operadorRol"
      FROM "Movimiento" m
      JOIN "Empresa" e ON e.id = m."empresaId"
      JOIN "Localidad" l ON l.id = m."localidadId"
      JOIN "Usuario" ucp ON ucp.id = m."creadoPorId"
      LEFT JOIN "Usuario" uc ON uc.id = m."clienteId"
      LEFT JOIN "Usuario" uo ON uo.id = m."operadorId"
      ${whereLookback}
      ORDER BY m."fechaSolicitud" ASC, m.id ASC;
    `);

    // Split: solo los del rango real para KPIs / incidentes / tablas principales
    const startRange = startUTC.toJSDate().getTime();
    const endRange = endUTC.toJSDate().getTime();

    const rowsInRange = rowsAll.filter((r) => {
      const t = r.fechaSolicitud.getTime();
      return t >= startRange && t < endRange;
    });

    const movimientoIds = rowsInRange.map((r) => r.id);

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

    // 3) Bono 09:00–09:00: primer movimiento por (locomotora, díaOperativo)
    // Usamos rowsAll (incluye lookback) para no marcar elegible algo que ya ocurrió antes en la ventana.
    const firstSeen = new Map<string, number>(); // key -> movimientoId del primer movimiento
    for (const r of rowsAll) {
      const dayKey = diaOperativoKey(r.fechaSolicitud, tz);
      const k = `${r.locomotiveNumber}__${dayKey}`;
      if (!firstSeen.has(k)) firstSeen.set(k, r.id);
    }

    // 4) Detalle por movimiento (solo del rango), con auditoría MX + anomalia + bono
    const detalles: AdminMovimientoDetalle[] = rowsInRange.map((r) => {
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

      const esAnomalia = minSolicitudAFin !== null && minSolicitudAFin < 10;

      const dayKey = diaOperativoKey(r.fechaSolicitud, tz);
      const bonusKey = `${r.locomotiveNumber}__${dayKey}`;

      let bonoElegible = false;
      let bonoMotivo: BonoMotivo = 'NO_TERMINO';

      if (!r.operadorId) {
        bonoElegible = false;
        bonoMotivo = 'SIN_OPERADOR';
      } else if (!r.fechaFin) {
        bonoElegible = false;
        bonoMotivo = 'NO_TERMINO';
      } else {
        const firstId = firstSeen.get(bonusKey);
        bonoElegible = firstId === r.id;
        bonoMotivo = bonoElegible ? 'PRIMER_MOV_DIA_OPERATIVO' : 'YA_BONIFICADA_EN_VENTANA';
      }

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

        esAnomalia,

        incidentesCount: inc.total,
        incidentesAbiertos: inc.ABIERTO,
        incidentesResueltos: inc.RESUELTO,
        incidentesCerrados: inc.CERRADO,

        diaOperativoMX: dayKey,
        bonoElegible,
        bonoMotivo,

        usuarios: {
          creadoPor: { id: r.creadoPorId, nombre: r.creadoPorNombre, rol: String(r.creadoPorRol) },
          cliente: r.clienteId
            ? { id: r.clienteId, nombre: r.clienteNombre ?? '—', rol: String(r.clienteRol ?? '—') }
            : null,
          operador: r.operadorId
            ? { id: r.operadorId, nombre: r.operadorNombre ?? '—', rol: String(r.operadorRol ?? '—') }
            : null,
        },
      };
    });

    // 5) KPI base
    const totalMov = detalles.length;

    const conFin = detalles.filter((d) => d.minSolicitudAFin !== null);
    const totalConFin = conFin.length;
    const totalSinFin = totalMov - totalConFin;

    const durAll = conFin.map((d) => safeNum(d.minSolicitudAFin));
    const durConInc = conFin.filter((d) => d.incidentesCount > 0).map((d) => safeNum(d.minSolicitudAFin));
    const durSinInc = conFin.filter((d) => d.incidentesCount === 0).map((d) => safeNum(d.minSolicitudAFin));

    function avgGte(th: number) {
      const xs = durAll.filter((x) => x >= th);
      return xs.length ? mean(xs) : 0;
    }

    const movConInc = detalles.filter((d) => d.incidentesCount > 0).length;
    const movConIncPct = totalMov ? Math.round((movConInc / totalMov) * 100) : 0;

    const corr = pearson(
      conFin.map((d) => safeNum(d.minSolicitudAFin)),
      conFin.map((d) => safeNum(d.incidentesCount))
    );

    // 6) Anomalías
    const anomaliasArr = conFin.filter((d) => d.esAnomalia);
    const anomalias = anomaliasArr.length;
    const anomaliasPct = totalConFin ? Math.round((anomalias / totalConFin) * 100) : 0;

    const countMap = <T extends string | number>(xs: T[]) => {
      const m = new Map<T, number>();
      for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
      return m;
    };

    const anomPorOperadorMap = countMap(
      anomaliasArr
        .map((d) => d.usuarios.operador?.id ?? null)
        .filter((x): x is number => x !== null)
    );

    const anomPorOperador = Array.from(anomPorOperadorMap.entries())
      .map(([operadorId, total]) => {
        const sample = anomaliasArr.find((d) => d.usuarios.operador?.id === operadorId)?.usuarios.operador;
        return {
          operadorId,
          operadorNombre: sample?.nombre ?? '—',
          total,
          pctSobreAnomalias: anomalias ? Math.round((total / anomalias) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 30);

    const anomPorClienteMap = countMap(
      anomaliasArr
        .map((d) => d.usuarios.cliente?.id ?? null)
        .filter((x): x is number => x !== null)
    );

    const anomPorCliente = Array.from(anomPorClienteMap.entries())
      .map(([clienteId, total]) => {
        const sample = anomaliasArr.find((d) => d.usuarios.cliente?.id === clienteId)?.usuarios.cliente;
        return {
          clienteId,
          clienteNombre: sample?.nombre ?? '—',
          total,
          pctSobreAnomalias: anomalias ? Math.round((total / anomalias) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 30);

    const anomPorEmpresaMap = countMap(anomaliasArr.map((d) => d.empresa || '—'));
    const anomPorEmpresa = Array.from(anomPorEmpresaMap.entries())
      .map(([empresa, total]) => ({
        empresa,
        total,
        pctSobreAnomalias: anomalias ? Math.round((total / anomalias) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 30);

    const anomPorLocoMap = countMap(anomaliasArr.map((d) => safeNum(d.locomotiveNumber)));
    const anomPorLocomotora = Array.from(anomPorLocoMap.entries())
      .map(([locomotiveNumber, total]) => ({
        locomotiveNumber,
        total,
        pctSobreAnomalias: anomalias ? Math.round((total / anomalias) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 30);

    const anomPorDiaMap = countMap(anomaliasArr.map((d) => d.diaMX));
    const anomPorDiaMX = Array.from(anomPorDiaMap.entries())
      .map(([diaMX, total]) => ({ diaMX, total }))
      .sort((a, b) => a.diaMX.localeCompare(b.diaMX));

    // 7) Buckets + incidentes por bucket
    const bucketOrder: DurBucketId[] = ['lt10', 'm10_20', 'm20_30', 'm30_60', 'm60_120', 'gte120', 'sinFin'];

    const bucketAgg = new Map<DurBucketId, { mov: number; inc: number; movConInc: number }>();
    for (const id of bucketOrder) bucketAgg.set(id, { mov: 0, inc: 0, movConInc: 0 });

    for (const d of detalles) {
      const bid = bucketFromMinutes(d.minSolicitudAFin);
      const agg = bucketAgg.get(bid)!;
      agg.mov += 1;
      agg.inc += d.incidentesCount;
      if (d.incidentesCount > 0) agg.movConInc += 1;
    }

    const duracionBuckets = bucketOrder.map((id) => {
      const a = bucketAgg.get(id)!;
      const pct = totalMov ? Math.round((a.mov / totalMov) * 100) : 0;
      const incidentRate = a.mov ? a.inc / a.mov : 0;
      return {
        id,
        label: bucketLabel(id),
        movimientos: a.mov,
        pct,
        incidentes: a.inc,
        incidentRate,
      };
    });

    const movConIncidentePctPorBucket = bucketOrder.map((id) => {
      const a = bucketAgg.get(id)!;
      const pct = a.mov ? Math.round((a.movConInc / a.mov) * 100) : 0;
      return { bucketId: id, bucketLabel: bucketLabel(id), movConIncidentePct: pct };
    });

    // 8) Bono KPIs + ranking operador
    const conOperadorYFin = conFin.filter((d) => !!d.usuarios.operador);
    const bonosElegibles = conOperadorYFin.filter((d) => d.bonoElegible).length;
    const bonosElegiblesPct = conOperadorYFin.length
      ? Math.round((bonosElegibles / conOperadorYFin.length) * 100)
      : 0;

    const opMap = new Map<number, {
      operadorId: number;
      operadorNombre: string;
      operadorRol: string;
      movimientos: number;
      conFin: number;
      elegibles: number;
      leadMins: number[];
      incidentesTotal: number;
      anomalias: number;
    }>();

    for (const d of detalles) {
      const op = d.usuarios.operador;
      if (!op) continue;

      let row = opMap.get(op.id);
      if (!row) {
        row = {
          operadorId: op.id,
          operadorNombre: op.nombre,
          operadorRol: op.rol,
          movimientos: 0,
          conFin: 0,
          elegibles: 0,
          leadMins: [],
          incidentesTotal: 0,
          anomalias: 0,
        };
        opMap.set(op.id, row);
      }

      row.movimientos += 1;
      row.incidentesTotal += d.incidentesCount;
      if (d.esAnomalia) row.anomalias += 1;

      if (d.minSolicitudAFin !== null) {
        row.conFin += 1;
        row.leadMins.push(safeNum(d.minSolicitudAFin));
        if (d.bonoElegible) row.elegibles += 1;
      }
    }

    const porOperador = Array.from(opMap.values())
      .map((r) => ({
        operadorId: r.operadorId,
        operadorNombre: r.operadorNombre,
        operadorRol: r.operadorRol,
        movimientos: r.movimientos,
        conFin: r.conFin,
        elegibles: r.elegibles,
        elegiblesPct: r.conFin ? Math.round((r.elegibles / r.conFin) * 100) : 0,
        leadMeanMin: mean(r.leadMins),
        incidentesTotal: r.incidentesTotal,
        anomalias: r.anomalias,
      }))
      // orden CEO: más bonos, luego más movimientos, luego menos anomalías (más “limpio”)
      .sort((a, b) => (b.elegibles - a.elegibles) || (b.movimientos - a.movimientos) || (a.anomalias - b.anomalias));

    // 9) Tops (auditoría)
    const topLentos = [...conFin]
      .sort((a, b) => safeNum(b.minSolicitudAFin) - safeNum(a.minSolicitudAFin))
      .slice(0, 40);

    const topConIncidentes = [...detalles]
      .filter((d) => d.incidentesCount > 0)
      .sort((a, b) => (b.incidentesCount - a.incidentesCount) || (safeNum(b.minSolicitudAFin) - safeNum(a.minSolicitudAFin)))
      .slice(0, 40);

    const topAnomalias = [...anomaliasArr]
      .sort((a, b) => {
        // anomalía más “grave” = más corta (más sospechosa), luego con incidentes, luego por id desc
        const da = safeNum(a.minSolicitudAFin);
        const db = safeNum(b.minSolicitudAFin);
        if (da !== db) return da - db; // más corta primero
        if (b.incidentesCount !== a.incidentesCount) return b.incidentesCount - a.incidentesCount;
        return b.id - a.id;
      })
      .slice(0, 80);

    const topBonosElegibles = [...conOperadorYFin]
      .filter((d) => d.bonoElegible)
      // orden: por locomotora/día operativo y luego por fecha (auditoría clara)
      .sort((a, b) => {
        const ak = `${a.locomotiveNumber}__${a.diaOperativoMX}`;
        const bk = `${b.locomotiveNumber}__${b.diaOperativoMX}`;
        if (ak !== bk) return ak.localeCompare(bk);
        return a.fechaSolicitudUTC.localeCompare(b.fechaSolicitudUTC);
      })
      .slice(0, 120);

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

        durMeanMin: mean(durAll),
        durMedianMin: median(durAll),
        durStdMin: stddev(durAll),

        avgGte1Min: avgGte(1),
        avgGte10Min: avgGte(10),
        avgGte20Min: avgGte(20),
        avgGte30Min: avgGte(30),

        totalIncidentes: incidentes.length,
        movimientosConIncidente: movConInc,
        movimientosConIncidentePct: movConIncPct,

        durMeanConIncidenteMin: mean(durConInc),
        durMeanSinIncidenteMin: mean(durSinInc),

        corrDurMin_vs_Incidentes: corr,

        anomalias,
        anomaliasPct,

        bonosElegibles,
        bonosElegiblesPct,
      },

      duracionBuckets,

      incidentes: {
        porEstado: incEstadoGlobal,
        movConIncidentePctPorBucket,
      },

      anomalias: {
        porOperador: anomPorOperador,
        porCliente: anomPorCliente,
        porEmpresa: anomPorEmpresa,
        porLocomotora: anomPorLocomotora,
        porDiaMX: anomPorDiaMX,
      },

      bonos: {
        porOperador,
      },

      topLentos,
      topConIncidentes,
      topAnomalias,
      topBonosElegibles,
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
