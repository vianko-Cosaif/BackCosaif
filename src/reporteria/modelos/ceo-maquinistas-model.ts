// reporteria/modelos/ceo-maquinistas-model.ts
// Reporte CEO: Ranking de Maquinistas (avanzado)

import type { AdminReporteFilters, PeriodoReporte } from './admin-model';
import {
  loadMovimientosBase,
  buildEstadoCounts,
  buildExecBuckets,
  buildTraffic,
  computeKpis,
  percentile,
  type EstadoCounts,
  type CeoMovimientoDetalle,
} from './ceo-base';

export type OperadorAvanzado = {
  operadorId: number;
  operadorNombre: string;
  totalMovimientos: number;
  conInicioFin: number;
  execMeanMin: number;
  execP90Min: number;
  okPct: number;
  criticosTotal: number;
  incidentesTotal: number;
  cancelados: number;
  canceladosConIncidente: number;
  estados: EstadoCounts;
};

export type OperadoresSegmento = {
  key: string;
  nombre: string;
  operadores: OperadorAvanzado[];
};

export type ReporteMaquinistas = {
  meta: any;
  kpis: ReturnType<typeof computeKpis>;
  estadosGeneral: EstadoCounts;
  ejecucionBuckets: ReturnType<typeof buildExecBuckets>['rows'];
  movimientosPorHora: Array<{ hora: number; movimientos: number }>;
  movimientosPorDiaSemana: Array<{ dia: string; movimientos: number }>;
  rankingOperadores: OperadorAvanzado[];
  operadoresPorEmpresa: OperadoresSegmento[];
  operadoresPorLocalidad: OperadoresSegmento[];
};

type OpAgg = {
  operadorId: number;
  operadorNombre: string;
  totalMovimientos: number;
  conInicioFin: number;
  m10_89: number;
  gte90: number;
  lt2: number;
  incidentesTotal: number;
  cancelados: number;
  canceladosConIncidente: number;
  estados: EstadoCounts;
  execTimes: number[];
};

function initOpAgg(id: number, nombre: string): OpAgg {
  return {
    operadorId: id,
    operadorNombre: nombre,
    totalMovimientos: 0,
    conInicioFin: 0,
    m10_89: 0,
    gte90: 0,
    lt2: 0,
    incidentesTotal: 0,
    cancelados: 0,
    canceladosConIncidente: 0,
    estados: buildEstadoCounts([]),
    execTimes: [],
  };
}

function applyOpAgg(row: OpAgg, d: CeoMovimientoDetalle) {
  row.totalMovimientos += 1;
  row.incidentesTotal += d.incidentesCount;
  if (row.estados[String(d.estado) as keyof EstadoCounts] !== undefined) {
    row.estados[String(d.estado) as keyof EstadoCounts] += 1;
  }
  if (String(d.estado) === 'CANCELADO') row.cancelados += 1;
  if (d.canceladoConIncidente) row.canceladosConIncidente += 1;

  if (d.execBucket) {
    row.conInicioFin += 1;
    if (d.execBucket === 'm10_89') row.m10_89 += 1;
    if (d.execBucket === 'gte90') row.gte90 += 1;
    if (d.execLt2) row.lt2 += 1;
  }
  if (d.minInicioAFin !== null) row.execTimes.push(d.minInicioAFin);
}

function finalizeOp(row: OpAgg): OperadorAvanzado {
  const okPct = row.conInicioFin ? Math.round((row.m10_89 / row.conInicioFin) * 100) : 0;
  const criticosTotal = row.lt2 + row.gte90;
  const execMeanMin = row.execTimes.length
    ? row.execTimes.reduce((a, b) => a + b, 0) / row.execTimes.length
    : 0;
  const execP90Min = percentile(row.execTimes, 0.9);
  return {
    operadorId: row.operadorId,
    operadorNombre: row.operadorNombre,
    totalMovimientos: row.totalMovimientos,
    conInicioFin: row.conInicioFin,
    execMeanMin,
    execP90Min,
    okPct,
    criticosTotal,
    incidentesTotal: row.incidentesTotal,
    cancelados: row.cancelados,
    canceladosConIncidente: row.canceladosConIncidente,
    estados: row.estados,
  };
}

function mapToRanking(map: Map<number, OpAgg>) {
  return Array.from(map.values())
    .map(finalizeOp)
    .sort((a, b) => (b.totalMovimientos - a.totalMovimientos) || (b.criticosTotal - a.criticosTotal));
}

export class CeoMaquinistasModel {
  static async reportePorPeriodo(filters: AdminReporteFilters, periodo: PeriodoReporte): Promise<ReporteMaquinistas> {
    const base = await loadMovimientosBase(filters, periodo);
    const detalles = base.detalles;

    const estadosGeneral = buildEstadoCounts(detalles);
    const kpis = computeKpis(detalles);
    const ejecucionBuckets = buildExecBuckets(detalles).rows;
    const traffic = buildTraffic(detalles);

    const opMap = new Map<number, OpAgg>();
    const empMap = new Map<string, Map<number, OpAgg>>();
    const locMap = new Map<string, Map<number, OpAgg>>();

    for (const d of detalles) {
      const op = d.usuarios.operador;
      if (!op) continue;

      if (!opMap.has(op.id)) opMap.set(op.id, initOpAgg(op.id, op.nombre));
      applyOpAgg(opMap.get(op.id)!, d);

      const empKey = d.empresa ?? '—';
      if (!empMap.has(empKey)) empMap.set(empKey, new Map());
      const empOps = empMap.get(empKey)!;
      if (!empOps.has(op.id)) empOps.set(op.id, initOpAgg(op.id, op.nombre));
      applyOpAgg(empOps.get(op.id)!, d);

      const locKey = d.localidad ?? '—';
      if (!locMap.has(locKey)) locMap.set(locKey, new Map());
      const locOps = locMap.get(locKey)!;
      if (!locOps.has(op.id)) locOps.set(op.id, initOpAgg(op.id, op.nombre));
      applyOpAgg(locOps.get(op.id)!, d);
    }

    const rankingOperadores = mapToRanking(opMap).slice(0, 40);

    const operadoresPorEmpresa = Array.from(empMap.entries())
      .map(([empresa, map]) => ({
        key: empresa,
        nombre: empresa,
        operadores: mapToRanking(map).slice(0, 15),
      }))
      .sort((a, b) => b.operadores.length - a.operadores.length);

    const operadoresPorLocalidad = Array.from(locMap.entries())
      .map(([loc, map]) => ({
        key: loc,
        nombre: loc,
        operadores: mapToRanking(map).slice(0, 15),
      }))
      .sort((a, b) => b.operadores.length - a.operadores.length);

    return {
      meta: base.meta,
      kpis,
      estadosGeneral,
      ejecucionBuckets,
      movimientosPorHora: traffic.movimientosPorHora,
      movimientosPorDiaSemana: traffic.movimientosPorDiaSemana,
      rankingOperadores,
      operadoresPorEmpresa,
      operadoresPorLocalidad,
    };
  }
}
