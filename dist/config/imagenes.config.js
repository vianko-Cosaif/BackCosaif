"use strict";
/**
 * config/imagenes.config.ts
 *
 * Configuracion centralizada para el manejo de imagenes de incidentes.
 * Incluye utilidades para optimizacion, validacion y organizacion de archivos.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImagenUtils = exports.IMAGEN_CONFIG = void 0;
exports.inicializarSistemaImagenes = inicializarSistemaImagenes;
exports.validarImagenesMiddleware = validarImagenesMiddleware;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const sharp_1 = __importDefault(require("sharp"));
exports.IMAGEN_CONFIG = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 85,
    format: 'jpeg',
    carpetaBase: path_1.default.join(process.cwd(), 'uploads', 'incidentes'),
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 4,
    allowedMimeTypes: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp'
    ]
};
/**
 * Utilidades para manejo de imagenes
 */
class ImagenUtils {
    /**
     * Crea la estructura de directorios para almacenar imagenes.
     * Organiza por a�o/mes/dia para facilitar busquedas.
     */
    static async crearEstructuraDirectorios() {
        try {
            const fecha = new Date();
            const ano = fecha.getFullYear();
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const dia = String(fecha.getDate()).padStart(2, '0');
            const directorios = [
                exports.IMAGEN_CONFIG.carpetaBase,
                path_1.default.join(exports.IMAGEN_CONFIG.carpetaBase, String(ano)),
                path_1.default.join(exports.IMAGEN_CONFIG.carpetaBase, String(ano), mes),
                path_1.default.join(exports.IMAGEN_CONFIG.carpetaBase, String(ano), mes, dia)
            ];
            for (const directorio of directorios) {
                await promises_1.default.mkdir(directorio, { recursive: true });
            }
        }
        catch (error) {
            throw new Error(`Error al crear estructura de directorios: ${error}`);
        }
    }
    /**
     * Optimiza una imagen usando Sharp con la configuracion predefinida.
     */
    static async optimizarImagen(buffer, nombreArchivo, carpetaDestino) {
        try {
            const rutaCompleta = path_1.default.join(carpetaDestino, nombreArchivo);
            await (0, sharp_1.default)(buffer)
                .resize(exports.IMAGEN_CONFIG.maxWidth, exports.IMAGEN_CONFIG.maxHeight, {
                fit: 'inside',
                withoutEnlargement: true
            })
                .jpeg({
                quality: exports.IMAGEN_CONFIG.quality,
                progressive: true,
                mozjpeg: true
            })
                .toFile(rutaCompleta);
            return path_1.default.relative(exports.IMAGEN_CONFIG.carpetaBase, rutaCompleta);
        }
        catch (error) {
            throw new Error(`Error al optimizar imagen: ${error}`);
        }
    }
    /**
     * Valida si un archivo es una imagen valida.
     */
    static validarImagen(file) {
        // Validar tipo MIME
        if (!exports.IMAGEN_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
            return {
                valido: false,
                error: `Tipo de archivo no permitido: ${file.mimetype}. Permitidos: ${exports.IMAGEN_CONFIG.allowedMimeTypes.join(', ')}`
            };
        }
        // Validar tama�o
        if (file.size > exports.IMAGEN_CONFIG.maxFileSize) {
            return {
                valido: false,
                error: `Archivo muy grande: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Maximo: ${(exports.IMAGEN_CONFIG.maxFileSize / (1024 * 1024))}MB`
            };
        }
        return { valido: true };
    }
    /**
     * Genera un nombre unico para el archivo.
     */
    static generarNombreArchivo(incidenteId, indice, extension = 'jpeg') {
        const timestamp = Date.now();
        return `incidente_${incidenteId}_imagen_${indice + 1}_${timestamp}.${extension}`;
    }
    /**
     * Elimina una imagen del servidor.
     */
    static async eliminarImagen(rutaRelativa) {
        try {
            const rutaCompleta = path_1.default.join(exports.IMAGEN_CONFIG.carpetaBase, rutaRelativa);
            await promises_1.default.unlink(rutaCompleta);
            return true;
        }
        catch (error) {
            console.warn(`No se pudo eliminar imagen: ${rutaRelativa}`, error);
            return false;
        }
    }
    /**
     * Obtiene informacion sobre una imagen (tama�o, dimensiones, etc.)
     */
    static async obtenerInfoImagen(rutaRelativa) {
        try {
            const rutaCompleta = path_1.default.join(exports.IMAGEN_CONFIG.carpetaBase, rutaRelativa);
            const stats = await promises_1.default.stat(rutaCompleta);
            const metadata = await (0, sharp_1.default)(rutaCompleta).metadata();
            return {
                archivo: path_1.default.basename(rutaCompleta),
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
        }
        catch (error) {
            throw new Error(`Error al obtener informacion de imagen: ${error}`);
        }
    }
    /**
     * Limpia imagenes huerfanas (sin referencia en base de datos)
     * Esta funcion debe ejecutarse periodicamente como tarea de mantenimiento.
     */
    static async limpiarImagenesHuerfanas(diasAntiguedad = 30) {
        try {
            // Implementar logica para comparar archivos en disco vs referencias en BD
            // Por ahora, solo eliminar archivos muy antiguos sin referencias
            const fechaLimite = new Date(Date.now() - (diasAntiguedad * 24 * 60 * 60 * 1000));
            let archivosEliminados = 0;
            // Esta implementacion requeriria acceso a la base de datos
            // para comparar que imagenes estan referenciadas
            console.log(`Limpieza de imagenes huerfanas ejecutada. Fecha limite: ${fechaLimite.toISOString()}`);
            return archivosEliminados;
        }
        catch (error) {
            throw new Error(`Error al limpiar imagenes huerfanas: ${error}`);
        }
    }
    /**
     * Obtiene estadisticas de uso de almacenamiento.
     */
    static async obtenerEstadisticasAlmacenamiento() {
        try {
            const calcularTamanoDirectorio = async (directorio) => {
                let tamano = 0;
                try {
                    const archivos = await promises_1.default.readdir(directorio, { withFileTypes: true });
                    for (const archivo of archivos) {
                        const rutaCompleta = path_1.default.join(directorio, archivo.name);
                        if (archivo.isDirectory()) {
                            tamano += await calcularTamanoDirectorio(rutaCompleta);
                        }
                        else {
                            const stats = await promises_1.default.stat(rutaCompleta);
                            tamano += stats.size;
                        }
                    }
                }
                catch (error) {
                    // Directorio no existe o no se puede leer
                }
                return tamano;
            };
            const tamanoTotal = await calcularTamanoDirectorio(exports.IMAGEN_CONFIG.carpetaBase);
            return {
                tamanoTotalBytes: tamanoTotal,
                tamanoTotalMB: (tamanoTotal / (1024 * 1024)).toFixed(2),
                tamanoTotalGB: (tamanoTotal / (1024 * 1024 * 1024)).toFixed(2),
                carpetaBase: exports.IMAGEN_CONFIG.carpetaBase,
                fechaConsulta: new Date().toISOString()
            };
        }
        catch (error) {
            throw new Error(`Error al obtener estadisticas de almacenamiento: ${error}`);
        }
    }
}
exports.ImagenUtils = ImagenUtils;
/**
 * Script de inicializacion para crear la estructura de directorios
 * Debe ejecutarse al iniciar la aplicacion
 */
async function inicializarSistemaImagenes() {
    try {
        await ImagenUtils.crearEstructuraDirectorios();
        console.log('Sistema de imagenes inicializado correctamente');
    }
    catch (error) {
        console.error('Error al inicializar sistema de imagenes:', error);
        throw error;
    }
}
/**
 * Middleware de Express para validacion de imagenes
 */
function validarImagenesMiddleware(req, res, next) {
    if (!req.files || !Array.isArray(req.files)) {
        return next();
    }
    const errores = [];
    if (req.files.length > exports.IMAGEN_CONFIG.maxFiles) {
        errores.push(`Maximo ${exports.IMAGEN_CONFIG.maxFiles} archivos permitidos`);
    }
    for (const file of req.files) {
        const validacion = ImagenUtils.validarImagen(file);
        if (!validacion.valido) {
            errores.push(validacion.error);
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
