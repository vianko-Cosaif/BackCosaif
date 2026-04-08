// reporteria/modelos/cronologia-empresas-model.ts
// Reporte: Cronologia por empresa con "siguiente movimiento" global

import type { AdminReporteFilters, PeriodoReporte } from './admin-model';
import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import { loadMovimientosBase } from './ceo-base';

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

export type MovimientoSiguiente = {
  id: number;
  empresa: string;
  locomotiveNumber: number;
  estado: string;
  fechaSolicitudMX: string;
  fechaFinMX: string | null;
  viaOrigen: string | null;
  viaDestino: string | null;
};

export type MovimientoCrono = MovimientoDetalle & {
  ordenDia: number;
  siguiente?: MovimientoSiguiente;
};

export type CronologiaEmpresaDia = {
  fecha: string; // yyyy-LL-dd
  movimientos: MovimientoCrono[];
};

export type EmpresaCronologia = {
  empresa: string;
  totalMovimientos: number;
  cronologia: CronologiaEmpresaDia[];
};

export type ReporteCronologiaEmpresas = {
  meta: {
    periodo: PeriodoReporte;
    etiqueta: string;
    fechaLocal: string;
    tz: string;
    rangoUTC: { desde: string; hastaExclusivo: string };
    rangoLocal: { desde: string; hastaExclusivo: string };
  };
  empresas: EmpresaCronologia[];
};

const prisma = new PrismaClient();
const MX_TZ = 'America/Mexico_City';

function fmtMX(d: Date | null, tz: string) {
  if (!d) return null;
  return DateTime.fromJSDate(d, { zone: tz }).toFormat('yyyy-LL-dd HH:mm');
}

export class CronologiaEmpresasModel {
  static async reporte(filters: AdminReporteFilters, periodo: PeriodoReporte): Promise<ReporteCronologiaEmpresas> {
    const base = await loadMovimientosBase(filters, periodo);
    const detalles = base.detalles;
    const tz = filters.tz ?? MX_TZ;

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

    const detallesMap = new Map<number, MovimientoDetalle>();
    for (const d of detalles) {
      const extra = extraMap.get(d.id);
      const incs = incByMov.get(d.id) ?? [];
      detallesMap.set(d.id, {
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
      });
    }

    // Orden global por fechaSolicitud
    const ordenGlobal = [...detalles].sort((a, b) => String(a.fechaSolicitudUTC).localeCompare(String(b.fechaSolicitudUTC)));

    const siguienteMap = new Map<number, MovimientoSiguiente | undefined>();
    for (let i = 0; i < ordenGlobal.length; i++) {
      const curr = ordenGlobal[i];
      const next = ordenGlobal[i + 1];
      if (!next) {
        siguienteMap.set(curr.id, undefined);
        continue;
      }
      const nextDet = detallesMap.get(next.id);
      if (!nextDet) continue;
      siguienteMap.set(curr.id, {
        id: nextDet.id,
        empresa: nextDet.empresa,
        locomotiveNumber: nextDet.locomotiveNumber,
        estado: nextDet.estado,
        fechaSolicitudMX: nextDet.fechaSolicitudMX,
        fechaFinMX: nextDet.fechaFinMX,
        viaOrigen: nextDet.viaOrigen,
        viaDestino: nextDet.viaDestino,
      });
    }

    // Cronologia por empresa y por dia (fechaSolicitud)
    const empresaMap = new Map<string, { total: number; mapDia: Map<string, MovimientoCrono[]> }>();
    const counters = new Map<string, Map<string, number>>(); // empresa -> fecha -> contador

    for (const d of ordenGlobal) {
      const det = detallesMap.get(d.id);
      if (!det) continue;

      const empresa = det.empresa ?? '—';
      const dateKey = d.diaMX;

      if (!empresaMap.has(empresa)) empresaMap.set(empresa, { total: 0, mapDia: new Map() });
      const emp = empresaMap.get(empresa)!;
      emp.total += 1;

      if (!counters.has(empresa)) counters.set(empresa, new Map());
      const cMap = counters.get(empresa)!;
      const idx = (cMap.get(dateKey) ?? 0) + 1;
      cMap.set(dateKey, idx);

      const list = emp.mapDia.get(dateKey) ?? [];
      list.push({ ...det, ordenDia: idx, siguiente: siguienteMap.get(d.id) });
      emp.mapDia.set(dateKey, list);
    }

    const empresas: EmpresaCronologia[] = Array.from(empresaMap.entries())
      .map(([empresa, data]) => ({
        empresa,
        totalMovimientos: data.total,
        cronologia: Array.from(data.mapDia.entries())
          .map(([fecha, movimientos]) => ({ fecha, movimientos }))
          .sort((a, b) => a.fecha.localeCompare(b.fecha)),
      }))
      .sort((a, b) => b.totalMovimientos - a.totalMovimientos);

    return {
      meta: base.meta,
      empresas,
    };
  }
}
