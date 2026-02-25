// reporteria/modelos/locomotoras-model.ts
// Reporte por locomotoras (rango por fechaInicio en TZ local)
// - Filtra movimientos por locomotiveNumber y fechaInicio (UTC)
// - Recibe fechas en formato YYYY-MM-DD (TZ MX por default)

import { DateTime } from 'luxon';
import { PrismaClient } from '@prisma/client';

export type LocomotorasReporteFilters = {
  fechaInicio: string; // YYYY-MM-DD (local)
  fechaFin: string; // YYYY-MM-DD (local)
  tz?: string; // default America/Mexico_City
  locomotoras: number[]; // lista requerida
  localidadId?: number;
  empresaId?: number;
};

export type LocomotoraMovimientoRow = {
  movimientoId: number;
  fechaInicioUTC: string; // ISO UTC
  fechaFinUTC: string | null; // ISO UTC
  clienteNombre: string | null;
  operadorNombre: string | null;
};

export type LocomotoraReporte = {
  locomotiveNumber: number;
  totalMovimientos: number;
  movimientos: LocomotoraMovimientoRow[];
};

export type LocomotorasReporte = {
  meta: {
    fechaInicio: string;
    fechaFin: string;
    tz: string;
    locomotoras: number[];
    rangoUTC: { desde: string; hastaExclusivo: string };
    rangoLocal: { desde: string; hastaExclusivo: string };
  };
  locomotoras: LocomotoraReporte[];
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

function rangoFechasUTC(fechaInicio: string, fechaFin: string, tz: string) {
  const startLocal = parseFechaLocal(fechaInicio, tz).startOf('day');
  const endBase = parseFechaLocal(fechaFin, tz).startOf('day');

  if (endBase < startLocal) {
    throw new Error('fechaFin debe ser mayor o igual a fechaInicio');
  }

  const endLocal = endBase.plus({ days: 1 }); // fin exclusivo

  return {
    startLocal,
    endLocal,
    startUTC: startLocal.toUTC(),
    endUTC: endLocal.toUTC(),
  };
}

export class LocomotorasReporteriaModel {
  static async reportePorFechas(filters: LocomotorasReporteFilters): Promise<LocomotorasReporte> {
    const tz = filters.tz ?? 'America/Mexico_City';

    // Normaliza la lista de locomotoras (sin duplicados, solo números válidos)
    const locomotoras = Array.from(new Set((filters.locomotoras ?? [])
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n))));

    if (!locomotoras.length) {
      throw new Error('Debes enviar al menos una locomotora en la consulta.');
    }

    // Convierte rango local (MX) a UTC para consultar correctamente en DB
    const { startLocal, endLocal, startUTC, endUTC } = rangoFechasUTC(
      filters.fechaInicio,
      filters.fechaFin,
      tz
    );

    // Movimientos filtrados por fechaInicio (UTC) y locomotora
    const movimientos = await prisma.movimiento.findMany({
      where: {
        locomotiveNumber: { in: locomotoras },
        fechaInicio: {
          gte: startUTC.toJSDate(),
          lt: endUTC.toJSDate(),
        },
        ...(filters.localidadId ? { localidadId: filters.localidadId } : {}),
        ...(filters.empresaId ? { empresaId: filters.empresaId } : {}),
      },
      orderBy: [{ locomotiveNumber: 'asc' }, { fechaInicio: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        locomotiveNumber: true,
        fechaInicio: true,
        fechaFin: true,
        cliente: { select: { nombre: true } },
        operador: { select: { nombre: true } },
      },
    });

    // Pre-creamos buckets para conservar locomotoras sin movimientos
    const byLoco = new Map<number, LocomotoraReporte>();
    for (const n of locomotoras) {
      byLoco.set(n, { locomotiveNumber: n, totalMovimientos: 0, movimientos: [] });
    }

    // Agrupamos movimientos por locomotora
    for (const m of movimientos) {
      const row: LocomotoraMovimientoRow = {
        movimientoId: m.id,
        fechaInicioUTC: m.fechaInicio!.toISOString(),
        fechaFinUTC: m.fechaFin ? m.fechaFin.toISOString() : null,
        clienteNombre: m.cliente?.nombre ?? null,
        operadorNombre: m.operador?.nombre ?? null,
      };

      const bucket = byLoco.get(m.locomotiveNumber) ?? {
        locomotiveNumber: m.locomotiveNumber,
        totalMovimientos: 0,
        movimientos: [],
      };

      bucket.movimientos.push(row);
      bucket.totalMovimientos += 1;
      byLoco.set(m.locomotiveNumber, bucket);
    }

    // Salida final (con meta y arreglo por locomotora)
    const locomotorasOut = Array.from(byLoco.values());

    return {
      meta: {
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin,
        tz,
        locomotoras,
        rangoUTC: {
          desde: startUTC.toISO()!,
          hastaExclusivo: endUTC.toISO()!,
        },
        rangoLocal: {
          desde: startLocal.toISO()!,
          hastaExclusivo: endLocal.toISO()!,
        },
      },
      locomotoras: locomotorasOut,
    };
  }
}
