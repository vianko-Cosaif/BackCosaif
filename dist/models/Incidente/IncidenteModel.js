"use strict";
// src/models/Incidente/IncidenteModel.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidenteModel = void 0;
exports.listarIncidentesPaginados = listarIncidentesPaginados;
const client_1 = require("@prisma/client");
const incidente_logger_1 = require("./incidente.logger");
const NotificadorFCM_1 = require("../../services/NotificadorFCM");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const sharp_1 = __importDefault(require("sharp"));
const prisma = new client_1.PrismaClient();
const IMAGEN_CONFIG = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 85,
    format: 'jpeg',
    carpetaBase: path_1.default.join(process.cwd(), 'uploads', 'incidentes')
};
function buildWhereByEstado(estado) {
    if (!estado)
        return {};
    switch (estado) {
        case 'PASADOS':
            return { estado: { in: [client_1.EstadoIncidente.CERRADO, client_1.EstadoIncidente.RESUELTO] } };
        case 'ABIERTO':
        case 'CERRADO':
        case 'RESUELTO':
            return { estado: client_1.EstadoIncidente[estado] };
        default:
            return {};
    }
}
/**
 * Listado paginado unificado con filtros opcionales
 */
async function listarIncidentesPaginados({ page = 1, pageSize = 20, estado, empresaId, localidadId }) {
    const skip = (page - 1) * pageSize;
    const where = {
        ...buildWhereByEstado(estado),
        ...(empresaId != null ? { movimiento: { empresaId } } : {}),
        ...(localidadId != null ? { movimiento: { localidadId } } : {})
    };
    const [items, total] = await Promise.all([
        prisma.incidente.findMany({
            where,
            include: {
                usuario: { select: { id: true, nombre: true } },
                movimiento: { select: { id: true, empresaId: true, localidadId: true } }
            },
            orderBy: [
                { fechaInicio: 'desc' },
                { id: 'desc' }
            ],
            skip,
            take: pageSize
        }),
        prisma.incidente.count({ where })
    ]);
    const data = items.map(i => ({
        id: i.id,
        descripcion: i.descripcion,
        estado: i.estado,
        fechaInicio: i.fechaInicio.toISOString(),
        usuario: { id: i.usuario.id, nombre: i.usuario.nombre },
        movimiento: { id: i.movimiento.id, empresaId: i.movimiento.empresaId, localidadId: i.movimiento.localidadId }
    }));
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
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
            ...(empresaId != null ? { empresaId } : {}),
            ...(localidadId != null ? { localidadId } : {})
        }
    };
}
class IncidenteModel {
    /** Obtener todos los incidentes sin paginar */
    static async obtenerIncidentes() {
        try {
            return await prisma.incidente.findMany({
                include: { movimiento: true, usuario: true },
                orderBy: { fechaInicio: 'desc' }
            });
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error al obtener incidentes', { error });
            throw new Error('Error al obtener incidentes');
        }
    }
    /** Crear un nuevo incidente, opcionalmente con imágenes */
    static async crearIncidente(data) {
        try {
            const nuevo = await prisma.incidente.create({
                data: {
                    descripcion: data.descripcion,
                    movimientoId: data.movimientoId,
                    usuarioId: data.usuarioId,
                    estado: client_1.EstadoIncidente.ABIERTO
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
            await NotificadorFCM_1.NotificadorFCM.notificarNuevoIncidente(nuevo);
            return nuevo;
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error al crear incidente', { data, error });
            throw new Error('Error al crear incidente');
        }
    }
    /** Editar un incidente existente (descripción, estado, imágenes) */
    static async editarIncidente(id, data) {
        try {
            const actual = await prisma.incidente.findUnique({ where: { id } });
            if (!actual)
                throw new Error('Incidente no encontrado');
            const update = {};
            if (data.descripcion)
                update.descripcion = data.descripcion;
            if (data.estado) {
                const mapEstado = {
                    ABIERTO: client_1.EstadoIncidente.ABIERTO,
                    CERRADO: client_1.EstadoIncidente.CERRADO,
                    RESUELTO: client_1.EstadoIncidente.RESUELTO,
                    PASADOS: client_1.EstadoIncidente.CERRADO
                };
                update.estado = mapEstado[data.estado];
                update.fechaFin = new Date();
            }
            if (data.imagenes?.length) {
                const prevImgs = [actual.imagen1, actual.imagen2, actual.imagen3, actual.imagen4]
                    .filter(Boolean);
                for (const img of prevImgs) {
                    await promises_1.default.unlink(path_1.default.join(IMAGEN_CONFIG.carpetaBase, img)).catch(() => { });
                }
                const rutas = await this.procesarImagenes(data.imagenes, id);
                update.imagen1 = rutas[0] ?? null;
                update.imagen2 = rutas[1] ?? null;
                update.imagen3 = rutas[2] ?? null;
                update.imagen4 = rutas[3] ?? null;
            }
            return await prisma.incidente.update({ where: { id }, data: update });
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error al editar incidente', { id, data, error });
            throw new Error('Error al editar incidente');
        }
    }
    /** Eliminar un incidente y sus imágenes */
    static async eliminarIncidente(id) {
        try {
            const inc = await prisma.incidente.findUnique({ where: { id } });
            if (!inc)
                throw new Error('Incidente no encontrado');
            const imgs = [inc.imagen1, inc.imagen2, inc.imagen3, inc.imagen4]
                .filter(Boolean);
            for (const img of imgs) {
                await promises_1.default.unlink(path_1.default.join(IMAGEN_CONFIG.carpetaBase, img)).catch(() => { });
            }
            return await prisma.incidente.delete({ where: { id } });
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error al eliminar incidente', { id, error });
            throw new Error('Error al eliminar incidente');
        }
    }
    /** Obtener incidente por ID, con relaciones */
    static async obtenerIncidentePorId(id) {
        const inc = await prisma.incidente.findUnique({
            where: { id },
            include: { movimiento: true, usuario: true }
        });
        if (!inc)
            throw new Error('Incidente no encontrado');
        return inc;
    }
    /** Verificar periodo de verificación/bloqueo (simplificado) */
    static async verificarPeriodoVerificacion(incidenteId) {
        const inc = await prisma.incidente.findUnique({
            where: { id: incidenteId },
            select: { estado: true, fechaInicio: true }
        });
        if (!inc)
            throw new Error('Incidente no encontrado');
        return { estado: inc.estado, fechaInicio: inc.fechaInicio };
    }
    /** Procesa y guarda imágenes optimizadas */
    static async procesarImagenes(imagenes, incidenteId) {
        const fecha = new Date();
        const carpeta = path_1.default.join(IMAGEN_CONFIG.carpetaBase, `${fecha.getFullYear()}`, `${fecha.getMonth() + 1}`, `${fecha.getDate()}`);
        await promises_1.default.mkdir(carpeta, { recursive: true });
        const rutas = [];
        for (let i = 0; i < imagenes.length && i < 4; i++) {
            const nombre = `inc_${incidenteId}_${Date.now()}_${i}.${IMAGEN_CONFIG.format}`;
            const full = path_1.default.join(carpeta, nombre);
            await (0, sharp_1.default)(imagenes[i])
                .resize(IMAGEN_CONFIG.maxWidth, IMAGEN_CONFIG.maxHeight, { fit: 'inside' })
                .jpeg({ quality: IMAGEN_CONFIG.quality })
                .toFile(full);
            rutas.push(path_1.default.relative(IMAGEN_CONFIG.carpetaBase, full));
        }
        return rutas;
    }
    /** Obtener ruta absoluta de imagen */
    static obtenerRutaCompletaImagen(rutaRel) {
        return path_1.default.join(IMAGEN_CONFIG.carpetaBase, rutaRel);
    }
}
exports.IncidenteModel = IncidenteModel;
