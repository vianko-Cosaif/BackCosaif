// reporteria/modelos/empresa-locomotoras-model.ts
// Reporte Empresa: Concentrado de locomotoras (sin incidentes) por rango de fechas

import { DateTime } from 'luxon';
import { PrismaClient } from '@prisma/client';

export type EmpresaLocomotorasFilters = {
  empresaId: number;
  desde: string; // YYYY-MM-DD o ISO local con hora
  hasta: string; // YYYY-MM-DD o ISO local con hora
  tz?: string;
  localidadId?: number;
  usuarioNombre?: string;
};

export type EstadoCounts = Record<
  'SOLICITADO' | 'EN_PROCESO' | 'DETENIDO' | 'ESPERA' | 'MODIFICADO' | 'CONCLUIDO' | 'CANCELADO',
  number
>;

export type LocomotoraConcentrado = {
  locomotiveNumber: number;
  totalMovimientos: number;
  estados: EstadoCounts;
};

export type MovimientoDetalle = {
  id: number;
  locomotiveNumber: number;
  estado: string;
  solicitadoPor: string | null;
  cliente: string | null;
  fechaSolicitudMX: string;
  fechaInicioMX: string | null;
  fechaFinMX: string | null;
  viaOrigen: string | null;
  viaDestino: string | null;
  lavado: boolean;
  torno: boolean;
  tipoMovimiento: string | null;
  prioridad: string;
  descripcion: string;
};

export type ReporteEmpresaLocomotoras = {
  meta: {
    empresaId: number;
    empresaNombre: string | null;
    tz: string;
    rangoLocal: { desde: string; hastaExclusivo: string };
    rangoUTC: { desde: string; hastaExclusivo: string };
    localidadId?: number;
  };
  resumen: {
    totalMovimientos: number;
    totalLocomotoras: number;
    estadosGeneral: EstadoCounts;
    usuarioCliente: string;
    totalUsuarioCliente: number;
    estadosUsuarioCliente: EstadoCounts;
  };
  locomotoras: LocomotoraConcentrado[];
  movimientos: MovimientoDetalle[];
  movimientosUsuarioCliente: MovimientoDetalle[];
};

const prisma = new PrismaClient();
const MX_TZ = 'America/Mexico_City';
const DEFAULT_USUARIO_CLIENTE = 'Jesus Rodriguez';

const ESTADOS: Array<keyof EstadoCounts> = [
  'SOLICITADO',
  'EN_PROCESO',
  'DETENIDO',
  'ESPERA',
  'MODIFICADO',
  'CONCLUIDO',
  'CANCELADO',
];

function initEstadoCounts(): EstadoCounts {
  return ESTADOS.reduce((acc, k) => {
    acc[k] = 0;
    return acc;
  }, {} as EstadoCounts);
}

function parseDateLocal(iso: string, tz: string) {
  const dt = DateTime.fromISO(iso, { zone: tz });
  if (!dt.isValid) throw new Error('Fecha inválida, usa YYYY-MM-DD o YYYY-MM-DDTHH:mm');
  return dt;
}

function rangeFromDates(desde: string, hasta: string, tz: string) {
  const desdeEsDia = /^\d{4}-\d{2}-\d{2}$/.test(desde);
  const hastaEsDia = /^\d{4}-\d{2}-\d{2}$/.test(hasta);
  const exactoConHora = !desdeEsDia || !hastaEsDia;

  const startLocal = desdeEsDia ? parseDateLocal(desde, tz).startOf('day') : parseDateLocal(desde, tz);
  const endLocal = hastaEsDia ? parseDateLocal(hasta, tz).startOf('day').plus({ days: 1 }) : parseDateLocal(hasta, tz);
  if (exactoConHora ? endLocal < startLocal : endLocal <= startLocal) {
    throw new Error('Rango inválido (hasta debe ser >= desde)');
  }
  return {
    startLocal,
    endLocal,
    startUTC: startLocal.toUTC(),
    endUTC: endLocal.toUTC(),
    exactoConHora,
  };
}

function fmtMX(d: Date | null, tz: string) {
  if (!d) return null;
  return DateTime.fromJSDate(d, { zone: tz }).toFormat('yyyy-LL-dd HH:mm');
}

function descripcionMovimiento(data: {
  viaOrigen: string | null;
  viaDestino: string | null;
  lavado: boolean;
  torno: boolean;
}) {
  const { viaOrigen, viaDestino, lavado, torno } = data;
  const servicios = [lavado ? 'Lavado' : '', torno ? 'Torno' : ''].filter(Boolean).join(' + ');

  if (viaOrigen && viaDestino) {
    if (servicios) return `De ${viaOrigen} a ${viaDestino} (Servicio: ${servicios})`;
    return `De ${viaOrigen} a ${viaDestino}`;
  }

  if (servicios && viaOrigen && !viaDestino) return `De ${viaOrigen} a Servicio (${servicios})`;
  if (servicios && !viaOrigen && viaDestino) return `Servicio (${servicios}) hacia ${viaDestino}`;
  if (servicios) return `Servicio (${servicios})`;

  if (viaOrigen && !viaDestino) return `Desde ${viaOrigen} (destino no definido)`;
  if (!viaOrigen && viaDestino) return `Hacia ${viaDestino} (origen no definido)`;
  return 'Movimiento sin vía';
}

function normalizeName(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export class EmpresaLocomotorasModel {
  static async reporte(filters: EmpresaLocomotorasFilters): Promise<ReporteEmpresaLocomotoras> {
    const tz = filters.tz ?? MX_TZ;
    const { startLocal, endLocal, startUTC, endUTC, exactoConHora } = rangeFromDates(filters.desde, filters.hasta, tz);
    const usuarioCliente = String(filters.usuarioNombre ?? DEFAULT_USUARIO_CLIENTE).trim() || DEFAULT_USUARIO_CLIENTE;
    const usuarioClienteNorm = normalizeName(usuarioCliente);

    const empresa = await prisma.empresa.findUnique({
      where: { id: filters.empresaId },
      select: { nombre: true },
    });

    const movimientos = await prisma.movimiento.findMany({
      where: {
        empresaId: filters.empresaId,
        localidadId: filters.localidadId,
        fechaSolicitud: exactoConHora
          ? { gte: startUTC.toJSDate(), lte: endUTC.toJSDate() }
          : { gte: startUTC.toJSDate(), lt: endUTC.toJSDate() },
      },
      select: {
        id: true,
        locomotiveNumber: true,
        estado: true,
        fechaSolicitud: true,
        fechaInicio: true,
        fechaFin: true,
        lavado: true,
        torno: true,
        tipoMovimiento: true,
        prioridad: true,
        creadoPor: { select: { nombre: true } },
        cliente: { select: { nombre: true } },
        viaOrigen: { select: { nombre: true } },
        viaDestino: { select: { nombre: true } },
      },
      orderBy: [{ fechaSolicitud: 'asc' }, { id: 'asc' }],
    });

    const estadosGeneral = initEstadoCounts();
    const estadosUsuarioCliente = initEstadoCounts();
    const locomap = new Map<number, LocomotoraConcentrado>();

    const detalles: MovimientoDetalle[] = movimientos.map((m) => {
      const st = String(m.estado) as keyof EstadoCounts;
      if (estadosGeneral[st] !== undefined) estadosGeneral[st] += 1;

      const loco = locomap.get(m.locomotiveNumber) ?? {
        locomotiveNumber: m.locomotiveNumber,
        totalMovimientos: 0,
        estados: initEstadoCounts(),
      };
      loco.totalMovimientos += 1;
      if (loco.estados[st] !== undefined) loco.estados[st] += 1;
      locomap.set(m.locomotiveNumber, loco);

      const viaOrigen = m.viaOrigen?.nombre ?? null;
      const viaDestino = m.viaDestino?.nombre ?? null;
      const solicitadoPor = m.creadoPor?.nombre ?? null;
      const cliente = m.cliente?.nombre ?? null;

      return {
        id: m.id,
        locomotiveNumber: m.locomotiveNumber,
        estado: String(m.estado),
        solicitadoPor,
        cliente,
        fechaSolicitudMX: fmtMX(m.fechaSolicitud, tz) ?? '',
        fechaInicioMX: fmtMX(m.fechaInicio, tz),
        fechaFinMX: fmtMX(m.fechaFin, tz),
        viaOrigen,
        viaDestino,
        lavado: Boolean(m.lavado),
        torno: Boolean(m.torno),
        tipoMovimiento: m.tipoMovimiento ? String(m.tipoMovimiento) : null,
        prioridad: String(m.prioridad),
        descripcion: descripcionMovimiento({ viaOrigen, viaDestino, lavado: Boolean(m.lavado), torno: Boolean(m.torno) }),
      };
    });

    const movimientosUsuarioCliente = detalles.filter((m) => {
      const creadoPorNorm = normalizeName(m.solicitadoPor);
      const clienteNorm = normalizeName(m.cliente);
      return creadoPorNorm === usuarioClienteNorm || clienteNorm === usuarioClienteNorm;
    });

    for (const m of movimientosUsuarioCliente) {
      const st = String(m.estado) as keyof EstadoCounts;
      if (estadosUsuarioCliente[st] !== undefined) estadosUsuarioCliente[st] += 1;
    }

    const locomotoras = Array.from(locomap.values()).sort(
      (a, b) => b.totalMovimientos - a.totalMovimientos
    );

    return {
      meta: {
        empresaId: filters.empresaId,
        empresaNombre: empresa?.nombre ?? null,
        tz,
        rangoLocal: { desde: startLocal.toISO()!, hastaExclusivo: endLocal.toISO()! },
        rangoUTC: { desde: startUTC.toISO()!, hastaExclusivo: endUTC.toISO()! },
        localidadId: filters.localidadId,
      },
      resumen: {
        totalMovimientos: movimientos.length,
        totalLocomotoras: locomotoras.length,
        estadosGeneral,
        usuarioCliente,
        totalUsuarioCliente: movimientosUsuarioCliente.length,
        estadosUsuarioCliente,
      },
      locomotoras,
      movimientos: detalles,
      movimientosUsuarioCliente,
    };
  }
}
