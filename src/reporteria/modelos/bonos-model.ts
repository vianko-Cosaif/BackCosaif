// reporteria/modelos/bonos-model.ts
// Reporte de bonos por locomotora (histórico completo, muestra solo periodo solicitado)
// - Regla: bono si fechaSolicitud >= (fechaFin del último bono) + 24h
// - Solo movimientos con fechaFin pueden otorgar bono

import { DateTime } from 'luxon';
import { PrismaClient } from '@prisma/client';

export type PeriodoReporte = 'DIA' | 'SEMANA' | 'QUINCENA' | 'MES' | 'BIMESTRE' | 'SEMESTRE' | 'ANUAL';

export type BonosReporteFilters = {
  fecha: string; // YYYY-MM-DD (ancla local MX)
  periodo: PeriodoReporte;
  tz?: string; // default America/Mexico_City
};

export type BonoJustificacion = 'PRIMER_BONO' | 'BONO_24H' | 'AUN_NO_24H' | 'SIN_FIN';

export type BonoMovimientoRow = {
  movimientoId: number;
  locomotiveNumber: number;

  fechaSolicitudUTC: string; // ISO UTC
  fechaInicioUTC: string | null; // ISO UTC
  fechaFinUTC: string | null; // ISO UTC

  duracionMin: number | null; // inicio -> fin

  ultimoBonoUTC: string | null; // fechaFin del último bono antes de este movimiento
  tiempoDesdeUltimoBonoMin: number | null; // solicitud -> ultimoBono

  bonoActual: boolean;
  justificacion: BonoJustificacion;

  operadorNombre: string | null;
  clienteNombre: string | null;
  solicitadoPor: string;
  empresa: string;
  localidad: string;
};

export type BonoLocomotoraReporte = {
  locomotiveNumber: number;
  totalMovimientos: number;
  totalBonos: number;
  ultimoBonoUTC: string | null; // último bono hasta el fin del periodo
  ultimoBonoEnPeriodoUTC: string | null; // último bono dentro del periodo
  movimientos: BonoMovimientoRow[];
};

export type BonosReporte = {
  meta: {
    periodo: PeriodoReporte;
    fechaLocal: string;
    tz: string;
    rangoUTC: { desde: string; hastaExclusivo: string };
    rangoLocal: { desde: string; hastaExclusivo: string };
  };
  locomotoras: BonoLocomotoraReporte[];
};

// Prisma singleton
// eslint-disable-next-line no-var
declare global { var __PRISMA__: PrismaClient | undefined; }

const prisma: PrismaClient =
  global.__PRISMA__ ??
  new PrismaClient({
    log: process.env.PRISMA_LOG === '1' ? ['error', 'warn'] : undefined,
  });

if (process.env.NODE_ENV !== 'production') global.__PRISMA__ = prisma;

function parseFechaLocal(fechaLocal: string, tz: string) {
  const dt = DateTime.fromISO(fechaLocal, { zone: tz });
  if (!dt.isValid) throw new Error('Fecha inválida, usa YYYY-MM-DD');
  return dt;
}

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
    case 'SEMANA': {
      startLocal = anchor.startOf('week').startOf('day');
      endLocal = startLocal.plus({ weeks: 1 });
      break;
    }
    case 'QUINCENA': {
      const day = anchor.day;
      if (day <= 15) {
        startLocal = anchor.startOf('month').startOf('day');
        endLocal = startLocal.set({ day: 16 });
      } else {
        startLocal = anchor.startOf('month').set({ day: 16 }).startOf('day');
        endLocal = anchor.startOf('month').plus({ months: 1 }).startOf('day');
      }
      break;
    }
    case 'MES': {
      startLocal = anchor.startOf('month').startOf('day');
      endLocal = startLocal.plus({ months: 1 });
      break;
    }
    case 'BIMESTRE': {
      const bIndex = Math.floor((anchor.month - 1) / 2);
      const startMonth = bIndex * 2 + 1;
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

  return {
    anchor,
    startLocal,
    endLocal,
    startUTC: startLocal.toUTC(),
    endUTC: endLocal.toUTC(),
  };
}

function minutesBetween(a?: Date | null, b?: Date | null): number | null {
  if (!a || !b) return null;
  const ms = b.getTime() - a.getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.round(ms / 60000);
}

export class BonosReporteriaModel {
  static async reportePorPeriodo(filters: BonosReporteFilters): Promise<BonosReporte> {
    const tz = filters.tz ?? 'America/Mexico_City';
    const { anchor, startLocal, endLocal, startUTC, endUTC } = rangoPeriodoUTC(
      filters.fecha,
      tz,
      filters.periodo
    );

    // 1) Locomotoras con movimientos dentro del periodo (por fechaSolicitud)
    const movimientosRango = await prisma.movimiento.findMany({
      where: {
        fechaSolicitud: {
          gte: startUTC.toJSDate(),
          lt: endUTC.toJSDate(),
        },
      },
      select: { locomotiveNumber: true },
      distinct: ['locomotiveNumber'],
    });

    const locomotoras = movimientosRango.map((m) => m.locomotiveNumber);

    if (!locomotoras.length) {
      return {
        meta: {
          periodo: filters.periodo,
          fechaLocal: filters.fecha,
          tz,
          rangoUTC: { desde: startUTC.toISO()!, hastaExclusivo: endUTC.toISO()! },
          rangoLocal: { desde: startLocal.toISO()!, hastaExclusivo: endLocal.toISO()! },
        },
        locomotoras: [],
      };
    }

    // 2) Historial completo de esas locomotoras hasta el fin del periodo
    const historial = await prisma.movimiento.findMany({
      where: {
        locomotiveNumber: { in: locomotoras },
        fechaSolicitud: {
          lt: endUTC.toJSDate(),
        },
      },
      orderBy: [
        { locomotiveNumber: 'asc' },
        { fechaSolicitud: 'asc' },
        { id: 'asc' },
      ],
      select: {
        id: true,
        locomotiveNumber: true,
        fechaSolicitud: true,
        fechaInicio: true,
        fechaFin: true,
        operador: { select: { nombre: true } },
        cliente: { select: { nombre: true } },
        creadoPor: { select: { nombre: true } },
        empresa: { select: { nombre: true } },
        localidad: { select: { nombre: true } },
      },
    });

    const startMs = startUTC.toMillis();
    const endMs = endUTC.toMillis();

    const byLoco = new Map<number, {
      lastBonusFin: Date | null;
      ultimoBonoUTC: string | null;
      ultimoBonoEnPeriodoUTC: string | null;
      totalMov: number;
      totalBonos: number;
      rows: BonoMovimientoRow[];
    }>();

    for (const n of locomotoras) {
      byLoco.set(n, {
        lastBonusFin: null,
        ultimoBonoUTC: null,
        ultimoBonoEnPeriodoUTC: null,
        totalMov: 0,
        totalBonos: 0,
        rows: [],
      });
    }

    for (const m of historial) {
      if (!byLoco.has(m.locomotiveNumber)) continue;

      const bucket = byLoco.get(m.locomotiveNumber)!;
      const isInRange = m.fechaSolicitud.getTime() >= startMs && m.fechaSolicitud.getTime() < endMs;

      const lastBonusBefore = bucket.lastBonusFin;

      let bonoActual = false;
      let justificacion: BonoJustificacion = 'SIN_FIN';

      if (m.fechaFin) {
        if (!bucket.lastBonusFin) {
          bonoActual = true;
          justificacion = 'PRIMER_BONO';
          bucket.lastBonusFin = m.fechaFin;
        } else if (m.fechaSolicitud.getTime() - bucket.lastBonusFin.getTime() >= 24 * 60 * 60 * 1000) {
          bonoActual = true;
          justificacion = 'BONO_24H';
          bucket.lastBonusFin = m.fechaFin;
        } else {
          bonoActual = false;
          justificacion = 'AUN_NO_24H';
        }
      } else {
        bonoActual = false;
        justificacion = 'SIN_FIN';
      }

      if (isInRange) {
        const duracionMin = minutesBetween(m.fechaInicio, m.fechaFin);
        const tiempoDesdeUltimoBonoMin = lastBonusBefore
          ? minutesBetween(lastBonusBefore, m.fechaSolicitud)
          : null;

        const row: BonoMovimientoRow = {
          movimientoId: m.id,
          locomotiveNumber: m.locomotiveNumber,
          fechaSolicitudUTC: m.fechaSolicitud.toISOString(),
          fechaInicioUTC: m.fechaInicio ? m.fechaInicio.toISOString() : null,
          fechaFinUTC: m.fechaFin ? m.fechaFin.toISOString() : null,
          duracionMin,
          ultimoBonoUTC: lastBonusBefore ? lastBonusBefore.toISOString() : null,
          tiempoDesdeUltimoBonoMin,
          bonoActual,
          justificacion,
          operadorNombre: m.operador?.nombre ?? null,
          clienteNombre: m.cliente?.nombre ?? null,
          solicitadoPor: m.creadoPor?.nombre ?? '—',
          empresa: m.empresa?.nombre ?? '—',
          localidad: m.localidad?.nombre ?? '—',
        };

        bucket.rows.push(row);
        bucket.totalMov += 1;
        if (bonoActual) {
          bucket.totalBonos += 1;
          bucket.ultimoBonoEnPeriodoUTC = m.fechaFin ? m.fechaFin.toISOString() : bucket.ultimoBonoEnPeriodoUTC;
        }
      }

      if (bucket.lastBonusFin) {
        bucket.ultimoBonoUTC = bucket.lastBonusFin.toISOString();
      }
    }

    const locomotorasOut: BonoLocomotoraReporte[] = Array.from(byLoco.entries()).map(([locomotiveNumber, b]) => ({
      locomotiveNumber,
      totalMovimientos: b.totalMov,
      totalBonos: b.totalBonos,
      ultimoBonoUTC: b.ultimoBonoUTC,
      ultimoBonoEnPeriodoUTC: b.ultimoBonoEnPeriodoUTC,
      movimientos: b.rows,
    }));

    return {
      meta: {
        periodo: filters.periodo,
        fechaLocal: filters.fecha,
        tz,
        rangoUTC: { desde: startUTC.toISO()!, hastaExclusivo: endUTC.toISO()! },
        rangoLocal: { desde: startLocal.toISO()!, hastaExclusivo: endLocal.toISO()! },
      },
      locomotoras: locomotorasOut,
    };
  }
}
