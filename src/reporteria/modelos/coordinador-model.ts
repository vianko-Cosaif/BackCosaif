// reporteria/modelos/coordinador-model.ts
// Reporte COORDINADOR: volumen operativo sin tiempos ni roles

import type { AdminReporteFilters, PeriodoReporte } from './admin-model';
import {
  loadMovimientosBase,
  buildEstadoCounts,
  buildTraffic,
  type EstadoCounts,
  type CeoMovimientoDetalle,
} from './ceo-base';

export type CoordinadorKpis = {
  totalMovimientos: number;
  totalConFin: number;
  totalSinFin: number;
  totalIncidentes: number;
  movimientosConIncidente: number;
  movimientosConIncidentePct: number;
  cancelados: number;
  canceladosConIncidente: number;
};

export type EmpresaResumen = {
  empresa: string;
  totalMovimientos: number;
  incidentesTotal: number;
  incidentesPct: number;
};

export type LocomotoraResumen = {
  locomotiveNumber: number;
  totalMovimientos: number;
  incidentesTotal: number;
  estados: EstadoCounts;
};

export type ReporteCoordinador = {
  meta: {
    periodo: PeriodoReporte;
    etiqueta: string;
    fechaLocal: string;
    tz: string;
    rangoUTC: { desde: string; hastaExclusivo: string };
    rangoLocal: { desde: string; hastaExclusivo: string };
  };
  kpis: CoordinadorKpis;
  estadosGeneral: EstadoCounts;
  movimientosPorHora: Array<{ hora: number; movimientos: number }>;
  movimientosPorDiaSemana: Array<{ dia: string; movimientos: number }>;
  incidentesPorHora: Array<{ hora: number; incidentes: number }>;
  incidentesPorDiaSemana: Array<{ dia: string; incidentes: number }>;
  topEmpresas: EmpresaResumen[];
  topLocomotoras: LocomotoraResumen[];
};

function toPct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0;
}

export class CoordinadorReporteriaModel {
  static async reportePorPeriodo(filters: AdminReporteFilters, periodo: PeriodoReporte): Promise<ReporteCoordinador> {
    const base = await loadMovimientosBase(filters, periodo);
    const detalles = base.detalles;

    const estadosGeneral = buildEstadoCounts(detalles);
    const traffic = buildTraffic(detalles);

    const totalMovimientos = detalles.length;
    const totalConFin = detalles.filter((d) => d.fechaFinUTC !== null).length;
    const totalSinFin = totalMovimientos - totalConFin;
    const totalIncidentes = detalles.reduce((acc, d) => acc + d.incidentesCount, 0);
    const movimientosConIncidente = detalles.filter((d) => d.incidentesCount > 0).length;
    const movimientosConIncidentePct = toPct(movimientosConIncidente, totalMovimientos);
    const cancelados = detalles.filter((d) => String(d.estado) === 'CANCELADO').length;
    const canceladosConIncidente = detalles.filter((d) => d.canceladoConIncidente).length;

    const empMap = new Map<string, { total: number; incidentes: number }>();
    const locoMap = new Map<number, { total: number; incidentes: number; estados: EstadoCounts }>();

    for (const d of detalles) {
      const emp = d.empresa ?? '—';
      const e = empMap.get(emp) ?? { total: 0, incidentes: 0 };
      e.total += 1;
      e.incidentes += d.incidentesCount;
      empMap.set(emp, e);

      const loco = d.locomotiveNumber ?? 0;
      const l = locoMap.get(loco) ?? { total: 0, incidentes: 0, estados: buildEstadoCounts([]) };
      l.total += 1;
      l.incidentes += d.incidentesCount;
      const st = String(d.estado) as keyof EstadoCounts;
      if (l.estados[st] !== undefined) l.estados[st] += 1;
      locoMap.set(loco, l);
    }

    const topEmpresas: EmpresaResumen[] = Array.from(empMap.entries())
      .map(([empresa, v]) => ({
        empresa,
        totalMovimientos: v.total,
        incidentesTotal: v.incidentes,
        incidentesPct: toPct(v.incidentes, v.total),
      }))
      .sort((a, b) => (b.totalMovimientos - a.totalMovimientos) || (b.incidentesTotal - a.incidentesTotal))
      .slice(0, 20);

    const topLocomotoras: LocomotoraResumen[] = Array.from(locoMap.entries())
      .map(([locomotiveNumber, v]) => ({
        locomotiveNumber,
        totalMovimientos: v.total,
        incidentesTotal: v.incidentes,
        estados: v.estados,
      }))
      .sort((a, b) => (b.totalMovimientos - a.totalMovimientos) || (b.incidentesTotal - a.incidentesTotal))
      .slice(0, 20);

    return {
      meta: base.meta,
      kpis: {
        totalMovimientos,
        totalConFin,
        totalSinFin,
        totalIncidentes,
        movimientosConIncidente,
        movimientosConIncidentePct,
        cancelados,
        canceladosConIncidente,
      },
      estadosGeneral,
      movimientosPorHora: traffic.movimientosPorHora,
      movimientosPorDiaSemana: traffic.movimientosPorDiaSemana,
      incidentesPorHora: traffic.incidentesPorHora,
      incidentesPorDiaSemana: traffic.incidentesPorDiaSemana,
      topEmpresas,
      topLocomotoras,
    };
  }
}
