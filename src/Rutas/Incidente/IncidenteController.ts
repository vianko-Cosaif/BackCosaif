import { PrismaClient, Incidente } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

const prisma = new PrismaClient();

// Configuración para manejo de imágenes de incidentes
export const IMAGEN_CONFIG = {
  basePath: path.join(process.cwd(), 'uploads', 'incidentes'),
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 85,
  format: 'jpeg' as const,
};

export class IncidenteModel {
  /**
   * Procesa y guarda hasta 4 imágenes en carpetas organizadas por fecha: uploads/incidentes/YYYY/MM/DD
   * @param imagenes - Buffers de las imágenes
   * @param incidenteId - ID del incidente
   */
  private static async procesarImagenes(
    imagenes: Buffer[],
    incidenteId: number
  ): Promise<void> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dirDestino = path.join(
      IMAGEN_CONFIG.basePath,
      String(year),
      month,
      day
    );

    await fs.mkdir(dirDestino, { recursive: true });

    for (let i = 0; i < Math.min(imagenes.length, 4); i++) {
      const timestamp = Date.now();
      const nombreArchivo = `incidente_${incidenteId}_${i + 1}_${timestamp}.${IMAGEN_CONFIG.format}`;
      const rutaArchivo = path.join(dirDestino, nombreArchivo);

      await sharp(imagenes[i])
        .resize(IMAGEN_CONFIG.maxWidth, IMAGEN_CONFIG.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toFormat(IMAGEN_CONFIG.format, { quality: IMAGEN_CONFIG.quality })
        .toFile(rutaArchivo);
    }
  }

  /**
   * Recupera rutas relativas de imágenes guardadas para un incidente
   * @param incidenteId - ID del incidente
   * @returns Array de rutas relativas (desde uploads/incidentes)
   */
  public static async obtenerImagenesIncidente(
    incidenteId: number
  ): Promise<string[]> {
    const resultados: string[] = [];

    async function recorrer(dir: string): Promise<void> {
      const entradas = await fs.readdir(dir, { withFileTypes: true });
      for (const ent of entradas) {
        const ruta = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          await recorrer(ruta);
        } else if (
          ent.isFile() &&
          ent.name.startsWith(`incidente_${incidenteId}_`)
        ) {
          resultados.push(
            path.relative(IMAGEN_CONFIG.basePath, ruta).replace(/\\/g, '/')
          );
        }
      }
    }

    await recorrer(IMAGEN_CONFIG.basePath);
    return resultados;
  }

  /**
   * Obtiene todos los incidentes ordenados por fecha de inicio descendente
   */
  public static async obtenerIncidentes(): Promise<Incidente[]> {
    return prisma.incidente.findMany({ orderBy: { fechaInicio: 'desc' } });
  }

  /**
   * Paginación de incidentes con filtros opcionales
   * @param page - Número de página
   * @param pageSize - Tamaño de página
   * @param filtros - Opciones de filtrado (estado, empresaId, localidadId, fechas)
   */
  public static async obtenerIncidentesPaginados(
    page = 1,
    pageSize = 20,
    filtros?: {
      estado?: string;
      empresaId?: number;
      localidadId?: number;
      fechaInicio?: Date;
      fechaFin?: Date;
    }
  ) {
    page = Math.max(1, page);
    pageSize = Math.min(100, Math.max(1, pageSize));
    const skip = (page - 1) * pageSize;
    const where: any = {};

    if (filtros?.estado) where.estado = filtros.estado;
    if (filtros?.fechaInicio || filtros?.fechaFin) {
      where.fechaInicio = {};
      if (filtros.fechaInicio) where.fechaInicio.gte = filtros.fechaInicio;
      if (filtros.fechaFin) where.fechaInicio.lte = filtros.fechaFin;
    }
    if (filtros?.empresaId || filtros?.localidadId) {
      where.movimiento = {};
      if (filtros.empresaId) where.movimiento.empresaId = filtros.empresaId;
      if (filtros.localidadId) where.movimiento.localidadId = filtros.localidadId;
    }

    const [data, total] = await Promise.all([
      prisma.incidente.findMany({
        where,
        orderBy: { fechaInicio: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.incidente.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNextPage: page * pageSize < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Obtiene incidentes por estado (ABIERTO o CERRADO)
   */
  public static async obtenerIncidentesPorEstado(
    estado: 'ABIERTO' | 'CERRADO',
    page = 1,
    pageSize = 20
  ) {
    return this.obtenerIncidentesPaginados(page, pageSize, { estado });
  }

  /**
   * Obtiene incidentes por localidad con paginación
   */
  public static async obtenerIncidentesPorLocalidad(
    localidadId: number,
    page = 1,
    pageSize = 20
  ) {
    return this.obtenerIncidentesPaginados(page, pageSize, { localidadId });
  }

  /**
   * Obtiene incidentes por empresa con paginación
   */
  public static async obtenerIncidentesPorEmpresa(
    empresaId: number,
    page = 1,
    pageSize = 20
  ) {
    return this.obtenerIncidentesPaginados(page, pageSize, { empresaId });
  }
}
