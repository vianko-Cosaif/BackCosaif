// reporteria/modelos/coordinador-model.ts
// Reporte COORDINADOR: volumen operativo sin tiempos ni roles

import type { AdminReporteFilters, PeriodoReporte } from './admin-model';
import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
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
  movimientosDetalle: MovimientoDetalle[];
  cronologiaCierres: CronologiaDia[];
  cronologiaMovimientos: CronologiaDia[];
};

function toPct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0;
}

export type IncidenteDetalle = {
  id: number;
  estado: string;
  descripcion: string;
  fechaInicioMX: string;
  fechaFinMX: string | null;
  usuario?: { id: number; nombre: string };
  imagenes: string[];
  imagenUrls: string[];
};

export type MovimientoDetalle = {
  id: number;
  locomotiveNumber: number;
  estado: string;
  empresa: string;
  localidad: string;

  solicitadoPor?: { id: number; nombre: string };
  operador?: { id: number; nombre: string };
  cliente?: { id: number; nombre: string };
  supervisor?: { id: number; nombre: string };
  coordinador?: { id: number; nombre: string };

  fechaSolicitudMX: string;
  fechaInicioMX: string | null;
  fechaFinMX: string | null;
  fechaCreacionMX: string;
  fechaActualizacionMX: string;

  minSolicitudAInicio: number | null;
  minInicioAFin: number | null;
  minSolicitudAFin: number | null;

  viaOrigen: string | null;
  viaDestino: string | null;
  tipoMovimiento: string | null;
  prioridad: string;
  comentarios: string | null;

  incidentes: IncidenteDetalle[];
};

export type CronologiaDia = {
  fecha: string; // yyyy-LL-dd (MX)
  movimientos: Array<MovimientoDetalle & { ordenDia: number }>;
};

const prisma = new PrismaClient();
const MX_TZ = 'America/Mexico_City';

function fmtMX(d: Date | null, tz: string) {
  if (!d) return null;
  return DateTime.fromJSDate(d, { zone: tz }).toFormat('yyyy-LL-dd HH:mm');
}

export class CoordinadorReporteriaModel {
  static async reportePorPeriodo(filters: AdminReporteFilters, periodo: PeriodoReporte): Promise<ReporteCoordinador> {
    const base = await loadMovimientosBase(filters, periodo);
    const detalles = base.detalles;
    const tz = filters.tz ?? MX_TZ;

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

    const ids = detalles.map((d) => d.id);

    const extras = ids.length
      ? await prisma.movimiento.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            instrucciones: true,
            viaOrigen: { select: { nombre: true } },
            viaDestino: { select: { nombre: true } },
            tipoMovimiento: true,
            prioridad: true,
          },
        })
      : [];

    const extraMap = new Map<number, typeof extras[number]>();
    for (const e of extras) extraMap.set(e.id, e);

    const incidentes = ids.length
      ? await prisma.incidente.findMany({
          where: { movimientoId: { in: ids } },
          select: {
            id: true,
            movimientoId: true,
            estado: true,
            descripcion: true,
            fechaInicio: true,
            fechaFin: true,
            imagen1: true,
            imagen2: true,
            imagen3: true,
            imagen4: true,
            usuario: { select: { id: true, nombre: true } },
          },
          orderBy: { id: 'asc' },
        })
      : [];

    const incByMov = new Map<number, IncidenteDetalle[]>();
    for (const inc of incidentes) {
      const imgs = [inc.imagen1, inc.imagen2, inc.imagen3, inc.imagen4].filter(Boolean) as string[];
      const urls = imgs.map((ruta) => `/incidentes/imagen?ruta=${encodeURIComponent(ruta)}`);
      const row: IncidenteDetalle = {
        id: inc.id,
        estado: String(inc.estado),
        descripcion: inc.descripcion,
        fechaInicioMX: fmtMX(inc.fechaInicio, tz) ?? '',
        fechaFinMX: fmtMX(inc.fechaFin, tz),
        usuario: inc.usuario ? { id: inc.usuario.id, nombre: inc.usuario.nombre } : undefined,
        imagenes: imgs,
        imagenUrls: urls,
      };
      const list = incByMov.get(inc.movimientoId) ?? [];
      list.push(row);
      incByMov.set(inc.movimientoId, list);
    }

    const movimientosDetalle: MovimientoDetalle[] = detalles.map((d) => {
      const extra = extraMap.get(d.id);
      const incs = incByMov.get(d.id) ?? [];
      return {
        id: d.id,
        locomotiveNumber: d.locomotiveNumber,
        estado: d.estado,
        empresa: d.empresa,
        localidad: d.localidad,
        solicitadoPor: d.usuarios.creadoPor ? { id: d.usuarios.creadoPor.id, nombre: d.usuarios.creadoPor.nombre } : undefined,
        operador: d.usuarios.operador ? { id: d.usuarios.operador.id, nombre: d.usuarios.operador.nombre } : undefined,
        cliente: d.usuarios.cliente ? { id: d.usuarios.cliente.id, nombre: d.usuarios.cliente.nombre } : undefined,
        supervisor: d.usuarios.supervisor ? { id: d.usuarios.supervisor.id, nombre: d.usuarios.supervisor.nombre } : undefined,
        coordinador: d.usuarios.coordinador ? { id: d.usuarios.coordinador.id, nombre: d.usuarios.coordinador.nombre } : undefined,
        fechaSolicitudMX: d.fechaSolicitudMX,
        fechaInicioMX: d.fechaInicioMX,
        fechaFinMX: d.fechaFinMX,
        fechaCreacionMX: fmtMX(extra?.createdAt ?? null, tz) ?? '',
        fechaActualizacionMX: fmtMX(extra?.updatedAt ?? null, tz) ?? '',
        minSolicitudAInicio: d.minSolicitudAInicio,
        minInicioAFin: d.minInicioAFin,
        minSolicitudAFin: d.minSolicitudAFin,
        viaOrigen: extra?.viaOrigen?.nombre ?? null,
        viaDestino: extra?.viaDestino?.nombre ?? null,
        tipoMovimiento: extra?.tipoMovimiento ? String(extra.tipoMovimiento) : null,
        prioridad: extra?.prioridad ? String(extra.prioridad) : '—',
        comentarios: extra?.instrucciones ?? null,
        incidentes: incs,
      };
    });

    const movDetailMap = new Map<number, MovimientoDetalle>();
    for (const m of movimientosDetalle) movDetailMap.set(m.id, m);

    const cronMap = new Map<string, Array<MovimientoDetalle & { ordenDia: number }>>();
    const completados = detalles
      .filter((d) => d.fechaFinUTC)
      .sort((a, b) => String(a.fechaFinUTC).localeCompare(String(b.fechaFinUTC)));

    const counters = new Map<string, number>();
    for (const d of completados) {
      const dateKey = DateTime.fromISO(String(d.fechaFinUTC), { zone: tz }).toFormat('yyyy-LL-dd');
      const idx = (counters.get(dateKey) ?? 0) + 1;
      counters.set(dateKey, idx);
      const det = movDetailMap.get(d.id);
      if (!det) continue;
      const list = cronMap.get(dateKey) ?? [];
      list.push({ ...det, ordenDia: idx });
      cronMap.set(dateKey, list);
    }

    const cronologiaCierres: CronologiaDia[] = Array.from(cronMap.entries())
      .map(([fecha, movimientos]) => ({ fecha, movimientos }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    const cronSolMap = new Map<string, Array<MovimientoDetalle & { ordenDia: number }>>();
    const solicitados = detalles
      .sort((a, b) => String(a.fechaSolicitudUTC).localeCompare(String(b.fechaSolicitudUTC)));

    const countersSol = new Map<string, number>();
    for (const d of solicitados) {
      const dateKey = d.diaMX;
      const idx = (countersSol.get(dateKey) ?? 0) + 1;
      countersSol.set(dateKey, idx);
      const det = movDetailMap.get(d.id);
      if (!det) continue;
      const list = cronSolMap.get(dateKey) ?? [];
      list.push({ ...det, ordenDia: idx });
      cronSolMap.set(dateKey, list);
    }

    const cronologiaMovimientos: CronologiaDia[] = Array.from(cronSolMap.entries())
      .map(([fecha, movimientos]) => ({ fecha, movimientos }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

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
      movimientosDetalle,
      cronologiaCierres,
      cronologiaMovimientos,
    };
  }
}
