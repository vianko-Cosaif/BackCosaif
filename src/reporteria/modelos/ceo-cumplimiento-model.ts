// reporteria/modelos/ceo-cumplimiento-model.ts
// Reporte CEO: Cumplimiento Operativo

import type { AdminReporteFilters, PeriodoReporte } from './admin-model';
import {
  loadMovimientosBase,
  buildEstadoCounts,
  computeKpis,
  buildExecBuckets,
  buildTraffic,
  type EstadoCounts,
  type CeoMovimientoDetalle,
} from './ceo-base';

export type CumplimientoGrupo = {
  key: string;
  nombre: string;
  totalMovimientos: number;
  conInicioFin: number;
  m0_9: number;
  m10_89: number;
  gte90: number;
  lt2: number;
  incidentesTotal: number;
  criticosTotal: number;
  okPct: number;
  incidentesPct: number;
  estados: EstadoCounts;
  cancelados: number;
  canceladosConIncidente: number;
};

export type ReporteCumplimiento = {
  meta: ReturnType<typeof buildMeta>;
  kpis: ReturnType<typeof computeKpis>;
  estadosGeneral: EstadoCounts;
  ejecucionBuckets: ReturnType<typeof buildExecBuckets>['rows'];
  movimientosPorHora: Array<{ hora: number; movimientos: number }>;
  movimientosPorDiaSemana: Array<{ dia: string; movimientos: number }>;
  incidentesPorHora: Array<{ hora: number; incidentes: number }>;
  incidentesPorDiaSemana: Array<{ dia: string; incidentes: number }>;
  porEmpresa: CumplimientoGrupo[];
  porLocalidad: CumplimientoGrupo[];
  porTurno: CumplimientoGrupo[];
};

function buildMeta(meta: any) {
  return meta;
}

function initAgg(): Omit<CumplimientoGrupo, 'key' | 'nombre' | 'okPct' | 'incidentesPct' | 'criticosTotal'> {
  return {
    totalMovimientos: 0,
    conInicioFin: 0,
    m0_9: 0,
    m10_89: 0,
    gte90: 0,
    lt2: 0,
    incidentesTotal: 0,
    estados: buildEstadoCounts([]),
    cancelados: 0,
    canceladosConIncidente: 0,
  };
}

function applyAgg(row: ReturnType<typeof initAgg>, d: CeoMovimientoDetalle) {
  row.totalMovimientos += 1;
  row.incidentesTotal += d.incidentesCount;
  if (row.estados[String(d.estado) as keyof EstadoCounts] !== undefined) {
    row.estados[String(d.estado) as keyof EstadoCounts] += 1;
  }
  if (String(d.estado) === 'CANCELADO') row.cancelados += 1;
  if (d.canceladoConIncidente) row.canceladosConIncidente += 1;

  if (d.execBucket) {
    row.conInicioFin += 1;
    if (d.execBucket === 'm0_9') row.m0_9 += 1;
    if (d.execBucket === 'm10_89') row.m10_89 += 1;
    if (d.execBucket === 'gte90') row.gte90 += 1;
    if (d.execLt2) row.lt2 += 1;
  }
}

function finalize(key: string, nombre: string, row: ReturnType<typeof initAgg>): CumplimientoGrupo {
  const criticosTotal = row.lt2 + row.gte90;
  const okPct = row.conInicioFin ? Math.round((row.m10_89 / row.conInicioFin) * 100) : 0;
  const incidentesPct = row.totalMovimientos
    ? Math.round((row.incidentesTotal / row.totalMovimientos) * 100)
    : 0;

  return {
    key,
    nombre,
    totalMovimientos: row.totalMovimientos,
    conInicioFin: row.conInicioFin,
    m0_9: row.m0_9,
    m10_89: row.m10_89,
    gte90: row.gte90,
    lt2: row.lt2,
    incidentesTotal: row.incidentesTotal,
    criticosTotal,
    okPct,
    incidentesPct,
    estados: row.estados,
    cancelados: row.cancelados,
    canceladosConIncidente: row.canceladosConIncidente,
  };
}

export class CeoCumplimientoModel {
  static async reportePorPeriodo(filters: AdminReporteFilters, periodo: PeriodoReporte): Promise<ReporteCumplimiento> {
    const base = await loadMovimientosBase(filters, periodo);
    const detalles = base.detalles;

    const estadosGeneral = buildEstadoCounts(detalles);
    const kpis = computeKpis(detalles);
    const ejecucionBuckets = buildExecBuckets(detalles).rows;
    const traffic = buildTraffic(detalles);

    const empMap = new Map<string, ReturnType<typeof initAgg>>();
    const locMap = new Map<string, ReturnType<typeof initAgg>>();
    const turnMap = new Map<string, ReturnType<typeof initAgg>>();

    for (const d of detalles) {
      const empKey = d.empresa ?? '—';
      const locKey = d.localidad ?? '—';
      const turnKey = d.turnoId;

      if (!empMap.has(empKey)) empMap.set(empKey, initAgg());
      if (!locMap.has(locKey)) locMap.set(locKey, initAgg());
      if (!turnMap.has(turnKey)) turnMap.set(turnKey, initAgg());

      applyAgg(empMap.get(empKey)!, d);
      applyAgg(locMap.get(locKey)!, d);
      applyAgg(turnMap.get(turnKey)!, d);
    }

    const porEmpresa = Array.from(empMap.entries())
      .map(([k, v]) => finalize(k, k, v))
      .sort((a, b) => (b.totalMovimientos - a.totalMovimientos));

    const porLocalidad = Array.from(locMap.entries())
      .map(([k, v]) => finalize(k, k, v))
      .sort((a, b) => (b.totalMovimientos - a.totalMovimientos));

    const porTurno = Array.from(turnMap.entries())
      .map(([k, v]) => {
        const nombre = detalles.find((d) => d.turnoId === k)?.turnoLabel ?? k;
        return finalize(k, `${nombre}`, v);
      })
      .sort((a, b) => a.key.localeCompare(b.key));

    return {
      meta: buildMeta(base.meta),
      kpis,
      estadosGeneral,
      ejecucionBuckets,
      movimientosPorHora: traffic.movimientosPorHora,
      movimientosPorDiaSemana: traffic.movimientosPorDiaSemana,
      incidentesPorHora: traffic.incidentesPorHora,
      incidentesPorDiaSemana: traffic.incidentesPorDiaSemana,
      porEmpresa,
      porLocalidad,
      porTurno,
    };
  }
}
