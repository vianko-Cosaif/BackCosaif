// reporteria/modelos/cliente-reportes-operativos-model.ts
// Suite de reportes operativos por empresa para cliente.

import { DateTime } from 'luxon';
import { PrismaClient } from '@prisma/client';
import { normalizarPeriodoCarga, type PeriodoCarga } from './cliente-carga-operativa-model';

export type ClienteReportFilters = {
  fecha: string;
  periodo: PeriodoCarga;
  empresaId: number;
  tz?: string;
  localidadId?: number;
  detalleLimit?: number;
  umbralMin?: number;
  page?: number;
  pageSize?: number;
};

export type EstadoCounts = Record<
  'SOLICITADO' | 'EN_PROCESO' | 'DETENIDO' | 'ESPERA' | 'MODIFICADO' | 'CONCLUIDO' | 'CANCELADO' | 'AGENDADO',
  number
>;

export type ReportMeta = {
  periodo: PeriodoCarga;
  periodoLabel: string;
  fechaLocal: string;
  tz: string;
  empresaId: number;
  empresaNombre: string | null;
  localidadId?: number;
  umbralMin: number;
  rangoUTC: { desde: string; hastaExclusivo: string };
  rangoLocal: { desde: string; hastaExclusivo: string };
  rangoTexto: string;
};

export type ViasReporte = {
  meta: ReportMeta;
  resumen: {
    totalMovimientos: number;
    totalVias: number;
    totalEntradas: number;
    totalSalidas: number;
    pendientes: number;
    cancelados: number;
    demorados: number;
    incidentes: number;
  };
  vias: Array<{
    viaId: number;
    via: string;
    localidad: string;
    totalUsos: number;
    movimientosRelacionados: number;
    entradas: number;
    salidas: number;
    pendientes: number;
    cancelados: number;
    demorados: number;
    incidentes: number;
    locomotorasUnicas: number;
    promAtencionMin: number | null;
  }>;
};

export type TurnosReporte = {
  meta: ReportMeta;
  turnos: Array<{
    turnoId: 'T1' | 'T2' | 'T3';
    turnoLabel: string;
    turnoRango: string;
    solicitados: number;
    iniciados: number;
    finalizados: number;
    conInicioFin: number;
    conInicioFinPct: number;
    cancelados: number;
    incidentes: number;
    demorados: number;
    promEjecucionMin: number | null;
    promAtencionMin: number | null;
  }>;
  movimientosPorHora: Array<{ hora: number; label: string; movimientos: number }>;
  estados: EstadoCounts;
};

export type UsuariosReporte = {
  meta: ReportMeta;
  solicitantes: Array<{
    usuarioId: number;
    nombre: string;
    rol: string;
    solicitudes: number;
    finalizados: number;
    cancelaciones: number;
    incidentes: number;
    locomotorasUnicas: number;
    turnos: Record<'T1' | 'T2' | 'T3', number>;
  }>;
  operadores: Array<{
    usuarioId: number;
    nombre: string;
    rol: string;
    atendidos: number;
    finalizados: number;
    cancelaciones: number;
    conInicioFin: number;
    incidentes: number;
    promEjecucionMin: number | null;
    turnos: Record<'T1' | 'T2' | 'T3', number>;
  }>;
  actividadPorDia: Array<{ fecha: string; diaSemana: string; solicitudes: number; atendidos: number; finalizados: number; cancelaciones: number }>;
  actividadPorTurno: Array<{ turnoId: 'T1' | 'T2' | 'T3'; turnoLabel: string; solicitudes: number; atendidos: number; finalizados: number; cancelaciones: number }>;
};

export type CumplimientoReporte = {
  meta: ReportMeta;
  resumen: {
    totalMovimientos: number;
    terminadosCorrectamente: number;
    concluidosSinIncidente: number;
    pendientes: number;
    cancelados: number;
    excedidos: number;
    promAtencionMin: number | null;
    promEjecucionMin: number | null;
    conInicioFinPct: number;
  };
  estados: EstadoCounts;
  porLocomotora: Array<{
    locomotiveNumber: number;
    totalMovimientos: number;
    concluidos: number;
    pendientes: number;
    cancelados: number;
    excedidos: number;
    incidentes: number;
    promAtencionMin: number | null;
  }>;
  porTurno: TurnosReporte['turnos'];
};

export type IncidentesReporte = {
  meta: ReportMeta;
  resumen: {
    totalIncidentes: number;
    movimientosConIncidente: number;
    incidentesAbiertos: number;
    incidentesResueltos: number;
    incidentesCerrados: number;
    cancelacionesRelacionadas: number;
  };
  porLocomotora: Array<{ locomotiveNumber: number; incidentes: number; movimientos: number; cancelacionesRelacionadas: number }>;
  porVia: Array<{ viaId: number | null; via: string; localidad: string; incidentes: number; movimientos: number; cancelacionesRelacionadas: number }>;
  porTurno: Array<{ turnoId: 'T1' | 'T2' | 'T3'; turnoLabel: string; turnoRango: string; incidentes: number; movimientos: number; cancelacionesRelacionadas: number }>;
  detalle: Array<{
    incidenteId: number;
    movimientoId: number;
    locomotiveNumber: number;
    estadoIncidente: string;
    estadoMovimiento: string;
    fechaIncidenteMX: string;
    viaOrigen: string | null;
    viaDestino: string | null;
    turnoLabel: string;
    usuario: string | null;
    descripcion: string;
  }>;
  detalleMeta: { totalIncidentes: number; incluidos: number; limit: number; truncado: boolean };
};

export type CronologiaReporte = {
  meta: ReportMeta;
  movimientos: Array<{
    id: number;
    locomotiveNumber: number;
    estadoActual: string;
    localidad: string;
    viaOrigen: string | null;
    viaDestino: string | null;
    servicio: string;
    prioridad: string;
    solicitadoPor: string;
    operador: string | null;
    fechaSolicitud: string;
    fechaInicio: string | null;
    fechaFin: string | null;
    fechaActualizacion: string;
    incidentes: number;
    canceladoConIncidente: boolean;
    linea: string[];
  }>;
  detalleMeta: {
    totalMovimientos: number;
    incluidos: number;
    limit: number;
    truncado: boolean;
    page: number;
    pageSize: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
    from: number;
    to: number;
  };
};

const MX_TZ = 'America/Mexico_City';
const DEFAULT_UMBRAL_MIN = 90;
const DIAS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const ESTADOS: Array<keyof EstadoCounts> = [
  'SOLICITADO',
  'EN_PROCESO',
  'DETENIDO',
  'ESPERA',
  'MODIFICADO',
  'CONCLUIDO',
  'CANCELADO',
  'AGENDADO',
];

// Prisma singleton
// eslint-disable-next-line no-var
declare global { var __PRISMA__: PrismaClient | undefined; }

const prisma: PrismaClient =
  global.__PRISMA__ ??
  new PrismaClient({
    log: process.env.PRISMA_LOG === '1' ? ['error', 'warn'] : undefined,
  });

if (process.env.NODE_ENV !== 'production') global.__PRISMA__ = prisma;

function initEstadoCounts(): EstadoCounts {
  return ESTADOS.reduce((acc, estado) => {
    acc[estado] = 0;
    return acc;
  }, {} as EstadoCounts);
}

function addEstado(counts: EstadoCounts, estado: string | null | undefined) {
  const key = String(estado ?? '') as keyof EstadoCounts;
  if (counts[key] !== undefined) counts[key] += 1;
}

function parseFechaLocal(fechaLocal: string, tz: string) {
  const dt = DateTime.fromISO(fechaLocal, { zone: tz });
  if (!dt.isValid) throw new Error('Fecha invalida, usa YYYY-MM-DD');
  return dt;
}

function rangoPeriodo(fechaLocal: string, tz: string, periodo: PeriodoCarga) {
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
    case 'QUINCENA': {
      const firstHalf = anchor.day <= 15;
      startLocal = anchor.set({ day: firstHalf ? 1 : 16 }).startOf('day');
      endLocal = firstHalf ? anchor.set({ day: 16 }).startOf('day') : anchor.plus({ months: 1 }).startOf('month');
      break;
    }
    case 'MES':
      startLocal = anchor.startOf('month').startOf('day');
      endLocal = startLocal.plus({ months: 1 });
      break;
    case 'BIMESTRE': {
      const bIndex = Math.floor((anchor.month - 1) / 2);
      startLocal = anchor.set({ month: bIndex * 2 + 1, day: 1 }).startOf('day');
      endLocal = startLocal.plus({ months: 2 });
      break;
    }
    case 'SEMESTRE':
      startLocal = anchor.set({ month: anchor.month <= 6 ? 1 : 7, day: 1 }).startOf('day');
      endLocal = startLocal.plus({ months: 6 });
      break;
    case 'ANUAL':
      startLocal = anchor.startOf('year').startOf('day');
      endLocal = startLocal.plus({ years: 1 });
      break;
  }

  return { anchor, startLocal, endLocal, startUTC: startLocal.toUTC(), endUTC: endLocal.toUTC() };
}

function periodoLabel(periodo: PeriodoCarga, anchor: DateTime, startLocal: DateTime) {
  const monthYear = startLocal.setLocale('es').toFormat('LLLL yyyy');
  switch (periodo) {
    case 'DIA':
      return startLocal.toFormat('yyyy-LL-dd');
    case 'SEMANA':
      return `Semana ${anchor.weekNumber} de ${anchor.weekYear}`;
    case 'QUINCENA':
      return `${startLocal.day === 1 ? 'Primera' : 'Segunda'} quincena de ${monthYear}`;
    case 'MES':
      return monthYear;
    case 'BIMESTRE':
      return `Bimestre ${Math.floor((anchor.month - 1) / 2) + 1} de ${anchor.year}`;
    case 'SEMESTRE':
      return `Semestre ${anchor.month <= 6 ? 1 : 2} de ${anchor.year}`;
    case 'ANUAL':
      return String(anchor.year);
  }
}

function rangoTexto(startLocal: DateTime, endLocal: DateTime) {
  const desde = startLocal.toFormat('yyyy-LL-dd');
  const hasta = endLocal.minus({ days: 1 }).toFormat('yyyy-LL-dd');
  return desde === hasta ? desde : `${desde} a ${hasta}`;
}

function minutesBetween(a?: Date | null, b?: Date | null): number | null {
  if (!a || !b) return null;
  const ms = b.getTime() - a.getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.round(ms / 60000);
}

function avg(values: number[]) {
  if (!values.length) return null;
  return Math.round(values.reduce((acc, n) => acc + n, 0) / values.length);
}

function pct(n: number, total: number) {
  return total ? Math.round((n / total) * 100) : 0;
}

function isFinalizado(estado: string, fechaFin?: Date | null) {
  return estado === 'CONCLUIDO' || !!fechaFin;
}

function isPendiente(estado: string) {
  return !['CONCLUIDO', 'CANCELADO'].includes(estado);
}

function servicioLabel(torno?: boolean | null, lavado?: boolean | null) {
  if (torno && lavado) return 'Torno + Lavado';
  if (torno) return 'Torno';
  if (lavado) return 'Lavado';
  return 'Sin servicio';
}

function turnoFromHour(hour: number) {
  if (hour >= 7 && hour < 15) return { turnoId: 'T1' as const, turnoLabel: 'Turno 1', turnoRango: '07:00-15:00' };
  if (hour >= 15 && hour < 23) return { turnoId: 'T2' as const, turnoLabel: 'Turno 2', turnoRango: '15:00-23:00' };
  return { turnoId: 'T3' as const, turnoLabel: 'Turno 3', turnoRango: '23:00-07:00' };
}

function sortedTop<T>(rows: T[], getValue: (row: T) => number, secondary?: (row: T) => string | number) {
  return rows.sort((a, b) => {
    const diff = getValue(b) - getValue(a);
    if (diff) return diff;
    return String(secondary?.(a) ?? '').localeCompare(String(secondary?.(b) ?? ''));
  });
}

function dateOnly(d: Date | null | undefined, tz: string) {
  return d ? DateTime.fromJSDate(d, { zone: tz }).toFormat('yyyy-LL-dd') : null;
}

function dateTimeMX(d: Date | null | undefined, tz: string) {
  return d ? DateTime.fromJSDate(d, { zone: tz }).toFormat('yyyy-LL-dd HH:mm') : null;
}

async function loadBase(filters: ClienteReportFilters) {
  const periodo = normalizarPeriodoCarga(filters.periodo);
  const tz = filters.tz ?? MX_TZ;
  const umbralMin = Math.max(1, Number(filters.umbralMin ?? DEFAULT_UMBRAL_MIN));
  const { anchor, startLocal, endLocal, startUTC, endUTC } = rangoPeriodo(filters.fecha, tz, periodo);

  const empresa = await prisma.empresa.findUnique({
    where: { id: filters.empresaId },
    select: { nombre: true },
  });
  if (!empresa) throw new Error('Empresa no encontrada');

  const movimientos = await prisma.movimiento.findMany({
    where: {
      empresaId: filters.empresaId,
      ...(filters.localidadId ? { localidadId: filters.localidadId } : {}),
      fechaSolicitud: { gte: startUTC.toJSDate(), lt: endUTC.toJSDate() },
    },
    orderBy: [{ fechaSolicitud: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      locomotiveNumber: true,
      estado: true,
      prioridad: true,
      tipoMovimiento: true,
      instrucciones: true,
      fechaSolicitud: true,
      fechaInicio: true,
      fechaFin: true,
      updatedAt: true,
      torno: true,
      lavado: true,
      localidad: { select: { id: true, nombre: true } },
      viaOrigen: { select: { id: true, nombre: true, localidad: { select: { nombre: true } } } },
      viaDestino: { select: { id: true, nombre: true, localidad: { select: { nombre: true } } } },
      creadoPor: { select: { id: true, nombre: true, rol: true } },
      operador: { select: { id: true, nombre: true, rol: true } },
      incidentes: {
        select: {
          id: true,
          estado: true,
          descripcion: true,
          fechaInicio: true,
          fechaFin: true,
          usuario: { select: { id: true, nombre: true } },
        },
        orderBy: { id: 'asc' },
      },
    },
  });

  const meta: ReportMeta = {
    periodo,
    periodoLabel: periodoLabel(periodo, anchor, startLocal),
    fechaLocal: filters.fecha,
    tz,
    empresaId: filters.empresaId,
    empresaNombre: empresa.nombre,
    localidadId: filters.localidadId,
    umbralMin,
    rangoUTC: { desde: startUTC.toISO()!, hastaExclusivo: endUTC.toISO()! },
    rangoLocal: { desde: startLocal.toISO()!, hastaExclusivo: endLocal.toISO()! },
    rangoTexto: rangoTexto(startLocal, endLocal),
  };

  return { meta, movimientos };
}

type MovimientoBase = Awaited<ReturnType<typeof loadBase>>['movimientos'][number];
type ReportViaRef = NonNullable<MovimientoBase['viaOrigen']>;

function serviceRouteLabel(m: MovimientoBase) {
  if (m.torno && m.lavado) return 'Torno + Lavado';
  if (m.torno) return 'Torno';
  if (m.lavado) return 'Lavado';
  return null;
}

function serviceViaRefs(m: MovimientoBase): ReportViaRef[] {
  const localidadId = Math.abs(Number(m.localidad.id) || 0);
  const localidad = { nombre: m.localidad.nombre };
  const refs: ReportViaRef[] = [];
  if (m.torno) refs.push({ id: -1000000 - localidadId * 10 - 1, nombre: 'Torno', localidad });
  if (m.lavado) refs.push({ id: -1000000 - localidadId * 10 - 2, nombre: 'Lavado', localidad });
  return refs;
}

function movimientoViaRefs(m: MovimientoBase): ReportViaRef[] {
  return [m.viaOrigen, m.viaDestino, ...serviceViaRefs(m)].filter((via): via is ReportViaRef => !!via);
}

function serviceSide(m: MovimientoBase): 'entrada' | 'salida' | 'servicio' {
  if (!m.viaOrigen && m.viaDestino) return 'salida';
  if (m.viaOrigen && !m.viaDestino) return 'entrada';
  return 'servicio';
}

function displayViaOrigen(m: MovimientoBase) {
  return m.viaOrigen?.nombre ?? (!m.viaOrigen && m.viaDestino ? serviceRouteLabel(m) : null);
}

function displayViaDestino(m: MovimientoBase) {
  return m.viaDestino?.nombre ?? (m.viaOrigen && !m.viaDestino ? serviceRouteLabel(m) : null);
}

function movimientoInfo(m: MovimientoBase, tz: string, umbralMin: number) {
  const estado = String(m.estado);
  const dt = DateTime.fromJSDate(m.fechaSolicitud, { zone: tz });
  const fecha = dt.toFormat('yyyy-LL-dd');
  const hora = dt.hour;
  const diaSemana = DIAS[dt.weekday - 1] ?? '—';
  const turno = turnoFromHour(hora);
  const ejecucionMin = minutesBetween(m.fechaInicio, m.fechaFin);
  const atencionMin = minutesBetween(m.fechaSolicitud, m.fechaFin);
  const conInicioFin = !!m.fechaInicio && !!m.fechaFin;
  const finalizado = isFinalizado(estado, m.fechaFin);
  const pendiente = isPendiente(estado);
  const cancelado = estado === 'CANCELADO';
  const incidentes = m.incidentes.length;
  const demorados = atencionMin !== null && atencionMin > umbralMin;

  return {
    estado,
    fecha,
    hora,
    diaSemana,
    turno,
    ejecucionMin,
    atencionMin,
    conInicioFin,
    finalizado,
    pendiente,
    cancelado,
    incidentes,
    demorados,
  };
}

export class ClienteReportesOperativosModel {
  static async vias(filters: ClienteReportFilters): Promise<ViasReporte> {
    const { meta, movimientos } = await loadBase(filters);

    type ViaAgg = {
      viaId: number;
      via: string;
      localidad: string;
      totalUsos: number;
      movimientos: Set<number>;
      entradas: number;
      salidas: number;
      pendientes: number;
      cancelados: number;
      demorados: number;
      incidentes: number;
      locomotoras: Set<number>;
      atencion: number[];
    };

    const vias = new Map<number, ViaAgg>();
    let totalEntradas = 0;
    let totalSalidas = 0;

    const touchVia = (
      via: MovimientoBase['viaOrigen'],
      m: MovimientoBase,
      info: ReturnType<typeof movimientoInfo>,
      tipo: 'entrada' | 'salida' | 'servicio'
    ) => {
      if (!via) return;
      let agg = vias.get(via.id);
      if (!agg) {
        agg = {
          viaId: via.id,
          via: via.nombre,
          localidad: via.localidad?.nombre ?? '—',
          totalUsos: 0,
          movimientos: new Set<number>(),
          entradas: 0,
          salidas: 0,
          pendientes: 0,
          cancelados: 0,
          demorados: 0,
          incidentes: 0,
          locomotoras: new Set<number>(),
          atencion: [],
        };
        vias.set(via.id, agg);
      }
      agg.totalUsos += 1;
      agg.movimientos.add(m.id);
      agg.locomotoras.add(m.locomotiveNumber);
      if (tipo === 'entrada') agg.entradas += 1;
      if (tipo === 'salida') agg.salidas += 1;
      if (info.pendiente) agg.pendientes += 1;
      if (info.cancelado) agg.cancelados += 1;
      if (info.demorados) agg.demorados += 1;
      agg.incidentes += info.incidentes;
      if (info.atencionMin !== null) agg.atencion.push(info.atencionMin);
    };

    for (const m of movimientos) {
      const info = movimientoInfo(m, meta.tz, meta.umbralMin);
      if (m.viaDestino) totalEntradas += 1;
      if (m.viaOrigen) totalSalidas += 1;
      touchVia(m.viaDestino, m, info, 'entrada');
      touchVia(m.viaOrigen, m, info, 'salida');
      for (const viaServicio of serviceViaRefs(m)) {
        const ladoServicio = serviceSide(m);
        if (ladoServicio === 'entrada') totalEntradas += 1;
        if (ladoServicio === 'salida') totalSalidas += 1;
        touchVia(viaServicio, m, info, ladoServicio);
      }
    }

    const rows = sortedTop(
      Array.from(vias.values()).map((v) => ({
        viaId: v.viaId,
        via: v.via,
        localidad: v.localidad,
        totalUsos: v.totalUsos,
        movimientosRelacionados: v.movimientos.size,
        entradas: v.entradas,
        salidas: v.salidas,
        pendientes: v.pendientes,
        cancelados: v.cancelados,
        demorados: v.demorados,
        incidentes: v.incidentes,
        locomotorasUnicas: v.locomotoras.size,
        promAtencionMin: avg(v.atencion),
      })),
      (row) => row.totalUsos,
      (row) => row.via
    );

    return {
      meta,
      resumen: {
        totalMovimientos: movimientos.length,
        totalVias: rows.length,
        totalEntradas,
        totalSalidas,
        pendientes: movimientos.filter((m) => movimientoInfo(m, meta.tz, meta.umbralMin).pendiente).length,
        cancelados: movimientos.filter((m) => String(m.estado) === 'CANCELADO').length,
        demorados: movimientos.filter((m) => movimientoInfo(m, meta.tz, meta.umbralMin).demorados).length,
        incidentes: movimientos.reduce((acc, m) => acc + m.incidentes.length, 0),
      },
      vias: rows,
    };
  }

  static async turnos(filters: ClienteReportFilters): Promise<TurnosReporte> {
    const { meta, movimientos } = await loadBase(filters);
    const turnos = buildTurnos(meta, movimientos);
    const hourCounts = Array.from({ length: 24 }, () => 0);
    const estados = initEstadoCounts();

    for (const m of movimientos) {
      const info = movimientoInfo(m, meta.tz, meta.umbralMin);
      hourCounts[info.hora] += 1;
      addEstado(estados, info.estado);
    }

    return {
      meta,
      turnos,
      movimientosPorHora: hourCounts.map((movimientosHora, hora) => ({
        hora,
        label: `${String(hora).padStart(2, '0')}:00`,
        movimientos: movimientosHora,
      })),
      estados,
    };
  }

  static async usuarios(filters: ClienteReportFilters): Promise<UsuariosReporte> {
    const { meta, movimientos } = await loadBase(filters);

    type UserAgg = {
      usuarioId: number;
      nombre: string;
      rol: string;
      total: number;
      finalizados: number;
      cancelaciones: number;
      incidentes: number;
      locomotoras: Set<number>;
      turnos: Record<'T1' | 'T2' | 'T3', number>;
      ejecucion: number[];
      conInicioFin: number;
    };

    const createUser = (usuarioId: number, nombre: string, rol: string): UserAgg => ({
      usuarioId,
      nombre,
      rol,
      total: 0,
      finalizados: 0,
      cancelaciones: 0,
      incidentes: 0,
      locomotoras: new Set<number>(),
      turnos: { T1: 0, T2: 0, T3: 0 },
      ejecucion: [],
      conInicioFin: 0,
    });

    const solicitantes = new Map<number, UserAgg>();
    const operadores = new Map<number, UserAgg>();
    const actividadDia = new Map<string, { fecha: string; diaSemana: string; solicitudes: number; atendidos: number; finalizados: number; cancelaciones: number }>();
    const actividadTurno = new Map<'T1' | 'T2' | 'T3', { turnoId: 'T1' | 'T2' | 'T3'; turnoLabel: string; solicitudes: number; atendidos: number; finalizados: number; cancelaciones: number }>([
      ['T1', { turnoId: 'T1', turnoLabel: 'Turno 1', solicitudes: 0, atendidos: 0, finalizados: 0, cancelaciones: 0 }],
      ['T2', { turnoId: 'T2', turnoLabel: 'Turno 2', solicitudes: 0, atendidos: 0, finalizados: 0, cancelaciones: 0 }],
      ['T3', { turnoId: 'T3', turnoLabel: 'Turno 3', solicitudes: 0, atendidos: 0, finalizados: 0, cancelaciones: 0 }],
    ]);

    for (const m of movimientos) {
      const info = movimientoInfo(m, meta.tz, meta.umbralMin);
      const sol = solicitantes.get(m.creadoPor.id) ?? createUser(m.creadoPor.id, m.creadoPor.nombre, String(m.creadoPor.rol));
      sol.total += 1;
      sol.locomotoras.add(m.locomotiveNumber);
      sol.incidentes += info.incidentes;
      sol.turnos[info.turno.turnoId] += 1;
      if (info.finalizado) sol.finalizados += 1;
      if (info.cancelado) sol.cancelaciones += 1;
      solicitantes.set(m.creadoPor.id, sol);

      if (m.operador) {
        const op = operadores.get(m.operador.id) ?? createUser(m.operador.id, m.operador.nombre, String(m.operador.rol));
        op.total += 1;
        op.locomotoras.add(m.locomotiveNumber);
        op.incidentes += info.incidentes;
        op.turnos[info.turno.turnoId] += 1;
        if (info.finalizado) op.finalizados += 1;
        if (info.cancelado) op.cancelaciones += 1;
        if (info.conInicioFin) op.conInicioFin += 1;
        if (info.ejecucionMin !== null) op.ejecucion.push(info.ejecucionMin);
        operadores.set(m.operador.id, op);
      }

      const day = actividadDia.get(info.fecha) ?? {
        fecha: info.fecha,
        diaSemana: info.diaSemana,
        solicitudes: 0,
        atendidos: 0,
        finalizados: 0,
        cancelaciones: 0,
      };
      day.solicitudes += 1;
      if (m.operador) day.atendidos += 1;
      if (info.finalizado) day.finalizados += 1;
      if (info.cancelado) day.cancelaciones += 1;
      actividadDia.set(info.fecha, day);

      const turn = actividadTurno.get(info.turno.turnoId)!;
      turn.solicitudes += 1;
      if (m.operador) turn.atendidos += 1;
      if (info.finalizado) turn.finalizados += 1;
      if (info.cancelado) turn.cancelaciones += 1;
    }

    return {
      meta,
      solicitantes: sortedTop(
        Array.from(solicitantes.values()).map((u) => ({
          usuarioId: u.usuarioId,
          nombre: u.nombre,
          rol: u.rol,
          solicitudes: u.total,
          finalizados: u.finalizados,
          cancelaciones: u.cancelaciones,
          incidentes: u.incidentes,
          locomotorasUnicas: u.locomotoras.size,
          turnos: u.turnos,
        })),
        (row) => row.solicitudes,
        (row) => row.nombre
      ),
      operadores: sortedTop(
        Array.from(operadores.values()).map((u) => ({
          usuarioId: u.usuarioId,
          nombre: u.nombre,
          rol: u.rol,
          atendidos: u.total,
          finalizados: u.finalizados,
          cancelaciones: u.cancelaciones,
          conInicioFin: u.conInicioFin,
          incidentes: u.incidentes,
          promEjecucionMin: avg(u.ejecucion),
          turnos: u.turnos,
        })),
        (row) => row.atendidos,
        (row) => row.nombre
      ),
      actividadPorDia: Array.from(actividadDia.values()).sort((a, b) => a.fecha.localeCompare(b.fecha)),
      actividadPorTurno: Array.from(actividadTurno.values()),
    };
  }

  static async cumplimiento(filters: ClienteReportFilters): Promise<CumplimientoReporte> {
    const { meta, movimientos } = await loadBase(filters);
    const estados = initEstadoCounts();
    const porLocomotora = new Map<number, { total: number; concluidos: number; pendientes: number; cancelados: number; excedidos: number; incidentes: number; atencion: number[] }>();
    const atencion: number[] = [];
    const ejecucion: number[] = [];
    let terminadosCorrectamente = 0;
    let concluidosSinIncidente = 0;
    let pendientes = 0;
    let cancelados = 0;
    let excedidos = 0;
    let conInicioFin = 0;

    for (const m of movimientos) {
      const info = movimientoInfo(m, meta.tz, meta.umbralMin);
      addEstado(estados, info.estado);
      if (info.estado === 'CONCLUIDO') terminadosCorrectamente += 1;
      if (info.estado === 'CONCLUIDO' && info.incidentes === 0) concluidosSinIncidente += 1;
      if (info.pendiente) pendientes += 1;
      if (info.cancelado) cancelados += 1;
      if (info.demorados) excedidos += 1;
      if (info.conInicioFin) conInicioFin += 1;
      if (info.atencionMin !== null) atencion.push(info.atencionMin);
      if (info.ejecucionMin !== null) ejecucion.push(info.ejecucionMin);

      const row = porLocomotora.get(m.locomotiveNumber) ?? {
        total: 0,
        concluidos: 0,
        pendientes: 0,
        cancelados: 0,
        excedidos: 0,
        incidentes: 0,
        atencion: [],
      };
      row.total += 1;
      if (info.estado === 'CONCLUIDO') row.concluidos += 1;
      if (info.pendiente) row.pendientes += 1;
      if (info.cancelado) row.cancelados += 1;
      if (info.demorados) row.excedidos += 1;
      row.incidentes += info.incidentes;
      if (info.atencionMin !== null) row.atencion.push(info.atencionMin);
      porLocomotora.set(m.locomotiveNumber, row);
    }

    return {
      meta,
      resumen: {
        totalMovimientos: movimientos.length,
        terminadosCorrectamente,
        concluidosSinIncidente,
        pendientes,
        cancelados,
        excedidos,
        promAtencionMin: avg(atencion),
        promEjecucionMin: avg(ejecucion),
        conInicioFinPct: pct(conInicioFin, movimientos.length),
      },
      estados,
      porLocomotora: sortedTop(
        Array.from(porLocomotora.entries()).map(([locomotiveNumber, r]) => ({
          locomotiveNumber,
          totalMovimientos: r.total,
          concluidos: r.concluidos,
          pendientes: r.pendientes,
          cancelados: r.cancelados,
          excedidos: r.excedidos,
          incidentes: r.incidentes,
          promAtencionMin: avg(r.atencion),
        })),
        (row) => row.totalMovimientos,
        (row) => row.locomotiveNumber
      ),
      porTurno: buildTurnos(meta, movimientos),
    };
  }

  static async incidentes(filters: ClienteReportFilters): Promise<IncidentesReporte> {
    const { meta, movimientos } = await loadBase(filters);
    const detalleLimit = Math.min(1000, Math.max(0, Number(filters.detalleLimit ?? 500)));
    const porLocomotora = new Map<number, { incidentes: number; movimientos: Set<number>; cancelacionesRelacionadas: number }>();
    const porVia = new Map<string, { viaId: number | null; via: string; localidad: string; incidentes: number; movimientos: Set<number>; cancelacionesRelacionadas: number }>();
    const porTurno = new Map<'T1' | 'T2' | 'T3', { turnoId: 'T1' | 'T2' | 'T3'; turnoLabel: string; turnoRango: string; incidentes: number; movimientos: Set<number>; cancelacionesRelacionadas: number }>([
      ['T1', { turnoId: 'T1', turnoLabel: 'Turno 1', turnoRango: '07:00-15:00', incidentes: 0, movimientos: new Set<number>(), cancelacionesRelacionadas: 0 }],
      ['T2', { turnoId: 'T2', turnoLabel: 'Turno 2', turnoRango: '15:00-23:00', incidentes: 0, movimientos: new Set<number>(), cancelacionesRelacionadas: 0 }],
      ['T3', { turnoId: 'T3', turnoLabel: 'Turno 3', turnoRango: '23:00-07:00', incidentes: 0, movimientos: new Set<number>(), cancelacionesRelacionadas: 0 }],
    ]);

    let totalIncidentes = 0;
    let incidentesAbiertos = 0;
    let incidentesResueltos = 0;
    let incidentesCerrados = 0;
    let cancelacionesRelacionadas = 0;
    const movimientosConIncidente = new Set<number>();
    const detalle: IncidentesReporte['detalle'] = [];

    const touchVia = (via: MovimientoBase['viaOrigen'], m: MovimientoBase, incCount: number, canceladoRelacionado: boolean) => {
      const key = via ? String(via.id) : 'sin-via';
      const row = porVia.get(key) ?? {
        viaId: via?.id ?? null,
        via: via?.nombre ?? 'Sin via',
        localidad: via?.localidad?.nombre ?? m.localidad.nombre,
        incidentes: 0,
        movimientos: new Set<number>(),
        cancelacionesRelacionadas: 0,
      };
      row.incidentes += incCount;
      row.movimientos.add(m.id);
      if (canceladoRelacionado) row.cancelacionesRelacionadas += 1;
      porVia.set(key, row);
    };

    for (const m of movimientos) {
      if (!m.incidentes.length) continue;
      const info = movimientoInfo(m, meta.tz, meta.umbralMin);
      const canceladoRelacionado = info.cancelado && m.incidentes.length > 0;
      totalIncidentes += m.incidentes.length;
      movimientosConIncidente.add(m.id);
      if (canceladoRelacionado) cancelacionesRelacionadas += 1;

      const loco = porLocomotora.get(m.locomotiveNumber) ?? {
        incidentes: 0,
        movimientos: new Set<number>(),
        cancelacionesRelacionadas: 0,
      };
      loco.incidentes += m.incidentes.length;
      loco.movimientos.add(m.id);
      if (canceladoRelacionado) loco.cancelacionesRelacionadas += 1;
      porLocomotora.set(m.locomotiveNumber, loco);

      const viasRelacionadas = movimientoViaRefs(m);
      if (viasRelacionadas.length) {
        for (const via of viasRelacionadas) {
          touchVia(via, m, m.incidentes.length, canceladoRelacionado);
        }
      } else {
        touchVia(null, m, m.incidentes.length, canceladoRelacionado);
      }

      const turno = porTurno.get(info.turno.turnoId)!;
      turno.incidentes += m.incidentes.length;
      turno.movimientos.add(m.id);
      if (canceladoRelacionado) turno.cancelacionesRelacionadas += 1;

      for (const inc of m.incidentes) {
        const st = String(inc.estado);
        if (st === 'ABIERTO') incidentesAbiertos += 1;
        if (st === 'RESUELTO') incidentesResueltos += 1;
        if (st === 'CERRADO') incidentesCerrados += 1;
        if (detalle.length < detalleLimit) {
          detalle.push({
            incidenteId: inc.id,
            movimientoId: m.id,
            locomotiveNumber: m.locomotiveNumber,
            estadoIncidente: st,
            estadoMovimiento: info.estado,
            fechaIncidenteMX: dateTimeMX(inc.fechaInicio, meta.tz) ?? '',
            viaOrigen: displayViaOrigen(m),
            viaDestino: displayViaDestino(m),
            turnoLabel: info.turno.turnoLabel,
            usuario: inc.usuario?.nombre ?? null,
            descripcion: inc.descripcion,
          });
        }
      }
    }

    return {
      meta,
      resumen: {
        totalIncidentes,
        movimientosConIncidente: movimientosConIncidente.size,
        incidentesAbiertos,
        incidentesResueltos,
        incidentesCerrados,
        cancelacionesRelacionadas,
      },
      porLocomotora: sortedTop(
        Array.from(porLocomotora.entries()).map(([locomotiveNumber, r]) => ({
          locomotiveNumber,
          incidentes: r.incidentes,
          movimientos: r.movimientos.size,
          cancelacionesRelacionadas: r.cancelacionesRelacionadas,
        })),
        (row) => row.incidentes,
        (row) => row.locomotiveNumber
      ),
      porVia: sortedTop(
        Array.from(porVia.values()).map((r) => ({
          viaId: r.viaId,
          via: r.via,
          localidad: r.localidad,
          incidentes: r.incidentes,
          movimientos: r.movimientos.size,
          cancelacionesRelacionadas: r.cancelacionesRelacionadas,
        })),
        (row) => row.incidentes,
        (row) => row.via
      ),
      porTurno: Array.from(porTurno.values()).map((r) => ({
        turnoId: r.turnoId,
        turnoLabel: r.turnoLabel,
        turnoRango: r.turnoRango,
        incidentes: r.incidentes,
        movimientos: r.movimientos.size,
        cancelacionesRelacionadas: r.cancelacionesRelacionadas,
      })),
      detalle,
      detalleMeta: { totalIncidentes, incluidos: detalle.length, limit: detalleLimit, truncado: detalle.length < totalIncidentes },
    };
  }

  static async cronologia(filters: ClienteReportFilters): Promise<CronologiaReporte> {
    const { meta, movimientos } = await loadBase(filters);
    const pageSize = Math.min(100, Math.max(10, Number(filters.pageSize ?? filters.detalleLimit ?? 25)));
    const totalMovimientos = movimientos.length;
    const totalPages = Math.max(1, Math.ceil(totalMovimientos / pageSize));
    const requestedPage = Math.max(1, Number(filters.page ?? 1));
    const page = Math.min(requestedPage, totalPages);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const rows = movimientos.slice(start, end).map((m) => {
      const info = movimientoInfo(m, meta.tz, meta.umbralMin);
      const linea = ['SOLICITADO'];
      if (m.fechaInicio) linea.push('INICIADO');
      if (['DETENIDO', 'ESPERA', 'MODIFICADO'].includes(info.estado)) linea.push(info.estado);
      if (['CONCLUIDO', 'CANCELADO'].includes(info.estado)) linea.push(info.estado);

      return {
        id: m.id,
        locomotiveNumber: m.locomotiveNumber,
        estadoActual: info.estado,
        localidad: m.localidad.nombre,
        viaOrigen: displayViaOrigen(m),
        viaDestino: displayViaDestino(m),
        servicio: servicioLabel(m.torno, m.lavado),
        prioridad: String(m.prioridad),
        solicitadoPor: m.creadoPor.nombre,
        operador: m.operador?.nombre ?? null,
        fechaSolicitud: dateOnly(m.fechaSolicitud, meta.tz) ?? '',
        fechaInicio: dateOnly(m.fechaInicio, meta.tz),
        fechaFin: dateOnly(m.fechaFin, meta.tz),
        fechaActualizacion: dateOnly(m.updatedAt, meta.tz) ?? '',
        incidentes: m.incidentes.length,
        canceladoConIncidente: info.cancelado && m.incidentes.length > 0,
        linea,
      };
    });

    return {
      meta,
      movimientos: rows,
      detalleMeta: {
        totalMovimientos,
        incluidos: rows.length,
        limit: pageSize,
        truncado: totalMovimientos > rows.length,
        page,
        pageSize,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
        from: totalMovimientos ? start + 1 : 0,
        to: Math.min(end, totalMovimientos),
      },
    };
  }
}

function buildTurnos(meta: ReportMeta, movimientos: MovimientoBase[]): TurnosReporte['turnos'] {
  type TurnAgg = {
    turnoId: 'T1' | 'T2' | 'T3';
    turnoLabel: string;
    turnoRango: string;
    solicitados: number;
    iniciados: number;
    finalizados: number;
    conInicioFin: number;
    cancelados: number;
    incidentes: number;
    demorados: number;
    ejecucion: number[];
    atencion: number[];
  };

  const turnos = new Map<'T1' | 'T2' | 'T3', TurnAgg>([
    ['T1', { turnoId: 'T1', turnoLabel: 'Turno 1', turnoRango: '07:00-15:00', solicitados: 0, iniciados: 0, finalizados: 0, conInicioFin: 0, cancelados: 0, incidentes: 0, demorados: 0, ejecucion: [], atencion: [] }],
    ['T2', { turnoId: 'T2', turnoLabel: 'Turno 2', turnoRango: '15:00-23:00', solicitados: 0, iniciados: 0, finalizados: 0, conInicioFin: 0, cancelados: 0, incidentes: 0, demorados: 0, ejecucion: [], atencion: [] }],
    ['T3', { turnoId: 'T3', turnoLabel: 'Turno 3', turnoRango: '23:00-07:00', solicitados: 0, iniciados: 0, finalizados: 0, conInicioFin: 0, cancelados: 0, incidentes: 0, demorados: 0, ejecucion: [], atencion: [] }],
  ]);

  for (const m of movimientos) {
    const info = movimientoInfo(m, meta.tz, meta.umbralMin);
    const row = turnos.get(info.turno.turnoId)!;
    row.solicitados += 1;
    if (m.fechaInicio) row.iniciados += 1;
    if (info.finalizado) row.finalizados += 1;
    if (info.conInicioFin) row.conInicioFin += 1;
    if (info.cancelado) row.cancelados += 1;
    if (info.demorados) row.demorados += 1;
    row.incidentes += info.incidentes;
    if (info.ejecucionMin !== null) row.ejecucion.push(info.ejecucionMin);
    if (info.atencionMin !== null) row.atencion.push(info.atencionMin);
  }

  return Array.from(turnos.values()).map((t) => ({
    turnoId: t.turnoId,
    turnoLabel: t.turnoLabel,
    turnoRango: t.turnoRango,
    solicitados: t.solicitados,
    iniciados: t.iniciados,
    finalizados: t.finalizados,
    conInicioFin: t.conInicioFin,
    conInicioFinPct: pct(t.conInicioFin, t.solicitados),
    cancelados: t.cancelados,
    incidentes: t.incidentes,
    demorados: t.demorados,
    promEjecucionMin: avg(t.ejecucion),
    promAtencionMin: avg(t.atencion),
  }));
}
