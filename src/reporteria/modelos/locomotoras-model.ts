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
  fechaSolicitudUTC: string; // ISO UTC
  fechaInicioUTC: string; // ISO UTC
  fechaFinUTC: string | null; // ISO UTC
  esperaMin: number | null; // solicitud -> inicio
  duracionMin: number | null; // inicio -> fin
  totalMin: number | null; // solicitud -> fin
  clienteNombre: string | null;
  operadorNombre: string | null;
  estado: string;
  tipoMovimiento: string | null;
  torno: boolean;
  lavado: boolean;
  empresa: string;
  localidad: string;
  solicitadoPor: string;
  viaOrigenNombre: string | null;
  viaDestinoNombre: string | null;
};

export type LocomotoraReporte = {
  locomotiveNumber: number;
  totalMovimientos: number;
  totalTorno: number;
  totalLavado: number;
  totalTornoLavado: number;
  totalSinTornoLavado: number;
  promEsperaMin: number | null;
  promDuracionMin: number | null;
  promTotalMin: number | null;
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

function minutesBetween(a?: Date | null, b?: Date | null): number | null {
  if (!a || !b) return null;
  const ms = b.getTime() - a.getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.round(ms / 60000);
}

function buildLocoBucket(locomotiveNumber: number): LocomotoraReporte {
  return {
    locomotiveNumber,
    totalMovimientos: 0,
    totalTorno: 0,
    totalLavado: 0,
    totalTornoLavado: 0,
    totalSinTornoLavado: 0,
    promEsperaMin: null,
    promDuracionMin: null,
    promTotalMin: null,
    movimientos: [],
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
        fechaSolicitud: true,
        fechaInicio: true,
        fechaFin: true,
        estado: true,
        tipoMovimiento: true,
        torno: true,
        lavado: true,
        empresa: { select: { nombre: true } },
        localidad: { select: { nombre: true } },
        creadoPor: { select: { nombre: true } },
        cliente: { select: { nombre: true } },
        operador: { select: { nombre: true } },
        viaOrigen: { select: { nombre: true } },
        viaDestino: { select: { nombre: true } },
      },
    });

    // Pre-creamos buckets para conservar locomotoras sin movimientos
    const byLoco = new Map<number, LocomotoraReporte>();
    const sums = new Map<number, { espera: number; esperaN: number; dur: number; durN: number; total: number; totalN: number }>();
    for (const n of locomotoras) {
      byLoco.set(n, buildLocoBucket(n));
      sums.set(n, { espera: 0, esperaN: 0, dur: 0, durN: 0, total: 0, totalN: 0 });
    }

    // Agrupamos movimientos por locomotora
    for (const m of movimientos) {
      const torno = !!m.torno;
      const lavado = !!m.lavado;
      const esperaMin = minutesBetween(m.fechaSolicitud, m.fechaInicio);
      const duracionMin = minutesBetween(m.fechaInicio, m.fechaFin);
      const totalMin = minutesBetween(m.fechaSolicitud, m.fechaFin);

      const row: LocomotoraMovimientoRow = {
        movimientoId: m.id,
        fechaSolicitudUTC: m.fechaSolicitud.toISOString(),
        fechaInicioUTC: m.fechaInicio!.toISOString(),
        fechaFinUTC: m.fechaFin ? m.fechaFin.toISOString() : null,
        esperaMin,
        duracionMin,
        totalMin,
        clienteNombre: m.cliente?.nombre ?? null,
        operadorNombre: m.operador?.nombre ?? null,
        estado: String(m.estado ?? '—'),
        tipoMovimiento: m.tipoMovimiento ? String(m.tipoMovimiento) : null,
        torno,
        lavado,
        empresa: m.empresa?.nombre ?? '—',
        localidad: m.localidad?.nombre ?? '—',
        solicitadoPor: m.creadoPor?.nombre ?? '—',
        viaOrigenNombre: m.viaOrigen?.nombre ?? null,
        viaDestinoNombre: m.viaDestino?.nombre ?? null,
      };

      const bucket = byLoco.get(m.locomotiveNumber) ?? {
        ...buildLocoBucket(m.locomotiveNumber),
      };

      bucket.movimientos.push(row);
      bucket.totalMovimientos += 1;
      if (torno) bucket.totalTorno += 1;
      if (lavado) bucket.totalLavado += 1;
      if (torno && lavado) bucket.totalTornoLavado += 1;
      if (!torno && !lavado) bucket.totalSinTornoLavado += 1;
      byLoco.set(m.locomotiveNumber, bucket);

      const acc = sums.get(m.locomotiveNumber)!;
      if (esperaMin !== null) { acc.espera += esperaMin; acc.esperaN += 1; }
      if (duracionMin !== null) { acc.dur += duracionMin; acc.durN += 1; }
      if (totalMin !== null) { acc.total += totalMin; acc.totalN += 1; }
    }

    // Promedios por locomotora
    for (const [loco, acc] of sums.entries()) {
      const bucket = byLoco.get(loco);
      if (!bucket) continue;
      bucket.promEsperaMin = acc.esperaN ? Math.round(acc.espera / acc.esperaN) : null;
      bucket.promDuracionMin = acc.durN ? Math.round(acc.dur / acc.durN) : null;
      bucket.promTotalMin = acc.totalN ? Math.round(acc.total / acc.totalN) : null;
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
