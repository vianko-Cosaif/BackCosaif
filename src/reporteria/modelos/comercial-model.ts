import { EstadoMovimiento, Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import { prisma } from '../../lib/prisma';

export type PeriodoComercial = 'SEMANA' | 'MES' | 'ANUAL';

export type ComercialFilters = {
  fecha: string;
  periodo: PeriodoComercial;
  tz?: string;
  empresaId?: number;
  localidadId?: number;
  locomotiveNumber?: number;
};

export type ComercialEstadoCounts = Record<EstadoMovimiento, number>;

export type ComercialMovimiento = {
  id: number;
  locomotiveNumber: number;
  empresaId: number;
  empresa: string;
  localidadId: number;
  localidad: string;
  estado: EstadoMovimiento;
  concluido: boolean;
  detenido: boolean;
  cancelado: boolean;
  torno: boolean;
  lavado: boolean;
  tornoStatus: string | null;
  lavadoStatus: string | null;
  prioridad: string;
  tipoMovimiento: string | null;
  fechaSolicitud: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  duracionMin: number | null;
  cliente: string | null;
  creadoPor: string;
  operador: string | null;
  viaOrigen: string | null;
  viaDestino: string | null;
  incidentes: number;
  incidentesAbiertos: number;
};

export type ComercialIncidente = {
  id: number;
  fuente: 'MOVIMIENTO' | 'TORNO' | 'LAVADO';
  movimientoId: number;
  locomotiveNumber: number;
  empresa: string;
  localidad: string;
  estado: string;
  descripcion: string;
  reportadoPor: string;
  fechaInicio: string;
  fechaFin: string | null;
};

export type ComercialReporte = {
  meta: {
    periodo: PeriodoComercial;
    fecha: string;
    tz: string;
    rangoLocal: { desde: string; hastaExclusivo: string };
    rangoUTC: { desde: string; hastaExclusivo: string };
    filtros: { empresaId?: number; localidadId?: number; locomotiveNumber?: number };
  };
  catalogos: {
    empresas: Array<{ id: number; nombre: string }>;
    localidades: Array<{ id: number; nombre: string; estado: string }>;
  };
  concentrado: {
    movimientosConcluidos: number;
    torneadosConcluidos: number;
    lavadosConcluidos: number;
    locomotorasAtendidas: number;
    empresasAtendidas: number;
  };
  generales: {
    totalMovimientos: number;
    concluidos: number;
    detenidos: number;
    cancelados: number;
    tornoSolicitados: number;
    lavadoSolicitados: number;
    incidentes: number;
    incidentesAbiertos: number;
    estados: ComercialEstadoCounts;
  };
  tendencia: Array<{
    clave: string;
    etiqueta: string;
    total: number;
    concluidos: number;
    detenidos: number;
    cancelados: number;
    torneados: number;
    lavados: number;
  }>;
  empresas: Array<{
    empresaId: number;
    empresa: string;
    total: number;
    concluidos: number;
    detenidos: number;
    cancelados: number;
    torneados: number;
    lavados: number;
    locomotoras: number;
    incidentes: number;
  }>;
  locomotoras: Array<{
    locomotiveNumber: number;
    empresas: string[];
    total: number;
    concluidos: number;
    detenidos: number;
    cancelados: number;
    torneados: number;
    lavados: number;
    incidentes: number;
    ultimoMovimiento: string;
  }>;
  movimientos: ComercialMovimiento[];
  incidentes: ComercialIncidente[];
};

const MX_TZ = 'America/Mexico_City';
const ESTADOS = Object.values(EstadoMovimiento);

function estadoCounts(): ComercialEstadoCounts {
  return ESTADOS.reduce((acc, estado) => {
    acc[estado] = 0;
    return acc;
  }, {} as ComercialEstadoCounts);
}

function parseFecha(fecha: string, tz: string) {
  const value = DateTime.fromISO(fecha, { zone: tz });
  if (!value.isValid || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new Error('Fecha inválida. Usa YYYY-MM-DD');
  }
  return value;
}

function rangoPeriodo(fecha: string, periodo: PeriodoComercial, tz: string) {
  const anchor = parseFecha(fecha, tz);
  const startLocal = periodo === 'SEMANA'
    ? anchor.startOf('week').startOf('day')
    : periodo === 'MES'
      ? anchor.startOf('month').startOf('day')
      : anchor.startOf('year').startOf('day');
  const endLocal = periodo === 'SEMANA'
    ? startLocal.plus({ weeks: 1 })
    : periodo === 'MES'
      ? startLocal.plus({ months: 1 })
      : startLocal.plus({ years: 1 });

  return { startLocal, endLocal, startUTC: startLocal.toUTC(), endUTC: endLocal.toUTC() };
}

function iso(value?: Date | null) {
  return value?.toISOString() ?? null;
}

function duracionMin(inicio?: Date | null, fin?: Date | null) {
  if (!inicio || !fin) return null;
  return Math.max(0, Math.round((fin.getTime() - inicio.getTime()) / 60000));
}

function servicioStatus(rows: Array<{ status: string; updatedAt: Date }>) {
  if (!rows.length) return null;
  const finalizado = rows.find((row) => row.status === 'FINALIZADO');
  if (finalizado) return finalizado.status;
  return [...rows].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]?.status ?? null;
}

function bucketKey(date: Date, periodo: PeriodoComercial, tz: string) {
  const dt = DateTime.fromJSDate(date, { zone: tz });
  return periodo === 'ANUAL' ? dt.toFormat('yyyy-LL') : dt.toFormat('yyyy-LL-dd');
}

function trendBuckets(start: DateTime, end: DateTime, periodo: PeriodoComercial) {
  const buckets: ComercialReporte['tendencia'] = [];
  let cursor = start;
  while (cursor < end) {
    const key = periodo === 'ANUAL' ? cursor.toFormat('yyyy-LL') : cursor.toFormat('yyyy-LL-dd');
    buckets.push({
      clave: key,
      etiqueta: periodo === 'ANUAL' ? cursor.toFormat('LLL') : cursor.toFormat('dd LLL'),
      total: 0,
      concluidos: 0,
      detenidos: 0,
      cancelados: 0,
      torneados: 0,
      lavados: 0,
    });
    cursor = periodo === 'ANUAL' ? cursor.plus({ months: 1 }) : cursor.plus({ days: 1 });
  }
  return buckets;
}

export class ComercialReporteriaModel {
  static async generar(filters: ComercialFilters): Promise<ComercialReporte> {
    const tz = filters.tz || MX_TZ;
    const { startLocal, endLocal, startUTC, endUTC } = rangoPeriodo(filters.fecha, filters.periodo, tz);

    const where: Prisma.MovimientoWhereInput = {
      fechaSolicitud: { gte: startUTC.toJSDate(), lt: endUTC.toJSDate() },
      ...(filters.empresaId ? { empresaId: filters.empresaId } : {}),
      ...(filters.localidadId ? { localidadId: filters.localidadId } : {}),
      ...(filters.locomotiveNumber ? { locomotiveNumber: filters.locomotiveNumber } : {}),
    };

    const [rows, empresasCatalogo, localidadesCatalogo] = await Promise.all([
      prisma.movimiento.findMany({
        where,
        orderBy: [{ fechaSolicitud: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          locomotiveNumber: true,
          estado: true,
          finalizado: true,
          torno: true,
          lavado: true,
          prioridad: true,
          tipoMovimiento: true,
          fechaSolicitud: true,
          fechaInicio: true,
          fechaFin: true,
          empresaId: true,
          localidadId: true,
          empresa: { select: { nombre: true } },
          localidad: { select: { nombre: true } },
          cliente: { select: { nombre: true } },
          creadoPor: { select: { nombre: true } },
          operador: { select: { nombre: true } },
          viaOrigen: { select: { nombre: true } },
          viaDestino: { select: { nombre: true } },
          incidentes: {
            orderBy: { fechaInicio: 'desc' },
            select: {
              id: true,
              descripcion: true,
              estado: true,
              fechaInicio: true,
              fechaFin: true,
              usuario: { select: { nombre: true } },
            },
          },
          tornos: {
            orderBy: { createdAt: 'desc' },
            select: {
              status: true,
              updatedAt: true,
              incidentes: {
                orderBy: { createdAt: 'desc' },
                select: {
                  id: true,
                  comentarios: true,
                  status: true,
                  createdAt: true,
                  updatedAt: true,
                  usuario: { select: { nombre: true } },
                },
              },
            },
          },
          lavados: {
            orderBy: { createdAt: 'desc' },
            select: {
              status: true,
              updatedAt: true,
              incidentes: {
                orderBy: { createdAt: 'desc' },
                select: {
                  id: true,
                  comentarios: true,
                  status: true,
                  createdAt: true,
                  updatedAt: true,
                  usuario: { select: { nombre: true } },
                },
              },
            },
          },
        },
      }),
      prisma.empresa.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } }),
      prisma.localidad.findMany({ select: { id: true, nombre: true, estado: true }, orderBy: { nombre: 'asc' } }),
    ]);

    const estados = estadoCounts();
    const incidentes: ComercialIncidente[] = [];
    const movimientos: ComercialMovimiento[] = [];
    const empresaMap = new Map<number, ComercialReporte['empresas'][number] & { locomotiveSet: Set<number> }>();
    const locomotiveMap = new Map<number, ComercialReporte['locomotoras'][number] & { empresaSet: Set<string> }>();
    const tendencia = trendBuckets(startLocal, endLocal, filters.periodo);
    const tendenciaMap = new Map(tendencia.map((bucket) => [bucket.clave, bucket]));

    for (const row of rows) {
      estados[row.estado] += 1;
      const normalIncidentes = row.incidentes.length;
      const tornoIncidentes = row.tornos.reduce((sum, torno) => sum + torno.incidentes.length, 0);
      const lavadoIncidentes = row.lavados.reduce((sum, lavado) => sum + lavado.incidentes.length, 0);
      const incidentesTotal = normalIncidentes + tornoIncidentes + lavadoIncidentes;
      const incidentesAbiertos = row.incidentes.filter((i) => i.estado === 'ABIERTO').length
        + row.tornos.reduce((sum, torno) => sum + torno.incidentes.filter((i) => i.status === 'ABIERTO').length, 0)
        + row.lavados.reduce((sum, lavado) => sum + lavado.incidentes.filter((i) => i.status === 'ABIERTO').length, 0);

      const movimiento: ComercialMovimiento = {
        id: row.id,
        locomotiveNumber: row.locomotiveNumber,
        empresaId: row.empresaId,
        empresa: row.empresa.nombre,
        localidadId: row.localidadId,
        localidad: row.localidad.nombre,
        estado: row.estado,
        concluido: row.estado === 'CONCLUIDO',
        detenido: row.estado === 'DETENIDO',
        cancelado: row.estado === 'CANCELADO',
        torno: Boolean(row.torno),
        lavado: Boolean(row.lavado),
        tornoStatus: servicioStatus(row.tornos),
        lavadoStatus: servicioStatus(row.lavados),
        prioridad: row.prioridad,
        tipoMovimiento: row.tipoMovimiento,
        fechaSolicitud: row.fechaSolicitud.toISOString(),
        fechaInicio: iso(row.fechaInicio),
        fechaFin: iso(row.fechaFin),
        duracionMin: duracionMin(row.fechaInicio, row.fechaFin),
        cliente: row.cliente?.nombre ?? null,
        creadoPor: row.creadoPor.nombre,
        operador: row.operador?.nombre ?? null,
        viaOrigen: row.viaOrigen?.nombre ?? null,
        viaDestino: row.viaDestino?.nombre ?? null,
        incidentes: incidentesTotal,
        incidentesAbiertos,
      };
      movimientos.push(movimiento);

      for (const incidente of row.incidentes) {
        incidentes.push({
          id: incidente.id,
          fuente: 'MOVIMIENTO',
          movimientoId: row.id,
          locomotiveNumber: row.locomotiveNumber,
          empresa: row.empresa.nombre,
          localidad: row.localidad.nombre,
          estado: incidente.estado,
          descripcion: incidente.descripcion,
          reportadoPor: incidente.usuario.nombre,
          fechaInicio: incidente.fechaInicio.toISOString(),
          fechaFin: iso(incidente.fechaFin),
        });
      }
      for (const torno of row.tornos) {
        for (const incidente of torno.incidentes) {
          incidentes.push({
            id: incidente.id,
            fuente: 'TORNO',
            movimientoId: row.id,
            locomotiveNumber: row.locomotiveNumber,
            empresa: row.empresa.nombre,
            localidad: row.localidad.nombre,
            estado: incidente.status,
            descripcion: incidente.comentarios || 'Incidente de torno',
            reportadoPor: incidente.usuario.nombre,
            fechaInicio: incidente.createdAt.toISOString(),
            fechaFin: incidente.status === 'ABIERTO' ? null : incidente.updatedAt.toISOString(),
          });
        }
      }
      for (const lavado of row.lavados) {
        for (const incidente of lavado.incidentes) {
          incidentes.push({
            id: incidente.id,
            fuente: 'LAVADO',
            movimientoId: row.id,
            locomotiveNumber: row.locomotiveNumber,
            empresa: row.empresa.nombre,
            localidad: row.localidad.nombre,
            estado: incidente.status,
            descripcion: incidente.comentarios || 'Incidente de lavado',
            reportadoPor: incidente.usuario.nombre,
            fechaInicio: incidente.createdAt.toISOString(),
            fechaFin: incidente.status === 'ABIERTO' ? null : incidente.updatedAt.toISOString(),
          });
        }
      }

      const empresa = empresaMap.get(row.empresaId) ?? {
        empresaId: row.empresaId,
        empresa: row.empresa.nombre,
        total: 0,
        concluidos: 0,
        detenidos: 0,
        cancelados: 0,
        torneados: 0,
        lavados: 0,
        locomotoras: 0,
        incidentes: 0,
        locomotiveSet: new Set<number>(),
      };
      empresa.total += 1;
      empresa.concluidos += movimiento.concluido ? 1 : 0;
      empresa.detenidos += movimiento.detenido ? 1 : 0;
      empresa.cancelados += movimiento.cancelado ? 1 : 0;
      empresa.torneados += movimiento.concluido && movimiento.torno ? 1 : 0;
      empresa.lavados += movimiento.concluido && movimiento.lavado ? 1 : 0;
      empresa.incidentes += incidentesTotal;
      empresa.locomotiveSet.add(row.locomotiveNumber);
      empresa.locomotoras = empresa.locomotiveSet.size;
      empresaMap.set(row.empresaId, empresa);

      const locomotora = locomotiveMap.get(row.locomotiveNumber) ?? {
        locomotiveNumber: row.locomotiveNumber,
        empresas: [],
        total: 0,
        concluidos: 0,
        detenidos: 0,
        cancelados: 0,
        torneados: 0,
        lavados: 0,
        incidentes: 0,
        ultimoMovimiento: row.fechaSolicitud.toISOString(),
        empresaSet: new Set<string>(),
      };
      locomotora.total += 1;
      locomotora.concluidos += movimiento.concluido ? 1 : 0;
      locomotora.detenidos += movimiento.detenido ? 1 : 0;
      locomotora.cancelados += movimiento.cancelado ? 1 : 0;
      locomotora.torneados += movimiento.concluido && movimiento.torno ? 1 : 0;
      locomotora.lavados += movimiento.concluido && movimiento.lavado ? 1 : 0;
      locomotora.incidentes += incidentesTotal;
      locomotora.empresaSet.add(row.empresa.nombre);
      locomotora.empresas = [...locomotora.empresaSet].sort();
      if (row.fechaSolicitud.toISOString() > locomotora.ultimoMovimiento) {
        locomotora.ultimoMovimiento = row.fechaSolicitud.toISOString();
      }
      locomotiveMap.set(row.locomotiveNumber, locomotora);

      const trend = tendenciaMap.get(bucketKey(row.fechaSolicitud, filters.periodo, tz));
      if (trend) {
        trend.total += 1;
        trend.concluidos += movimiento.concluido ? 1 : 0;
        trend.detenidos += movimiento.detenido ? 1 : 0;
        trend.cancelados += movimiento.cancelado ? 1 : 0;
        trend.torneados += movimiento.concluido && movimiento.torno ? 1 : 0;
        trend.lavados += movimiento.concluido && movimiento.lavado ? 1 : 0;
      }
    }

    const concluidos = movimientos.filter((movimiento) => movimiento.concluido);
    const incidentesAbiertos = incidentes.filter((incidente) => incidente.estado === 'ABIERTO').length;

    return {
      meta: {
        periodo: filters.periodo,
        fecha: filters.fecha,
        tz,
        rangoLocal: { desde: startLocal.toISO()!, hastaExclusivo: endLocal.toISO()! },
        rangoUTC: { desde: startUTC.toISO()!, hastaExclusivo: endUTC.toISO()! },
        filtros: {
          ...(filters.empresaId ? { empresaId: filters.empresaId } : {}),
          ...(filters.localidadId ? { localidadId: filters.localidadId } : {}),
          ...(filters.locomotiveNumber ? { locomotiveNumber: filters.locomotiveNumber } : {}),
        },
      },
      catalogos: { empresas: empresasCatalogo, localidades: localidadesCatalogo },
      concentrado: {
        movimientosConcluidos: concluidos.length,
        torneadosConcluidos: concluidos.filter((movimiento) => movimiento.torno).length,
        lavadosConcluidos: concluidos.filter((movimiento) => movimiento.lavado).length,
        locomotorasAtendidas: new Set(concluidos.map((movimiento) => movimiento.locomotiveNumber)).size,
        empresasAtendidas: new Set(concluidos.map((movimiento) => movimiento.empresaId)).size,
      },
      generales: {
        totalMovimientos: movimientos.length,
        concluidos: estados.CONCLUIDO,
        detenidos: estados.DETENIDO,
        cancelados: estados.CANCELADO,
        tornoSolicitados: movimientos.filter((movimiento) => movimiento.torno).length,
        lavadoSolicitados: movimientos.filter((movimiento) => movimiento.lavado).length,
        incidentes: incidentes.length,
        incidentesAbiertos,
        estados,
      },
      tendencia,
      empresas: [...empresaMap.values()]
        .map(({ locomotiveSet: _locomotiveSet, ...empresa }) => empresa)
        .sort((a, b) => b.total - a.total || a.empresa.localeCompare(b.empresa)),
      locomotoras: [...locomotiveMap.values()]
        .map(({ empresaSet: _empresaSet, ...locomotora }) => locomotora)
        .sort((a, b) => b.total - a.total || a.locomotiveNumber - b.locomotiveNumber),
      movimientos,
      incidentes: incidentes.sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio)),
    };
  }
}
