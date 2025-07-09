"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidenteModel = exports.IMAGEN_CONFIG = void 0;
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const sharp_1 = __importDefault(require("sharp"));
const prisma = new client_1.PrismaClient();
// Configuración para manejo de imágenes de incidentes
exports.IMAGEN_CONFIG = {
    basePath: path_1.default.join(process.cwd(), 'uploads', 'incidentes'),
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 85,
    format: 'jpeg',
};
class IncidenteModel {
    static reorganizarRondasPorIncidente(empresaId, localidadId, id) {
        throw new Error("Method not implemented.");
    }
    /**
     * Procesa y guarda hasta 4 imágenes en carpetas organizadas por fecha: uploads/incidentes/YYYY/MM/DD
     * @param imagenes - Buffers de las imágenes
     * @param incidenteId - ID del incidente
     */
    static async procesarImagenes(imagenes, incidenteId) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dirDestino = path_1.default.join(exports.IMAGEN_CONFIG.basePath, String(year), month, day);
        await promises_1.default.mkdir(dirDestino, { recursive: true });
        for (let i = 0; i < Math.min(imagenes.length, 4); i++) {
            const timestamp = Date.now();
            const nombreArchivo = `incidente_${incidenteId}_${i + 1}_${timestamp}.${exports.IMAGEN_CONFIG.format}`;
            const rutaArchivo = path_1.default.join(dirDestino, nombreArchivo);
            await (0, sharp_1.default)(imagenes[i])
                .resize(exports.IMAGEN_CONFIG.maxWidth, exports.IMAGEN_CONFIG.maxHeight, {
                fit: 'inside',
                withoutEnlargement: true,
            })
                .toFormat(exports.IMAGEN_CONFIG.format, { quality: exports.IMAGEN_CONFIG.quality })
                .toFile(rutaArchivo);
        }
    }
    /**
     * Recupera rutas relativas de imágenes guardadas para un incidente
     * @param incidenteId - ID del incidente
     * @returns Array de rutas relativas (desde uploads/incidentes)
     */
    static async obtenerImagenesIncidente(incidenteId) {
        const resultados = [];
        async function recorrer(dir) {
            const entradas = await promises_1.default.readdir(dir, { withFileTypes: true });
            for (const ent of entradas) {
                const ruta = path_1.default.join(dir, ent.name);
                if (ent.isDirectory()) {
                    await recorrer(ruta);
                }
                else if (ent.isFile() &&
                    ent.name.startsWith(`incidente_${incidenteId}_`)) {
                    resultados.push(path_1.default.relative(exports.IMAGEN_CONFIG.basePath, ruta).replace(/\\/g, '/'));
                }
            }
        }
        await recorrer(exports.IMAGEN_CONFIG.basePath);
        return resultados;
    }
    /**
     * Obtiene todos los incidentes ordenados por fecha de inicio descendente
     */
    static async obtenerIncidentes() {
        return prisma.incidente.findMany({ orderBy: { fechaInicio: 'desc' } });
    }
    /**
     * Paginación de incidentes con filtros opcionales
     * @param page - Número de página
     * @param pageSize - Tamaño de página
     * @param filtros - Opciones de filtrado (estado, empresaId, localidadId, fechas)
     */
    static async obtenerIncidentesPaginados(page = 1, pageSize = 20, filtros) {
        page = Math.max(1, page);
        pageSize = Math.min(100, Math.max(1, pageSize));
        const skip = (page - 1) * pageSize;
        const where = {};
        if (filtros?.estado)
            where.estado = filtros.estado;
        if (filtros?.fechaInicio || filtros?.fechaFin) {
            where.fechaInicio = {};
            if (filtros.fechaInicio)
                where.fechaInicio.gte = filtros.fechaInicio;
            if (filtros.fechaFin)
                where.fechaInicio.lte = filtros.fechaFin;
        }
        if (filtros?.empresaId || filtros?.localidadId) {
            where.movimiento = {};
            if (filtros.empresaId)
                where.movimiento.empresaId = filtros.empresaId;
            if (filtros.localidadId)
                where.movimiento.localidadId = filtros.localidadId;
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
    static async obtenerIncidentesPorEstado(estado, page = 1, pageSize = 20) {
        return this.obtenerIncidentesPaginados(page, pageSize, { estado });
    }
    /**
     * Obtiene incidentes por localidad con paginación
     */
    static async obtenerIncidentesPorLocalidad(localidadId, page = 1, pageSize = 20) {
        return this.obtenerIncidentesPaginados(page, pageSize, { localidadId });
    }
    /**
     * Obtiene incidentes por empresa con paginación
     */
    static async obtenerIncidentesPorEmpresa(empresaId, page = 1, pageSize = 20) {
        return this.obtenerIncidentesPaginados(page, pageSize, { empresaId });
    }
}
exports.IncidenteModel = IncidenteModel;
