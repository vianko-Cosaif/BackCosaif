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
}): Promise<PaginacionIncidentes<{
  id: number;
  descripcion: string;
  estado: string;
  fechaInicio: string;
  usuario: { id: number; nombre: string };
  movimiento: { id: number; empresaId: number; localidadId: number };
}>> {
  const PAGE_SIZE = 20;
  const skip = (page - 1) * PAGE_SIZE;
  const where = buildWhereByEstado(estado);

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
  const where = buildWhereByEstado(estado);
  const orderBy = [{ id: 'desc' as const }];

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

  _cronTimer = setInterval(async () => {
    if (_cronRunning) return;
    if (Date.now() - _lastCronRun < CRON_INTERVAL_MS / 2) return;

    _cronRunning = true;
    try {
      _lastCronRun = Date.now();
      await IncidenteModel.cerrarIncidentesVencidos();
    } catch (e) {
      incidenteError.error('Cron cerrarIncidentesVencidos falló', { error: String(e) });
    } finally {
      _cronRunning = false;
    }
  }, CRON_INTERVAL_MS);

  setTimeout(() => {
    IncidenteModel.cerrarIncidentesVencidos().catch((e) =>
      incidenteError.warn('Auto-sweep inicial falló', { error: String(e) })
    );
  }, 5_000);

  incidenteError.info('Cron interno de incidentes iniciado', { CRON_INTERVAL_MS });
}

export class IncidenteModel {
  /* ======================= LECTURA ======================= */

  static async obtenerIncidentes() {
    try {
      return await prisma.incidente.findMany({
        include: {
          movimiento: {
            include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true, ronda: true },
          },
          usuario: { select: { id: true, nombre: true, email: true, empresa: true } },
        },
        orderBy: { fechaInicio: 'desc' },
      });
    } catch (error) {
      incidenteError.error('Error al obtener incidentes', { error });
      throw new Error('Error al obtener incidentes');
    }
  }

  static async obtenerIncidentesPorEstado(estado: 'ABIERTO' | 'CERRADO') {
    try {
      return await prisma.incidente.findMany({
        where: { estado },
        include: {
          movimiento: { include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true, ronda: true } },
          usuario: { select: { id: true, nombre: true, email: true, empresa: true } },
        },
        orderBy: { fechaInicio: 'desc' },
      });
    } catch (error) {
      incidenteError.error('Error al obtener incidentes por estado', { estado, error });
      throw new Error('Error al obtener incidentes por estado');
    }
  }

  static async obtenerIncidentesPorMovimiento(movimientoId: number) {
    try {
      return await prisma.incidente.findMany({
        where: { movimientoId },
        include: { usuario: { select: { id: true, nombre: true, email: true, empresa: true } } },
        orderBy: { fechaInicio: 'desc' },
      });
    } catch (error) {
      incidenteError.error('Error al obtener incidentes por movimiento', { movimientoId, error });
      throw new Error('Error al obtener incidentes por movimiento');
    }
  }

  static async obtenerIncidentePorId(id: number) {
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
  }

  static async verificarPeriodoVerificacion(incidenteId: number) {
    try {
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
    } catch (error) {
      incidenteError.error('Error al verificar periodo de verificación', { incidenteId, error });
      throw new Error('Error al verificar periodo de verificación');
    }
  }

  static async obtenerIncidentesPaginados(page = 1, pageSize = 30, estado?: 'ABIERTO' | 'CERRADO') {
    try {
      const skip = (page - 1) * pageSize;
      const whereClause: any = {};
      if (estado) whereClause.estado = estado;

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
    } catch (error) {
      incidenteError.error('Error al obtener incidentes paginados', { error });
      throw new Error('Error al obtener incidentes');
    }
  }

  static async obtenerIncidentesPorLocalidad(localidadId: number, page = 1, pageSize = 20) {
    try {
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
    } catch (error) {
      incidenteError.error('Error al obtener incidentes por localidad', { localidadId, error });
      throw new Error('Error al obtener incidentes por localidad');
    }
  }

  static async obtenerIncidentesPorEmpresaYLocalidad(empresaId: number, localidadId: number, page = 1, pageSize = 20) {
    try {
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
    } catch (error) {
      incidenteError.error('Error al obtener incidentes por empresa y localidad', { empresaId, localidadId, error });
      throw new Error('Error al obtener incidentes por empresa y localidad');
    }
  }

  static async obtenerIncidentesPorEmpresa(empresaId: number, page = 1, pageSize = 20) {
    try {
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
    } catch (error) {
      incidenteError.error('Error al obtener incidentes por empresa', { empresaId, error });
      throw new Error('Error al obtener incidentes por empresa');
    }
  }

  /* =================== ESCRITURA / UPDATE =================== */

static async editarIncidente(
  id: number,
  data: { descripcion?: string; estado?: 'ABIERTO' | 'CERRADO' | 'RESUELTO'; imagenes?: Buffer[] }
) {
  try {
    const { incidenteActualizado, estadoAnterior } = await prisma.$transaction(async (tx) => {
      const actual = await tx.incidente.findUnique({
        where: { id },
        include: { movimiento: true },
      });
      if (!actual) throw new Error(`No se encontró incidente con id ${id}`);

      const updateData: any = {};
      if (data.descripcion !== undefined) updateData.descripcion = data.descripcion;

      // reemplazo de imágenes igual que antes
      if (data.imagenes?.length) {
        const anteriores = [actual.imagen1, actual.imagen2, actual.imagen3, actual.imagen4];
        for (const ruta of anteriores) {
          if (!ruta) continue;
          try {
            await fs.unlink(path.join(IMAGEN_CONFIG.carpetaBase, ruta));
          } catch (err) {
            incidenteError.warn('No se pudo eliminar imagen anterior', { ruta, err });
          }
        }
        const rutas = await IncidenteModel.procesarImagenes(data.imagenes, id);
        updateData.imagen1 = rutas[0] ?? null;
        updateData.imagen2 = rutas[1] ?? null;
        updateData.imagen3 = rutas[2] ?? null;
        updateData.imagen4 = rutas[3] ?? null;
      }

      if (data.estado !== undefined && data.estado !== actual.estado) {
        updateData.estado = data.estado as any;
        updateData.fechaFin = new Date();

        // RESUELTO = volver a trabajar
        if (data.estado === 'RESUELTO') {
          await tx.movimiento.update({
            where: { id: actual.movimientoId },
            data: { estado: 'EN_PROCESO', fechaPausa: null, incidenteGlobal: false },
          });
          incidenteError.info('Movimiento reactivado tras resolución de incidente', {
            incidenteId: id,
            movimientoId: actual.movimientoId,
          });
        }
      }

      const upd = await tx.incidente.update({
        where: { id },
        data: updateData,
        include: { movimiento: true, usuario: { select: { id: true, nombre: true, email: true } } },
      });

      return { incidenteActualizado: upd, estadoAnterior: actual.estado };
    });

    // ======= LÓGICA AL CERRAR =======
    if (data.estado === 'CERRADO') {
      const movId = incidenteActualizado.movimientoId;
      const cierres = await prisma.incidente.count({ where: { movimientoId: movId, estado: 'CERRADO' } });

      if (cierres >= MAX_CIERRES_NO_RESUELTOS) {
        // aquí sí lo truena de verdad
        const mov = await prisma.movimiento.findUnique({
          where: { id: movId },
          include: { empresa: true, localidad: true },
        });

        await prisma.$transaction(async (tx) => {
          await tx.movimiento.update({
            where: { id: movId },
            data: { finalizado: true, fechaFin: new Date(), incidenteGlobal: false, fechaPausa: null },
          });
          await tx.ronda.deleteMany({ where: { movimientoId: movId } });
        });

        if (mov?.localidadId) await RondaModel.recomponerRondasLocalidad(mov.localidadId);
        if (mov) await NotificadorFCM.notificarCancelacionMovimiento(mov, 'Reincidencia de incidentes');

        incidenteError.warn('Movimiento cancelado por múltiples cierres no resueltos', {
          incidenteId: id,
          movimientoId: movId,
          cierres,
        });
      } else {
        // aquí va tu reacomodo NUEVO
        await RondaModel.gestionarIncidente(movId);

        // y aquí reactivamos el movimiento para que vuelva a salir en la ronda
        await prisma.movimiento.update({
          where: { id: movId },
          data: { estado: 'EN_PROCESO', fechaPausa: null, incidenteGlobal: false },
        });

        incidenteError.info('Reorden ejecutado por cierre de incidente', {
          incidenteId: id,
          movimientoId: movId,
          cierres,
        });
      }
    }

    // Notificación centralizada
    if (data.estado && data.estado !== estadoAnterior) {
      await NotificadorFCM.notificarCambioEstado(incidenteActualizado as Incidente, estadoAnterior);
    }

    _ensureCron();
    try { await this.cerrarIncidentesVencidos(); } catch {}

    return incidenteActualizado;
  } catch (error) {
    incidenteError.error('Error al editar incidente', { id, data, error });
    throw new Error('Error al editar incidente');
  }
}

  private static async procesarImagenes(imagenes: Buffer[], incidenteId: number): Promise<string[]> {
    try {
      const fecha = new Date();
      const ano = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');

      const carpetaDestino = path.join(IMAGEN_CONFIG.carpetaBase, String(ano), mes, dia);
      await fs.mkdir(carpetaDestino, { recursive: true });

      const rutasGuardadas: string[] = [];
      for (let i = 0; i < imagenes.length && i < 4; i++) {
        const nombreArchivo = `incidente_${incidenteId}_imagen_${i + 1}_${Date.now()}.${IMAGEN_CONFIG.format}`;
        const rutaCompleta = path.join(carpetaDestino, nombreArchivo);

        await sharp(imagenes[i])
          .resize(IMAGEN_CONFIG.maxWidth, IMAGEN_CONFIG.maxHeight, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: IMAGEN_CONFIG.quality, progressive: true, mozjpeg: true })
          .toFile(rutaCompleta);

        rutasGuardadas.push(path.relative(IMAGEN_CONFIG.carpetaBase, rutaCompleta));
      }

      incidenteError.info('Imágenes procesadas y guardadas', {
        incidenteId,
        cantidad: rutasGuardadas.length,
        carpeta: carpetaDestino,
      });
      return rutasGuardadas;
    } catch (error) {
      incidenteError.error('Error al procesar imágenes', { incidenteId, error });
      throw new Error('Error al procesar imágenes del incidente');
    }
  }

  /* ===== Reglas de reorganización por incidente (explícitas) ===== */

  public static async reorganizarRondasPorIncidente(empresaId: number, localidadId: number, movimientoId: number) {
    try {
      const rondaMovimiento = await prisma.ronda.findFirst({
        where: { movimientoId, localidadId, concluido: false },
        include: { movimiento: true },
      });

      if (!rondaMovimiento) {
        incidenteError.info('No se encontró ronda para el movimiento', { movimientoId, empresaId, localidadId });
        return;
      }

      const prioridad = rondaMovimiento.movimiento?.prioridad ?? 'BAJA';

      if (prioridad === 'ALTA') {
        await this.moverMovimientoARonda1AlFinal(localidadId, empresaId, movimientoId);
      } else {
        await this.aplicarEfectoCadenaBaja(empresaId, localidadId, rondaMovimiento);
      }

      await RondaModel.recomponerRondasLocalidad(localidadId);
    } catch (error) {
      incidenteError.error('Error al reorganizar rondas por incidente', { empresaId, localidadId, movimientoId, error });
      throw new Error('Error al reorganizar rondas por incidente');
    }
  }

  private static async moverMovimientoARonda1AlFinal(localidadId: number, empresaId: number, movimientoId: number) {
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
  }

  private static async aplicarEfectoCadenaBaja(
    empresaId: number,
    localidadId: number,
    rondaMovimiento: Ronda & { movimiento: { prioridad: string } }
  ) {
    await prisma.$transaction(async (tx) => {
      const chain = await this.obtenerSlotsEmpresaDesde(tx, localidadId, empresaId, rondaMovimiento.rondaNumero);
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
  }

  private static async obtenerSlotsEmpresaDesde(
    tx: Prisma.TransactionClient,
    localidadId: number,
    empresaId: number,
    desdeRonda: number
  ) {
    return tx.ronda.findMany({
      where: { localidadId, empresaId, concluido: false, rondaNumero: { gte: desdeRonda } },
      select: { id: true, rondaNumero: true, orden: true },
      orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
    });
  }

  private static async tamanoDeRonda(tx: Prisma.TransactionClient, localidadId: number, rondaNumero: number) {
    if (!Number.isFinite(rondaNumero) || rondaNumero < 1) return 0;
    return tx.ronda.count({ where: { localidadId, rondaNumero, concluido: false } });
  }

  private static async moverRonda(tx: Prisma.TransactionClient, row: Ronda, targetRonda: number, targetOrden: number) {
    const sameRound = row.rondaNumero === targetRonda;

    if (sameRound) {
      if (targetOrden === row.orden) return;

      if (targetOrden > row.orden) {
        await tx.ronda.updateMany({
          where: { localidadId: row.localidadId, rondaNumero: row.rondaNumero, concluido: false, orden: { gt: row.orden, lte: targetOrden } },
          data: { orden: { decrement: 1 } },
        });
      } else {
        await tx.ronda.updateMany({
          where: { localidadId: row.localidadId, rondaNumero: row.rondaNumero, concluido: false, orden: { gte: targetOrden, lt: row.orden } },
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
  }

  /* =================== CREAR / ELIMINAR / TIMEOUTS =================== */

  static async crearIncidente(data: { descripcion: string; movimientoId: number; usuarioId: number; imagenes?: Buffer[] }) {
    try {
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
      if (data.imagenes?.length) rutasImagenes = await this.procesarImagenes(data.imagenes, nuevoIncidente.id);

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
      if (incPlano) await NotificadorFCM.notificarNuevoIncidente(incPlano);

      // Levanta/garantiza cron + sweep inmediato
      _ensureCron();
      try { await this.cerrarIncidentesVencidos(); } catch {}

      incidenteError.info('Incidente creado y procesado', {
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
    } catch (error) {
      incidenteError.error('Error al crear incidente', { data, error });
      throw new Error('Error al crear incidente');
    }
  }

  static async eliminarIncidente(id: number) {
    try {
      const incidente = await prisma.incidente.findUnique({ where: { id } });
      if (!incidente) throw new Error(`No se encontró incidente con id ${id}`);

      const imagenes = [incidente.imagen1, incidente.imagen2, incidente.imagen3, incidente.imagen4];

      for (const rutaImagen of imagenes) {
        if (!rutaImagen) continue;
        try {
          await fs.unlink(path.join(IMAGEN_CONFIG.carpetaBase, rutaImagen));
        } catch (error) {
          incidenteError.warn('No se pudo eliminar imagen', { rutaImagen, error });
        }
      }

      const incidenteEliminado = await prisma.incidente.delete({ where: { id } });

      incidenteError.info('Incidente eliminado correctamente', {
        incidenteId: id,
        imagenesEliminadas: imagenes.filter(Boolean).length,
      });

      // Mantén el cron activo
      _ensureCron();

      return incidenteEliminado;
    } catch (error) {
      incidenteError.error('Error al eliminar incidente', { id, error });
      throw new Error('Error al eliminar incidente');
    }
  }

  /**
   * Cierra de golpe todos los incidentes ABIERTO con más de 10 min desde fechaInicio.
   * Idempotente. Úsalo en un cron (interno) que se garantiza con _ensureCron().
   */
  static async cerrarIncidentesVencidos() {
    try {
      const tiempoLimite = new Date(Date.now() - TIMEOUT_CONFIG.verificacion);

      const incidentesVencidos = await prisma.incidente.findMany({
        where: { estado: 'ABIERTO', fechaInicio: { lte: tiempoLimite } },
        select: { id: true },
        orderBy: { id: 'asc' },
        take: 1000,
      });

      if (!incidentesVencidos.length) return 0;

      let cerrados = 0;
      for (const inc of incidentesVencidos) {
        try {
          await IncidenteModel.editarIncidente(inc.id, { estado: 'CERRADO' });
          cerrados++;
        } catch (e) {
          incidenteError.error('Fallo cerrando incidente vencido', { incidenteId: inc.id, error: String(e) });
        }
      }

      if (cerrados > 0) {
        incidenteError.info('Incidentes cerrados automáticamente por timeout', {
          cantidad: cerrados,
          limiteISO: tiempoLimite.toISOString(),
        });
      }

      return cerrados;
    } catch (error) {
      incidenteError.error('Error al cerrar incidentes vencidos', { error });
      throw new Error('Error al cerrar incidentes vencidos');
    }
  }

  static obtenerRutaCompletaImagen(rutaRelativa: string): string {
    return path.join(IMAGEN_CONFIG.carpetaBase, rutaRelativa);
  }

  /* ===================== Reglas complementarias ===================== */

  private static async esUnicaEmpresaEnRondas(empresaId: number, localidadId: number): Promise<boolean> {
    const empresas = await prisma.ronda.findMany({
      where: { localidadId, concluido: false },
      select: { empresaId: true },
      distinct: ['empresaId'],
    });
    return empresas.length === 1 && empresas[0].empresaId === empresaId;
  }

  static async continuarMovimiento(id: number, comentario: string): Promise<Incidente> {
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

    await NotificadorFCM.notificarContinuarMovimiento(actualizado as Incidente, comentario);

    // Levanta/garantiza cron + sweep inmediato
    _ensureCron();
    try { await this.cerrarIncidentesVencidos(); } catch {}

    return actualizado;
  }
}
