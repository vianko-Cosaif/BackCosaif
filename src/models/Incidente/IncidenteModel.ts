// IncidenteModel.ts
/**
 * Modelo de acceso a datos para la entidad Incidente.
 * - Manejo de imágenes con optimización
 * - Reorganización de rondas SOLO al CERRAR incidentes
 * - Micro-cron por incidente (cierre automático a los 10 minutos)
 */

import { PrismaClient, Incidente, Prisma, Ronda } from '@prisma/client';
import { incidenteError } from './incidente.logger';
import { RondaModel } from '../Movimientos/Ronda/RondaModel';
import { NotificadorFCM } from '../../services/NotificadorFCM';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import admin from 'firebase-admin';

const prisma = new PrismaClient();

/** Configuración para el manejo de imágenes */
const IMAGEN_CONFIG = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 85,
  format: 'jpeg' as const,
  carpetaBase: path.join(process.cwd(), 'uploads', 'incidentes'),
};

// -------------------------
// Helpers de filtros/paginado
// -------------------------

export type EstadoFiltro = 'ABIERTO' | 'CERRADO' | 'RESUELTO' | 'PASADOS';

function buildWhereByEstado(estado?: EstadoFiltro) {
  if (!estado) return {};
  if (estado === 'PASADOS') {
    return { estado: { in: ['CERRADO', 'RESUELTO'] } };
  }
  if (estado === 'ABIERTO' || estado === 'CERRADO' || estado === 'RESUELTO') {
    return { estado };
  }
  return {};
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
  cursor?: { fechaInicio: string; id: number } | null;
  limit?: number;
  estado?: EstadoFiltro;
}) {
  const where = buildWhereByEstado(estado);
  const orderBy = [{ fechaInicio: 'desc' as const }, { id: 'desc' as const }];

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
  const nextCursor = hasNext
    ? { fechaInicio: data[data.length - 1].fechaInicio.toISOString(), id: data[data.length - 1].id }
    : null;

  return { data, cursor: nextCursor, hasNext, estado: estado ?? null };
}

/** Configuración de tiempos */
const TIMEOUT_CONFIG = {
  verificacion: 10 * 60 * 1000, // 10 min: cierre automático si sigue ABIERTO
  bloqueo: 5 * 60 * 1000, // opcional para UI
};

/** Timers en memoria para cierre automático por incidente */
const AUTO_CLOSE_TIMERS = new Map<number, NodeJS.Timeout>();

function cancelarCierreAutomatico(incidenteId: number) {
  const t = AUTO_CLOSE_TIMERS.get(incidenteId);
  if (t) {
    clearTimeout(t);
    AUTO_CLOSE_TIMERS.delete(incidenteId);
  }
}

async function programarCierreAutomatico(incidenteId: number) {
  cancelarCierreAutomatico(incidenteId);
  const timer = setTimeout(async () => {
    try {
      const inc = await prisma.incidente.findUnique({ where: { id: incidenteId }, select: { estado: true } });
      if (inc && inc.estado === 'ABIERTO') {
        await IncidenteModel.editarIncidente(incidenteId, { estado: 'CERRADO' });
      }
    } catch (e) {
      incidenteError.error('Error en cierre automático', { incidenteId, e });
    } finally {
      AUTO_CLOSE_TIMERS.delete(incidenteId);
    }
  }, TIMEOUT_CONFIG.verificacion);
  AUTO_CLOSE_TIMERS.set(incidenteId, timer);
}

export class IncidenteModel {
  // =========================================================
  // Lectura
  // =========================================================
  static async obtenerIncidentes() {
    try {
      return await prisma.incidente.findMany({
        include: {
          movimiento: {
            include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true, rondas: true },
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
          movimiento: { include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true, rondas: true } },
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
        movimiento: { include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true, rondas: true } },
        usuario: { select: { id: true, nombre: true, email: true, empresa: true } },
      },
    });

    if (!incidente) {
      throw new Error(`No existe incidente con id ${id}`);
    }

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
        select: { id: true, estado: true, fechaInicio: true }
      });

      if (!incidente) throw new Error(`No se encontró incidente con id ${incidenteId}`);

      if (incidente.estado === 'CERRADO' || incidente.estado === 'RESUELTO') {
        return {
          enPeriodoVerificacion: false,
          enPeriodoBloqueo: false,
          tiempoRestante: 0,
          mensaje: 'Incidente ya está cerrado o resuelto'
        };
      }

      const ahora = new Date();
      const transcurrido = ahora.getTime() - incidente.fechaInicio.getTime();

      const verif = TIMEOUT_CONFIG.verificacion;
      const bloque = TIMEOUT_CONFIG.bloqueo;

      const enPeriodoVerificacion = transcurrido <= verif;
      const enPeriodoBloqueo = transcurrido > verif && transcurrido <= verif + bloque;

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
        mensaje
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

  // =========================================================
  // Escritura / Update
  // =========================================================

  static async editarIncidente(id: number, data: { descripcion?: string; estado?: 'ABIERTO' | 'CERRADO' | 'RESUELTO'; imagenes?: Buffer[] }) {
    try {
      const incidenteActual = await prisma.incidente.findUnique({
        where: { id },
        include: { movimiento: true },
      });
      if (!incidenteActual) throw new Error(`No se encontró incidente con id ${id}`);

      const estadoAnterior = incidenteActual.estado;
      const updateData: any = {};

      let debeReordenar = false;
      let empresaId: number | null = null;
      let localidadId: number | null = null;
      let movimientoId: number | null = null;

      if (data.descripcion !== undefined) updateData.descripcion = data.descripcion;

      if (data.estado !== undefined && data.estado !== estadoAnterior) {
        updateData.estado = data.estado;
        updateData.fechaFin = new Date();

        // Al RESOLVER: reactivar movimiento y NO reordenar rondas
        if (data.estado === 'RESUELTO') {
          await prisma.movimiento.update({
            where: { id: incidenteActual.movimientoId },
            data: { estado: 'EN_PROCESO', fechaPausa: null, incidenteGlobal: false },
          });
          cancelarCierreAutomatico(id);
          incidenteError.info('Movimiento reactivado tras resolución de incidente', {
            incidenteId: id,
            movimientoId: incidenteActual.movimientoId,
          });
        }

        // Al CERRAR: reordenar rondas
        if (data.estado === 'CERRADO') {
          empresaId = incidenteActual.movimiento.empresaId;
          localidadId = incidenteActual.movimiento.localidadId;
          movimientoId = incidenteActual.movimientoId;
          debeReordenar = true;
          cancelarCierreAutomatico(id);
        }
      }

      if (data.imagenes?.length) {
        const anteriores = [incidenteActual.imagen1, incidenteActual.imagen2, incidenteActual.imagen3, incidenteActual.imagen4];
        for (const ruta of anteriores) {
          if (!ruta) continue;
          try {
            await fs.unlink(path.join(IMAGEN_CONFIG.carpetaBase, ruta));
          } catch (err) {
            incidenteError.warn('No se pudo eliminar imagen anterior', { ruta, err });
          }
        }
        const rutas = await this.procesarImagenes(data.imagenes, id);
        updateData.imagen1 = rutas[0] ?? null;
        updateData.imagen2 = rutas[1] ?? null;
        updateData.imagen3 = rutas[2] ?? null;
        updateData.imagen4 = rutas[3] ?? null;
      }

      const incidenteActualizado = await prisma.incidente.update({
        where: { id },
        data: updateData,
        include: { movimiento: true, usuario: { select: { id: true, nombre: true, email: true } } },
      });

      if (debeReordenar && empresaId && localidadId && movimientoId) {
        await this.reorganizarRondasPorIncidente(empresaId, localidadId, movimientoId);
      }

      if (data.estado && data.estado !== estadoAnterior) {
        await this.notificarCambioEstado(incidenteActualizado, estadoAnterior);
      }

      incidenteError.info('Incidente actualizado correctamente', {
        incidenteId: id,
        estadoAnterior,
        estadoNuevo: incidenteActualizado.estado,
      });
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

      incidenteError.info('Imágenes procesadas y guardadas', { incidenteId, cantidad: rutasGuardadas.length, carpeta: carpetaDestino });
      return rutasGuardadas;
    } catch (error) {
      incidenteError.error('Error al procesar imágenes', { incidenteId, error });
      throw new Error('Error al procesar imágenes del incidente');
    }
  }

  // =========================================================
  // Reglas de reorganización por incidente
  // =========================================================

  /**
   * Reorganiza rondas cuando se CIERRE un incidente:
   * - ALTA: enviar al final de ronda 1; si es la ÚNICA ALTA, intentar swap R1:1 <-> R2:1
   * - BAJA: efecto cadena dentro de la misma empresa
   */
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

  private static async moverMovimientoARonda1AlFinal(localidadId: number, empresaId: number, movimientoId: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const actual = await tx.ronda.findFirst({
        where: { movimientoId, localidadId, concluido: false },
        include: { movimiento: { select: { prioridad: true, lavado: true, torno: true } } },
      });
      if (!actual) return;

      const tipoRonda = actual.tipoRonda;

      const altasEnR1 = await tx.ronda.count({
        where: {
          localidadId,
          tipoRonda,
          rondaNumero: 1,
          concluido: false,
          movimiento: { prioridad: 'ALTA' },
        },
      });

      if (altasEnR1 === 1) {
        const r1Primera = await tx.ronda.findFirst({
          where: { localidadId, tipoRonda, rondaNumero: 1, concluido: false },
          orderBy: { orden: 'asc' },
        });
        const r2Primera = await tx.ronda.findFirst({
          where: { localidadId, tipoRonda, rondaNumero: 2, concluido: false },
          orderBy: { orden: 'asc' },
        });

        if (r1Primera && r2Primera) {
          await this.moverRonda(tx, r1Primera, 2, 1);
          const r2PrimeraRefrescada = await tx.ronda.findUnique({ where: { id: r2Primera.id } });
          if (r2PrimeraRefrescada) {
            await this.moverRonda(tx, r2PrimeraRefrescada, 1, 1);
          }
          return;
        }
      }

      await tx.ronda.updateMany({
        where: {
          localidadId,
          tipoRonda,
          rondaNumero: actual.rondaNumero,
          concluido: false,
          orden: { gt: actual.orden },
        },
        data: { orden: { decrement: 1 } },
      });
      await tx.ronda.delete({ where: { id: actual.id } });

      const ultimoOrden = await tx.ronda.count({ where: { localidadId, tipoRonda, rondaNumero: 1, concluido: false } });
      await tx.ronda.create({
        data: { movimientoId, empresaId, localidadId, tipoRonda, rondaNumero: 1, orden: ultimoOrden + 1 },
      });
    });
  }

  private static async aplicarEfectoCadenaBaja(empresaId: number, localidadId: number, rondaMovimiento: Ronda & { movimiento: { prioridad: string } }) {
    await prisma.$transaction(async (tx) => {
      const chain = await this.obtenerSlotsEmpresaDesde(tx, localidadId, empresaId, rondaMovimiento.rondaNumero);
      if (chain.length === 0) return;

      if (chain.length === 1) {
        const nextRound = chain[0].rondaNumero + 1;
        const tam = await this.tamanoDeRonda(tx, localidadId, nextRound);
        const actual = await tx.ronda.findUnique({ where: { id: chain[0].id } });
        if (!actual) return;

        if (tam > 0) {
          await this.moverRonda(tx, actual, nextRound, tam + 1);
        } else {
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

      if (tam > 0) {
        await this.moverRonda(tx, current, nextRound, tam + 1);
      } else {
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

  private static async moverRonda(
    tx: Prisma.TransactionClient,
    row: Ronda,
    targetRonda: number,
    targetOrden: number
  ) {
    const sameRound = row.rondaNumero === targetRonda;

    if (sameRound) {
      if (targetOrden === row.orden) return;

      if (targetOrden > row.orden) {
        await tx.ronda.updateMany({
          where: {
            localidadId: row.localidadId,
            tipoRonda: row.tipoRonda,
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
            tipoRonda: row.tipoRonda,
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
      where: {
        localidadId: row.localidadId,
        tipoRonda: row.tipoRonda,
        rondaNumero: row.rondaNumero,
        concluido: false,
        orden: { gt: row.orden },
      },
      data: { orden: { decrement: 1 } },
    });

    await tx.ronda.updateMany({
      where: {
        localidadId: row.localidadId,
        tipoRonda: row.tipoRonda,
        rondaNumero: targetRonda,
        concluido: false,
        orden: { gte: targetOrden },
      },
      data: { orden: { increment: 1 } },
    });

    await tx.ronda.update({ where: { id: row.id }, data: { rondaNumero: targetRonda, orden: targetOrden } });
  }

  // =========================================================
  // Crear / Eliminar / Timeouts
  // =========================================================

  static async crearIncidente(data: { descripcion: string; movimientoId: number; usuarioId: number; imagenes?: Buffer[] }) {
    try {
      const movimiento = await prisma.movimiento.findUnique({
        where: { id: data.movimientoId },
        include: { empresa: true, localidad: true, rondas: true },
      });
      if (!movimiento) throw new Error(`No se encontró movimiento con id ${data.movimientoId}`);

      const nuevoIncidente = await prisma.incidente.create({
        data: {
          descripcion: data.descripcion,
          movimientoId: data.movimientoId,
          usuarioId: data.usuarioId,
          estado: 'ABIERTO',
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
        include: {
          movimiento: { include: { empresa: true, localidad: true, rondas: true } },
          usuario: { select: { id: true, nombre: true, email: true, empresa: true } },
        },
      });

      await prisma.movimiento.update({
        where: { id: data.movimientoId },
        data: { estado: 'DETENIDO', fechaPausa: new Date(), incidenteGlobal: true },
      });

      // Micro-cron: programar cierre automático a los 10 minutos
      programarCierreAutomatico(nuevoIncidente.id).catch(() => {});

      await NotificadorFCM.notificarNuevoIncidente(incidenteConImagenes);

      incidenteError.info('Incidente creado y procesado', {
        incidenteId: nuevoIncidente.id,
        movimientoId: data.movimientoId,
        empresaId: movimiento.empresaId,
        localidadId: movimiento.localidadId,
        imagenesGuardadas: rutasImagenes.length,
      });

      return incidenteConImagenes;
    } catch (error) {
      incidenteError.error('Error al crear incidente', { data, error });
      throw new Error('Error al crear incidente');
    }
  }

  static async eliminarIncidente(id: number) {
    try {
      cancelarCierreAutomatico(id);

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

      return incidenteEliminado;
    } catch (error) {
      incidenteError.error('Error al eliminar incidente', { id, error });
      throw new Error('Error al eliminar incidente');
    }
  }

  static async cerrarIncidentesVencidos() {
    try {
      const tiempoLimite = new Date(Date.now() - TIMEOUT_CONFIG.verificacion);
      const incidentesVencidos = await prisma.incidente.findMany({
        where: { estado: 'ABIERTO', fechaInicio: { lte: tiempoLimite } },
      });

      let cerrados = 0;
      for (const inc of incidentesVencidos) {
        await this.editarIncidente(inc.id, { estado: 'CERRADO' });
        cerrados++;
      }

      if (cerrados > 0) {
        incidenteError.info('Incidentes cerrados automáticamente por micro-cron', {
          cantidad: cerrados,
          tiempoLimite: tiempoLimite.toISOString(),
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

  // =========================================================
  // Notificaciones
  // =========================================================

  static async notificarCambioEstado(incidente: Incidente, estadoAnterior: string): Promise<void> {
    try {
      const movimiento = await prisma.movimiento.findUnique({
        where: { id: incidente.movimientoId },
        include: { empresa: true, localidad: true },
      });
      if (!movimiento) return;

      // Destinatarios: usuarios activos de la MISMA empresa y roles operativos
      const ROLES = ['CLIENTE', 'SUPERVISOR', 'OPERADOR', 'COORDINADOR', 'MAQUINISTA'];
      const usuarios = await prisma.usuario.findMany({
        where: {
          empresaId: movimiento.empresaId,
          activo: true,
          rol: { in: ROLES as any },
        },
        include: { fcmTokens: true },
      });

      const tokens = Array.from(
        new Set(usuarios.flatMap((u) => u.fcmTokens.map((t) => t.token)))
      );
      if (tokens.length === 0) return;

      const empresaNombre = movimiento.empresa?.nombre ?? 'Sin Empresa';
      const descripcion =
        incidente.descripcion.length > 50 ? incidente.descripcion.slice(0, 50) + '…' : incidente.descripcion;

      const titulo =
        incidente.estado === 'RESUELTO'
          ? '✅ INCIDENTE RESUELTO'
          : incidente.estado === 'CERRADO'
          ? '❌ INCIDENTE CERRADO'
          : '🔄 INCIDENTE ACTUALIZADO';

      const mensaje = {
        notification: { title: titulo, body: `ID #${incidente.id} • ${empresaNombre} • Loco ${movimiento.locomotiveNumber}` },
        data: {
          pantalla: 'Incidente',
          incidenteId: String(incidente.id),
          movimientoId: String(incidente.movimientoId),
          empresa: empresaNombre,
          locomotora: String(movimiento.locomotiveNumber),
          estadoAnterior,
          estadoNuevo: incidente.estado,
          descripcion,
          tipo: 'cambio_estado_incidente',
          fecha: new Date().toISOString(),
        },
        tokens,
      };

      await admin.messaging().sendEachForMulticast(mensaje);
    } catch (error) {
      console.error('Error enviando notificación de cambio de estado:', error);
      throw error;
    }
  }

  // =========================================================
  // Reglas complementarias / Acciones directas
  // =========================================================

  private static async esUnicaEmpresaEnRondas(empresaId: number, localidadId: number): Promise<boolean> {
    const empresas = await prisma.ronda.findMany({
      where: { localidadId, concluido: false },
      select: { empresaId: true },
      distinct: ['empresaId'],
    });
    return empresas.length === 1 && empresas[0].empresaId === empresaId;
  }

  /**
   * Cierra el incidente (flujo “continuar movimiento” previo).
   * Ahora: siempre reordena al cerrar y ajusta el copy de notificación.
   */
  static async continuarMovimiento(id: number, comentario: string): Promise<Incidente> {
    const incidente = await prisma.incidente.findUnique({
      where: { id },
      include: { movimiento: { include: { empresa: true, localidad: true } } },
    });

    if (!incidente) throw new Error('Incidente no encontrado');
    if (incidente.estado === 'CERRADO') throw new Error('Incidente ya cerrado');

    const actualizado = await prisma.incidente.update({
      where: { id },
      data: { estado: 'CERRADO', fechaFin: new Date() },
      include: { movimiento: true },
    });

    cancelarCierreAutomatico(id);

    // Reordenar SIEMPRE al cerrar
    await this.reorganizarRondasPorIncidente(
      incidente.movimiento.empresaId,
      incidente.movimiento.localidadId,
      incidente.movimientoId
    );

    // Notificar cierre con comentario
    const usuarios = await prisma.usuario.findMany({
      where: {
        empresaId: incidente.movimiento.empresaId,
        activo: true,
        rol: { in: ['CLIENTE', 'SUPERVISOR', 'OPERADOR', 'COORDINADOR', 'MAQUINISTA'] as any },
      },
      include: { fcmTokens: true },
    });

    const tokens = Array.from(new Set(usuarios.flatMap((u) => u.fcmTokens.map((t) => t.token))));
    if (tokens.length > 0) {
      const empresa = incidente.movimiento.empresa?.nombre ?? 'Sin Empresa';
      const loco = incidente.movimiento.locomotiveNumber;

      await admin.messaging().sendEachForMulticast({
        notification: { title: '❌ INCIDENTE CERRADO', body: `Cerrado por cliente: "${comentario}"` },
        data: {
          pantalla: 'Incidente',
          incidenteId: String(actualizado.id),
          movimientoId: String(incidente.movimientoId),
          empresa,
          locomotora: String(loco),
          tipo: 'incidente_cerrado_cliente',
          timestamp: new Date().toISOString(),
        },
        tokens,
      });
    }

    return actualizado;
  }

  // Conveniencia: endpoints dedicados
  static async resolverIncidente(id: number) {
    return this.editarIncidente(id, { estado: 'RESUELTO' });
  }
  static async cerrarIncidente(id: number) {
    return this.editarIncidente(id, { estado: 'CERRADO' });
  }
}
