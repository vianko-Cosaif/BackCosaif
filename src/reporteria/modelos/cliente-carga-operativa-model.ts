// reporteria/modelos/cliente-carga-operativa-model.ts
// Reporte de carga operativa por empresa: frecuencia, vias, dias, horas y locomotoras.

import { DateTime } from 'luxon';
import { PrismaClient } from '@prisma/client';

export type PeriodoCarga = 'DIA' | 'SEMANA' | 'QUINCENA' | 'MES' | 'BIMESTRE' | 'SEMESTRE' | 'ANUAL';

export type ClienteCargaFilters = {
  fecha: string;
  periodo: PeriodoCarga;
  empresaId: number;
  tz?: string;
  localidadId?: number;
  detalleLimit?: number;
};

export type EstadoCounts = Record<
  'SOLICITADO' | 'EN_PROCESO' | 'DETENIDO' | 'ESPERA' | 'MODIFICADO' | 'CONCLUIDO' | 'CANCELADO' | 'AGENDADO',
  number
>;

export type ServicioCounts = {
  torno: number;
  lavado: number;
  tornoLavado: number;
  sinServicio: number;
};

export type LocomotoraCargaRow = {
  locomotiveNumber: number;
  movimientos: number;
  viasUsadas: number;
  diasActivos: number;
  estados: EstadoCounts;
};

export type ViaCargaRow = {
  viaId: number;
  via: string;
  localidad: string;
  totalUsos: number;
  movimientosRelacionados: number;
  comoOrigen: number;
  comoDestino: number;
  locomotorasUnicas: number;
  diasActivos: number;
  cargaRelativaPct: number;
};

export type UsuarioCargaRow = {
  usuarioId: number;
  nombre: string;
  rol: string;
  solicitudes: number;
  locomotorasUnicas: number;
  viasRelacionadas: number;
  estados: EstadoCounts;
};

export type DiaCargaRow = {
  fecha: string;
  diaSemana: string;
  movimientos: number;
  locomotorasUnicas: number;
  viasRelacionadas: number;
};

export type HoraCargaRow = {
  hora: number;
  label: string;
  movimientos: number;
  pct: number;
};

export type DiaSemanaCargaRow = {
  dia: string;
  movimientos: number;
  pct: number;
};

export type TurnoCargaRow = {
  turnoId: 'T1' | 'T2' | 'T3';
  turnoLabel: string;
  turnoRango: string;
  movimientos: number;
  pct: number;
};

export type MatrizDiaHoraRow = {
  dia: string;
  total: number;
  horas: number[];
};

export type MovimientoCargaDetalle = {
  id: number;
  locomotiveNumber: number;
  estado: string;
  prioridad: string;
  fechaSolicitudMX: string;
  fecha: string;
  hora: number;
  diaSemana: string;
  turnoLabel: string;
  localidad: string;
  viaOrigen: string | null;
  viaDestino: string | null;
  servicio: string;
  solicitadoPor: string;
};

export type ReporteClienteCargaOperativa = {
  meta: {
    periodo: PeriodoCarga;
    etiqueta: string;
    periodoLabel: string;
    fechaLocal: string;
    tz: string;
    empresaId: number;
    empresaNombre: string | null;
    localidadId?: number;
    rangoUTC: { desde: string; hastaExclusivo: string };
    rangoLocal: { desde: string; hastaExclusivo: string };
    rangoTexto: string;
  };
  resumen: {
    totalMovimientos: number;
    totalLocomotoras: number;
    totalVias: number;
    totalUsuariosSolicitantes: number;
    totalLocalidades: number;
    conViaOrigen: number;
    conViaDestino: number;
    estados: EstadoCounts;
    servicios: ServicioCounts;
    diaPico: { fecha: string; movimientos: number } | null;
    horaPico: { hora: number; label: string; movimientos: number } | null;
    viaMasCargada: { via: string; movimientos: number } | null;
    locomotoraMasMovida: { locomotiveNumber: number; movimientos: number } | null;
  };
  locomotoras: LocomotoraCargaRow[];
  vias: ViaCargaRow[];
  usuariosSolicitantes: UsuarioCargaRow[];
  movimientosPorDia: DiaCargaRow[];
  movimientosPorHora: HoraCargaRow[];
  movimientosPorDiaSemana: DiaSemanaCargaRow[];
  movimientosPorTurno: TurnoCargaRow[];
  matrizDiaHora: MatrizDiaHoraRow[];
  detalle: MovimientoCargaDetalle[];
  detalleMeta: {
    totalMovimientos: number;
    incluidos: number;
    limit: number;
    truncado: boolean;
  };
};

const MX_TZ = 'America/Mexico_City';

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

const DIAS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

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

function parseFechaLocal(fechaLocal: string, tz: string) {
  const dt = DateTime.fromISO(fechaLocal, { zone: tz });
  if (!dt.isValid) throw new Error('Fecha invalida, usa YYYY-MM-DD');
  return dt;
}

export function normalizarPeriodoCarga(periodo: unknown): PeriodoCarga {
  const v = String(periodo ?? '').trim().toUpperCase();
  const validos: PeriodoCarga[] = ['DIA', 'SEMANA', 'QUINCENA', 'MES', 'BIMESTRE', 'SEMESTRE', 'ANUAL'];
  return validos.includes(v as PeriodoCarga) ? (v as PeriodoCarga) : 'MES';
}

function rangoPeriodoCarga(fechaLocal: string, tz: string, periodo: PeriodoCarga) {
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

  return {
    anchor,
    startLocal,
    endLocal,
    startUTC: startLocal.toUTC(),
    endUTC: endLocal.toUTC(),
  };
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

function turnoFromHour(hour: number): TurnoCargaRow {
  if (hour >= 7 && hour < 15) {
    return { turnoId: 'T1', turnoLabel: 'Turno 1', turnoRango: '07:00-15:00', movimientos: 0, pct: 0 };
  }
  if (hour >= 15 && hour < 23) {
    return { turnoId: 'T2', turnoLabel: 'Turno 2', turnoRango: '15:00-23:00', movimientos: 0, pct: 0 };
  }
  return { turnoId: 'T3', turnoLabel: 'Turno 3', turnoRango: '23:00-07:00', movimientos: 0, pct: 0 };
}

function servicioLabel(torno?: boolean | null, lavado?: boolean | null) {
  if (torno && lavado) return 'Torno + Lavado';
  if (torno) return 'Torno';
  if (lavado) return 'Lavado';
  return 'Sin servicio';
}

type ReportViaRef = { id: number; nombre: string; localidad?: { nombre: string } | null };
type ServiceViaCarrier = {
  localidad: { id: number; nombre: string };
  viaOrigen?: ReportViaRef | null;
  viaDestino?: ReportViaRef | null;
  torno?: boolean | null;
  lavado?: boolean | null;
};

function serviceRouteLabel(m: ServiceViaCarrier) {
  if (m.torno && m.lavado) return 'Torno + Lavado';
  if (m.torno) return 'Torno';
  if (m.lavado) return 'Lavado';
  return null;
}

function serviceViaRefs(m: ServiceViaCarrier): ReportViaRef[] {
  const localidadId = Math.abs(Number(m.localidad.id) || 0);
  const localidad = { nombre: m.localidad.nombre };
  const refs: ReportViaRef[] = [];
  if (m.torno) refs.push({ id: -1000000 - localidadId * 10 - 1, nombre: 'Torno', localidad });
  if (m.lavado) refs.push({ id: -1000000 - localidadId * 10 - 2, nombre: 'Lavado', localidad });
  return refs;
}

function movimientoViaRefs(m: ServiceViaCarrier): ReportViaRef[] {
  return [m.viaOrigen, m.viaDestino, ...serviceViaRefs(m)].filter((via): via is ReportViaRef => !!via);
}

function serviceSide(m: ServiceViaCarrier): 'origen' | 'destino' | 'servicio' {
  if (!m.viaOrigen && m.viaDestino) return 'origen';
  if (m.viaOrigen && !m.viaDestino) return 'destino';
  return 'servicio';
}

function displayViaOrigen(m: ServiceViaCarrier) {
  return m.viaOrigen?.nombre ?? (!m.viaOrigen && m.viaDestino ? serviceRouteLabel(m) : null);
}

function displayViaDestino(m: ServiceViaCarrier) {
  return m.viaDestino?.nombre ?? (m.viaOrigen && !m.viaDestino ? serviceRouteLabel(m) : null);
}

function pct(n: number, total: number) {
  return total ? Math.round((n / total) * 100) : 0;
}

function addEstado(counts: EstadoCounts, estado: string | null | undefined) {
  const key = String(estado ?? '') as keyof EstadoCounts;
  if (counts[key] !== undefined) counts[key] += 1;
}

function sortedTop<T>(rows: T[], getValue: (row: T) => number, secondary?: (row: T) => string | number) {
  return rows.sort((a, b) => {
    const diff = getValue(b) - getValue(a);
    if (diff) return diff;
    const sa = secondary?.(a);
    const sb = secondary?.(b);
    return String(sa ?? '').localeCompare(String(sb ?? ''));
  });
}

export class ClienteCargaOperativaModel {
  static async reporte(filters: ClienteCargaFilters): Promise<ReporteClienteCargaOperativa> {
    const tz = filters.tz ?? MX_TZ;
    const detalleLimit = Math.min(1000, Math.max(0, Number(filters.detalleLimit ?? 500)));
    const { anchor, startLocal, endLocal, startUTC, endUTC } = rangoPeriodoCarga(filters.fecha, tz, filters.periodo);

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
        fechaSolicitud: true,
        torno: true,
        lavado: true,
        localidad: { select: { id: true, nombre: true } },
        viaOrigen: { select: { id: true, nombre: true, localidad: { select: { nombre: true } } } },
        viaDestino: { select: { id: true, nombre: true, localidad: { select: { nombre: true } } } },
        creadoPor: { select: { id: true, nombre: true, rol: true } },
      },
    });

    type ViaAgg = {
      viaId: number;
      via: string;
      localidad: string;
      totalUsos: number;
      movimientos: Set<number>;
      comoOrigen: number;
      comoDestino: number;
      locomotoras: Set<number>;
      dias: Set<string>;
    };

    type LocoAgg = {
      locomotiveNumber: number;
      movimientos: number;
      vias: Set<number>;
      dias: Set<string>;
      estados: EstadoCounts;
    };

    type UserAgg = {
      usuarioId: number;
      nombre: string;
      rol: string;
      solicitudes: number;
      locomotoras: Set<number>;
      vias: Set<number>;
      estados: EstadoCounts;
    };

    type DayAgg = {
      fecha: string;
      diaSemana: string;
      movimientos: number;
      locomotoras: Set<number>;
      vias: Set<number>;
    };

    const estados = initEstadoCounts();
    const servicios: ServicioCounts = { torno: 0, lavado: 0, tornoLavado: 0, sinServicio: 0 };
    const locos = new Map<number, LocoAgg>();
    const vias = new Map<number, ViaAgg>();
    const users = new Map<number, UserAgg>();
    const dias = new Map<string, DayAgg>();
    const localidades = new Set<number>();
    const hourCounts = Array.from({ length: 24 }, () => 0);
    const dayWeekCounts = new Map<string, number>(DIAS.map((d) => [d, 0]));
    const matrix = new Map<string, number[]>(DIAS.map((d) => [d, Array.from({ length: 24 }, () => 0)]));
    const turnos = new Map<'T1' | 'T2' | 'T3', TurnoCargaRow>([
      ['T1', { turnoId: 'T1', turnoLabel: 'Turno 1', turnoRango: '07:00-15:00', movimientos: 0, pct: 0 }],
      ['T2', { turnoId: 'T2', turnoLabel: 'Turno 2', turnoRango: '15:00-23:00', movimientos: 0, pct: 0 }],
      ['T3', { turnoId: 'T3', turnoLabel: 'Turno 3', turnoRango: '23:00-07:00', movimientos: 0, pct: 0 }],
    ]);

    let conViaOrigen = 0;
    let conViaDestino = 0;

    const touchVia = (
      via: { id: number; nombre: string; localidad?: { nombre: string } | null } | null,
      movimientoId: number,
      locomotiveNumber: number,
      dia: string,
      tipo: 'origen' | 'destino' | 'servicio'
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
          comoOrigen: 0,
          comoDestino: 0,
          locomotoras: new Set<number>(),
          dias: new Set<string>(),
        };
        vias.set(via.id, agg);
      }
      agg.totalUsos += 1;
      agg.movimientos.add(movimientoId);
      agg.locomotoras.add(locomotiveNumber);
      agg.dias.add(dia);
      if (tipo === 'origen') agg.comoOrigen += 1;
      if (tipo === 'destino') agg.comoDestino += 1;
    };

    const detalle: MovimientoCargaDetalle[] = [];

    for (const m of movimientos) {
      const dt = DateTime.fromJSDate(m.fechaSolicitud, { zone: tz });
      const fecha = dt.toFormat('yyyy-LL-dd');
      const hora = dt.hour;
      const diaSemana = DIAS[dt.weekday - 1] ?? '—';
      const turno = turnoFromHour(hora);
      const estado = String(m.estado);
      const loco = Number(m.locomotiveNumber);
      const torno = !!m.torno;
      const lavado = !!m.lavado;
      const viasRelacionadas = movimientoViaRefs(m);
      const viaIds = viasRelacionadas.map((via) => via.id);

      localidades.add(m.localidad.id);
      addEstado(estados, estado);
      if (torno) servicios.torno += 1;
      if (lavado) servicios.lavado += 1;
      if (torno && lavado) servicios.tornoLavado += 1;
      if (!torno && !lavado) servicios.sinServicio += 1;
      if (m.viaOrigen) conViaOrigen += 1;
      if (m.viaDestino) conViaDestino += 1;

      let locoAgg = locos.get(loco);
      if (!locoAgg) {
        locoAgg = { locomotiveNumber: loco, movimientos: 0, vias: new Set<number>(), dias: new Set<string>(), estados: initEstadoCounts() };
        locos.set(loco, locoAgg);
      }
      locoAgg.movimientos += 1;
      locoAgg.dias.add(fecha);
      for (const viaId of viaIds) locoAgg.vias.add(viaId);
      addEstado(locoAgg.estados, estado);

      let userAgg = users.get(m.creadoPor.id);
      if (!userAgg) {
        userAgg = {
          usuarioId: m.creadoPor.id,
          nombre: m.creadoPor.nombre,
          rol: String(m.creadoPor.rol),
          solicitudes: 0,
          locomotoras: new Set<number>(),
          vias: new Set<number>(),
          estados: initEstadoCounts(),
        };
        users.set(m.creadoPor.id, userAgg);
      }
      userAgg.solicitudes += 1;
      userAgg.locomotoras.add(loco);
      for (const viaId of viaIds) userAgg.vias.add(viaId);
      addEstado(userAgg.estados, estado);

      let dayAgg = dias.get(fecha);
      if (!dayAgg) {
        dayAgg = { fecha, diaSemana, movimientos: 0, locomotoras: new Set<number>(), vias: new Set<number>() };
        dias.set(fecha, dayAgg);
      }
      dayAgg.movimientos += 1;
      dayAgg.locomotoras.add(loco);
      for (const viaId of viaIds) dayAgg.vias.add(viaId);

      hourCounts[hora] += 1;
      dayWeekCounts.set(diaSemana, (dayWeekCounts.get(diaSemana) ?? 0) + 1);
      matrix.get(diaSemana)![hora] += 1;
      turnos.get(turno.turnoId)!.movimientos += 1;

      touchVia(m.viaOrigen, m.id, loco, fecha, 'origen');
      touchVia(m.viaDestino, m.id, loco, fecha, 'destino');
      for (const viaServicio of serviceViaRefs(m)) {
        touchVia(viaServicio, m.id, loco, fecha, serviceSide(m));
      }

      if (detalle.length < detalleLimit) {
        detalle.push({
          id: m.id,
          locomotiveNumber: loco,
          estado,
          prioridad: String(m.prioridad),
          fechaSolicitudMX: dt.toFormat('yyyy-LL-dd HH:mm'),
          fecha,
          hora,
          diaSemana,
          turnoLabel: turno.turnoLabel,
          localidad: m.localidad.nombre,
          viaOrigen: displayViaOrigen(m),
          viaDestino: displayViaDestino(m),
          servicio: servicioLabel(m.torno, m.lavado),
          solicitadoPor: m.creadoPor.nombre,
        });
      }
    }

    const totalMovimientos = movimientos.length;
    const locomotoras = sortedTop(
      Array.from(locos.values()).map((l) => ({
        locomotiveNumber: l.locomotiveNumber,
        movimientos: l.movimientos,
        viasUsadas: l.vias.size,
        diasActivos: l.dias.size,
        estados: l.estados,
      })),
      (row) => row.movimientos,
      (row) => row.locomotiveNumber
    );

    const maxViaUsos = Math.max(1, ...Array.from(vias.values()).map((v) => v.totalUsos));
    const viasRows = sortedTop(
      Array.from(vias.values()).map((v) => ({
        viaId: v.viaId,
        via: v.via,
        localidad: v.localidad,
        totalUsos: v.totalUsos,
        movimientosRelacionados: v.movimientos.size,
        comoOrigen: v.comoOrigen,
        comoDestino: v.comoDestino,
        locomotorasUnicas: v.locomotoras.size,
        diasActivos: v.dias.size,
        cargaRelativaPct: Math.round((v.totalUsos / maxViaUsos) * 100),
      })),
      (row) => row.totalUsos,
      (row) => row.via
    );

    const usuariosSolicitantes = sortedTop(
      Array.from(users.values()).map((u) => ({
        usuarioId: u.usuarioId,
        nombre: u.nombre,
        rol: u.rol,
        solicitudes: u.solicitudes,
        locomotorasUnicas: u.locomotoras.size,
        viasRelacionadas: u.vias.size,
        estados: u.estados,
      })),
      (row) => row.solicitudes,
      (row) => row.nombre
    );

    const movimientosPorDia = Array.from(dias.values())
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((d) => ({
        fecha: d.fecha,
        diaSemana: d.diaSemana,
        movimientos: d.movimientos,
        locomotorasUnicas: d.locomotoras.size,
        viasRelacionadas: d.vias.size,
      }));

    const movimientosPorHora = hourCounts.map((movimientos, hora) => ({
      hora,
      label: `${String(hora).padStart(2, '0')}:00`,
      movimientos,
      pct: pct(movimientos, totalMovimientos),
    }));

    const movimientosPorDiaSemana = DIAS.map((dia) => {
      const movimientos = dayWeekCounts.get(dia) ?? 0;
      return { dia, movimientos, pct: pct(movimientos, totalMovimientos) };
    });

    const movimientosPorTurno = Array.from(turnos.values()).map((t) => ({
      ...t,
      pct: pct(t.movimientos, totalMovimientos),
    }));

    const matrizDiaHora = DIAS.map((dia) => {
      const horas = matrix.get(dia) ?? Array.from({ length: 24 }, () => 0);
      return { dia, total: horas.reduce((acc, n) => acc + n, 0), horas };
    });

    const diaPico = movimientosPorDia.length
      ? sortedTop([...movimientosPorDia], (row) => row.movimientos, (row) => row.fecha)[0]
      : null;
    const horaPico = movimientosPorHora.length
      ? sortedTop([...movimientosPorHora], (row) => row.movimientos, (row) => row.hora)[0]
      : null;
    const viaMasCargada = viasRows[0] ? { via: viasRows[0].via, movimientos: viasRows[0].totalUsos } : null;
    const locomotoraMasMovida = locomotoras[0]
      ? { locomotiveNumber: locomotoras[0].locomotiveNumber, movimientos: locomotoras[0].movimientos }
      : null;

    const label = periodoLabel(filters.periodo, anchor, startLocal);

    return {
      meta: {
        periodo: filters.periodo,
        etiqueta: `Carga_${filters.periodo}_${filters.empresaId}_${startLocal.toFormat('yyyyLLdd')}`,
        periodoLabel: label,
        fechaLocal: filters.fecha,
        tz,
        empresaId: filters.empresaId,
        empresaNombre: empresa.nombre,
        localidadId: filters.localidadId,
        rangoUTC: { desde: startUTC.toISO()!, hastaExclusivo: endUTC.toISO()! },
        rangoLocal: { desde: startLocal.toISO()!, hastaExclusivo: endLocal.toISO()! },
        rangoTexto: rangoTexto(startLocal, endLocal),
      },
      resumen: {
        totalMovimientos,
        totalLocomotoras: locos.size,
        totalVias: vias.size,
        totalUsuariosSolicitantes: users.size,
        totalLocalidades: localidades.size,
        conViaOrigen,
        conViaDestino,
        estados,
        servicios,
        diaPico: diaPico ? { fecha: diaPico.fecha, movimientos: diaPico.movimientos } : null,
        horaPico: horaPico ? { hora: horaPico.hora, label: horaPico.label, movimientos: horaPico.movimientos } : null,
        viaMasCargada,
        locomotoraMasMovida,
      },
      locomotoras,
      vias: viasRows,
      usuariosSolicitantes,
      movimientosPorDia,
      movimientosPorHora,
      movimientosPorDiaSemana,
      movimientosPorTurno,
      matrizDiaHora,
      detalle,
      detalleMeta: {
        totalMovimientos,
        incluidos: detalle.length,
        limit: detalleLimit,
        truncado: detalle.length < totalMovimientos,
      },
    };
  }
}
