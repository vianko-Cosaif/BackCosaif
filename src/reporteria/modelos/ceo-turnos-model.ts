// reporteria/modelos/ceo-turnos-model.ts
// Reporte CEO: Desempeño por Turno

import type { AdminReporteFilters, PeriodoReporte } from './admin-model';
import {
  loadMovimientosBase,
  buildEstadoCounts,
  buildExecBuckets,
  buildTraffic,
  computeKpis,
  type EstadoCounts,
  type CeoMovimientoDetalle,
} from './ceo-base';

export type TurnoRow = {
  turnoId: string;
  turnoLabel: string;
  turnoRango: string;
  totalMovimientos: number;
  conInicioFin: number;
  okPct: number;
  criticosTotal: number;
  incidentesTotal: number;
  cancelados: number;
  canceladosConIncidente: number;
  estados: EstadoCounts;
};

export type OperadorRow = {
  operadorId: number;
  operadorNombre: string;
  totalMovimientos: number;
  conInicioFin: number;
  okPct: number;
  criticosTotal: number;
  incidentesTotal: number;
};

export type TurnoRanking = {
  turnoId: string;
  turnoLabel: string;
  turnoRango: string;
  operadores: OperadorRow[];
};

export type ReporteTurnos = {
  meta: any;
  kpis: ReturnType<typeof computeKpis>;
  estadosGeneral: EstadoCounts;
  ejecucionBuckets: ReturnType<typeof buildExecBuckets>['rows'];
  movimientosPorHora: Array<{ hora: number; movimientos: number }>;
  incidentesPorHora: Array<{ hora: number; incidentes: number }>;
  turnos: TurnoRow[];
  rankingOperadoresPorTurno: TurnoRanking[];
};

type TurnoAgg = {
  totalMovimientos: number;
  conInicioFin: number;
  m10_89: number;
  gte90: number;
  lt2: number;
  incidentesTotal: number;
  cancelados: number;
  canceladosConIncidente: number;
  estados: EstadoCounts;
  label: string;
  rango: string;
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
};

function initTurnoAgg(label: string, rango: string): TurnoAgg {
  return {
    totalMovimientos: 0,
    conInicioFin: 0,
    m10_89: 0,
    gte90: 0,
    lt2: 0,
    incidentesTotal: 0,
    cancelados: 0,
    canceladosConIncidente: 0,
    estados: buildEstadoCounts([]),
    label,
    rango,
  };
}

function applyTurnoAgg(row: TurnoAgg, d: CeoMovimientoDetalle) {
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
}

function applyOpAgg(row: OpAgg, d: CeoMovimientoDetalle) {
  row.totalMovimientos += 1;
  row.incidentesTotal += d.incidentesCount;
  if (d.execBucket) {
    row.conInicioFin += 1;
    if (d.execBucket === 'm10_89') row.m10_89 += 1;
    if (d.execBucket === 'gte90') row.gte90 += 1;
    if (d.execLt2) row.lt2 += 1;
  }
}

export class CeoTurnosModel {
  static async reportePorPeriodo(filters: AdminReporteFilters, periodo: PeriodoReporte): Promise<ReporteTurnos> {
    const base = await loadMovimientosBase(filters, periodo);
    const detalles = base.detalles;

    const estadosGeneral = buildEstadoCounts(detalles);
    const kpis = computeKpis(detalles);
    const ejecucionBuckets = buildExecBuckets(detalles).rows;
    const traffic = buildTraffic(detalles);

    const turnMap = new Map<string, TurnoAgg>();
    const opTurnMap = new Map<string, Map<number, OpAgg>>();

    for (const d of detalles) {
      const tId = d.turnoId;
      if (!turnMap.has(tId)) turnMap.set(tId, initTurnoAgg(d.turnoLabel, d.turnoRango));
      applyTurnoAgg(turnMap.get(tId)!, d);

      const op = d.usuarios.operador;
      if (op) {
        if (!opTurnMap.has(tId)) opTurnMap.set(tId, new Map());
        const inner = opTurnMap.get(tId)!;
        if (!inner.has(op.id)) {
          inner.set(op.id, {
            operadorId: op.id,
            operadorNombre: op.nombre,
            totalMovimientos: 0,
            conInicioFin: 0,
            m10_89: 0,
            gte90: 0,
            lt2: 0,
            incidentesTotal: 0,
          });
        }
        applyOpAgg(inner.get(op.id)!, d);
      }
    }

    const turnos = Array.from(turnMap.entries())
      .map(([turnoId, r]) => {
        const okPct = r.conInicioFin ? Math.round((r.m10_89 / r.conInicioFin) * 100) : 0;
        const criticosTotal = r.lt2 + r.gte90;
        return {
          turnoId,
          turnoLabel: r.label,
          turnoRango: r.rango,
          totalMovimientos: r.totalMovimientos,
          conInicioFin: r.conInicioFin,
          okPct,
          criticosTotal,
          incidentesTotal: r.incidentesTotal,
          cancelados: r.cancelados,
          canceladosConIncidente: r.canceladosConIncidente,
          estados: r.estados,
        } as TurnoRow;
      })
      .sort((a, b) => a.turnoId.localeCompare(b.turnoId));

    const rankingOperadoresPorTurno = Array.from(opTurnMap.entries())
      .map(([turnoId, ops]) => {
        const first = turnMap.get(turnoId);
        const operadores = Array.from(ops.values())
          .map((o) => ({
            operadorId: o.operadorId,
            operadorNombre: o.operadorNombre,
            totalMovimientos: o.totalMovimientos,
            conInicioFin: o.conInicioFin,
            okPct: o.conInicioFin ? Math.round((o.m10_89 / o.conInicioFin) * 100) : 0,
            criticosTotal: o.lt2 + o.gte90,
            incidentesTotal: o.incidentesTotal,
          }))
          .sort((a, b) => b.totalMovimientos - a.totalMovimientos)
          .slice(0, 10);

        return {
          turnoId,
          turnoLabel: first?.label ?? turnoId,
          turnoRango: first?.rango ?? '',
          operadores,
        } as TurnoRanking;
      })
      .sort((a, b) => a.turnoId.localeCompare(b.turnoId));

    return {
      meta: base.meta,
      kpis,
      estadosGeneral,
      ejecucionBuckets,
      movimientosPorHora: traffic.movimientosPorHora,
      incidentesPorHora: traffic.incidentesPorHora,
      turnos,
      rankingOperadoresPorTurno,
    };
  }
}
