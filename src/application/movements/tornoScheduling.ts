import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { prismaTorno } from '../../lib/servicePrisma';
import { MovimientoModel } from '../../models/Movimientos';
import { movimientoControllerLogger as log } from '../../Rutas/Movimientos/movimiento.controller.logger';
import { normalizeMedidasRuedaInput, limpiarTornoAgendadosVencidosMs, eliminarTornoAgendadoPorMovimiento, getRuedaSolicitudPorMovimiento, crearTornoAgendado, cancelarRondaTornoPorMovimiento } from '../../services/tornoMs/tornoMsClient';

const medidaSchema = z.preprocess(
  (v) => (typeof v === 'number' ? String(v) : v),
  z.string().min(1)
);

const wheelCountSchema = z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(12)]);
export const medidasTornoSchema = z.object({
  wheelCount: wheelCountSchema.optional(),
  l1: medidaSchema.optional(),
  l2: medidaSchema.optional(),
  l3: medidaSchema.optional(),
  l4: medidaSchema.optional(),
  l5: medidaSchema.optional(),
  l6: medidaSchema.optional(),
  r1: medidaSchema.optional(),
  r2: medidaSchema.optional(),
  r3: medidaSchema.optional(),
  r4: medidaSchema.optional(),
  r5: medidaSchema.optional(),
  r6: medidaSchema.optional(),
});

const TORNO_AGENDADO_PREFIX = '[TORNO_AGENDADO:';
const TORNO_AGENDADO_WINDOW_MS = 10 * 60 * 1000;
export const TORNO_RECUPERACION_TIPO = 'TORNO_RECUPERACION';
const TORNO_RECUPERACION_WINDOW_MINUTES = 5 * 60;

type TornoAgendadoMeta = {
  version: 1;
  fechaProgramada: string;
  fechaLimiteActivacion: string;
  medidasTorno: ReturnType<typeof normalizeMedidasRuedaInput>;
  creadoEn: string;
};

export const encodeTornoAgendadoMeta = (meta: TornoAgendadoMeta) =>
  `${TORNO_AGENDADO_PREFIX}${Buffer.from(JSON.stringify(meta), 'utf8').toString('base64')}]`;

export const decodeTornoAgendadoMeta = (instrucciones?: string | null): TornoAgendadoMeta | null => {
  const match = String(instrucciones ?? '').match(/\[TORNO_AGENDADO:([^\]]+)\]/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

const stripTornoAgendadoMeta = (instrucciones?: string | null) => {
  const clean = String(instrucciones ?? '')
    .replace(/\s*\[TORNO_AGENDADO:[^\]]+\]\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return clean || null;
};

export const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60 * 1000);

export const isWithinActivationWindow = (movimiento: { fechaSolicitud?: Date | string | null; instrucciones?: string | null }) => {
  const meta = decodeTornoAgendadoMeta(movimiento.instrucciones);
  const start = new Date(meta?.fechaProgramada ?? movimiento.fechaSolicitud ?? '');
  if (Number.isNaN(start.getTime())) return false;
  const limit = new Date(meta?.fechaLimiteActivacion ?? addMinutes(start, 10).toISOString());
  const now = new Date();
  return now >= start && now <= limit;
};

export const canActivateScheduledTorno = (movimiento: { fechaSolicitud?: Date | string | null; instrucciones?: string | null }) => {
  const meta = decodeTornoAgendadoMeta(movimiento.instrucciones);
  const start = new Date(meta?.fechaProgramada ?? movimiento.fechaSolicitud ?? '');
  if (Number.isNaN(start.getTime())) return false;
  const limit = new Date(meta?.fechaLimiteActivacion ?? addMinutes(start, 10).toISOString());
  return new Date() <= limit;
};

export const getScheduledPayload = (movimiento: any, helper?: any) => {
  const meta = decodeTornoAgendadoMeta(movimiento?.instrucciones);
  const tipo = String(helper?.tipo ?? 'TORNO').toUpperCase();
  const temporaryRecovery = tipo === TORNO_RECUPERACION_TIPO;
  const fechaProgramada =
    helper?.fechaProgramada ??
    meta?.fechaProgramada ??
    movimiento?.fechaSolicitud?.toISOString?.() ??
    movimiento?.fechaSolicitud ??
    null;
  return {
    id: movimiento?.id,
    locomotiveNumber: movimiento?.locomotiveNumber,
    empresaId: movimiento?.empresaId,
    localidadId: movimiento?.localidadId,
    viaOrigenId: movimiento?.viaOrigenId,
    viaDestinoId: movimiento?.viaDestinoId,
    tipoMovimiento: movimiento?.tipoMovimiento,
    prioridad: movimiento?.prioridad,
    direccionEmpuje: movimiento?.direccionEmpuje,
    posicionCabina: movimiento?.posicionCabina,
    posicionChimenea: movimiento?.posicionChimenea,
    polo: movimiento?.polo,
    fechaProgramada,
    fechaLimiteActivacion:
      helper?.fechaLimiteActivacion ??
      meta?.fechaLimiteActivacion ??
      (fechaProgramada ? addMinutes(new Date(fechaProgramada), 10).toISOString() : null),
    medidasTorno: helper?.medidasTorno ?? helper?.ruedaSolicitud ?? meta?.medidasTorno ?? null,
    instrucciones: stripTornoAgendadoMeta(movimiento?.instrucciones),
    tipo,
    temporaryRecovery,
    recovery: temporaryRecovery,
    usuarioIntentoNombre: temporaryRecovery
      ? movimiento?.cliente?.nombre ?? movimiento?.creadoPor?.nombre ?? 'correspondiente'
      : undefined,
    fechaIntento: temporaryRecovery
      ? movimiento?.fechaFin?.toISOString?.() ?? movimiento?.fechaFin ?? movimiento?.fechaSolicitud?.toISOString?.() ?? movimiento?.fechaSolicitud ?? fechaProgramada
      : undefined,
  };
};

export const isTornoRecoveryCompatible = (
  movimiento: any,
  input: {
    userId?: number | null;
    locomotiveNumber?: number | null;
    localidadId?: number | null;
    viaOrigenId?: number | null;
  }
) => {
  return (
    movimiento?.torno === true &&
    String(movimiento?.estado).toUpperCase() === 'CANCELADO' &&
    Number(movimiento?.locomotiveNumber) === Number(input.locomotiveNumber)
  );
};

export const extractMedidasFromRuedaSolicitud = (ruedaSolicitud: any): ReturnType<typeof normalizeMedidasRuedaInput> | null => {
  if (!ruedaSolicitud) return null;
  const draft = {
    wheelCount: ruedaSolicitud.wheelCount,
    l1: ruedaSolicitud.l1,
    l2: ruedaSolicitud.l2,
    l3: ruedaSolicitud.l3,
    l4: ruedaSolicitud.l4,
    l5: ruedaSolicitud.l5,
    l6: ruedaSolicitud.l6,
    r1: ruedaSolicitud.r1,
    r2: ruedaSolicitud.r2,
    r3: ruedaSolicitud.r3,
    r4: ruedaSolicitud.r4,
    r5: ruedaSolicitud.r5,
    r6: ruedaSolicitud.r6,
  };
  try {
    return normalizeMedidasRuedaInput(draft);
  } catch {
    return null;
  }
};

export const cleanupExpiredTornoSchedules = async () => {
  try {
    const expiredMs = await limpiarTornoAgendadosVencidosMs();
    const items = Array.isArray(expiredMs?.items) ? expiredMs.items : [];
    let deleted = 0;

    for (const item of items) {
      if (String(item?.tipo ?? '').toUpperCase() === TORNO_RECUPERACION_TIPO) {
        continue;
      }
      const idMovimiento = Number(item?.idMovimiento);
      if (!Number.isInteger(idMovimiento) || idMovimiento <= 0) continue;
      try {
        await MovimientoModel.eliminarMovimiento(idMovimiento);
        deleted += 1;
      } catch (error: any) {
        log.error('No se pudo eliminar movimiento agendado vencido desde índice msTorno', {
          movId: idMovimiento,
          err: error?.message,
        });
      }
    }

    return { found: items.length, deleted, source: 'msTorno' };
  } catch (error: any) {
    log.error('No se pudo limpiar índice TornoAgendado en msTorno; usando limpieza legacy', {
      err: error?.message,
    });
  }

  const fechaMaxima = new Date(Date.now() - TORNO_AGENDADO_WINDOW_MS);
  const vencidos = await prisma.movimiento.findMany({
    where: {
      torno: true,
      estado: 'AGENDADO' as any,
      finalizado: false,
      fechaSolicitud: { lt: fechaMaxima },
    },
    select: { id: true },
  });

  let deleted = 0;
  for (const mov of vencidos) {
    try {
      await MovimientoModel.eliminarMovimiento(mov.id);
      try {
        await eliminarTornoAgendadoPorMovimiento(mov.id);
      } catch (msError: any) {
        log.error('No se pudo limpiar índice TornoAgendado legacy', { movId: mov.id, err: msError?.message });
      }
      deleted += 1;
    } catch (error: any) {
      log.error('No se pudo eliminar solicitud agendada vencida', { movId: mov.id, err: error?.message });
    }
  }
  return { found: vencidos.length, deleted };
};

const saveTemporaryTornoRecovery = async (movimiento: {
  id: number;
  torno?: boolean | null;
  locomotiveNumber?: number | null;
  localidadId?: number | null;
}) => {
  if (movimiento.torno !== true) return null;
  const locomotive = Number(movimiento.locomotiveNumber);
  if (!Number.isFinite(locomotive) || locomotive <= 0) return null;

  const ruedaSolicitud = await getRuedaSolicitudPorMovimiento(movimiento.id).catch(() => null);
  if (!ruedaSolicitud) return null;

  const fechaProgramada = new Date();
  const fechaLimiteActivacion = addMinutes(fechaProgramada, TORNO_RECUPERACION_WINDOW_MINUTES);

  return crearTornoAgendado({
    locomotive,
    tipo: TORNO_RECUPERACION_TIPO,
    localidad: movimiento.localidadId ?? null,
    idMovimiento: movimiento.id,
    fechaProgramada,
    fechaLimiteActivacion,
  });
};

export const reconcileRecentTornoRecoveries = async (
  _authenticatedUserId: number,
  excludedMovementIds: number[] = [],
  scope: { empresaId?: number; localidadId?: number } = {},
) => {
  const now = new Date();
  const recoveryStart = addMinutes(now, -TORNO_RECUPERACION_WINDOW_MINUTES);
  const candidates = await prisma.movimiento.findMany({
    where: {
      torno: true,
      estado: 'CANCELADO' as any,
      fechaFin: { gte: recoveryStart },
      ...(scope.empresaId ? { empresaId: scope.empresaId } : {}),
      ...(scope.localidadId ? { localidadId: scope.localidadId } : {}),
      ...(excludedMovementIds.length ? { id: { notIn: excludedMovementIds } } : {}),
    },
    include: {
      empresa: true,
      localidad: true,
      viaOrigen: true,
      viaDestino: true,
      ronda: true,
      cliente: { select: { nombre: true } },
      creadoPor: { select: { nombre: true } },
    },
    orderBy: { fechaFin: 'desc' },
    take: 20,
  });

  const solicitudes = await prismaTorno.ruedaSolicitud.findMany({
    where: { movimientoId: { in: candidates.map(m => m.id) } }, orderBy: { id: 'desc' },
  });
  const byMovement = new Map<number, any>();
  for (const solicitud of solicitudes) if (!byMovement.has(solicitud.movimientoId)) byMovement.set(solicitud.movimientoId, solicitud);
  const recovered: any[] = [];
  for (const movimiento of candidates) {
    const ruedaSolicitud = byMovement.get(movimiento.id);
    const medidasTorno = extractMedidasFromRuedaSolicitud(ruedaSolicitud);
    if (!medidasTorno) continue;

    const fechaProgramada = movimiento.fechaFin ?? movimiento.updatedAt ?? now;
    const fechaLimiteActivacion = addMinutes(fechaProgramada, TORNO_RECUPERACION_WINDOW_MINUTES);
    if (fechaLimiteActivacion.getTime() < now.getTime()) continue;

    const helper: any = {
      idMovimiento: movimiento.id,
      locomotive: movimiento.locomotiveNumber,
      tipo: TORNO_RECUPERACION_TIPO,
      localidad: movimiento.localidadId,
      fechaProgramada,
      fechaLimiteActivacion,
      activo: true,
      medidasTorno,
      ruedaSolicitud,
    };

    recovered.push(getScheduledPayload(movimiento, {
      ...helper,
      tipo: TORNO_RECUPERACION_TIPO,
      fechaProgramada,
      fechaLimiteActivacion,
      medidasTorno: helper?.medidasTorno ?? medidasTorno,
      ruedaSolicitud: helper?.ruedaSolicitud ?? ruedaSolicitud,
    }));
  }

  return recovered;
};

export const cancelAndSaveTemporaryTornoRecovery = async (
  movimiento: {
    id: number;
    torno?: boolean | null;
    locomotiveNumber?: number | null;
    localidadId?: number | null;
  },
  options: { fin?: Date; razon?: string } = {}
) => {
  if (movimiento.torno !== true) return null;

  await cancelarRondaTornoPorMovimiento(movimiento.id, {
    fin: options.fin ?? new Date(),
    razon: options.razon,
  }).catch((error: any) =>
    log.error('No se pudo cancelar ronda de torno asociada al movimiento', {
      movId: movimiento.id,
      err: error?.message,
    })
  );

  return saveTemporaryTornoRecovery(movimiento);
};

export async function enrichWithTornoMeasures<T extends { movimiento?: { id?: number; torno?: boolean | null } | null }>(
  payload: T
): Promise<T & { tornoMedidas?: unknown | null }> {
  const movimientoId = Number(payload.movimiento?.id);
  const isTorno = payload.movimiento?.torno === true;

  if (!isTorno || !Number.isInteger(movimientoId) || movimientoId <= 0) {
    return payload;
  }

  try {
    const tornoMedidas = await getRuedaSolicitudPorMovimiento(movimientoId);
    return {
      ...payload,
      tornoMedidas,
    };
  } catch (error: any) {
    log.error('No se pudieron consultar medidas de torno en lectura de movimiento', {
      movimientoId,
      err: error?.message,
    });
    return {
      ...payload,
      tornoMedidas: null,
    };
  }
}

