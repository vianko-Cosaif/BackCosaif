// reporteria/modelos/ceo-comparativo-model.ts
// Reporte CEO: Ejecutivo Comparativo (periodo actual vs anterior)

import type { AdminReporteFilters, PeriodoReporte } from './admin-model';
import {
  loadMovimientosBase,
  rangoPeriodoUTC,
  rangoAnteriorFromCurrent,
  buildEstadoCounts,
  buildExecBuckets,
  computeKpis,
  type EstadoCounts,
  type CeoMovimientoDetalle,
} from './ceo-base';

export type DeltaMetric = {
  actual: number;
  anterior: number;
  delta: number;
  deltaPct: number;
};

export type ComparativoResumen = {
  totalMovimientos: DeltaMetric;
  okPct: DeltaMetric;
  criticosTotal: DeltaMetric;
  incidentesTotal: DeltaMetric;
  cancelados: DeltaMetric;
  indiceOperativo: DeltaMetric;
  backlogProm: DeltaMetric;
};

export type ComparativoEmpresaRow = {
  empresa: string;
  actual: number;
  anterior: number;
  delta: number;
  deltaPct: number;
};

export type ComparativoClienteRow = {
  clienteId: number;
  clienteNombre: string;
  actual: number;
  anterior: number;
  delta: number;
  deltaPct: number;
};

export type ReporteComparativo = {
  meta: {
    periodo: PeriodoReporte;
    tz: string;
    actual: { etiqueta: string; rangoLocal: { desde: string; hastaExclusivo: string } };
    anterior: { etiqueta: string; rangoLocal: { desde: string; hastaExclusivo: string } };
  };
  actual: {
    kpis: ReturnType<typeof computeKpis>;
    estadosGeneral: EstadoCounts;
    ejecucionBuckets: ReturnType<typeof buildExecBuckets>['rows'];
  };
  anterior: {
    kpis: ReturnType<typeof computeKpis>;
    estadosGeneral: EstadoCounts;
    ejecucionBuckets: ReturnType<typeof buildExecBuckets>['rows'];
  };
  resumen: ComparativoResumen;
  cambiosEmpresas: ComparativoEmpresaRow[];
  cambiosClientes: ComparativoClienteRow[];
};

function deltaMetric(actual: number, anterior: number): DeltaMetric {
  const delta = actual - anterior;
  const deltaPct = anterior ? Math.round((delta / anterior) * 100) : (actual ? 100 : 0);
  return { actual, anterior, delta, deltaPct };
}

function buildOkPct(kpis: ReturnType<typeof computeKpis>, buckets: ReturnType<typeof buildExecBuckets>['rows']) {
  const ok = buckets.find((b) => b.id === 'm10_89')?.movimientos ?? 0;
  return kpis.totalConInicioFin ? Math.round((ok / kpis.totalConInicioFin) * 100) : 0;
}

function aggByEmpresa(detalles: CeoMovimientoDetalle[]) {
  const map = new Map<string, number>();
  for (const d of detalles) {
    const key = d.empresa ?? '—';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function aggByCliente(detalles: CeoMovimientoDetalle[]) {
  const map = new Map<number, { nombre: string; total: number }>();
  for (const d of detalles) {
    const cli = d.usuarios.cliente;
    const id = cli?.id ?? 0;
    const nombre = cli?.nombre ?? 'Sin cliente';
    const cur = map.get(id) ?? { nombre, total: 0 };
    cur.total += 1;
    map.set(id, cur);
  }
  return map;
}

export class CeoComparativoModel {
  static async reportePorPeriodo(filters: AdminReporteFilters, periodo: PeriodoReporte): Promise<ReporteComparativo> {
    const tz = filters.tz ?? 'America/Mexico_City';
    const { startLocal } = rangoPeriodoUTC(filters.fecha, tz, periodo);
    const prev = rangoAnteriorFromCurrent(startLocal, periodo);
    const prevFecha = prev.startLocal.toFormat('yyyy-LL-dd');

    const actualBase = await loadMovimientosBase(filters, periodo);
    const prevBase = await loadMovimientosBase({ ...filters, fecha: prevFecha, tz }, periodo);

    const actualKpis = computeKpis(actualBase.detalles);
    const prevKpis = computeKpis(prevBase.detalles);

    const actualBuckets = buildExecBuckets(actualBase.detalles).rows;
    const prevBuckets = buildExecBuckets(prevBase.detalles).rows;

    const resumen: ComparativoResumen = {
      totalMovimientos: deltaMetric(actualKpis.totalMovimientos, prevKpis.totalMovimientos),
      okPct: deltaMetric(buildOkPct(actualKpis, actualBuckets), buildOkPct(prevKpis, prevBuckets)),
      criticosTotal: deltaMetric(actualKpis.criticosTotal, prevKpis.criticosTotal),
      incidentesTotal: deltaMetric(actualKpis.totalIncidentes, prevKpis.totalIncidentes),
      cancelados: deltaMetric(actualKpis.cancelados, prevKpis.cancelados),
      indiceOperativo: deltaMetric(actualKpis.indiceOperativo, prevKpis.indiceOperativo),
      backlogProm: deltaMetric(actualKpis.backlogAvgAgeMin, prevKpis.backlogAvgAgeMin),
    };

    const empActual = aggByEmpresa(actualBase.detalles);
    const empPrev = aggByEmpresa(prevBase.detalles);
    const empresas = new Set([...empActual.keys(), ...empPrev.keys()]);
    const cambiosEmpresas = Array.from(empresas)
      .map((empresa) => {
        const actual = empActual.get(empresa) ?? 0;
        const anterior = empPrev.get(empresa) ?? 0;
        const delta = actual - anterior;
        const deltaPct = anterior ? Math.round((delta / anterior) * 100) : (actual ? 100 : 0);
        return { empresa, actual, anterior, delta, deltaPct } as ComparativoEmpresaRow;
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 20);

    const cliActual = aggByCliente(actualBase.detalles);
    const cliPrev = aggByCliente(prevBase.detalles);
    const clientes = new Set([...cliActual.keys(), ...cliPrev.keys()]);
    const cambiosClientes = Array.from(clientes)
      .map((id) => {
        const a = cliActual.get(id);
        const p = cliPrev.get(id);
        const actual = a?.total ?? 0;
        const anterior = p?.total ?? 0;
        const delta = actual - anterior;
        const deltaPct = anterior ? Math.round((delta / anterior) * 100) : (actual ? 100 : 0);
        return {
          clienteId: id,
          clienteNombre: a?.nombre ?? p?.nombre ?? 'Sin cliente',
          actual,
          anterior,
          delta,
          deltaPct,
        } as ComparativoClienteRow;
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 20);

    return {
      meta: {
        periodo,
        tz,
        actual: {
          etiqueta: actualBase.meta.etiqueta,
          rangoLocal: actualBase.meta.rangoLocal,
        },
        anterior: {
          etiqueta: prevBase.meta.etiqueta,
          rangoLocal: prevBase.meta.rangoLocal,
        },
      },
      actual: {
        kpis: actualKpis,
        estadosGeneral: buildEstadoCounts(actualBase.detalles),
        ejecucionBuckets: actualBuckets,
      },
      anterior: {
        kpis: prevKpis,
        estadosGeneral: buildEstadoCounts(prevBase.detalles),
        ejecucionBuckets: prevBuckets,
      },
      resumen,
      cambiosEmpresas,
      cambiosClientes,
    };
  }
}
