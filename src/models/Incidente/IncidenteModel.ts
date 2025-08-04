// src/models/Incidente/IncidenteModel.ts

import { PrismaClient, EstadoIncidente, Incidente as IncidenteEntity } from '@prisma/client';
import { incidenteError } from './incidente.logger';
import { NotificadorFCM } from '../../services/NotificadorFCM';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

const prisma = new PrismaClient();

export type EstadoFiltro = 'ABIERTO' | 'CERRADO' | 'RESUELTO' | 'PASADOS';

const IMAGEN_CONFIG = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 85,
  format: 'jpeg' as const,
  carpetaBase: path.join(process.cwd(), 'uploads', 'incidentes')
};

function buildWhereByEstado(estado?: EstadoFiltro) {
  if (!estado) return {};
  switch (estado) {
    case 'PASADOS':
      return { estado: { in: [EstadoIncidente.CERRADO, EstadoIncidente.RESUELTO] } };
    case 'ABIERTO':
    case 'CERRADO':
    case 'RESUELTO':
      return { estado: EstadoIncidente[estado] };
    default:
      return {};
  }
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
    empresaId?: number;
    localidadId?: number;
  };
}

/**
 * Listado paginado unificado con filtros opcionales
 */
export async function listarIncidentesPaginados({
  page = 1,
  pageSize = 20,
  estado,
  empresaId,
  localidadId
}: {
  page?: number;
  pageSize?: number;
  estado?: EstadoFiltro;
  empresaId?: number;
  localidadId?: number;
}): Promise<PaginacionIncidentes<{
  id: number;
  descripcion: string;
  estado: string;
  fechaInicio: string;
  usuario: { id: number; nombre: string };
  movimiento: { id: number; empresaId: number; localidadId: number };
}>> {
  const skip = (page - 1) * pageSize;
  const where: any = {
    ...buildWhereByEstado(estado),
    ...(empresaId != null ? { movimiento: { empresaId } } : {}),
    ...(localidadId != null ? { movimiento: { localidadId } } : {})
  };

  const [items, total] = await Promise.all([
    prisma.incidente.findMany({
      where,
      include: {
        usuario:    { select: { id: true, nombre: true } },
        movimiento: { select: { id: true, empresaId: true, localidadId: true } }
      },
      orderBy: [
        { fechaInicio: 'desc' },
        { id:          'desc' }
      ],
      skip,
      take: pageSize
    }),
    prisma.incidente.count({ where })
  ]);

  const data = items.map(i => ({
    id:           i.id,
    descripcion:  i.descripcion,
    estado:       i.estado,
    fechaInicio:  i.fechaInicio.toISOString(),
    usuario:      { id: i.usuario.id, nombre: i.usuario.nombre },
    movimiento:   { id: i.movimiento.id, empresaId: i.movimiento.empresaId, localidadId: i.movimiento.localidadId }
  }));

  const totalPages     = Math.max(1, Math.ceil(total / pageSize));
  const hasNextPage    = page < totalPages;
  const hasPreviousPage= page > 1;

  return {
    data,
    meta: {
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      estadoFiltro: estado ?? null,
      ...(empresaId   != null ? { empresaId }   : {}),
      ...(localidadId != null ? { localidadId } : {})
    }
  };
}

export class IncidenteModel {
  /** Obtener todos los incidentes sin paginar */
  static async obtenerIncidentes(): Promise<IncidenteEntity[]> {
    try {
      return await prisma.incidente.findMany({
        include: { movimiento: true, usuario: true },
        orderBy: { fechaInicio: 'desc' }
      });
    } catch (error) {
      incidenteError.error('Error al obtener incidentes', { error });
      throw new Error('Error al obtener incidentes');
    }
  }

  /** Crear un nuevo incidente, opcionalmente con imágenes */
  static async crearIncidente(data: {
    descripcion: string;
    movimientoId: number;
    usuarioId: number;
    imagenes?: Buffer[];
  }): Promise<IncidenteEntity> {
    try {
      const nuevo = await prisma.incidente.create({
        data: {
          descripcion:  data.descripcion,
          movimientoId: data.movimientoId,
          usuarioId:    data.usuarioId,
          estado:       EstadoIncidente.ABIERTO
        }
      });

      if (data.imagenes?.length) {
        const rutas = await this.procesarImagenes(data.imagenes, nuevo.id);
        await prisma.incidente.update({
          where: { id: nuevo.id },
          data: {
            imagen1: rutas[0] ?? null,
            imagen2: rutas[1] ?? null,
            imagen3: rutas[2] ?? null,
            imagen4: rutas[3] ?? null
          }
        });
      }

      await NotificadorFCM.notificarNuevoIncidente(nuevo);
      return nuevo;
    } catch (error) {
      incidenteError.error('Error al crear incidente', { data, error });
      throw new Error('Error al crear incidente');
    }
  }

  /** Editar un incidente existente (descripción, estado, imágenes) */
  static async editarIncidente(
    id: number,
    data: { descripcion?: string; estado?: EstadoFiltro; imagenes?: Buffer[] }
  ): Promise<IncidenteEntity> {
    try {
      const actual = await prisma.incidente.findUnique({ where: { id } });
      if (!actual) throw new Error('Incidente no encontrado');

      const update: any = {};
      if (data.descripcion) update.descripcion = data.descripcion;
      if (data.estado) {
        const mapEstado: Record<EstadoFiltro, EstadoIncidente> = {
          ABIERTO: EstadoIncidente.ABIERTO,
          CERRADO: EstadoIncidente.CERRADO,
          RESUELTO: EstadoIncidente.RESUELTO,
          PASADOS: EstadoIncidente.CERRADO
        };
        update.estado   = mapEstado[data.estado];
        update.fechaFin = new Date();
      }

      if (data.imagenes?.length) {
        const prevImgs = [actual.imagen1, actual.imagen2, actual.imagen3, actual.imagen4]
          .filter(Boolean) as string[];
        for (const img of prevImgs) {
          await fs.unlink(path.join(IMAGEN_CONFIG.carpetaBase, img)).catch(() => {});
        }
        const rutas = await this.procesarImagenes(data.imagenes, id);
        update.imagen1 = rutas[0] ?? null;
        update.imagen2 = rutas[1] ?? null;
        update.imagen3 = rutas[2] ?? null;
        update.imagen4 = rutas[3] ?? null;
      }

      return await prisma.incidente.update({ where: { id }, data: update });
    } catch (error) {
      incidenteError.error('Error al editar incidente', { id, data, error });
      throw new Error('Error al editar incidente');
    }
  }

  /** Eliminar un incidente y sus imágenes */
  static async eliminarIncidente(id: number): Promise<IncidenteEntity> {
    try {
      const inc = await prisma.incidente.findUnique({ where: { id } });
      if (!inc) throw new Error('Incidente no encontrado');
      const imgs = [inc.imagen1, inc.imagen2, inc.imagen3, inc.imagen4]
        .filter(Boolean) as string[];
      for (const img of imgs) {
        await fs.unlink(path.join(IMAGEN_CONFIG.carpetaBase, img)).catch(() => {});
      }
      return await prisma.incidente.delete({ where: { id } });
    } catch (error) {
      incidenteError.error('Error al eliminar incidente', { id, error });
      throw new Error('Error al eliminar incidente');
    }
  }

  /** Obtener incidente por ID, con relaciones */
  static async obtenerIncidentePorId(id: number): Promise<IncidenteEntity> {
    const inc = await prisma.incidente.findUnique({
      where: { id },
      include: { movimiento: true, usuario: true }
    });
    if (!inc) throw new Error('Incidente no encontrado');
    return inc;
  }

  /** Verificar periodo de verificación/bloqueo (simplificado) */
  static async verificarPeriodoVerificacion(incidenteId: number) {
    const inc = await prisma.incidente.findUnique({
      where: { id: incidenteId },
      select: { estado: true, fechaInicio: true }
    });
    if (!inc) throw new Error('Incidente no encontrado');
    return { estado: inc.estado, fechaInicio: inc.fechaInicio };
  }

  /** Procesa y guarda imágenes optimizadas */
  private static async procesarImagenes(imagenes: Buffer[], incidenteId: number): Promise<string[]> {
    const fecha  = new Date();
    const carpeta = path.join(
      IMAGEN_CONFIG.carpetaBase,
      `${fecha.getFullYear()}`,
      `${fecha.getMonth()+1}`,
      `${fecha.getDate()}`
    );
    await fs.mkdir(carpeta, { recursive: true });
    const rutas: string[] = [];
    for (let i = 0; i < imagenes.length && i < 4; i++) {
      const nombre = `inc_${incidenteId}_${Date.now()}_${i}.${IMAGEN_CONFIG.format}`;
      const full   = path.join(carpeta, nombre);
      await sharp(imagenes[i])
        .resize(IMAGEN_CONFIG.maxWidth, IMAGEN_CONFIG.maxHeight, { fit: 'inside' })
        .jpeg({ quality: IMAGEN_CONFIG.quality })
        .toFile(full);
      rutas.push(path.relative(IMAGEN_CONFIG.carpetaBase, full));
    }
    return rutas;
  }

  /** Obtener ruta absoluta de imagen */
  static obtenerRutaCompletaImagen(rutaRel: string) {
    return path.join(IMAGEN_CONFIG.carpetaBase, rutaRel);
  }
}
