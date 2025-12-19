import { DateTime } from 'luxon';
import { prisma } from '../../prisma';

export type PeriodoReporte = 'DIA' | 'MES' | 'BIMESTRE' | 'SEMESTRE' | 'ANUAL';

export type ReportePeriodoFilters = {
  /**
   * Fecha “ancla” en horario MX.
   * - DIA: usa ese día
   * - MES/BIMESTRE/SEMESTRE/ANUAL: usa el periodo donde cae esa fecha
   */
  fecha: string; // 'YYYY-MM-DD'
  tz?: string; // default America/Mexico_City
  localidadId?: number;
  empresaId?: number;
};

// Backwards compatibility si ya tenías el nombre viejo:
export type ReporteDiaFilters = ReportePeriodoFilters;

/**
 * Incidente real: sale de Incidente por movimientoId.
 * No se usa movimiento.incidenteGlobal para reportes.
 */
export type IncidenteMini = {
  id: number;
  estado: 'ABIERTO' | 'CERRADO' | 'RESUELTO';
  descripcion: string;
  fechaInicio: string; // ISO UTC
  fechaFin: string | null; // ISO UTC
  usuarioId: number;
  usuarioNombre: string;
  usuarioRol: string;
};

export type MovimientoPeriodoRow = {
  id: number;

  empresaId: number;
  empresa: string;

  localidadId: number;
  localidad: string;

  estado: string; // EstadoMovimiento
  locomotiveNumber: number;

  fechaSolicitud: string; // ISO UTC
  fechaInicio: string | null;
  fechaFin: string | null;

  clienteId: number | null;
  clienteNombre: string | null;

  operadorId: number | null; // operador = maquinista (según tu operación)
  operadorNombre: string | null;

  incidentes: IncidenteMini[];
  incidentePendiente: boolean;
};

export type ReportePeriodo = {
  meta: {
    periodo: PeriodoReporte;
    etiqueta: string; // para nombre de archivo/impresión
    fechaLocal: string; // ancla (lo que te mandaron)
    tz: string;
    rangoUTC: { desde: string; hastaExclusivo: string };
    rangoLocal: { desde: string; hastaExclusivo: string };
  };
  resumen: {
    totalMovimientos: number;
    movimientosPorEstado: Record<string, number>;

    totalIncidentes: number;
    incidentesPorEstado: Record<string, number>;

    porEmpresa: Array<{
      empresaId: number;
      empresa: string;

      totalMovimientos: number;
      movimientosPorEstado: Record<string, number>;

      totalIncidentes: number;
      incidentesPorEstado: Record<string, number>;

      movimientosConIncidenteAbierto: number;
    }>;
  };
  movimientos: MovimientoPeriodoRow[];
};

// Alias para no romper imports existentes
export type ReporteDia = ReportePeriodo;
export type MovimientoDiaRow = MovimientoPeriodoRow;

function inc(map: Record<string, number>, key: string, n = 1) {
  map[key] = (map[key] ?? 0) + n;
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
  if (periodo === 'MES') return dtLocal.toFormat('yyyy-LL');

  if (periodo === 'BIMESTRE') {
    const b = Math.floor((m - 1) / 2) + 1; // 1..6
    return `${y}-B${String(b).padStart(2, '0')}`;
  }

  if (periodo === 'SEMESTRE') {
    const s = m <= 6 ? 1 : 2;
    return `${y}-S${s}`;
  }

  // ANUAL
  return `${y}`;
}

/**
 * Regresa rango [startLocal, endLocal) y su versión UTC.
 * Nota: usamos fin exclusivo para no andar peleando con 23:59:59.999.
 */
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
    case 'MES': {
      startLocal = anchor.startOf('month').startOf('day');
      endLocal = startLocal.plus({ months: 1 });
      break;
    }
    case 'BIMESTRE': {
      const bIndex = Math.floor((anchor.month - 1) / 2); // 0..5
      const startMonth = bIndex * 2 + 1; // 1,3,5,7,9,11
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

  const startUTC = startLocal.toUTC();
  const endUTC = endLocal.toUTC();

  return { anchor, startLocal, endLocal, startUTC, endUTC };
}

export class ReporteriaMovimientoModel {
  /**
   * Motor único: arma reporte para cualquier periodo.
   */
  static async reportePorPeriodo(
    filters: ReportePeriodoFilters,
    periodo: PeriodoReporte
  ): Promise<ReportePeriodo> {
    const tz = filters.tz ?? 'America/Mexico_City';
    const { anchor, startLocal, endLocal, startUTC, endUTC } = rangoPeriodoUTC(
      filters.fecha,
      tz,
      periodo
    );

    // 1) Movimientos del periodo (por fechaSolicitud) + nombres de involucrados
    // operador = maquinista (tu operación) porque el schema no trae maquinistaId
    const movimientos = await prisma.movimiento.findMany({
      where: {
        ...(filters.localidadId ? { localidadId: filters.localidadId } : {}),
        ...(filters.empresaId ? { empresaId: filters.empresaId } : {}),
        fechaSolicitud: {
          gte: startUTC.toJSDate(),
          lt: endUTC.toJSDate(), // fin exclusivo
        },
      },
      orderBy: [{ fechaSolicitud: 'asc' }],
      select: {
        id: true,
        empresaId: true,
        localidadId: true,
        estado: true,
        locomotiveNumber: true,
        fechaSolicitud: true,
        fechaInicio: true,
        fechaFin: true,

        empresa: { select: { nombre: true } },
        localidad: { select: { nombre: true } },

        clienteId: true,
        cliente: { select: { nombre: true } },

        operadorId: true,
        operador: { select: { nombre: true } },
      },
    });

    const movimientoIds = movimientos.map((m) => m.id);

    // 2) Incidentes por movimientoId (la verdad)
    const incidentes = movimientoIds.length
      ? await prisma.incidente.findMany({
          where: { movimientoId: { in: movimientoIds } },
          orderBy: [{ id: 'asc' }],
          select: {
            id: true,
            movimientoId: true,
            estado: true,
            descripcion: true,
            fechaInicio: true,
            fechaFin: true,
            usuarioId: true,
            usuario: { select: { nombre: true, rol: true } },
          },
        })
      : [];

    const incidentesPorMovimiento = new Map<number, IncidenteMini[]>();
    for (const i of incidentes) {
      const arr = incidentesPorMovimiento.get(i.movimientoId) ?? [];
      arr.push({
        id: i.id,
        estado: i.estado,
        descripcion: i.descripcion,
        fechaInicio: i.fechaInicio.toISOString(),
        fechaFin: i.fechaFin ? i.fechaFin.toISOString() : null,
        usuarioId: i.usuarioId,
        usuarioNombre: i.usuario?.nombre ?? '—',
        usuarioRol: String(i.usuario?.rol ?? '—'),
      });
      incidentesPorMovimiento.set(i.movimientoId, arr);
    }

    // 3) Rows para export
    const movimientosRows: MovimientoPeriodoRow[] = movimientos.map((m) => {
      const incs = incidentesPorMovimiento.get(m.id) ?? [];
      const pendiente = incs.some((x) => x.estado === 'ABIERTO');

      return {
        id: m.id,

        empresaId: m.empresaId,
        empresa: m.empresa?.nombre ?? '—',

        localidadId: m.localidadId,
        localidad: m.localidad?.nombre ?? '—',

        estado: m.estado,
        locomotiveNumber: m.locomotiveNumber,

        fechaSolicitud: m.fechaSolicitud.toISOString(),
        fechaInicio: m.fechaInicio ? m.fechaInicio.toISOString() : null,
        fechaFin: m.fechaFin ? m.fechaFin.toISOString() : null,

        clienteId: m.clienteId ?? null,
        clienteNombre: m.cliente?.nombre ?? null,

        operadorId: m.operadorId ?? null,
        operadorNombre: m.operador?.nombre ?? null,

        incidentes: incs,
        incidentePendiente: pendiente,
      };
    });

    // 4) Resúmenes (para gráficas)
    const movimientosPorEstado: Record<string, number> = {};
    const incidentesPorEstado: Record<string, number> = {};
    const porEmpresaMap = new Map<number, any>();

    for (const r of movimientosRows) {
      inc(movimientosPorEstado, r.estado);

      let emp = porEmpresaMap.get(r.empresaId);
      if (!emp) {
        emp = {
          empresaId: r.empresaId,
          empresa: r.empresa,
          totalMovimientos: 0,
          movimientosPorEstado: {} as Record<string, number>,
          totalIncidentes: 0,
          incidentesPorEstado: {} as Record<string, number>,
          movimientosConIncidenteAbierto: 0,
        };
        porEmpresaMap.set(r.empresaId, emp);
      }

      emp.totalMovimientos++;
      inc(emp.movimientosPorEstado, r.estado);

      if (r.incidentes.length) {
        emp.totalIncidentes += r.incidentes.length;
        for (const i of r.incidentes) {
          inc(emp.incidentesPorEstado, i.estado);
          inc(incidentesPorEstado, i.estado);
        }
      }

      if (r.incidentePendiente) emp.movimientosConIncidenteAbierto++;
    }

    const porEmpresa = Array.from(porEmpresaMap.values()).sort((a, b) =>
      a.empresa.localeCompare(b.empresa),
    );

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
      resumen: {
        totalMovimientos: movimientosRows.length,
        movimientosPorEstado,
        totalIncidentes: incidentes.length,
        incidentesPorEstado,
        porEmpresa,
      },
      movimientos: movimientosRows,
    };
  }

  // Atajos
  static reporteDia(filters: ReportePeriodoFilters) {
    return this.reportePorPeriodo(filters, 'DIA');
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
