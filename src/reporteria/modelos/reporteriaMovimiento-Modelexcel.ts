// reporteria/modelos/reporteriaMovimiento-Modelexcel.ts
// Motor de datos para Excel (DIA/SEMANA/MES/BIMESTRE/SEMESTRE/ANUAL)
// - Rango se calcula en TZ MX y se consulta en UTC con fin EXCLUSIVO.
// - Incidentes “reales” salen de Incidente por movimientoId (NO incidenteGlobal).
// - SIN fechaPausa.
// - Incluye nombres: creadoPor/cliente/operador/supervisor/coordinador.
// - Incluye evidencias: imagen1..4.
// - Incluye “Incidente principal” embebido en la fila de movimiento:
//   - Si hay ABIERTO → el ABIERTO más reciente.
//   - Si no hay ABIERTO → el más reciente de todos.
// - “Resuelto por” (limitación DB): en Incidente normal NO existe resueltoPor.
//   - Se usa el actor del incidente cuando estado != ABIERTO y fechaFin != null.
//
// Nota: este archivo NO genera el .xlsx; solo arma datos y agregados.

import { DateTime } from 'luxon';
import { PrismaClient } from '@prisma/client';

export type PeriodoReporte = 'DIA' | 'SEMANA' | 'MES' | 'BIMESTRE' | 'SEMESTRE' | 'ANUAL';

export type ReportePeriodoFilters = {
  fecha: string; // 'YYYY-MM-DD'
  tz?: string; // default America/Mexico_City
  localidadId?: number;
  empresaId?: number;
};

// Prisma singleton
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

/* =========================
   Tipos Excel-ready
   ========================= */

export type IncidenteExcelRow = {
  incidenteId: number;
  movimientoId: number;

  estado: 'ABIERTO' | 'CERRADO' | 'RESUELTO';
  descripcion: string;

  fechaInicioUTC: string; // ISO UTC
  fechaFinUTC: string | null;

  actorId: number;
  actorNombre: string;
  actorRol: string;

  imagen1: string | null;
  imagen2: string | null;
  imagen3: string | null;
  imagen4: string | null;

  totalEvidencias: number;
  tieneEvidencia: boolean;

  // Particiones temporales (para pivots/filtros)
  diaMX: string; // yyyy-LL-dd
  mesMX: string; // yyyy-LL
  anioMX: number; // yyyy
  semanaISO: number; // 1..53 (MX)
};

export type MovimientoExcelRow = {
  movimientoId: number;

  empresaId: number;
  empresa: string;

  localidadId: number;
  localidad: string;

  estado: string; // EstadoMovimiento
  prioridad: string; // Prioridad
  tipoMovimiento: string | null;

  locomotiveNumber: number;

  fechaSolicitudUTC: string;
  fechaInicioUTC: string | null;
  fechaFinUTC: string | null;

  creadoPorId: number;
  creadoPorNombre: string;

  clienteId: number | null;
  clienteNombre: string | null;

  operadorId: number | null; // <- IMPORTANTE: lo ocupas sí o sí
  operadorNombre: string | null;

  supervisorId: number | null;
  supervisorNombre: string | null;

  coordinadorId: number | null;
  coordinadorNombre: string | null;

  finalizado: boolean | null;

  // Métricas (para correlaciones / dashboards)
  duracionMin: number | null; // fin - inicio
  esperaHastaInicioMin: number | null; // inicio - solicitud
  tiempoHastaFinMin: number | null; // fin - solicitud

  // Incidentes agregados
  tieneIncidentes: boolean;
  totalIncidentes: number;
  incAbiertos: number;
  incResueltos: number;
  incCerrados: number;

  primerIncidenteUTC: string | null;
  ultimoIncidenteUTC: string | null;
  tiempoHastaPrimerIncidenteMin: number | null;

  // Evidencias agregadas desde incidentes
  totalEvidenciasIncidentes: number;
  tieneEvidencia: boolean;

  // Flags útiles
  incidentePendiente: boolean; // true si existe incidente ABIERTO

  // ===== Incidente principal (embebido en fila de movimiento) =====
  incidenteIdPrincipal: number | null;
  incidenteEstadoPrincipal: 'ABIERTO' | 'CERRADO' | 'RESUELTO' | null;
  incidenteDescripcionPrincipal: string | null;
  incidenteInicioUTC: string | null;
  incidenteFinUTC: string | null;

  // actor del incidente principal (quien lo creó/reportó en tu DB)
  incidenteActorId: number | null;
  incidenteActorNombre: string | null;
  incidenteActorRol: string | null;

  // “Resuelto por” (limitación: no existe campo dedicado en Incidente normal)
  // si está cerrado/resuelto y tiene fechaFin, se toma el mismo actor del incidente.
  incidenteResueltoPorNombre: string | null;
  incidenteResueltoPorRol: string | null;

  // Particiones temporales (para pivots/filtros)
  diaMX: string;
  mesMX: string;
  anioMX: number;
  semanaISO: number;
};

export type ResumenGrupo = {
  key: string; // nombre de empresa / usuario / etc
  id?: number | null;

  totalMov: number;
  concluidos: number;
  cancelados: number;
  enProceso: number;
  espera: number;
  solicitado: number;
  otrosEstado: number;

  totalInc: number;
  incAbiertos: number;
  incResueltos: number;
  incCerrados: number;

  movConIncidente: number;
  movConIncidenteAbierto: number;
  movConEvidencia: number;

  duracionPromMin: number | null;
  esperaPromMin: number | null;

  // para ranking
  impacto: number; // totalMov + totalInc
};

export type ReporteExcel = {
  meta: {
    periodo: PeriodoReporte;
    etiqueta: string;
    fechaLocal: string;
    tz: string;
    rangoUTC: { desde: string; hastaExclusivo: string };
    rangoLocal: { desde: string; hastaExclusivo: string };
  };

  // Hoja datos
  movimientos: MovimientoExcelRow[];
  incidentes: IncidenteExcelRow[];

  // “Pivots” (datos agregados para hojas)
  general: {
    totalMov: number;
    totalInc: number;
    movConInc: number;
    movConIncPct: number;
    incAbiertos: number;
    incResueltos: number;
    incCerrados: number;
    duracionPromMin: number | null;
    esperaPromMin: number | null;
  };

  porEmpresa: ResumenGrupo[];
  porCreador: ResumenGrupo[];
  porOperador: ResumenGrupo[];
  porCliente: ResumenGrupo[];

  // series temporales (día/mes/año) para gráficas
  seriePorDia: Array<{ diaMX: string; totalMov: number; totalInc: number; movConInc: number }>;
  seriePorMes: Array<{ mesMX: string; totalMov: number; totalInc: number; movConInc: number }>;
  seriePorAnio: Array<{ anioMX: number; totalMov: number; totalInc: number; movConInc: number }>;
};

/* =========================
   Helpers
   ========================= */

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

  return `${y}`; // ANUAL
}

function rangoPeriodoUTC(fechaLocal: string, tz: string, periodo: PeriodoReporte) {
  const anchor = parseFechaLocal(fechaLocal, tz);

  let startLocal: DateTime;
  let endLocal: DateTime;

  switch (periodo) {
    case 'DIA':
      startLocal = anchor.startOf('day');
      endLocal = startLocal.plus({ days: 1 });
      break;

    case 'SEMANA':
      startLocal = anchor.startOf('week').startOf('day');
      endLocal = startLocal.plus({ weeks: 1 });
      break;

    case 'MES':
      startLocal = anchor.startOf('month').startOf('day');
      endLocal = startLocal.plus({ months: 1 });
      break;

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

    case 'ANUAL':
      startLocal = anchor.startOf('year').startOf('day');
      endLocal = startLocal.plus({ years: 1 });
      break;

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

function minutesBetween(aIsoUtc: string | null, bIsoUtc: string | null): number | null {
  if (!aIsoUtc || !bIsoUtc) return null;
  const a = DateTime.fromISO(aIsoUtc, { zone: 'utc' });
  const b = DateTime.fromISO(bIsoUtc, { zone: 'utc' });
  if (!a.isValid || !b.isValid) return null;
  return Math.round(b.diff(a, 'minutes').minutes);
}

function avg(nums: Array<number | null>) {
  const xs = nums.filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
  if (!xs.length) return null;
  return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
}

function safePct(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function toMXPartsFromUtcIso(isoUtc: string, tz: string) {
  const dt = DateTime.fromISO(isoUtc, { zone: 'utc' }).setZone(tz);
  return {
    diaMX: dt.toFormat('yyyy-LL-dd'),
    mesMX: dt.toFormat('yyyy-LL'),
    anioMX: dt.year,
    semanaISO: dt.weekNumber,
  };
}

/* =========================
   Agregadores
   ========================= */

function estadoBuckets(estado: string) {
  const s = String(estado ?? '').toUpperCase();
  return {
    concl: s === 'CONCLUIDO',
    canc: s === 'CANCELADO',
    proc: s === 'EN_PROCESO' || s === 'PROCESO',
    espera: s === 'ESPERA' || s === 'EN_ESPERA',
    sol: s === 'SOLICITADO',
  };
}

function ensureGrupo(map: Map<string, ResumenGrupo>, key: string, id?: number | null) {
  let g = map.get(key);
  if (!g) {
    g = {
      key,
      id: id ?? null,

      totalMov: 0,
      concluidos: 0,
      cancelados: 0,
      enProceso: 0,
      espera: 0,
      solicitado: 0,
      otrosEstado: 0,

      totalInc: 0,
      incAbiertos: 0,
      incResueltos: 0,
      incCerrados: 0,

      movConIncidente: 0,
      movConIncidenteAbierto: 0,
      movConEvidencia: 0,

      duracionPromMin: null,
      esperaPromMin: null,

      impacto: 0,
    };
    map.set(key, g);
  }
  return g;
}

function finalizeGrupos(rows: ResumenGrupo[], duraciones: Map<string, number[]>, esperas: Map<string, number[]>) {
  for (const g of rows) {
    const d = duraciones.get(g.key) ?? [];
    const e = esperas.get(g.key) ?? [];
    g.duracionPromMin = d.length ? Math.round(d.reduce((a, b) => a + b, 0) / d.length) : null;
    g.esperaPromMin = e.length ? Math.round(e.reduce((a, b) => a + b, 0) / e.length) : null;
    g.impacto = g.totalMov + g.totalInc;
  }
  rows.sort((a, b) => b.impacto - a.impacto);
}

/* =========================
   Modelo principal
   ========================= */

export class ReporteriaMovimientoExcelModel {
  static async reportePorPeriodo(filters: ReportePeriodoFilters, periodo: PeriodoReporte): Promise<ReporteExcel> {
    const tz = filters.tz ?? 'America/Mexico_City';
    const { anchor, startLocal, endLocal, startUTC, endUTC } = rangoPeriodoUTC(filters.fecha, tz, periodo);

    // 1) Movimientos (por fechaSolicitud) con nombres completos
    const movimientos = await prisma.movimiento.findMany({
      where: {
        ...(filters.localidadId ? { localidadId: filters.localidadId } : {}),
        ...(filters.empresaId ? { empresaId: filters.empresaId } : {}),
        fechaSolicitud: {
          gte: startUTC.toJSDate(),
          lt: endUTC.toJSDate(),
        },
      },
      orderBy: [{ fechaSolicitud: 'asc' }],
      select: {
        id: true,
        empresaId: true,
        localidadId: true,

        estado: true,
        prioridad: true,
        tipoMovimiento: true,
        locomotiveNumber: true,

        fechaSolicitud: true,
        fechaInicio: true,
        fechaFin: true,

        finalizado: true,

        empresa: { select: { nombre: true } },
        localidad: { select: { nombre: true } },

        creadoPorId: true,
        creadoPor: { select: { nombre: true } },

        clienteId: true,
        cliente: { select: { nombre: true } },

        operadorId: true,
        operador: { select: { nombre: true } },

        supervisorId: true,
        supervisor: { select: { nombre: true } },

        coordinadorId: true,
        coordinador: { select: { nombre: true } },
      },
    });

    const movimientoIds = movimientos.map((m) => m.id);

    // 2) Incidentes “reales” por movimientoId con evidencias
    const incidentesRaw = movimientoIds.length
      ? await prisma.incidente.findMany({
          where: { movimientoId: { in: movimientoIds } },
          orderBy: [{ fechaInicio: 'asc' }, { id: 'asc' }], // <- mejor que solo id
          select: {
            id: true,
            movimientoId: true,
            estado: true,
            descripcion: true,
            fechaInicio: true,
            fechaFin: true,
            usuarioId: true,
            usuario: { select: { nombre: true, rol: true } },

            imagen1: true,
            imagen2: true,
            imagen3: true,
            imagen4: true,
          },
        })
      : [];

    const incidentes: IncidenteExcelRow[] = incidentesRaw.map((i) => {
      const img = [i.imagen1, i.imagen2, i.imagen3, i.imagen4].filter(Boolean);
      const parts = toMXPartsFromUtcIso(i.fechaInicio.toISOString(), tz);

      return {
        incidenteId: i.id,
        movimientoId: i.movimientoId,
        estado: i.estado,
        descripcion: i.descripcion,
        fechaInicioUTC: i.fechaInicio.toISOString(),
        fechaFinUTC: i.fechaFin ? i.fechaFin.toISOString() : null,
        actorId: i.usuarioId,
        actorNombre: i.usuario?.nombre ?? '—',
        actorRol: String(i.usuario?.rol ?? '—'),
        imagen1: i.imagen1 ?? null,
        imagen2: i.imagen2 ?? null,
        imagen3: i.imagen3 ?? null,
        imagen4: i.imagen4 ?? null,
        totalEvidencias: img.length,
        tieneEvidencia: img.length > 0,
        ...parts,
      };
    });

    // Index incidentes por movimiento
    const incByMov = new Map<number, IncidenteExcelRow[]>();
    for (const i of incidentes) {
      const arr = incByMov.get(i.movimientoId) ?? [];
      arr.push(i);
      incByMov.set(i.movimientoId, arr);
    }

    // helper: incidente principal
    const pickIncidentePrincipal = (incs: IncidenteExcelRow[]) => {
      if (!incs.length) return { principal: null as IncidenteExcelRow | null, resuelto: null as IncidenteExcelRow | null };

      // 1) si hay abiertos, el ABIERTO más reciente (por fechaInicio)
      const abiertos = incs.filter((x) => x.estado === 'ABIERTO');
      const principal = (abiertos.length ? abiertos[abiertos.length - 1] : incs[incs.length - 1]) ?? null;

      // “resuelto por”: limitación DB, usamos el actor del incidente cuando está cerrado/resuelto y tiene fechaFin
      const resuelto = principal && principal.estado !== 'ABIERTO' && principal.fechaFinUTC ? principal : null;

      return { principal, resuelto };
    };

    // 3) Armar filas Movimientos Excel-ready (con incidente principal embebido)
    const movimientosRows: MovimientoExcelRow[] = movimientos.map((m) => {
      const fechaSolicitudUTC = m.fechaSolicitud.toISOString();
      const fechaInicioUTC = m.fechaInicio ? m.fechaInicio.toISOString() : null;
      const fechaFinUTC = m.fechaFin ? m.fechaFin.toISOString() : null;

      const incs = incByMov.get(m.id) ?? [];

      const totalInc = incs.length;
      const incAbiertos = incs.filter((x) => x.estado === 'ABIERTO').length;
      const incResueltos = incs.filter((x) => x.estado === 'RESUELTO').length;
      const incCerrados = incs.filter((x) => x.estado === 'CERRADO').length;

      const primerInc = incs.length ? incs[0].fechaInicioUTC : null;
      const ultimoInc = incs.length ? incs[incs.length - 1].fechaInicioUTC : null;

      const totalEvid = incs.reduce((a, b) => a + (b.totalEvidencias ?? 0), 0);

      const duracionMin = minutesBetween(fechaInicioUTC, fechaFinUTC);
      const esperaHastaInicioMin = minutesBetween(fechaSolicitudUTC, fechaInicioUTC);
      const tiempoHastaFinMin = minutesBetween(fechaSolicitudUTC, fechaFinUTC);
      const tiempoHastaPrimerIncidenteMin = minutesBetween(fechaInicioUTC, primerInc);

      const { principal, resuelto } = pickIncidentePrincipal(incs);

      const parts = toMXPartsFromUtcIso(fechaSolicitudUTC, tz);

      return {
        movimientoId: m.id,

        empresaId: m.empresaId,
        empresa: m.empresa?.nombre ?? '—',

        localidadId: m.localidadId,
        localidad: m.localidad?.nombre ?? '—',

        estado: String(m.estado),
        prioridad: String(m.prioridad ?? '—'),
        tipoMovimiento: m.tipoMovimiento ? String(m.tipoMovimiento) : null,

        locomotiveNumber: m.locomotiveNumber,

        fechaSolicitudUTC,
        fechaInicioUTC,
        fechaFinUTC,

        creadoPorId: m.creadoPorId,
        creadoPorNombre: m.creadoPor?.nombre ?? '—',

        clienteId: m.clienteId ?? null,
        clienteNombre: m.cliente?.nombre ?? null,

        operadorId: m.operadorId ?? null,
        operadorNombre: m.operador?.nombre ?? null,

        supervisorId: m.supervisorId ?? null,
        supervisorNombre: m.supervisor?.nombre ?? null,

        coordinadorId: m.coordinadorId ?? null,
        coordinadorNombre: m.coordinador?.nombre ?? null,

        finalizado: m.finalizado ?? null,

        duracionMin,
        esperaHastaInicioMin,
        tiempoHastaFinMin,

        tieneIncidentes: totalInc > 0,
        totalIncidentes: totalInc,
        incAbiertos,
        incResueltos,
        incCerrados,

        primerIncidenteUTC: primerInc,
        ultimoIncidenteUTC: ultimoInc,
        tiempoHastaPrimerIncidenteMin,

        totalEvidenciasIncidentes: totalEvid,
        tieneEvidencia: totalEvid > 0,

        incidentePendiente: incAbiertos > 0,

        // ===== incidente principal embebido =====
        incidenteIdPrincipal: principal?.incidenteId ?? null,
        incidenteEstadoPrincipal: principal?.estado ?? null,
        incidenteDescripcionPrincipal: principal?.descripcion ?? null,
        incidenteInicioUTC: principal?.fechaInicioUTC ?? null,
        incidenteFinUTC: principal?.fechaFinUTC ?? null,
        incidenteActorId: principal?.actorId ?? null,
        incidenteActorNombre: principal?.actorNombre ?? null,
        incidenteActorRol: principal?.actorRol ?? null,

        incidenteResueltoPorNombre: resuelto?.actorNombre ?? null,
        incidenteResueltoPorRol: resuelto?.actorRol ?? null,

        ...parts,
      };
    });

    // 4) Agregaciones (por Empresa / Creador / Operador / Cliente)
    const grpEmpresa = new Map<string, ResumenGrupo>();
    const grpCreador = new Map<string, ResumenGrupo>();
    const grpOperador = new Map<string, ResumenGrupo>();
    const grpCliente = new Map<string, ResumenGrupo>();

    const durEmp = new Map<string, number[]>();
    const espEmp = new Map<string, number[]>();
    const durCre = new Map<string, number[]>();
    const espCre = new Map<string, number[]>();
    const durOpe = new Map<string, number[]>();
    const espOpe = new Map<string, number[]>();
    const durCli = new Map<string, number[]>();
    const espCli = new Map<string, number[]>();

    const pushMetric = (map: Map<string, number[]>, key: string, val: number | null) => {
      if (val === null || !Number.isFinite(val)) return;
      const arr = map.get(key) ?? [];
      arr.push(val);
      map.set(key, arr);
    };

    for (const r of movimientosRows) {
      const b = estadoBuckets(r.estado);

      const apply = (g: ResumenGrupo) => {
        g.totalMov++;

        if (b.concl) g.concluidos++;
        else if (b.canc) g.cancelados++;
        else if (b.proc) g.enProceso++;
        else if (b.espera) g.espera++;
        else if (b.sol) g.solicitado++;
        else g.otrosEstado++;

        g.totalInc += r.totalIncidentes;
        g.incAbiertos += r.incAbiertos;
        g.incResueltos += r.incResueltos;
        g.incCerrados += r.incCerrados;

        if (r.tieneIncidentes) g.movConIncidente++;
        if (r.incidentePendiente) g.movConIncidenteAbierto++;
        if (r.tieneEvidencia) g.movConEvidencia++;
      };

      const keyE = r.empresa || '—';
      apply(ensureGrupo(grpEmpresa, keyE, r.empresaId));
      pushMetric(durEmp, keyE, r.duracionMin);
      pushMetric(espEmp, keyE, r.esperaHastaInicioMin);

      const keyCr = r.creadoPorNombre || '—';
      apply(ensureGrupo(grpCreador, keyCr, r.creadoPorId));
      pushMetric(durCre, keyCr, r.duracionMin);
      pushMetric(espCre, keyCr, r.esperaHastaInicioMin);

      const keyOp = r.operadorNombre || 'Sin Operador';
      apply(ensureGrupo(grpOperador, keyOp, r.operadorId ?? null));
      pushMetric(durOpe, keyOp, r.duracionMin);
      pushMetric(espOpe, keyOp, r.esperaHastaInicioMin);

      const keyCl = r.clienteNombre || 'Sin Cliente';
      apply(ensureGrupo(grpCliente, keyCl, r.clienteId ?? null));
      pushMetric(durCli, keyCl, r.duracionMin);
      pushMetric(espCli, keyCl, r.esperaHastaInicioMin);
    }

    const porEmpresa = Array.from(grpEmpresa.values());
    const porCreador = Array.from(grpCreador.values());
    const porOperador = Array.from(grpOperador.values());
    const porCliente = Array.from(grpCliente.values());

    finalizeGrupos(porEmpresa, durEmp, espEmp);
    finalizeGrupos(porCreador, durCre, espCre);
    finalizeGrupos(porOperador, durOpe, espOpe);
    finalizeGrupos(porCliente, durCli, espCli);

    // 5) Series temporales (para gráficas por día/mes/año)
    const sDia = new Map<string, { totalMov: number; totalInc: number; movConInc: number }>();
    const sMes = new Map<string, { totalMov: number; totalInc: number; movConInc: number }>();
    const sAnio = new Map<number, { totalMov: number; totalInc: number; movConInc: number }>();

    for (const r of movimientosRows) {
      const d = sDia.get(r.diaMX) ?? { totalMov: 0, totalInc: 0, movConInc: 0 };
      d.totalMov++;
      d.totalInc += r.totalIncidentes;
      if (r.tieneIncidentes) d.movConInc++;
      sDia.set(r.diaMX, d);

      const m = sMes.get(r.mesMX) ?? { totalMov: 0, totalInc: 0, movConInc: 0 };
      m.totalMov++;
      m.totalInc += r.totalIncidentes;
      if (r.tieneIncidentes) m.movConInc++;
      sMes.set(r.mesMX, m);

      const a = sAnio.get(r.anioMX) ?? { totalMov: 0, totalInc: 0, movConInc: 0 };
      a.totalMov++;
      a.totalInc += r.totalIncidentes;
      if (r.tieneIncidentes) a.movConInc++;
      sAnio.set(r.anioMX, a);
    }

    const seriePorDia = Array.from(sDia.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([diaMX, v]) => ({ diaMX, ...v }));

    const seriePorMes = Array.from(sMes.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mesMX, v]) => ({ mesMX, ...v }));

    const seriePorAnio = Array.from(sAnio.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([anioMX, v]) => ({ anioMX, ...v }));

    // 6) General KPIs
    const totalMov = movimientosRows.length;
    const totalInc = incidentes.length;
    const movConInc = movimientosRows.filter((x) => x.tieneIncidentes).length;

    const general = {
      totalMov,
      totalInc,
      movConInc,
      movConIncPct: safePct(movConInc, totalMov),
      incAbiertos: incidentes.filter((x) => x.estado === 'ABIERTO').length,
      incResueltos: incidentes.filter((x) => x.estado === 'RESUELTO').length,
      incCerrados: incidentes.filter((x) => x.estado === 'CERRADO').length,
      duracionPromMin: avg(movimientosRows.map((x) => x.duracionMin)),
      esperaPromMin: avg(movimientosRows.map((x) => x.esperaHastaInicioMin)),
    };

    return {
      meta: {
        periodo,
        etiqueta: etiquetaPeriodo(periodo, anchor),
        fechaLocal: filters.fecha,
        tz,
        rangoUTC: {
          desde: startUTC.toISO()!,
          hastaExclusivo: endUTC.toISO()!,
        },
        rangoLocal: {
          desde: startLocal.toISO()!,
          hastaExclusivo: endLocal.toISO()!,
        },
      },

      movimientos: movimientosRows,
      incidentes,

      general,
      porEmpresa,
      porCreador,
      porOperador,
      porCliente,

      seriePorDia,
      seriePorMes,
      seriePorAnio,
    };
  }

  static reporteDia(filters: ReportePeriodoFilters) {
    return this.reportePorPeriodo(filters, 'DIA');
  }
  static reporteSemana(filters: ReportePeriodoFilters) {
    return this.reportePorPeriodo(filters, 'SEMANA');
  }
  static reporteMes(filters: ReportePeriodoFilters) {
    return this.reportePorPeriodo(filters, 'MES');
  }
  static reporteBimestre(filters: ReportePeriodoFilters) {
    return this.reportePorPeriodo(filters, 'BIMESTRE');
  }
  static reporteSemestre(filters: ReportePeriodoFilters) {
    return this.reportePorPeriodo(filters, 'SEMESTRE');
  }
  static reporteAnual(filters: ReportePeriodoFilters) {
    return this.reportePorPeriodo(filters, 'ANUAL');
  }
}
