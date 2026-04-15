// reporteria/modelos/ceo-trafico-cliente-model.ts
// Reporte CEO: Tráfico por Cliente

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

export type ClienteRow = {
  clienteId: number;
  clienteNombre: string;
  totalMovimientos: number;
  conInicioFin: number;
  okPct: number;
  incidentesTotal: number;
  criticosTotal: number;
  cancelados: number;
  canceladosConIncidente: number;
  estados: EstadoCounts;
};

type ClienteAgg = {
  totalMovimientos: number;
  conInicioFin: number;
  m10_89: number;
  gte90: number;
  lt2: number;
  incidentesTotal: number;
  cancelados: number;
  canceladosConIncidente: number;
  estados: EstadoCounts;
};

export type EmpresaClienteRow = {
  empresa: string;
  totalMovimientos: number;
  clientesUnicos: number;
  incidentesTotal: number;
  estados: EstadoCounts;
};

export type ReporteTraficoCliente = {
  meta: any;
  kpis: ReturnType<typeof computeKpis>;
  estadosGeneral: EstadoCounts;
  ejecucionBuckets: ReturnType<typeof buildExecBuckets>['rows'];
  movimientosPorHora: Array<{ hora: number; movimientos: number }>;
  movimientosPorDiaSemana: Array<{ dia: string; movimientos: number }>;
  topClientesMovimientos: ClienteRow[];
  topClientesIncidentes: ClienteRow[];
  clientes: ClienteRow[];
  porEmpresa: EmpresaClienteRow[];
};

function initCliente(): ClienteAgg {
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
  };
}

function applyCliente(row: ClienteAgg, d: CeoMovimientoDetalle) {
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

function initEmpresa(): Omit<EmpresaClienteRow, 'empresa' | 'clientesUnicos'> & { clientes: Set<number> } {
  return {
    totalMovimientos: 0,
    incidentesTotal: 0,
    estados: buildEstadoCounts([]),
    clientes: new Set<number>(),
  };
}

export class CeoTraficoClienteModel {
  static async reportePorPeriodo(filters: AdminReporteFilters, periodo: PeriodoReporte): Promise<ReporteTraficoCliente> {
    const base = await loadMovimientosBase(filters, periodo);
    const detalles = base.detalles;

    const estadosGeneral = buildEstadoCounts(detalles);
    const kpis = computeKpis(detalles);
    const ejecucionBuckets = buildExecBuckets(detalles).rows;
    const traffic = buildTraffic(detalles);

    const cliMap = new Map<number, ReturnType<typeof initCliente>>();
    const cliName = new Map<number, string>();
    const empMap = new Map<string, ReturnType<typeof initEmpresa>>();

    for (const d of detalles) {
      const cli = d.usuarios.cliente;
      const cliId = cli?.id ?? 0;
      const cliNombre = cli?.nombre ?? 'Sin cliente';

      if (!cliMap.has(cliId)) cliMap.set(cliId, initCliente());
      cliName.set(cliId, cliNombre);

      applyCliente(cliMap.get(cliId)!, d);

      const empKey = d.empresa ?? '—';
      if (!empMap.has(empKey)) empMap.set(empKey, initEmpresa());
      const er = empMap.get(empKey)!;
      er.totalMovimientos += 1;
      er.incidentesTotal += d.incidentesCount;
      if (er.estados[String(d.estado) as keyof EstadoCounts] !== undefined) {
        er.estados[String(d.estado) as keyof EstadoCounts] += 1;
      }
      if (cliId) er.clientes.add(cliId);
    }

    const clientes = Array.from(cliMap.entries()).map(([id, row]) => {
      const nombre = cliName.get(id) ?? 'Sin cliente';
      const okPct = row.conInicioFin ? Math.round((row.m10_89 / row.conInicioFin) * 100) : 0;
      const criticosTotal = row.lt2 + row.gte90;

      return {
        clienteId: id,
        clienteNombre: nombre,
        totalMovimientos: row.totalMovimientos,
        conInicioFin: row.conInicioFin,
        okPct,
        incidentesTotal: row.incidentesTotal,
        criticosTotal,
        cancelados: row.cancelados,
        canceladosConIncidente: row.canceladosConIncidente,
        estados: row.estados,
      } as ClienteRow;
    });

    const topClientesMovimientos = [...clientes]
      .sort((a, b) => b.totalMovimientos - a.totalMovimientos)
      .slice(0, 12);

    const topClientesIncidentes = [...clientes]
      .sort((a, b) => b.incidentesTotal - a.incidentesTotal)
      .slice(0, 12);

    const porEmpresa = Array.from(empMap.entries())
      .map(([empresa, r]) => ({
        empresa,
        totalMovimientos: r.totalMovimientos,
        clientesUnicos: r.clientes.size,
        incidentesTotal: r.incidentesTotal,
        estados: r.estados,
      }))
      .sort((a, b) => b.totalMovimientos - a.totalMovimientos);

    return {
      meta: base.meta,
      kpis,
      estadosGeneral,
      ejecucionBuckets,
      movimientosPorHora: traffic.movimientosPorHora,
      movimientosPorDiaSemana: traffic.movimientosPorDiaSemana,
      topClientesMovimientos,
      topClientesIncidentes,
      clientes,
      porEmpresa,
    };
  }
}
