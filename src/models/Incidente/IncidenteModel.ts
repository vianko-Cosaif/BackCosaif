// src/models/Incidentes/IncidenteModel.ts
/**
 * Modelo de acceso a datos para la entidad Incidente.
 * - Manejo de imágenes con optimización
 * - Reorganización de rondas (solo cuando Incidente lo ordena)
 * - Auto-cierre a los 10 minutos si no se resuelve
 * - Delegación FCM al NotificadorFCM (single source of truth)
 *
 * HARDENING PROD:
 * - Side-effects (FCM, recomposición, sweep) = best-effort (no tumba request)
 * - Cron interno = 1 solo líder en PM2 cluster (NODE_APP_INSTANCE === "0")
 * - Sweep vencidos = reutiliza la regla de cierre no resuelto
 */

import { PrismaClient, Incidente, EstadoIncidente, Prisma, Ronda } from '@prisma/client';
import { incidenteError } from './incidente.logger';
import { RondaModel } from '../Movimientos/Ronda/RondaModel';
import { NotificadorFCM } from '../../services/NotificadorFCM'; // <-- ajusta la ruta si difiere en tu proyecto
import {
  publishMovimientoCreadoEvent,
  publishMovimientoEstadoEvent,
  publishRealtimeEvent,
  publishRondaReordenadaEvent,
} from '../../realtime/realtimeHub';
import {
  cancelarRondaTornoPorMovimiento,
  crearRecuperacionTemporalTornoCancelado,
} from '../../services/tornoMs/tornoMsClient';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

const prisma = new PrismaClient();

/* =========================================================
 *                    DEBUG / TRACE (PM2)
 * =========================================================
 * - console.* => stdout/stderr (PM2 logs)
 * - incidenteError.* => tu logger estructurado
 * - Activa con: INCIDENTE_TRACE=1
 * - Más ruido: INCIDENTE_TRACE_VERBOSE=1
 */

const TRACE_ON = ['1', 'true', 'yes', 'on'].includes(String(process.env.INCIDENTE_TRACE ?? '').toLowerCase());
const TRACE_VERBOSE = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.INCIDENTE_TRACE_VERBOSE ?? '').toLowerCase()
);

type TraceLevel = 'debug' | 'info' | 'warn' | 'error';

function _safeJson(x: any) {
  try {
    return JSON.stringify(x);
  } catch {
    return '"[unserializable]"';
  }
}

function _nowISO() {
  return new Date().toISOString();
}

function _rid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function trace(level: TraceLevel, msg: string, meta?: Record<string, any>) {
  // debug solo con TRACE_ON
  if (level === 'debug' && !TRACE_ON) return;
  // info/warn/error siempre (para prod) si TRACE_ON está activo; si no, solo warn/error
  if (!TRACE_ON && level === 'info') return;

  const payload = {
    t: _nowISO(),
    level,
    scope: 'IncidenteModel',
    msg,
    ...(meta ? { meta } : {}),
  };

  if (level === 'error') console.error(_safeJson(payload));
  else if (level === 'warn') console.warn(_safeJson(payload));
  else console.log(_safeJson(payload));

  try {
    if (level === 'error') incidenteError.error(msg, meta);
    else if (level === 'warn') incidenteError.warn(msg, meta);
    else if (level === 'info') incidenteError.info(msg, meta);
    else incidenteError.debug?.(msg, meta);
  } catch {
    // no revientes por logging
  }
}

async function traceSpan<T>(name: string, fn: () => Promise<T>, meta?: Record<string, any>): Promise<T> {
  const start = Date.now();
  trace('info', `▶ ${name}`, meta);
  try {
    const out = await fn();
    trace('info', `✔ ${name}`, { ...(meta ?? {}), ms: Date.now() - start });
    return out;
  } catch (e: any) {
    trace('error', `✖ ${name}`, { ...(meta ?? {}), ms: Date.now() - start, error: String(e?.stack ?? e) });
    throw e;
  }
}

/* =========================================================
 *                HARDENING HELPERS (PROD)
 * ========================================================= */

function _unref(t: NodeJS.Timeout | null) {
  try {
    (t as any)?.unref?.();
  } catch {
    // ignore
  }
}

function isNoActiveRoundErr(e: any) {
  const msg = String(e?.message ?? e ?? '').toLowerCase();
  const stack = String(e?.stack ?? '').toLowerCase();
  return msg.includes('no hay ronda activa') || stack.includes('no hay ronda activa');
}

/**
 * Side-effects nunca deben tumbar el request.
 * (FCM, recomposición, sweep, etc.)
 */
async function bestEffort<T>(name: string, fn: () => Promise<T>, meta?: Record<string, any>): Promise<T | undefined> {
  try {
    return await traceSpan(name, fn, meta);
  } catch (e: any) {
    trace('warn', `${name} falló (ignorado)`, { ...(meta ?? {}), error: String(e?.stack ?? e) });
    return undefined;
  }
}

async function cancelarTornoRequeridoPorMovimiento(
  movimientoId: number,
  options: { fin: Date; razon: string },
  meta?: Record<string, any>
) {
  let lastError: unknown;

  for (let intento = 1; intento <= 3; intento += 1) {
    try {
      const result = await cancelarRondaTornoPorMovimiento(movimientoId, options);
      const status = String(result?.ronda?.status ?? '').toUpperCase();

      if (!result?.ronda?.id) {
        throw new Error(`No se encontró RondaServicio de torno para el movimiento ${movimientoId}`);
      }
      if (status !== 'CANCELADO') {
        throw new Error(`La ronda de torno quedó en estado ${status || 'DESCONOCIDO'}`);
      }

      trace('info', 'Torneado cancelado por límite de incidentes', {
        ...(meta ?? {}),
        movimientoId,
        rondaServicioId: result.ronda.id,
        intento,
      });
      return result;
    } catch (error) {
      lastError = error;
      trace('warn', 'Falló la cancelación obligatoria del torneado', {
        ...(meta ?? {}),
        movimientoId,
        intento,
        error: String((error as any)?.stack ?? error),
      });
      if (intento < 3) {
        await new Promise((resolve) => setTimeout(resolve, intento * 150));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`No se pudo cancelar el torneado del movimiento ${movimientoId}`);
}

async function crearRecuperacionTornoRequerida(
  movimiento: {
    id: number;
    torno?: boolean | null;
    locomotiveNumber?: number | null;
    localidadId?: number | null;
  },
  meta?: Record<string, any>
) {
  let lastError: unknown;

  for (let intento = 1; intento <= 3; intento += 1) {
    try {
      const recovery = await crearRecuperacionTemporalTornoCancelado(movimiento);
      const limite = new Date(recovery?.fechaLimiteActivacion ?? '');

      if (!recovery?.id || recovery?.activo !== true) {
        throw new Error(`msTorno no creó una recuperación activa para el movimiento ${movimiento.id}`);
      }
      if (String(recovery?.tipo ?? '').toUpperCase() !== 'TORNO_RECUPERACION') {
        throw new Error(`msTorno devolvió un tipo de recuperación inválido para el movimiento ${movimiento.id}`);
      }
      if (Number.isNaN(limite.getTime()) || limite.getTime() <= Date.now()) {
        throw new Error(`La recuperación del movimiento ${movimiento.id} no tiene una ventana válida`);
      }

      trace('info', 'Recuperación de torneado creada tras cancelación por incidentes', {
        ...(meta ?? {}),
        movimientoId: movimiento.id,
        tornoAgendadoId: recovery.id,
        fechaLimiteActivacion: limite.toISOString(),
        intento,
      });
      return recovery;
    } catch (error) {
      lastError = error;
      trace('warn', 'Falló la creación obligatoria de recuperación del torneado', {
        ...(meta ?? {}),
        movimientoId: movimiento.id,
        intento,
        error: String((error as any)?.stack ?? error),
      });
      if (intento < 3) {
        await new Promise((resolve) => setTimeout(resolve, intento * 150));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`No se pudo crear la recuperación del torneado ${movimiento.id}`);
}

/* =========================================================
 *                    CONSTANTES / CONFIG
 * ========================================================= */

const RESUELTO = (EstadoIncidente as unknown as Record<string, string>).RESUELTO ?? 'RESUELTO';
const IMAGEN_CONFIG = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 85,
  format: 'jpeg' as const,
  carpetaBase: path.join(process.cwd(), 'uploads', 'incidentes'),
};

export type EstadoFiltro = 'ABIERTO' | 'CERRADO' | 'RESUELTO' | 'PASADOS';

function buildWhereByEstado(estado?: EstadoFiltro) {
  if (!estado) return {};
  if (estado === 'PASADOS') return { estado: { in: [EstadoIncidente.CERRADO, RESUELTO as any] } };
  if (estado === 'RESUELTO') return { estado: RESUELTO as any };
  return { estado: estado as any };
}

export interface PaginacionIncidentes<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    estadoFiltro: EstadoFiltro | null;
  };
}

/* =========================================================
 *                       LECTURA
 * ========================================================= */

export async function listarIncidentesPaginados({
  page = 1,
  estado,
}: {
  page?: number;
  estado?: EstadoFiltro;
}): Promise<
  PaginacionIncidentes<{
    id: number;
    descripcion: string;
    estado: string;
    fechaInicio: string;
    usuario: { id: number; nombre: string };
    movimiento: { id: number; empresaId: number; localidadId: number };
  }>
> {
  const rid = _rid();
  return traceSpan(
    'listarIncidentesPaginados',
    async () => {
      const PAGE_SIZE = 20;
      const skip = (page - 1) * PAGE_SIZE;
      const where = buildWhereByEstado(estado);

      trace('info', 'listarIncidentesPaginados:params', { rid, page, estado, skip, take: PAGE_SIZE });

      const [items, total] = await Promise.all([
        prisma.incidente.findMany({
          where,
          include: {
            usuario: { select: { id: true, nombre: true } },
            movimiento: { select: { id: true, empresaId: true, localidadId: true } },
          },
          orderBy: [{ fechaInicio: 'desc' }, { id: 'desc' }],
          skip,
          take: PAGE_SIZE,
        }),
        prisma.incidente.count({ where }),
      ]);

      const data = items.map((i) => ({
        id: i.id,
        descripcion: i.descripcion,
        estado: i.estado,
        fechaInicio: i.fechaInicio.toISOString(),
        usuario: { id: i.usuario.id, nombre: i.usuario.nombre },
        movimiento: { id: i.movimiento.id, empresaId: i.movimiento.empresaId, localidadId: i.movimiento.localidadId },
      }));

      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      return {
        data,
        meta: {
          total,
          page,
          pageSize: PAGE_SIZE,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          estadoFiltro: estado ?? null,
        },
      };
    },
    { rid }
  );
}

export async function listarIncidentesPorCursor({
  cursor,
  limit = 20,
  estado,
}: {
  cursor?: { id: number } | null;
  limit?: number;
  estado?: EstadoFiltro;
}) {
  const rid = _rid();
  return traceSpan(
    'listarIncidentesPorCursor',
    async () => {
      const where = buildWhereByEstado(estado);
      const orderBy = [{ id: 'desc' as const }];

      trace('info', 'listarIncidentesPorCursor:params', { rid, cursor, limit, estado });

      const result = await prisma.incidente.findMany({
        where,
        include: {
          movimiento: { include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true } },
          usuario: { select: { id: true, nombre: true, email: true } },
        },
        orderBy,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
      });

      const hasNext = result.length > limit;
      const data = hasNext ? result.slice(0, limit) : result;
      const nextCursor = hasNext ? { id: data[data.length - 1].id } : null;

      return { data, cursor: nextCursor, hasNext, estado: estado ?? null };
    },
    { rid }
  );
}

export class IncidenteModel {
  /**
   * Auto-cierre en 10 minutos (sin periodo de bloqueo).
   */
  private static readonly TIMEOUT_CONFIG = {
    verificacion: 10 * 60 * 1000,
    bloqueo: 0,
  };
  private static readonly MAX_INCIDENTES_POR_LOCOMOTORA = 3;

  // Scheduler interno
  private static incidentSchedulerStarted = false;
  private static incidentSchedulerBootstrapping = false;
  private static incidentTimers = new Map<number, NodeJS.Timeout>();

  private static isIncidentSchedulerLeader() {
    const inst = process.env.NODE_APP_INSTANCE;
    return inst == null || String(inst) === '0';
  }

  private static clearIncidentTimer(incidenteId: number) {
    const timer = this.incidentTimers.get(incidenteId);
    if (timer) {
      clearTimeout(timer);
      this.incidentTimers.delete(incidenteId);
    }
  }

  private static scheduleIncidentAutoClose(incidenteId: number, fechaInicio: Date) {
    if (!this.isIncidentSchedulerLeader()) return;

    this.clearIncidentTimer(incidenteId);

    const cierreAtMs = fechaInicio.getTime() + this.TIMEOUT_CONFIG.verificacion;
    const delayMs = Math.max(0, cierreAtMs - Date.now());

    const timer = setTimeout(() => {
      this.incidentTimers.delete(incidenteId);
      const runId = _rid();
      void bestEffort(
        'cerrarIncidenteProgramado(timeout)',
        () => IncidenteModel.cerrarIncidenteProgramado(incidenteId),
        {
          runId,
          incidenteId,
          cierreAutomaticoAt: new Date(cierreAtMs).toISOString(),
        }
      );
    }, delayMs);

    _unref(timer);
    this.incidentTimers.set(incidenteId, timer);

    trace('info', 'Incidente programado para autocierre', {
      incidenteId,
      delayMs,
      cierreAutomaticoAt: new Date(cierreAtMs).toISOString(),
    });
  }

  private static async bootstrapIncidentScheduler() {
    if (!this.isIncidentSchedulerLeader() || this.incidentSchedulerBootstrapping) return;

    this.incidentSchedulerBootstrapping = true;
    const runId = _rid();

    try {
      const abiertos = await prisma.incidente.findMany({
        where: { estado: 'ABIERTO' },
        select: { id: true, fechaInicio: true },
        orderBy: { id: 'asc' },
      });

      for (const incidente of abiertos) {
        this.scheduleIncidentAutoClose(incidente.id, incidente.fechaInicio);
      }

      trace('info', 'Scheduler de incidentes rehidratado', {
        runId,
        abiertos: abiertos.length,
        timers: this.incidentTimers.size,
      });
    } catch (e: any) {
      trace('warn', 'Rehidratación inicial de incidentes falló', {
        runId,
        error: String(e?.stack ?? e),
      });
    } finally {
      this.incidentSchedulerBootstrapping = false;
    }
  }

  static ensureIncidentScheduler() {
    if (this.incidentSchedulerStarted) return;

    this.incidentSchedulerStarted = true;

    if (!this.isIncidentSchedulerLeader()) {
      trace('info', 'Scheduler puntual de incidentes NO iniciado (worker no líder)', {
        pid: process.pid,
        inst: process.env.NODE_APP_INSTANCE,
      });
      return;
    }

    trace('info', 'Scheduler puntual de incidentes iniciado (líder)', {
      pid: process.pid,
      inst: process.env.NODE_APP_INSTANCE,
    });

    const t = setTimeout(() => {
      void this.bootstrapIncidentScheduler();
    }, 5_000);

    _unref(t);
  }
  private static appendMovimientoComentario(base: string | null | undefined, comentario: string) {
    const limpio = String(base ?? '').trim();
    return limpio ? `${limpio} | ${comentario}` : comentario;
  }

  private static limpiarComentariosIncidente(base: string | null | undefined) {
    return String(base ?? '')
      .split('|')
      .map((segmento) => segmento.trim())
      .filter((segmento) => segmento && !/^Incidente\s+#\d+/i.test(segmento))
      .join(' | ');
  }

  private static comentarioIncidenteNoResuelto(incidenteId: number, movimientoId: number) {
    return `Incidente #${incidenteId} no resuelto para movimiento #${movimientoId}`;
  }

  /**
   * Obtiene la cadena de movimientos reprogramados a partir del movimiento actual.
   * Regla: el movimiento anterior guarda el comentario "Reprogramado en movimiento #X".
   */
  private static async obtenerCadenaMovimientos(movimientoId: number): Promise<number[]> {
    const chain: number[] = [];
    const seen = new Set<number>();
    let current = movimientoId;
    const MAX_DEPTH = 20;

    for (let i = 0; i < MAX_DEPTH; i++) {
      if (seen.has(current)) break;
      seen.add(current);
      chain.push(current);

      const token = `Reprogramado en movimiento #${current}`;
      const prev = await prisma.movimiento.findFirst({
        where: { instrucciones: { contains: token } },
        select: { id: true },
      });
      if (!prev) break;
      current = prev.id;
    }

    return chain;
  }

  static async cerrarIncidenteProgramado(incidenteId: number) {
    const rid = _rid();
    return traceSpan(
      'cerrarIncidenteProgramado',
      async () => {
        this.clearIncidentTimer(incidenteId);

        const actualizado = await prisma.incidente.updateMany({
          where: { id: incidenteId, estado: 'ABIERTO' },
          data: { estado: 'CERRADO', fechaFin: new Date() },
        });

        if (!actualizado.count) {
          trace('info', 'Autocierre omitido: incidente ya no estaba abierto', {
            rid,
            incidenteId,
          });
          return false;
        }

        await this.reprogramarMovimientoPorIncidenteNoResuelto(incidenteId);

        const incidenteCerrado = await prisma.incidente.findUnique({ where: { id: incidenteId } });
        if (incidenteCerrado) {
          await bestEffort(
            'NotificadorFCM.notificarCambioEstado(timeout)',
            () => NotificadorFCM.notificarCambioEstado(incidenteCerrado, 'ABIERTO', 'incidente_timeout'),
            { rid, incidenteId }
          );
        }

        trace('info', 'Incidente autocerrado por timeout exacto', {
          rid,
          incidenteId,
          timeoutMs: this.TIMEOUT_CONFIG.verificacion,
        });

        return true;
      },
      { rid, incidenteId }
    );
  }

  private static async reprogramarMovimientoPorIncidenteNoResuelto(incidenteId: number) {
    const rid = _rid();
    return traceSpan(
      'reprogramarMovimientoPorIncidenteNoResuelto',
      async () => {
        const incidente = await prisma.incidente.findUnique({
          where: { id: incidenteId },
          include: {
            movimiento: {
              include: { ronda: true, empresa: true, localidad: true },
            },
          },
        });
        if (!incidente) throw new Error(`No se encontró incidente con id ${incidenteId}`);

        const movimientoId = incidente.movimientoId;

        if (incidente.movimiento.finalizado) {
          trace('info', 'Reprogramación omitida: movimiento original ya quedó histórico', {
            rid,
            incidenteId,
            movimientoId,
          });

          return {
            originalMovimientoId: movimientoId,
            nuevoMovimientoId: null,
            localidadId: incidente.movimiento.localidadId,
            empresaId: incidente.movimiento.empresaId,
            prioridad: incidente.movimiento.prioridad as 'ALTA' | 'BAJA',
            reutilizoRonda: false,
          };
        }

        const cadenaMovimientos = await this.obtenerCadenaMovimientos(movimientoId);
        const totalIncidentesCadena = await prisma.incidente.count({
          where: { movimientoId: { in: cadenaMovimientos } },
        });

        if (totalIncidentesCadena >= this.MAX_INCIDENTES_POR_LOCOMOTORA) {
          const ahora = new Date();
          const comentarioBase = this.comentarioIncidenteNoResuelto(incidenteId, movimientoId);
          const comentarioCancelacion =
            `${comentarioBase}. Cancelado tras ${totalIncidentesCadena} incidentes en la misma solicitud para la locomotora #${incidente.movimiento.locomotiveNumber}.`;

          const resultado = await prisma.$transaction(async (tx) => {
            const original = await tx.movimiento.findUnique({
              where: { id: movimientoId },
            });
            if (!original) throw new Error(`No se encontró movimiento con id ${movimientoId}`);

            await tx.movimiento.update({
              where: { id: original.id },
              data: {
                estado: 'CANCELADO',
                finalizado: true,
                fechaFin: ahora,
                fechaPausa: null,
                updatedAt: ahora,
                incidenteGlobal: false,
                instrucciones: this.appendMovimientoComentario(original.instrucciones, comentarioCancelacion),
              },
            });

            await tx.ronda.deleteMany({ where: { movimientoId: original.id } });

            return {
              originalMovimientoId: original.id,
              nuevoMovimientoId: null,
              localidadId: original.localidadId,
              empresaId: original.empresaId,
              prioridad: original.prioridad as 'ALTA' | 'BAJA',
              reutilizoRonda: false,
              cancelado: true,
            };
          });

          await bestEffort(
            'RondaModel.recomponerRondasLocalidad(cancelado_por_incidentes)',
            () => RondaModel.recomponerRondasLocalidad(resultado.localidadId),
            { rid, incidenteId, localidadId: resultado.localidadId }
          );

          await bestEffort(
            'RondaModel.siguienteInteligente(cancelado_por_incidentes)',
            () => RondaModel.siguienteInteligente(resultado.localidadId),
            { rid, incidenteId, localidadId: resultado.localidadId }
          );

          const movimientoCancelado = await prisma.movimiento.findUnique({
            where: { id: movimientoId },
            include: { empresa: true, localidad: true },
          });

          if (movimientoCancelado) {
            if (movimientoCancelado.torno === true) {
              await cancelarTornoRequeridoPorMovimiento(
                movimientoCancelado.id,
                {
                  fin: ahora,
                  razon: comentarioCancelacion,
                },
                { rid, incidenteId, movimientoId }
              );

              await crearRecuperacionTornoRequerida(
                movimientoCancelado,
                { rid, incidenteId, movimientoId }
              );
            }

            await bestEffort(
              'NotificadorFCM.notificarCancelacionMovimiento(limite_incidentes)',
              () =>
                NotificadorFCM.notificarCancelacionMovimiento(
                  movimientoCancelado,
                  `Límite de ${this.MAX_INCIDENTES_POR_LOCOMOTORA} incidentes para locomotora ${movimientoCancelado.locomotiveNumber}`
                ),
              { rid, incidenteId, movimientoId }
            );
          }

          trace('warn', 'Movimiento cancelado por límite de incidentes en locomotora', {
            rid,
            incidenteId,
            movimientoId,
            locomotiveNumber: incidente.movimiento.locomotiveNumber,
            totalIncidentesCadena,
          });

          return resultado;
        }

        try {
          await traceSpan('RondaModel.gestionarIncidente', () => RondaModel.gestionarIncidente(movimientoId), {
            rid,
            incidenteId,
            movimientoId,
          });
        } catch (e: any) {
          if (isNoActiveRoundErr(e)) {
            trace('warn', 'gestionarIncidente omitido: movimiento sin ronda activa', {
              rid,
              incidenteId,
              movimientoId,
              error: String(e?.message ?? e),
            });
          } else {
            throw e;
          }
        }

        const ahora = new Date();
        const comentarioBase = this.comentarioIncidenteNoResuelto(incidenteId, movimientoId);

        const resultado = await prisma.$transaction(async (tx) => {
          const original = await tx.movimiento.findUnique({
            where: { id: movimientoId },
            include: { ronda: true },
          });
          if (!original) throw new Error(`No se encontró movimiento con id ${movimientoId}`);

          const instruccionesBase = this.limpiarComentariosIncidente(original.instrucciones);

          const nuevoMovimiento = await tx.movimiento.create({
            data: {
              empresaId: original.empresaId,
              creadoPorId: original.creadoPorId,
              clienteId: original.clienteId,
              supervisorId: original.supervisorId,
              coordinadorId: original.coordinadorId,
              operadorId: null,
              localidadId: original.localidadId,
              viaOrigenId: original.viaOrigenId,
              viaDestinoId: original.viaDestinoId,
              locomotiveNumber: original.locomotiveNumber,
              lavado: original.lavado ?? false,
              torno: original.torno ?? false,
              prioridad: original.prioridad,
              tipoMovimiento: original.tipoMovimiento,
              estado: 'SOLICITADO',
              fechaSolicitud: ahora,
              instrucciones: instruccionesBase || null,
              posicionChimenea: original.posicionChimenea,
              incidenteGlobal: false,
              direccionEmpuje: original.direccionEmpuje,
              posicionCabina: original.posicionCabina,
              finalizado: false,
            },
          });

          await tx.movimiento.update({
            where: { id: original.id },
            data: {
              estado: 'DETENIDO',
              finalizado: true,
              fechaFin: ahora,
              updatedAt: ahora,
              incidenteGlobal: false,
              instrucciones: this.appendMovimientoComentario(
                original.instrucciones,
                `${comentarioBase}. Reprogramado en movimiento #${nuevoMovimiento.id}.`
              ),
            },
          });

          const rondaActiva = await tx.ronda.findFirst({
            where: { movimientoId: original.id, concluido: false },
          });

          if (rondaActiva) {
            await tx.ronda.update({
              where: { id: rondaActiva.id },
              data: {
                movimientoId: nuevoMovimiento.id,
                empresaId: nuevoMovimiento.empresaId,
                localidadId: nuevoMovimiento.localidadId,
                concluido: false,
              },
            });
          }

          return {
            originalMovimientoId: original.id,
            nuevoMovimientoId: nuevoMovimiento.id,
            localidadId: nuevoMovimiento.localidadId,
            empresaId: nuevoMovimiento.empresaId,
            prioridad: nuevoMovimiento.prioridad as 'ALTA' | 'BAJA',
            reutilizoRonda: !!rondaActiva,
            rondaId: rondaActiva?.id ?? null,
          };
        });

        if (!resultado.reutilizoRonda) {
          await traceSpan(
            'RondaModel.generarRondaParaMovimiento',
            () =>
              RondaModel.generarRondaParaMovimiento({
                movimientoId: resultado.nuevoMovimientoId,
                empresaId: resultado.empresaId,
                localidadId: resultado.localidadId,
                prioridad: resultado.prioridad,
              }),
            { rid, incidenteId, nuevoMovimientoId: resultado.nuevoMovimientoId }
          );
        }

        const rondaFinal = await prisma.ronda.findFirst({
          where: { movimientoId: resultado.nuevoMovimientoId, concluido: false },
          select: { rondaNumero: true, orden: true },
        });

        const comentarioNuevoMovimiento = rondaFinal
          ? `${comentarioBase}. Movimiento reprogramado en ronda ${rondaFinal.rondaNumero}, posición ${rondaFinal.orden}.`
          : `${comentarioBase}. Movimiento reprogramado.`;

        await prisma.movimiento.update({
          where: { id: resultado.nuevoMovimientoId },
          data: {
            instrucciones: this.appendMovimientoComentario(
              await prisma.movimiento.findUnique({ where: { id: resultado.nuevoMovimientoId }, select: { instrucciones: true } }).then((m) => m?.instrucciones),
              comentarioNuevoMovimiento
            ),
          },
        });

        await bestEffort(
          'RondaModel.siguienteInteligente(reprogramado)',
          () => RondaModel.siguienteInteligente(resultado.localidadId),
          { rid, incidenteId, localidadId: resultado.localidadId }
        );

        const nuevoMovimientoRealtime = await prisma.movimiento.findUnique({
          where: { id: resultado.nuevoMovimientoId },
          include: { ronda: true },
        });

        if (nuevoMovimientoRealtime) {
          publishMovimientoCreadoEvent(nuevoMovimientoRealtime);
          publishMovimientoEstadoEvent({
            ...nuevoMovimientoRealtime,
            estadoAnterior: 'DETENIDO',
          });
          publishRondaReordenadaEvent({
            id: nuevoMovimientoRealtime.ronda?.id ?? resultado.rondaId,
            movimientoId: nuevoMovimientoRealtime.id,
            empresaId: nuevoMovimientoRealtime.empresaId,
            localidadId: nuevoMovimientoRealtime.localidadId,
            clienteId: nuevoMovimientoRealtime.clienteId,
            rondaIds: [nuevoMovimientoRealtime.ronda?.id ?? resultado.rondaId].filter(
              (id): id is number => Number.isFinite(Number(id))
            ),
            movimientoIds: [resultado.originalMovimientoId, resultado.nuevoMovimientoId],
            reason: 'incidente-no-resuelto-reprogramado',
          });
        }

        await bestEffort(
          'NotificadorFCM.notificarNuevoMovimiento(reprogramado)',
          () => NotificadorFCM.notificarNuevoMovimiento(resultado.nuevoMovimientoId),
          { rid, incidenteId, nuevoMovimientoId: resultado.nuevoMovimientoId }
        );

        trace('info', 'Movimiento reprogramado tras cierre no resuelto', {
          rid,
          incidenteId,
          originalMovimientoId: resultado.originalMovimientoId,
          nuevoMovimientoId: resultado.nuevoMovimientoId,
          reutilizoRonda: resultado.reutilizoRonda,
        });

        return resultado;
      },
      { rid, incidenteId }
    );
  }

  /* ======================= LECTURA ======================= */

  static async obtenerIncidentes() {
    const rid = _rid();
    return traceSpan(
      'obtenerIncidentes',
      async () => {
        return await prisma.incidente.findMany({
          include: {
            movimiento: { include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true, ronda: true } },
            usuario: { select: { id: true, nombre: true, email: true, empresa: true } },
          },
          orderBy: { fechaInicio: 'desc' },
        });
      },
      { rid }
    );
  }

  static async obtenerIncidentesPorEstado(estado: 'ABIERTO' | 'CERRADO') {
    const rid = _rid();
    return traceSpan(
      'obtenerIncidentesPorEstado',
      async () => {
        return await prisma.incidente.findMany({
          where: { estado },
          include: {
            movimiento: { include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true, ronda: true } },
            usuario: { select: { id: true, nombre: true, email: true, empresa: true } },
          },
          orderBy: { fechaInicio: 'desc' },
        });
      },
      { rid, estado }
    );
  }

  static async obtenerIncidentesPorMovimiento(movimientoId: number) {
    const rid = _rid();
    return traceSpan(
      'obtenerIncidentesPorMovimiento',
      async () => {
        return await prisma.incidente.findMany({
          where: { movimientoId },
          include: { usuario: { select: { id: true, nombre: true, email: true, empresa: true } } },
          orderBy: { fechaInicio: 'desc' },
        });
      },
      { rid, movimientoId }
    );
  }

  static async obtenerIncidentePorId(id: number) {
    const rid = _rid();
    return traceSpan(
      'obtenerIncidentePorId',
      async () => {
        const incidente = await prisma.incidente.findUnique({
          where: { id },
          include: {
            movimiento: { include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true, ronda: true } },
            usuario: { select: { id: true, nombre: true, email: true, empresa: true } },
          },
        });

        if (!incidente) throw new Error(`No existe incidente con id ${id}`);

        const rutasRelativas = [incidente.imagen1, incidente.imagen2, incidente.imagen3, incidente.imagen4].filter(
          Boolean
        ) as string[];

        return {
          id: incidente.id,
          descripcion: incidente.descripcion,
          estado: incidente.estado,
          fechaInicio: incidente.fechaInicio,
          fechaFin: incidente.fechaFin,
          usuario: incidente.usuario,
          movimiento: incidente.movimiento,
          imagenes: rutasRelativas,
        };
      },
      { rid, id }
    );
  }

  static async verificarPeriodoVerificacion(incidenteId: number) {
    const rid = _rid();
    return traceSpan(
      'verificarPeriodoVerificacion',
      async () => {
        this.ensureIncidentScheduler();

        const incidente = await prisma.incidente.findUnique({
          where: { id: incidenteId },
          select: { id: true, estado: true, fechaInicio: true, fechaFin: true },
        });

        if (!incidente) throw new Error(`No se encontró incidente con id ${incidenteId}`);

        if (incidente.estado === EstadoIncidente.ABIERTO) {
          this.scheduleIncidentAutoClose(incidente.id, incidente.fechaInicio);
        }

        const cierreAutomaticoAt = new Date(incidente.fechaInicio.getTime() + this.TIMEOUT_CONFIG.verificacion);

        if (incidente.estado === EstadoIncidente.CERRADO || incidente.estado === (RESUELTO as any)) {
          return {
            estado: incidente.estado,
            enPeriodoVerificacion: false,
            enPeriodoBloqueo: false,
            tiempoRestante: 0,
            tiempoRestanteSegundos: 0,
            timeoutMs: this.TIMEOUT_CONFIG.verificacion,
            fechaInicio: incidente.fechaInicio.toISOString(),
            fechaFin: incidente.fechaFin?.toISOString() ?? null,
            cierreAutomaticoAt: cierreAutomaticoAt.toISOString(),
            mensaje: 'Incidente ya está cerrado o resuelto',
          };
        }

        const ahora = new Date();
        const transcurrido = ahora.getTime() - incidente.fechaInicio.getTime();
        const verif = this.TIMEOUT_CONFIG.verificacion;
        const bloque = this.TIMEOUT_CONFIG.bloqueo;

        const enPeriodoVerificacion = transcurrido <= verif;
        const enPeriodoBloqueo = bloque > 0 && transcurrido > verif && transcurrido <= verif + bloque;

        let tiempoRestante = 0;
        let mensaje = '';

        if (enPeriodoVerificacion) {
          tiempoRestante = verif - transcurrido;
          mensaje = 'Periodo de verificación activo';
        } else if (enPeriodoBloqueo) {
          tiempoRestante = verif + bloque - transcurrido;
          mensaje = 'Periodo de bloqueo activo';
        } else {
          mensaje = 'Incidente puede ser cerrado';
        }

        return {
          estado: incidente.estado,
          enPeriodoVerificacion,
          enPeriodoBloqueo,
          tiempoRestante: Math.max(0, tiempoRestante),
          tiempoRestanteSegundos: Math.ceil(Math.max(0, tiempoRestante) / 1000),
          timeoutMs: this.TIMEOUT_CONFIG.verificacion,
          fechaInicio: incidente.fechaInicio.toISOString(),
          fechaFin: incidente.fechaFin?.toISOString() ?? null,
          cierreAutomaticoAt: cierreAutomaticoAt.toISOString(),
          mensaje,
        };
      },
      { rid, incidenteId }
    );
  }

  static async obtenerIncidentesPaginados(page = 1, pageSize = 30, estado?: 'ABIERTO' | 'CERRADO') {
    const rid = _rid();
    return traceSpan(
      'obtenerIncidentesPaginados',
      async () => {
        const skip = (page - 1) * pageSize;
        const whereClause: any = {};
        if (estado) whereClause.estado = estado;

        trace('info', 'obtenerIncidentesPaginados:params', { rid, page, pageSize, estado, skip });

        const [incidentes, total] = await Promise.all([
          prisma.incidente.findMany({
            where: whereClause,
            include: { movimiento: true, usuario: true },
            orderBy: { fechaInicio: 'desc' },
            skip,
            take: pageSize,
          }),
          prisma.incidente.count({ where: whereClause }),
        ]);

        return {
          data: incidentes,
          meta: {
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
            hasNextPage: page * pageSize < total,
            hasPreviousPage: page > 1,
          },
        };
      },
      { rid }
    );
  }

  static async obtenerIncidentesPorLocalidad(localidadId: number, page = 1, pageSize = 20) {
    const rid = _rid();
    return traceSpan(
      'obtenerIncidentesPorLocalidad',
      async () => {
        const skip = (page - 1) * pageSize;
        const [incidentes, total] = await Promise.all([
          prisma.incidente.findMany({
            where: { movimiento: { localidadId } },
            include: { movimiento: true, usuario: true },
            orderBy: { fechaInicio: 'desc' },
            skip,
            take: pageSize,
          }),
          prisma.incidente.count({ where: { movimiento: { localidadId } } }),
        ]);
        return {
          data: incidentes,
          meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
        };
      },
      { rid, localidadId, page, pageSize }
    );
  }

  static async obtenerIncidentesPorEmpresaYLocalidad(empresaId: number, localidadId: number, page = 1, pageSize = 20) {
    const rid = _rid();
    return traceSpan(
      'obtenerIncidentesPorEmpresaYLocalidad',
      async () => {
        const skip = (page - 1) * pageSize;
        const [incidentes, total] = await Promise.all([
          prisma.incidente.findMany({
            where: { movimiento: { empresaId, localidadId } },
            include: { movimiento: true, usuario: true },
            orderBy: { fechaInicio: 'desc' },
            skip,
            take: pageSize,
          }),
          prisma.incidente.count({ where: { movimiento: { empresaId, localidadId } } }),
        ]);
        return {
          data: incidentes,
          meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
        };
      },
      { rid, empresaId, localidadId, page, pageSize }
    );
  }

  static async obtenerIncidentesPorEmpresa(empresaId: number, page = 1, pageSize = 20) {
    const rid = _rid();
    return traceSpan(
      'obtenerIncidentesPorEmpresa',
      async () => {
        const skip = (page - 1) * pageSize;
        const [incidentes, total] = await Promise.all([
          prisma.incidente.findMany({
            where: { movimiento: { empresaId } },
            include: { movimiento: true, usuario: true },
            orderBy: { fechaInicio: 'desc' },
            skip,
            take: pageSize,
          }),
          prisma.incidente.count({ where: { movimiento: { empresaId } } }),
        ]);
        return {
          data: incidentes,
          meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
        };
      },
      { rid, empresaId, page, pageSize }
    );
  }

  /* ======================= EDITAR ======================= */

  static async editarIncidente(
    id: number,
    data: { descripcion?: string; estado?: 'ABIERTO' | 'CERRADO' | 'RESUELTO'; imagenes?: Buffer[] }
  ) {
    const rid = _rid();

    return traceSpan(
      'editarIncidente',
      async () => {
        trace('info', 'editarIncidente:start', {
          rid,
          id,
          estado: data.estado,
          hasDesc: data.descripcion !== undefined,
          imgs: data.imagenes?.length ?? 0,
        });

        const { incidenteActualizado, estadoAnterior } = await traceSpan(
          'prisma.$transaction(editarIncidente)',
          () =>
            prisma.$transaction(async (tx) => {
              trace('info', 'tx:load incidente', { rid, id });

              const actual = await tx.incidente.findUnique({
                where: { id },
                include: { movimiento: true },
              });
              if (!actual) throw new Error(`No se encontró incidente con id ${id}`);

              const updateData: any = {};
              if (data.descripcion !== undefined) updateData.descripcion = data.descripcion;

              // reemplazo de imágenes
              if (data.imagenes?.length) {
                trace('info', 'tx:reemplazo imagenes:start', { rid, id, count: data.imagenes.length });

                const anteriores = [actual.imagen1, actual.imagen2, actual.imagen3, actual.imagen4];
                for (const ruta of anteriores) {
                  if (!ruta) continue;
                  try {
                    await fs.unlink(path.join(IMAGEN_CONFIG.carpetaBase, ruta));
                    TRACE_VERBOSE && trace('debug', 'unlink imagen anterior OK', { rid, ruta });
                  } catch (err: any) {
                    trace('warn', 'No se pudo eliminar imagen anterior', {
                      rid,
                      ruta,
                      err: String(err?.message ?? err),
                    });
                  }
                }

                const rutas = await traceSpan(
                  'procesarImagenes',
                  () => IncidenteModel.procesarImagenes(data.imagenes as Buffer[], id),
                  { rid, incidenteId: id }
                );

                updateData.imagen1 = rutas[0] ?? null;
                updateData.imagen2 = rutas[1] ?? null;
                updateData.imagen3 = rutas[2] ?? null;
                updateData.imagen4 = rutas[3] ?? null;

                trace('info', 'tx:reemplazo imagenes:done', { rid, id, rutasCount: rutas.length });
              }

              if (data.estado !== undefined && data.estado !== actual.estado) {
                updateData.estado = data.estado as any;
                updateData.fechaFin = new Date();

                // RESUELTO = volver a trabajar
                if (data.estado === 'RESUELTO') {
                  trace('info', 'tx:movimiento reactivar (RESUELTO)', {
                    rid,
                    incidenteId: id,
                    movimientoId: actual.movimientoId,
                  });

                  await tx.movimiento.update({
                    where: { id: actual.movimientoId },
                    data: { estado: 'EN_PROCESO', fechaPausa: null, incidenteGlobal: false },
                  });

                  trace('info', 'Movimiento reactivado tras resolución de incidente', {
                    rid,
                    incidenteId: id,
                    movimientoId: actual.movimientoId,
                  });
                }
              }

              trace('info', 'tx:update incidente', { rid, id, patchKeys: Object.keys(updateData) });

              const upd = await tx.incidente.update({
                where: { id },
                data: updateData,
                include: { movimiento: true, usuario: { select: { id: true, nombre: true, email: true } } },
              });

              trace('info', 'tx:update incidente:done', {
                rid,
                id,
                estadoAnterior: actual.estado,
                estadoNuevo: upd.estado,
              });

              return { incidenteActualizado: upd, estadoAnterior: actual.estado };
            }),
          { rid, id }
        );

        // ======= LÓGICA AL CERRAR =======
        if (data.estado === 'CERRADO') {
          await this.reprogramarMovimientoPorIncidenteNoResuelto(id);
          trace('info', 'Cierre no resuelto ejecutado con reprogramación', {
            rid,
            incidenteId: id,
            movimientoId: incidenteActualizado.movimientoId,
          });
        }

        // ✅ Notificación centralizada = best-effort (NO 500)
        if (data.estado && data.estado !== estadoAnterior) {
          await bestEffort(
            'NotificadorFCM.notificarCambioEstado',
            () => NotificadorFCM.notificarCambioEstado(incidenteActualizado as Incidente, estadoAnterior),
            { rid, incidenteId: id, estadoAnterior, estadoNuevo: data.estado }
          );

          publishRealtimeEvent({
            type: 'incidente.estado',
            movimientoId: incidenteActualizado.movimientoId,
            empresaId: incidenteActualizado.movimiento?.empresaId,
            localidadId: incidenteActualizado.movimiento?.localidadId,
            clienteId: incidenteActualizado.movimiento?.clienteId,
            incidenteId: incidenteActualizado.id,
            estado: data.estado,
            estadoAnterior,
            incidenteGlobal: data.estado === 'ABIERTO',
            locomotiveNumber: incidenteActualizado.movimiento?.locomotiveNumber,
          });

          if (data.estado === 'RESUELTO') {
            publishMovimientoEstadoEvent({
              ...incidenteActualizado.movimiento,
              estado: 'EN_PROCESO',
              estadoAnterior: 'DETENIDO',
              incidenteGlobal: false,
            });
          }
        }

        if (data.estado === 'CERRADO' || data.estado === 'RESUELTO') {
          this.clearIncidentTimer(id);
        } else if (data.estado === 'ABIERTO' && incidenteActualizado.fechaInicio) {
          this.scheduleIncidentAutoClose(id, incidenteActualizado.fechaInicio);
        }

        trace('info', 'editarIncidente:done', { rid, id, estadoFinal: incidenteActualizado.estado });
        return incidenteActualizado;
      },
      { rid, id }
    );
  }

  /* ======================= IMÁGENES ======================= */

  private static async procesarImagenes(imagenes: Buffer[], incidenteId: number): Promise<string[]> {
    const rid = _rid();
    return traceSpan(
      'procesarImagenes',
      async () => {
        const fecha = new Date();
        const ano = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');

        const carpetaDestino = path.join(IMAGEN_CONFIG.carpetaBase, String(ano), mes, dia);
        await fs.mkdir(carpetaDestino, { recursive: true });

        trace('info', 'procesarImagenes:mkdir', { rid, incidenteId, carpetaDestino });

        const rutasGuardadas: string[] = [];
        for (let i = 0; i < imagenes.length && i < 4; i++) {
          const nombreArchivo = `incidente_${incidenteId}_imagen_${i + 1}_${Date.now()}.${IMAGEN_CONFIG.format}`;
          const rutaCompleta = path.join(carpetaDestino, nombreArchivo);

          TRACE_VERBOSE && trace('debug', 'sharp:start', { rid, incidenteId, idx: i + 1, rutaCompleta });

          await sharp(imagenes[i])
            .resize(IMAGEN_CONFIG.maxWidth, IMAGEN_CONFIG.maxHeight, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: IMAGEN_CONFIG.quality, progressive: true, mozjpeg: true })
            .toFile(rutaCompleta);

          rutasGuardadas.push(path.relative(IMAGEN_CONFIG.carpetaBase, rutaCompleta));
          TRACE_VERBOSE && trace('debug', 'sharp:done', { rid, incidenteId, idx: i + 1 });
        }

        trace('info', 'Imágenes procesadas y guardadas', {
          rid,
          incidenteId,
          cantidad: rutasGuardadas.length,
          carpeta: carpetaDestino,
        });

        return rutasGuardadas;
      },
      { rid, incidenteId, count: imagenes?.length ?? 0 }
    );
  }

  /* ===== Reglas de reorganización por incidente (explícitas) ===== */

  public static async reorganizarRondasPorIncidente(empresaId: number, localidadId: number, movimientoId: number) {
    const rid = _rid();
    return traceSpan(
      'reorganizarRondasPorIncidente',
      async () => {
        const rondaMovimiento = await prisma.ronda.findFirst({
          where: { movimientoId, localidadId, concluido: false },
          include: { movimiento: true },
        });

        if (!rondaMovimiento) {
          trace('info', 'No se encontró ronda para el movimiento', { rid, movimientoId, empresaId, localidadId });
          return;
        }

        const prioridad = rondaMovimiento.movimiento?.prioridad ?? 'BAJA';
        trace('info', 'reorganizarRondasPorIncidente:prioridad', {
          rid,
          movimientoId,
          empresaId,
          localidadId,
          prioridad,
        });

        if (prioridad === 'ALTA') {
          await traceSpan(
            'moverMovimientoARonda1AlFinal',
            () => this.moverMovimientoARonda1AlFinal(localidadId, empresaId, movimientoId),
            { rid, movimientoId, empresaId, localidadId }
          );
        } else {
          await traceSpan(
            'aplicarEfectoCadenaBaja',
            () => this.aplicarEfectoCadenaBaja(empresaId, localidadId, rondaMovimiento as any),
            { rid, movimientoId, empresaId, localidadId }
          );
        }

        await bestEffort('RondaModel.recomponerRondasLocalidad', () => RondaModel.recomponerRondasLocalidad(localidadId), {
          rid,
          localidadId,
        });
      },
      { rid, empresaId, localidadId, movimientoId }
    );
  }

  private static async moverMovimientoARonda1AlFinal(localidadId: number, empresaId: number, movimientoId: number) {
    const rid = _rid();
    return traceSpan(
      'moverMovimientoARonda1AlFinal',
      async () => {
        await prisma.$transaction(async (tx) => {
          const rondaActual = await tx.ronda.findFirst({ where: { movimientoId } });
          if (rondaActual) {
            await tx.ronda.delete({ where: { id: rondaActual.id } });
            await tx.ronda.updateMany({
              where: { localidadId, rondaNumero: rondaActual.rondaNumero, orden: { gt: rondaActual.orden } },
              data: { orden: { decrement: 1 } },
            });
          }

          const ultimoOrden = await tx.ronda.count({ where: { localidadId, rondaNumero: 1, concluido: false } });
          await tx.ronda.create({
            data: { movimientoId, empresaId, localidadId, rondaNumero: 1, orden: ultimoOrden + 1 },
          });
        });
      },
      { rid, localidadId, empresaId, movimientoId }
    );
  }

  private static async aplicarEfectoCadenaBaja(
    empresaId: number,
    localidadId: number,
    rondaMovimiento: Ronda & { movimiento: { prioridad: string } }
  ) {
    const rid = _rid();
    return traceSpan(
      'aplicarEfectoCadenaBaja',
      async () => {
        await prisma.$transaction(async (tx) => {
          const chain = await this.obtenerSlotsEmpresaDesde(tx, localidadId, empresaId, rondaMovimiento.rondaNumero);
          TRACE_VERBOSE && trace('debug', 'chain slots', { rid, len: chain.length, desdeRonda: rondaMovimiento.rondaNumero });

          if (chain.length === 0) return;

          if (chain.length === 1) {
            const nextRound = chain[0].rondaNumero + 1;
            const tam = await this.tamanoDeRonda(tx, localidadId, nextRound);
            const actual = await tx.ronda.findUnique({ where: { id: chain[0].id } });
            if (!actual) return;

            if (tam > 0) await this.moverRonda(tx, actual, nextRound, tam + 1);
            else {
              const max = await tx.ronda.aggregate({ where: { localidadId, concluido: false }, _max: { rondaNumero: true } });
              await this.moverRonda(tx, actual, (max._max.rondaNumero ?? 0) + 1, 1);
            }
            return;
          }

          let current = await tx.ronda.findUnique({ where: { id: chain[0].id } });
          if (!current) return;

          for (let i = 1; i < chain.length; i++) {
            const targetMeta = chain[i];
            const targetRow = await tx.ronda.findUnique({ where: { id: targetMeta.id } });
            if (!targetRow) continue;

            await this.moverRonda(tx, current, targetRow.rondaNumero, targetRow.orden);

            const pushed = await tx.ronda.findUnique({ where: { id: targetMeta.id } });
            if (!pushed) break;
            current = pushed;
          }

          const last = chain[chain.length - 1];
          const nextRound = last.rondaNumero + 1;
          const tam = await this.tamanoDeRonda(tx, localidadId, nextRound);

          if (tam > 0) await this.moverRonda(tx, current, nextRound, tam + 1);
          else {
            const max = await tx.ronda.aggregate({ where: { localidadId, concluido: false }, _max: { rondaNumero: true } });
            await this.moverRonda(tx, current, (max._max.rondaNumero ?? 0) + 1, 1);
          }
        });
      },
      { rid, empresaId, localidadId, desdeRonda: rondaMovimiento.rondaNumero }
    );
  }

  private static async obtenerSlotsEmpresaDesde(tx: Prisma.TransactionClient, localidadId: number, empresaId: number, desdeRonda: number) {
    const rid = _rid();
    return traceSpan(
      'obtenerSlotsEmpresaDesde',
      async () => {
        return tx.ronda.findMany({
          where: { localidadId, empresaId, concluido: false, rondaNumero: { gte: desdeRonda } },
          select: { id: true, rondaNumero: true, orden: true },
          orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
        });
      },
      { rid, localidadId, empresaId, desdeRonda }
    );
  }

  private static async tamanoDeRonda(tx: Prisma.TransactionClient, localidadId: number, rondaNumero: number) {
    const rid = _rid();
    return traceSpan(
      'tamanoDeRonda',
      async () => {
        if (!Number.isFinite(rondaNumero) || rondaNumero < 1) return 0;
        return tx.ronda.count({ where: { localidadId, rondaNumero, concluido: false } });
      },
      { rid, localidadId, rondaNumero }
    );
  }

  private static async moverRonda(tx: Prisma.TransactionClient, row: Ronda, targetRonda: number, targetOrden: number) {
    const rid = _rid();
    return traceSpan(
      'moverRonda',
      async () => {
        const sameRound = row.rondaNumero === targetRonda;

        if (sameRound) {
          if (targetOrden === row.orden) return;

          if (targetOrden > row.orden) {
            await tx.ronda.updateMany({
              where: {
                localidadId: row.localidadId,
                rondaNumero: row.rondaNumero,
                concluido: false,
                orden: { gt: row.orden, lte: targetOrden },
              },
              data: { orden: { decrement: 1 } },
            });
          } else {
            await tx.ronda.updateMany({
              where: {
                localidadId: row.localidadId,
                rondaNumero: row.rondaNumero,
                concluido: false,
                orden: { gte: targetOrden, lt: row.orden },
              },
              data: { orden: { increment: 1 } },
            });
          }

          await tx.ronda.update({ where: { id: row.id }, data: { orden: targetOrden } });
          return;
        }

        await tx.ronda.updateMany({
          where: { localidadId: row.localidadId, rondaNumero: row.rondaNumero, concluido: false, orden: { gt: row.orden } },
          data: { orden: { decrement: 1 } },
        });

        await tx.ronda.updateMany({
          where: { localidadId: row.localidadId, rondaNumero: targetRonda, concluido: false, orden: { gte: targetOrden } },
          data: { orden: { increment: 1 } },
        });

        await tx.ronda.update({ where: { id: row.id }, data: { rondaNumero: targetRonda, orden: targetOrden } });
      },
      { rid, rowId: row.id, fromRonda: row.rondaNumero, fromOrden: row.orden, targetRonda, targetOrden }
    );
  }

  /* =================== CREAR / ELIMINAR / TIMEOUTS =================== */

  static async crearIncidente(data: { descripcion: string; movimientoId: number; usuarioId: number; imagenes?: Buffer[] }) {
    const rid = _rid();
    return traceSpan(
      'crearIncidente',
      async () => {
        trace('info', 'crearIncidente:start', {
          rid,
          movimientoId: data.movimientoId,
          usuarioId: data.usuarioId,
          hasImgs: !!data.imagenes?.length,
        });

        const movimiento = await prisma.movimiento.findUnique({
          where: { id: data.movimientoId },
          include: { empresa: true, localidad: true, ronda: true },
        });
        if (!movimiento) throw new Error(`No se encontró movimiento con id ${data.movimientoId}`);

        const incidenteExistente = await prisma.incidente.findFirst({
          where: {
            movimientoId: data.movimientoId,
            usuarioId: data.usuarioId,
            descripcion: data.descripcion,
            estado: 'ABIERTO',
          },
          orderBy: { fechaInicio: 'desc' },
        });
        if (incidenteExistente) {
          trace('info', 'crearIncidente:idempotente', {
            rid,
            incidenteId: incidenteExistente.id,
            movimientoId: data.movimientoId,
          });
          return incidenteExistente;
        }

        const fechaInicioIncidente = new Date();

        const nuevoIncidente = await prisma.incidente.create({
          data: {
            descripcion: data.descripcion,
            movimientoId: data.movimientoId,
            usuarioId: data.usuarioId,
            estado: 'ABIERTO',
            fechaInicio: fechaInicioIncidente,
          },
        });

        let rutasImagenes: string[] = [];
        if (data.imagenes?.length) {
          rutasImagenes = await this.procesarImagenes(data.imagenes, nuevoIncidente.id);
        }

        const incidenteConImagenes = await prisma.incidente.update({
          where: { id: nuevoIncidente.id },
          data: {
            imagen1: rutasImagenes[0] ?? null,
            imagen2: rutasImagenes[1] ?? null,
            imagen3: rutasImagenes[2] ?? null,
            imagen4: rutasImagenes[3] ?? null,
          },
        });

        const cadenaMovimientos = await this.obtenerCadenaMovimientos(data.movimientoId);
        const totalIncidentesCadena = await prisma.incidente.count({
          where: { movimientoId: { in: cadenaMovimientos } },
        });

        if (!movimiento.finalizado && totalIncidentesCadena >= this.MAX_INCIDENTES_POR_LOCOMOTORA) {
          const ahora = new Date();
          const comentarioCancelacion =
            `Cancelado tras ${totalIncidentesCadena} incidentes en la misma solicitud para la locomotora #${movimiento.locomotiveNumber}.`;

          await prisma.$transaction(async (tx) => {
            await tx.movimiento.update({
              where: { id: movimiento.id },
              data: {
                estado: 'CANCELADO',
                finalizado: true,
                fechaFin: ahora,
                fechaPausa: null,
                updatedAt: ahora,
                incidenteGlobal: false,
                instrucciones: this.appendMovimientoComentario(movimiento.instrucciones, comentarioCancelacion),
              },
            });

            await tx.incidente.updateMany({
              where: { movimientoId: { in: cadenaMovimientos }, estado: 'ABIERTO' },
              data: { estado: 'CERRADO', fechaFin: ahora },
            });

            await tx.ronda.deleteMany({ where: { movimientoId: movimiento.id } });
          });

          for (const movimientoId of cadenaMovimientos) {
            const incidentes = await prisma.incidente.findMany({
              where: { movimientoId },
              select: { id: true },
            });
            for (const inc of incidentes) this.clearIncidentTimer(inc.id);
          }

          await bestEffort(
            'RondaModel.recomponerRondasLocalidad(cancelado_por_incidentes_al_crear)',
            () => RondaModel.recomponerRondasLocalidad(movimiento.localidadId),
            { rid, incidenteId: nuevoIncidente.id, localidadId: movimiento.localidadId }
          );

          await bestEffort(
            'RondaModel.siguienteInteligente(cancelado_por_incidentes_al_crear)',
            () => RondaModel.siguienteInteligente(movimiento.localidadId),
            { rid, incidenteId: nuevoIncidente.id, localidadId: movimiento.localidadId }
          );

          const movimientoCancelado = await prisma.movimiento.findUnique({
            where: { id: movimiento.id },
            include: { empresa: true, localidad: true },
          });

          if (movimientoCancelado?.torno === true) {
            await cancelarTornoRequeridoPorMovimiento(
              movimientoCancelado.id,
              {
                fin: ahora,
                razon: comentarioCancelacion,
              },
              { rid, incidenteId: nuevoIncidente.id, movimientoId: movimientoCancelado.id }
            );

            await crearRecuperacionTornoRequerida(
              movimientoCancelado,
              { rid, incidenteId: nuevoIncidente.id, movimientoId: movimientoCancelado.id }
            );
          }

          if (movimientoCancelado) {
            await bestEffort(
              'NotificadorFCM.notificarCancelacionMovimiento(limite_incidentes_al_crear)',
              () =>
                NotificadorFCM.notificarCancelacionMovimiento(
                  movimientoCancelado,
                  `Límite de ${this.MAX_INCIDENTES_POR_LOCOMOTORA} incidentes para locomotora ${movimientoCancelado.locomotiveNumber}`
                ),
              { rid, incidenteId: nuevoIncidente.id, movimientoId: movimientoCancelado.id }
            );
          }

          trace('warn', 'Movimiento cancelado al levantar incidente por límite de incidentes', {
            rid,
            incidenteId: nuevoIncidente.id,
            movimientoId: movimiento.id,
            locomotiveNumber: movimiento.locomotiveNumber,
            totalIncidentesCadena,
          });

          return await prisma.incidente.findUnique({
            where: { id: nuevoIncidente.id },
            include: {
              movimiento: { include: { empresa: true, localidad: true, ronda: true } },
              usuario: { select: { id: true, nombre: true, email: true, empresa: true } },
            },
          });
        }

        await prisma.movimiento.update({
          where: { id: data.movimientoId },
          data: {
            estado: 'DETENIDO',
            fechaPausa: fechaInicioIncidente,
            incidenteGlobal: true,
            ...(movimiento.fechaInicio ? {} : { fechaInicio: fechaInicioIncidente }),
          },
        });

        // El aviso realtime debe llegar a la web incluso si Firebase falla o tarda.
        publishRealtimeEvent({
          type: 'movimiento.incidente',
          movimientoId: movimiento.id,
          empresaId: movimiento.empresaId,
          localidadId: movimiento.localidadId,
          clienteId: movimiento.clienteId,
          estado: 'DETENIDO',
          incidenteGlobal: true,
          incidenteId: nuevoIncidente.id,
          descripcion: nuevoIncidente.descripcion,
          locomotiveNumber: movimiento.locomotiveNumber,
        });

        const incPlano = await prisma.incidente.findUnique({ where: { id: incidenteConImagenes.id } });
        if (incPlano) {
          await bestEffort('NotificadorFCM.notificarNuevoIncidente', () => NotificadorFCM.notificarNuevoIncidente(incPlano), {
            rid,
            incidenteId: incPlano.id,
          });
        }

        this.ensureIncidentScheduler();
        this.scheduleIncidentAutoClose(nuevoIncidente.id, nuevoIncidente.fechaInicio);

        trace('info', 'Incidente creado y procesado', {
          rid,
          incidenteId: nuevoIncidente.id,
          movimientoId: data.movimientoId,
          empresaId: movimiento.empresaId,
          localidadId: movimiento.localidadId,
          imagenesGuardadas: rutasImagenes.length,
        });

        return await prisma.incidente.findUnique({
          where: { id: nuevoIncidente.id },
          include: {
            movimiento: { include: { empresa: true, localidad: true, ronda: true } },
            usuario: { select: { id: true, nombre: true, email: true, empresa: true } },
          },
        });
      },
      { rid }
    );
  }

  static async eliminarIncidente(id: number) {
    const rid = _rid();
    return traceSpan(
      'eliminarIncidente',
      async () => {
        const incidente = await prisma.incidente.findUnique({ where: { id } });
        if (!incidente) throw new Error(`No se encontró incidente con id ${id}`);

        const imagenes = [incidente.imagen1, incidente.imagen2, incidente.imagen3, incidente.imagen4];

        for (const rutaImagen of imagenes) {
          if (!rutaImagen) continue;
          try {
            await fs.unlink(path.join(IMAGEN_CONFIG.carpetaBase, rutaImagen));
            TRACE_VERBOSE && trace('debug', 'unlink imagen OK', { rid, rutaImagen });
          } catch (error: any) {
            trace('warn', 'No se pudo eliminar imagen', { rid, rutaImagen, error: String(error?.message ?? error) });
          }
        }

        const incidenteEliminado = await prisma.incidente.delete({ where: { id } });

        trace('info', 'Incidente eliminado correctamente', {
          rid,
          incidenteId: id,
          imagenesEliminadas: imagenes.filter(Boolean).length,
        });

        this.clearIncidentTimer(id);
        return incidenteEliminado;
      },
      { rid, id }
    );
  }

  /**
   * Cierra incidentes ABIERTO con más de 10 min desde fechaInicio
   * aplicando la misma regla de cierre no resuelto.
   */
  static async cerrarIncidentesVencidos() {
    const rid = _rid();
    return traceSpan(
      'cerrarIncidentesVencidos',
      async () => {
        const tiempoLimite = new Date(Date.now() - this.TIMEOUT_CONFIG.verificacion);

        const vencidos = await prisma.incidente.findMany({
          where: { estado: 'ABIERTO', fechaInicio: { lte: tiempoLimite } },
          select: { id: true },
          orderBy: { id: 'asc' },
          take: 1000,
        });

        trace('info', 'cerrarIncidentesVencidos:scan', {
          rid,
          limiteISO: tiempoLimite.toISOString(),
          encontrados: vencidos.length,
        });

        if (!vencidos.length) return 0;

        let cerrados = 0;

        for (const incidente of vencidos) {
          await bestEffort(
            'cerrar incidente vencido con reprogramación',
            async () => {
              const ok = await this.cerrarIncidenteProgramado(incidente.id);
              if (ok) cerrados += 1;
            },
            { rid, incidenteId: incidente.id }
          );
        }

        trace('info', 'Incidentes cerrados automáticamente por timeout', {
          rid,
          cantidad: cerrados,
          limiteISO: tiempoLimite.toISOString(),
        });

        return cerrados;
      },
      { rid }
    );
  }

  static obtenerRutaCompletaImagen(rutaRelativa: string): string {
    return path.join(IMAGEN_CONFIG.carpetaBase, rutaRelativa);
  }

  /* ===================== Reglas complementarias ===================== */

  private static async esUnicaEmpresaEnRondas(empresaId: number, localidadId: number): Promise<boolean> {
    const rid = _rid();
    return traceSpan(
      'esUnicaEmpresaEnRondas',
      async () => {
        const empresas = await prisma.ronda.findMany({
          where: { localidadId, concluido: false },
          select: { empresaId: true },
          distinct: ['empresaId'],
        });
        return empresas.length === 1 && empresas[0].empresaId === empresaId;
      },
      { rid, empresaId, localidadId }
    );
  }

  static async continuarMovimiento(id: number, comentario: string): Promise<Incidente> {
    const rid = _rid();
    return traceSpan(
      'continuarMovimiento',
      async () => {
        const incidente = await prisma.incidente.findUnique({
          where: { id },
          include: { movimiento: { include: { empresa: true, localidad: true } } },
        });

        if (!incidente) throw new Error('Incidente no encontrado');
        if (incidente.estado === EstadoIncidente.CERRADO || incidente.estado === (RESUELTO as any)) {
          throw new Error('Incidente ya finalizado');
        }

        const actualizado = await prisma.incidente.update({
          where: { id },
          data: { estado: RESUELTO as any, fechaFin: new Date() },
          include: { movimiento: true },
        });

        const movimientoContinuado = await prisma.movimiento.update({
          where: { id: incidente.movimientoId },
          data: { estado: 'EN_PROCESO', fechaPausa: null, incidenteGlobal: false },
        });

        // ✅ FCM best-effort
        await bestEffort(
          'NotificadorFCM.notificarContinuarMovimiento',
          () => NotificadorFCM.notificarContinuarMovimiento(actualizado as Incidente, comentario),
          { rid, incidenteId: id }
        );

        this.clearIncidentTimer(id);

        publishRealtimeEvent({
          type: 'incidente.estado',
          movimientoId: actualizado.movimientoId,
          empresaId: movimientoContinuado.empresaId,
          localidadId: movimientoContinuado.localidadId,
          clienteId: movimientoContinuado.clienteId,
          incidenteId: actualizado.id,
          estado: RESUELTO,
          estadoAnterior: incidente.estado,
          incidenteGlobal: false,
          locomotiveNumber: movimientoContinuado.locomotiveNumber,
        });
        publishMovimientoEstadoEvent({
          ...movimientoContinuado,
          estadoAnterior: 'DETENIDO',
        });

        return actualizado;
      },
      { rid, id }
    );
  }
}
