/**
 * config/imagenes.config.ts
 *
 * Configuracion centralizada para el manejo de imagenes de incidentes.
 * Incluye utilidades para optimizacion, validacion y organizacion de archivos.
 */

import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

export interface ConfigImagenes {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  carpetaBase: string;
  maxFileSize: number; // en bytes
  maxFiles: number;
  allowedMimeTypes: string[];
}

export const IMAGEN_CONFIG: ConfigImagenes = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 85,
  format: 'jpeg',
  carpetaBase: path.join(process.cwd(), 'uploads', 'incidentes'),
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 4,
  allowedMimeTypes: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp'
  ]
};

const ENV = process.env.NODE_ENV;

/**
 * Utilidades para manejo de imagenes
 */
export class ImagenUtils {
  /**
   * Crea la estructura de directorios para almacenar imagenes.
   * Organiza por a�o/mes/dia para facilitar busquedas.
   */
  static async crearEstructuraDirectorios(): Promise<void> {
    try {
      const fecha = new Date();
      const ano = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      
      const directorios = [
        IMAGEN_CONFIG.carpetaBase,
        path.join(IMAGEN_CONFIG.carpetaBase, String(ano)),
        path.join(IMAGEN_CONFIG.carpetaBase, String(ano), mes),
        path.join(IMAGEN_CONFIG.carpetaBase, String(ano), mes, dia)
      ];
      
      for (const directorio of directorios) {
        await fs.mkdir(directorio, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Error al crear estructura de directorios: ${error}`);
    }
  }

  /**
   * Optimiza una imagen usando Sharp con la configuracion predefinida.
   */
  static async optimizarImagen(
    buffer: Buffer, 
    nombreArchivo: string,
    carpetaDestino: string
  ): Promise<string> {
    try {
      const rutaCompleta = path.join(carpetaDestino, nombreArchivo);
      
      await sharp(buffer)
        .resize(IMAGEN_CONFIG.maxWidth, IMAGEN_CONFIG.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ 
          quality: IMAGEN_CONFIG.quality,
          progressive: true,
          mozjpeg: true
        })
        .toFile(rutaCompleta);
      
      return path.relative(IMAGEN_CONFIG.carpetaBase, rutaCompleta);
    } catch (error) {
      throw new Error(`Error al optimizar imagen: ${error}`);
    }
  }

  /**
   * Valida si un archivo es una imagen valida.
   */
  static validarImagen(file: Express.Multer.File): { valido: boolean; error?: string } {
    // Validar tipo MIME
    if (!IMAGEN_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
      return {
        valido: false,
        error: `Tipo de archivo no permitido: ${file.mimetype}. Permitidos: ${IMAGEN_CONFIG.allowedMimeTypes.join(', ')}`
      };
    }

    // Validar tama�o
    if (file.size > IMAGEN_CONFIG.maxFileSize) {
      return {
        valido: false,
        error: `Archivo muy grande: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Maximo: ${(IMAGEN_CONFIG.maxFileSize / (1024 * 1024))}MB`
      };
    }

    return { valido: true };
  }

  /**
   * Genera un nombre unico para el archivo.
   */
  static generarNombreArchivo(
    incidenteId: number, 
    indice: number, 
    extension: string = 'jpeg'
  ): string {
    const timestamp = Date.now();
    return `incidente_${incidenteId}_imagen_${indice + 1}_${timestamp}.${extension}`;
  }

  /**
   * Elimina una imagen del servidor.
   */
  static async eliminarImagen(rutaRelativa: string): Promise<boolean> {
    try {
      const rutaCompleta = path.join(IMAGEN_CONFIG.carpetaBase, rutaRelativa);
      await fs.unlink(rutaCompleta);
      return true;
    } catch (error) {
      if(ENV === "development"){
        console.error(`Error al eliminar imagen: ${rutaRelativa}`, error, ' en eliminarImagen');
      } else {
        console.error(`Error al eliminar imagen`);
      }
      console.warn(`No se pudo eliminar imagen`);
      return false;
    }
  }

  /**
   * Obtiene informacion sobre una imagen (tama�o, dimensiones, etc.)
   */
  static async obtenerInfoImagen(rutaRelativa: string): Promise<any> {
    try {
      const rutaCompleta = path.join(IMAGEN_CONFIG.carpetaBase, rutaRelativa);
      const stats = await fs.stat(rutaCompleta);
      const metadata = await sharp(rutaCompleta).metadata();
      
      return {
        archivo: path.basename(rutaCompleta),
        tamano: stats.size,
        tamanoMB: (stats.size / (1024 * 1024)).toFixed(2),
        dimensiones: {
          ancho: metadata.width,
          alto: metadata.height
        },
        formato: metadata.format,
        fechaCreacion: stats.birthtime,
        fechaModificacion: stats.mtime
      };
    } catch (error) {
      throw new Error(`Error al obtener informacion de imagen: ${error}`);
    }
  }

  /**
   * Limpia imagenes huerfanas (sin referencia en base de datos)
   * Esta funcion debe ejecutarse periodicamente como tarea de mantenimiento.
   */
  static async limpiarImagenesHuerfanas(diasAntiguedad: number = 30): Promise<number> {
    try {
      // Implementar logica para comparar archivos en disco vs referencias en BD
      // Por ahora, solo eliminar archivos muy antiguos sin referencias
      
      const fechaLimite = new Date(Date.now() - (diasAntiguedad * 24 * 60 * 60 * 1000));
      let archivosEliminados = 0;
      
      // Esta implementacion requeriria acceso a la base de datos
      // para comparar que imagenes estan referenciadas
      if(ENV === "development"){
        console.log(`Limpieza de imagenes huerfanas ejecutada. Fecha limite: ${fechaLimite.toISOString()}`, ' en limpiarImagenesHuerfanas');
      } else {
        console.log(`Limpieza de imagenes huerfanas ejecutada. Fecha limite: ${fechaLimite.toISOString()}`);
      }
      
      return archivosEliminados;
    } catch (error) {
      throw new Error(`Error al limpiar imagenes huerfanas: ${error}`);
    }
  }

  /**
   * Obtiene estadisticas de uso de almacenamiento.
   */
  static async obtenerEstadisticasAlmacenamiento(): Promise<any> {
    try {
      const calcularTamanoDirectorio = async (directorio: string): Promise<number> => {
        let tamano = 0;
        try {
          const archivos = await fs.readdir(directorio, { withFileTypes: true });
          
          for (const archivo of archivos) {
            const rutaCompleta = path.join(directorio, archivo.name);
            
            if (archivo.isDirectory()) {
              tamano += await calcularTamanoDirectorio(rutaCompleta);
            } else {
              const stats = await fs.stat(rutaCompleta);
              tamano += stats.size;
            }
          }
        } catch (error) {
          // Directorio no existe o no se puede leer
        }
        
        return tamano;
      };

      const tamanoTotal = await calcularTamanoDirectorio(IMAGEN_CONFIG.carpetaBase);
      
      return {
        tamanoTotalBytes: tamanoTotal,
        tamanoTotalMB: (tamanoTotal / (1024 * 1024)).toFixed(2),
        tamanoTotalGB: (tamanoTotal / (1024 * 1024 * 1024)).toFixed(2),
        carpetaBase: IMAGEN_CONFIG.carpetaBase,
        fechaConsulta: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Error al obtener estadisticas de almacenamiento: ${error}`);
    }
  }
}

/**
 * Script de inicializacion para crear la estructura de directorios
 * Debe ejecutarse al iniciar la aplicacion
 */
export async function inicializarSistemaImagenes(): Promise<void> {
  try {
    await ImagenUtils.crearEstructuraDirectorios();
    console.log('Sistema de imagenes inicializado correctamente');
  } catch (error) {
    if(ENV === "development"){
      console.error('Error al inicializar sistema de imagenes:', error, ' en inicializarSistemaImagenes');
    } else {
      console.error('Error al inicializar sistema de imagenes');
    }
    throw error;
  }
}

/**
 * Middleware de Express para validacion de imagenes
 */
export function validarImagenesMiddleware(req: any, res: any, next: any) {
  if (!req.files || !Array.isArray(req.files)) {
    return next();
  }

  const errores: string[] = [];

  if (req.files.length > IMAGEN_CONFIG.maxFiles) {
    errores.push(`Maximo ${IMAGEN_CONFIG.maxFiles} archivos permitidos`);
  }

  for (const file of req.files) {
    const validacion = ImagenUtils.validarImagen(file);
    if (!validacion.valido) {
      errores.push(validacion.error!);
    }
  }

  if (errores.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validacion de archivos fallida',
      detalles: errores
    });
  }

  next();
}