// src/models/Incidentes/IncidenteModel.ts
/**
 * Modelo de acceso a datos para la entidad Incidente.
 * - Manejo de imágenes con optimización
 * - Reorganización de rondas (solo cuando Incidente lo ordena)
 * - Auto-cierre a los 10 minutos si no se resuelve
 * - Delegación FCM al NotificadorFCM (single source of truth)
 */

import { PrismaClient, Incidente, EstadoIncidente, Prisma, Ronda } from '@prisma/client';
import { incidenteError } from './incidente.logger';
import { RondaModel } from '../Movimientos/Ronda/RondaModel';
import { NotificadorFCM } from '../../services/NotificadorFCM'; // <-- ajusta la ruta si difiere en tu proyecto
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
  if (!TRACE_ON && (level === 'info')) return;

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
 *                    CONSTANTES / CONFIG
 * ========================================================= */

const RESUELTO = (EstadoIncidente as unknown as Record<string, string>).RESUELTO ?? 'RESUELTO';
const MAX_CIERRES_NO_RESUELTOS = 3;

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

/**
 * Auto-cierre en 10 minutos (sin periodo de bloqueo).
 */
const TIMEOUT_CONFIG = {
  verificacion: 10 * 60 * 1000,
  bloqueo: 0,
};

/* =========================================================
 *               CRON INTERNO (AUTO-SWEEP VENCIDOS)
 * ========================================================= */
const CRON_INTERVAL_MS = 60_000;
let _cronStarted = false;
let _cronRunning = false;
let _cronTimer: NodeJS.Timeout | null = null;
let _lastCronRun = 0;

function _ensureCron() {
  if (_cronStarted) return;
  _cronStarted = true;

  trace('info', 'Cron interno de incidentes iniciado', { CRON_INTERVAL_MS, pid: process.pid });

  _cronTimer = setInterval(async () => {
    if (_cronRunning) return;
    if (Date.now() - _lastCronRun < CRON_INTERVAL_MS / 2) return;

    _cronRunning = true;
    const runId = _rid();

    try {
      _lastCronRun = Date.now();
      trace('info', 'Cron tick cerrarIncidentesVencidos()', { runId, CRON_INTERVAL_MS });

      await traceSpan('cerrarIncidentesVencidos(cron)', () => IncidenteModel.cerrarIncidentesVencidos(), { runId });
    } catch (e: any) {
      trace('error', 'Cron cerrarIncidentesVencidos falló', { runId, error: String(e?.stack ?? e) });
    } finally {
      _cronRunning = false;
    }
  }, CRON_INTERVAL_MS);

  setTimeout(() => {
    const runId = _rid();
    trace('info', 'Auto-sweep inicial programado', { runId, delayMs: 5000 });

    IncidenteModel.cerrarIncidentesVencidos()
      .then((n) => trace('info', 'Auto-sweep inicial OK', { runId, cerrados: n }))
      .catch((e: any) => trace('warn', 'Auto-sweep inicial falló', { runId, error: String(e?.stack ?? e) }));
  }, 5_000);
}

export class IncidenteModel {
  /* ======================= LECTURA ======================= */

  static async obtenerIncidentes() {
    const rid = _rid();
    return traceSpan(
      'obtenerIncidentes',
      async () => {
        return await prisma.incidente.findMany({
          include: {
            movimiento: {
              include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true, ronda: true },
            },
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
        const incidente = await prisma.incidente.findUnique({
          where: { id: incidenteId },
          select: { id: true, estado: true, fechaInicio: true },
        });

        if (!incidente) throw new Error(`No se encontró incidente con id ${incidenteId}`);

        if (incidente.estado === EstadoIncidente.CERRADO || incidente.estado === (RESUELTO as any)) {
          return {
            enPeriodoVerificacion: false,
            enPeriodoBloqueo: false,
            tiempoRestante: 0,
            mensaje: 'Incidente ya está cerrado o resuelto',
          };
        }

        const ahora = new Date();
        const transcurrido = ahora.getTime() - incidente.fechaInicio.getTime();
        const verif = TIMEOUT_CONFIG.verificacion;
        const bloque = TIMEOUT_CONFIG.bloqueo;

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
          enPeriodoVerificacion,
          enPeriodoBloqueo,
          tiempoRestante: Math.max(0, tiempoRestante),
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

  /* =================== ESCRITURA / UPDATE =================== */

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
                    trace('warn', 'No se pudo eliminar imagen anterior', { rid, ruta, err: String(err?.message ?? err) });
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
                  trace('info', 'tx:movimiento reactivar (RESUELTO)', { rid, incidenteId: id, movimientoId: actual.movimientoId });

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

              trace('info', 'tx:update incidente:done', { rid, id, estadoAnterior: actual.estado, estadoNuevo: upd.estado });
              return { incidenteActualizado: upd, estadoAnterior: actual.estado };
            }),
          { rid, id }
        );

        // ======= LÓGICA AL CERRAR =======
        if (data.estado === 'CERRADO') {
          const movId = incidenteActualizado.movimientoId;

          trace('info', 'post:cerrado:count cierres', { rid, incidenteId: id, movId });

          const cierres = await prisma.incidente.count({ where: { movimientoId: movId, estado: 'CERRADO' } });

          trace('info', 'post:cerrado:cierres', { rid, incidenteId: id, movId, cierres, MAX_CIERRES_NO_RESUELTOS });

          if (cierres >= MAX_CIERRES_NO_RESUELTOS) {
            trace('warn', 'post:cerrado:cancelación por reincidencia', { rid, incidenteId: id, movId, cierres });

            const mov = await prisma.movimiento.findUnique({
              where: { id: movId },
              include: { empresa: true, localidad: true },
            });

            await traceSpan(
              'prisma.$transaction(cancelar movimiento + borrar rondas)',
              () =>
                prisma.$transaction(async (tx) => {
                  await tx.movimiento.update({
                    where: { id: movId },
                    data: { finalizado: true, fechaFin: new Date(), incidenteGlobal: false, fechaPausa: null },
                  });
                  await tx.ronda.deleteMany({ where: { movimientoId: movId } });
                }),
              { rid, movId }
            );

            if (mov?.localidadId) {
              await traceSpan('RondaModel.recomponerRondasLocalidad', () => RondaModel.recomponerRondasLocalidad(mov.localidadId!), {
                rid,
                localidadId: mov.localidadId,
              });
            }

            if (mov) {
              await traceSpan('NotificadorFCM.notificarCancelacionMovimiento', () =>
                NotificadorFCM.notificarCancelacionMovimiento(mov, 'Reincidencia de incidentes'), { rid, movId });
            }

            trace('warn', 'Movimiento cancelado por múltiples cierres no resueltos', { rid, incidenteId: id, movimientoId: movId, cierres });
          } else {
            await traceSpan('RondaModel.gestionarIncidente', () => RondaModel.gestionarIncidente(movId), { rid, movId });

            // lo dejamos detenido: sigue en la ronda pero no se auto-inicia
            await traceSpan(
              'prisma.movimiento.update(DETENIDO post-cierre)',
              () =>
                prisma.movimiento.update({
                  where: { id: movId },
                  data: { estado: 'DETENIDO', fechaPausa: null, incidenteGlobal: false },
                }) as any,
              { rid, movId }
            );

            trace('info', 'Reorden ejecutado por cierre de incidente', { rid, incidenteId: id, movimientoId: movId, cierres });
          }
        }

        // Notificación centralizada
        if (data.estado && data.estado !== estadoAnterior) {
          await traceSpan(
            'NotificadorFCM.notificarCambioEstado',
            () => NotificadorFCM.notificarCambioEstado(incidenteActualizado as Incidente, estadoAnterior),
            { rid, incidenteId: id, estadoAnterior, estadoNuevo: data.estado }
          );
        }

        _ensureCron();
        try {
          await traceSpan('cerrarIncidentesVencidos(sweep inmediato)', () => this.cerrarIncidentesVencidos(), { rid });
        } catch (e: any) {
          trace('warn', 'sweep inmediato falló', { rid, error: String(e?.stack ?? e) });
        }

        trace('info', 'editarIncidente:done', { rid, id, estadoFinal: incidenteActualizado.estado });
        return incidenteActualizado;
      },
      { rid, id }
    );
  }

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
        trace('info', 'reorganizarRondasPorIncidente:prioridad', { rid, movimientoId, empresaId, localidadId, prioridad });

        if (prioridad === 'ALTA') {
          await traceSpan('moverMovimientoARonda1AlFinal', () => this.moverMovimientoARonda1AlFinal(localidadId, empresaId, movimientoId), {
            rid,
            movimientoId,
            empresaId,
            localidadId,
          });
        } else {
          await traceSpan('aplicarEfectoCadenaBaja', () => this.aplicarEfectoCadenaBaja(empresaId, localidadId, rondaMovimiento as any), {
            rid,
            movimientoId,
            empresaId,
            localidadId,
          });
        }

        await traceSpan('RondaModel.recomponerRondasLocalidad', () => RondaModel.recomponerRondasLocalidad(localidadId), {
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

  private static async obtenerSlotsEmpresaDesde(
    tx: Prisma.TransactionClient,
    localidadId: number,
    empresaId: number,
    desdeRonda: number
  ) {
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

        const nuevoIncidente = await prisma.incidente.create({
          data: {
            descripcion: data.descripcion,
            movimientoId: data.movimientoId,
            usuarioId: data.usuarioId,
            estado: 'ABIERTO',
            fechaInicio: new Date(),
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

        await prisma.movimiento.update({
          where: { id: data.movimientoId },
          data: { estado: 'DETENIDO', fechaPausa: new Date(), incidenteGlobal: true },
        });

        const incPlano = await prisma.incidente.findUnique({ where: { id: incidenteConImagenes.id } });
        if (incPlano) {
          await traceSpan('NotificadorFCM.notificarNuevoIncidente', () => NotificadorFCM.notificarNuevoIncidente(incPlano), {
            rid,
            incidenteId: incPlano.id,
          });
        }

        _ensureCron();
        try {
          await traceSpan('cerrarIncidentesVencidos(sweep inmediato)', () => this.cerrarIncidentesVencidos(), { rid });
        } catch (e: any) {
          trace('warn', 'sweep inmediato falló', { rid, error: String(e?.stack ?? e) });
        }

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

        _ensureCron();
        return incidenteEliminado;
      },
      { rid, id }
    );
  }

  /**
   * Cierra de golpe todos los incidentes ABIERTO con más de 10 min desde fechaInicio.
   * Idempotente. Úsalo en un cron (interno) que se garantiza con _ensureCron().
   */
  static async cerrarIncidentesVencidos() {
    const rid = _rid();
    return traceSpan(
      'cerrarIncidentesVencidos',
      async () => {
        const tiempoLimite = new Date(Date.now() - TIMEOUT_CONFIG.verificacion);

        const incidentesVencidos = await prisma.incidente.findMany({
          where: { estado: 'ABIERTO', fechaInicio: { lte: tiempoLimite } },
          select: { id: true },
          orderBy: { id: 'asc' },
          take: 1000,
        });

        trace('info', 'cerrarIncidentesVencidos:scan', {
          rid,
          limiteISO: tiempoLimite.toISOString(),
          encontrados: incidentesVencidos.length,
        });

        if (!incidentesVencidos.length) return 0;

        let cerrados = 0;
        for (const inc of incidentesVencidos) {
          try {
            await IncidenteModel.editarIncidente(inc.id, { estado: 'CERRADO' });
            cerrados++;
          } catch (e: any) {
            trace('error', 'Fallo cerrando incidente vencido', { rid, incidenteId: inc.id, error: String(e?.stack ?? e) });
          }
        }

        if (cerrados > 0) {
          trace('info', 'Incidentes cerrados automáticamente por timeout', {
            rid,
            cantidad: cerrados,
            limiteISO: tiempoLimite.toISOString(),
          });
        }

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

        await prisma.movimiento.update({
          where: { id: incidente.movimientoId },
          data: { estado: 'EN_PROCESO', fechaPausa: null, incidenteGlobal: false },
        });

        await traceSpan(
          'NotificadorFCM.notificarContinuarMovimiento',
          () => NotificadorFCM.notificarContinuarMovimiento(actualizado as Incidente, comentario),
          { rid, incidenteId: id }
        );

        _ensureCron();
        try {
          await traceSpan('cerrarIncidentesVencidos(sweep inmediato)', () => this.cerrarIncidentesVencidos(), { rid });
        } catch (e: any) {
          trace('warn', 'sweep inmediato falló', { rid, error: String(e?.stack ?? e) });
        }

        return actualizado;
      },
      { rid, id }
    );
  }
}
