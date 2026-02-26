// reporteria/modelos/empresas-model.ts
// Reporte de movimientos por empresa (rango por fechaSolicitud en TZ local)
// - Recibe fechas en formato YYYY-MM-DD (TZ MX por default)
// - Filtra por empresa(s) y localidad (opcional)

import { DateTime } from 'luxon';
import { PrismaClient } from '@prisma/client';

export type EmpresasReporteFilters = {
  fechaInicio: string; // YYYY-MM-DD (local)
  fechaFin: string; // YYYY-MM-DD (local)
  tz?: string; // default America/Mexico_City
  empresaIds?: number[]; // opcional
  localidadId?: number;
};

export type EmpresaMovimientoRow = {
  movimientoId: number;
  empresaId: number;
  empresa: string;
  locomotiveNumber: number;

  fechaSolicitudUTC: string; // ISO UTC
  fechaInicioUTC: string | null; // ISO UTC
  fechaFinUTC: string | null; // ISO UTC
  esperaMin: number | null; // solicitud -> inicio
  duracionMin: number | null; // inicio -> fin
  totalMin: number | null; // solicitud -> fin

  estado: string;
  tipoMovimiento: string | null;
  torno: boolean;
  lavado: boolean;

  clienteNombre: string | null;
  operadorNombre: string | null;
  solicitadoPor: string;
  localidad: string;
  viaOrigenNombre: string | null;
  viaDestinoNombre: string | null;
};

export type EmpresaReporte = {
  empresaId: number;
  empresa: string;
  totalMovimientos: number;
  totalLocomotoras: number;
  totalTorno: number;
  totalLavado: number;
  totalTornoLavado: number;
  totalSinTornoLavado: number;
  promEsperaMin: number | null;
  promDuracionMin: number | null;
  promTotalMin: number | null;
  movimientos: EmpresaMovimientoRow[];
};

export type EmpresasReporte = {
  meta: {
    fechaInicio: string;
    fechaFin: string;
    tz: string;
    empresaIds?: number[];
    rangoUTC: { desde: string; hastaExclusivo: string };
    rangoLocal: { desde: string; hastaExclusivo: string };
  };
  empresas: EmpresaReporte[];
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

function normalizeIds(xs: any[] | undefined) {
  return Array.from(
    new Set(
      (xs ?? [])
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n))
    )
  );
}

export class EmpresasReporteriaModel {
  static async reportePorFechas(filters: EmpresasReporteFilters): Promise<EmpresasReporte> {
    const tz = filters.tz ?? 'America/Mexico_City';
    const empresaIds = normalizeIds(filters.empresaIds);

    const { startLocal, endLocal, startUTC, endUTC } = rangoFechasUTC(
      filters.fechaInicio,
      filters.fechaFin,
      tz
    );

    const movimientos = await prisma.movimiento.findMany({
      where: {
        ...(empresaIds.length ? { empresaId: { in: empresaIds } } : {}),
        ...(filters.localidadId ? { localidadId: filters.localidadId } : {}),
        fechaSolicitud: {
          gte: startUTC.toJSDate(),
          lt: endUTC.toJSDate(),
        },
      },
      orderBy: [
        { empresaId: 'asc' },
        { fechaSolicitud: 'asc' },
        { id: 'asc' },
      ],
      select: {
        id: true,
        empresaId: true,
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

    const byEmp = new Map<number, EmpresaReporte>();
    const locoSets = new Map<number, Set<number>>();
    const sums = new Map<number, { espera: number; esperaN: number; dur: number; durN: number; total: number; totalN: number }>();

    for (const m of movimientos) {
      const empId = m.empresaId;
      const empName = m.empresa?.nombre ?? '—';

      let bucket = byEmp.get(empId);
      if (!bucket) {
        bucket = {
          empresaId: empId,
          empresa: empName,
          totalMovimientos: 0,
          totalLocomotoras: 0,
          totalTorno: 0,
          totalLavado: 0,
          totalTornoLavado: 0,
          totalSinTornoLavado: 0,
          promEsperaMin: null,
          promDuracionMin: null,
          promTotalMin: null,
          movimientos: [],
        };
        byEmp.set(empId, bucket);
        locoSets.set(empId, new Set<number>());
        sums.set(empId, { espera: 0, esperaN: 0, dur: 0, durN: 0, total: 0, totalN: 0 });
      }

      const torno = !!m.torno;
      const lavado = !!m.lavado;
      const esperaMin = minutesBetween(m.fechaSolicitud, m.fechaInicio);
      const duracionMin = minutesBetween(m.fechaInicio, m.fechaFin);
      const totalMin = minutesBetween(m.fechaSolicitud, m.fechaFin);

      const row: EmpresaMovimientoRow = {
        movimientoId: m.id,
        empresaId: empId,
        empresa: empName,
        locomotiveNumber: m.locomotiveNumber,

        fechaSolicitudUTC: m.fechaSolicitud.toISOString(),
        fechaInicioUTC: m.fechaInicio ? m.fechaInicio.toISOString() : null,
        fechaFinUTC: m.fechaFin ? m.fechaFin.toISOString() : null,
        esperaMin,
        duracionMin,
        totalMin,

        estado: String(m.estado ?? '—'),
        tipoMovimiento: m.tipoMovimiento ? String(m.tipoMovimiento) : null,
        torno,
        lavado,

        clienteNombre: m.cliente?.nombre ?? null,
        operadorNombre: m.operador?.nombre ?? null,
        solicitadoPor: m.creadoPor?.nombre ?? '—',
        localidad: m.localidad?.nombre ?? '—',
        viaOrigenNombre: m.viaOrigen?.nombre ?? null,
        viaDestinoNombre: m.viaDestino?.nombre ?? null,
      };

      bucket.movimientos.push(row);
      bucket.totalMovimientos += 1;
      if (torno) bucket.totalTorno += 1;
      if (lavado) bucket.totalLavado += 1;
      if (torno && lavado) bucket.totalTornoLavado += 1;
      if (!torno && !lavado) bucket.totalSinTornoLavado += 1;

      const set = locoSets.get(empId)!;
      set.add(m.locomotiveNumber);

      const acc = sums.get(empId)!;
      if (esperaMin !== null) { acc.espera += esperaMin; acc.esperaN += 1; }
      if (duracionMin !== null) { acc.dur += duracionMin; acc.durN += 1; }
      if (totalMin !== null) { acc.total += totalMin; acc.totalN += 1; }
    }

    const empresas = Array.from(byEmp.values()).map((e) => {
      const set = locoSets.get(e.empresaId) ?? new Set<number>();
      e.totalLocomotoras = set.size;
      const acc = sums.get(e.empresaId);
      if (acc) {
        e.promEsperaMin = acc.esperaN ? Math.round(acc.espera / acc.esperaN) : null;
        e.promDuracionMin = acc.durN ? Math.round(acc.dur / acc.durN) : null;
        e.promTotalMin = acc.totalN ? Math.round(acc.total / acc.totalN) : null;
      }
      return e;
    });

    empresas.sort((a, b) => a.empresa.localeCompare(b.empresa));

    return {
      meta: {
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin,
        tz,
        empresaIds: empresaIds.length ? empresaIds : undefined,
        rangoUTC: {
          desde: startUTC.toISO()!,
          hastaExclusivo: endUTC.toISO()!,
        },
        rangoLocal: {
          desde: startLocal.toISO()!,
          hastaExclusivo: endLocal.toISO()!,
        },
      },
      empresas,
    };
  }
}
