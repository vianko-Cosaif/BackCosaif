"use strict";
// src/controllers/IncidenteController.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidenteController = exports.uploadImagenes = void 0;
const multer_1 = __importDefault(require("multer"));
const promises_1 = __importDefault(require("fs/promises"));
const IncidenteModel_1 = require("../../models/Incidente/IncidenteModel");
const incidente_controller_logger_1 = require("./incidente.controller.logger");
// Configuración de multer (memoria, max. 4 imágenes de 10MB c/u)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 4 },
    fileFilter: (_req, file, cb) => {
        const permitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        permitidos.includes(file.mimetype)
            ? cb(null, true)
            : cb(new Error('Solo se permiten JPEG, JPG, PNG o WEBP'));
    }
});
exports.uploadImagenes = upload.array('imagenes', 4);
class IncidenteController {
}
exports.IncidenteController = IncidenteController;
_a = IncidenteController;
/**
 * GET /incidentes
 * Listado paginado con filtros opcionales:
 * ?estado=&page=&pageSize=&empresaId=&localidadId=
 */
IncidenteController.listar = async (req, res) => {
    try {
        const { estado: e, page: p, pageSize: ps, empresaId: emp, localidadId: loc } = req.query;
        const page = Math.max(1, Number(p) || 1);
        const pageSize = Math.max(1, Number(ps) || 20);
        const estado = ['ABIERTO', 'CERRADO', 'RESUELTO', 'PASADOS'].includes(e)
            ? e
            : undefined;
        const result = await (0, IncidenteModel_1.listarIncidentesPaginados)({
            page,
            pageSize,
            estado,
            empresaId: emp ? Number(emp) : undefined,
            localidadId: loc ? Number(loc) : undefined
        });
        res.json({ success: true, data: result.data, meta: result.meta });
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('listar', { error, query: req.query });
        res.status(500).json({ success: false, error: 'Error al listar incidentes' });
    }
};
/**
 * GET /incidentes/:id
 * Obtener un incidente por su ID (con relaciones)
 */
IncidenteController.obtenerPorId = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const incidente = await IncidenteModel_1.IncidenteModel.obtenerIncidentePorId(id);
        res.json({ success: true, data: incidente });
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('obtenerPorId', { id: req.params.id, error });
        const errorMsg = (error instanceof Error) ? error.message : String(error);
        const status = /no encontrado/i.test(errorMsg) ? 404 : 500;
        res.status(status).json({ success: false, error: errorMsg });
    }
};
/**
 * POST /incidentes
 * Crea un nuevo incidente (opcionalmente con imágenes)
 */
IncidenteController.crear = async (req, res) => {
    try {
        const { descripcion, movimientoId, usuarioId } = req.body;
        if (!descripcion || !movimientoId || !usuarioId) {
            return res
                .status(400)
                .json({ success: false, error: 'Faltan campos obligatorios' });
        }
        const buffers = Array.isArray(req.files)
            ? req.files.map(f => f.buffer)
            : [];
        const nuevo = await IncidenteModel_1.IncidenteModel.crearIncidente({
            descripcion: descripcion.trim(),
            movimientoId: Number(movimientoId),
            usuarioId: Number(usuarioId),
            imagenes: buffers.length ? buffers : undefined
        });
        res.status(201).json({ success: true, data: nuevo });
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('crear', { body: req.body, error });
        res.status(500).json({ success: false, error: 'Error al crear incidente' });
    }
};
/**
 * PUT /incidentes/:id
 * Edita descripción, estado y/o imágenes de un incidente
 */
IncidenteController.editar = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { descripcion, estado } = req.body;
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        if (estado && !['ABIERTO', 'CERRADO', 'RESUELTO', 'PASADOS'].includes(estado)) {
            return res.status(400).json({ success: false, error: 'Estado inválido' });
        }
        const buffers = Array.isArray(req.files)
            ? req.files.map(f => f.buffer)
            : [];
        const actualizado = await IncidenteModel_1.IncidenteModel.editarIncidente(id, {
            descripcion: descripcion?.trim(),
            estado: estado,
            imagenes: buffers.length ? buffers : undefined
        });
        res.json({ success: true, data: actualizado });
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('editar', { id: req.params.id, error });
        res.status(500).json({ success: false, error: 'Error al editar incidente' });
    }
};
/**
 * DELETE /incidentes/:id
 * Elimina un incidente y sus imágenes del disco
 */
IncidenteController.eliminar = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const eliminado = await IncidenteModel_1.IncidenteModel.eliminarIncidente(id);
        res.json({ success: true, data: eliminado });
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('eliminar', { id: req.params.id, error });
        res.status(500).json({ success: false, error: 'Error al eliminar incidente' });
    }
};
/**
 * GET /incidentes/:id/verificacion
 * Verifica periodo de verificación / bloqueo (simplificado)
 */
IncidenteController.verificarPeriodo = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const info = await IncidenteModel_1.IncidenteModel.verificarPeriodoVerificacion(id);
        res.json({ success: true, data: info });
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('verificarPeriodo', { id: req.params.id, error });
        res.status(500).json({ success: false, error: 'Error al verificar periodo' });
    }
};
/**
 * POST /incidentes/:id/cerrar
 * Cierra manualmente un incidente (cambia estado a CERRADO)
 */
IncidenteController.cerrar = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const cerrado = await IncidenteModel_1.IncidenteModel.editarIncidente(id, { estado: 'CERRADO' });
        res.json({ success: true, data: cerrado });
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('cerrar', { id: req.params.id, error });
        res.status(500).json({ success: false, error: 'Error al cerrar incidente' });
    }
};
/**
 * GET /incidentes/imagen/:ruta
 * Sirve la imagen correspondiente a la ruta relativa
 */
IncidenteController.servirImagen = async (req, res) => {
    try {
        const ruta = req.params.ruta;
        const fullPath = IncidenteModel_1.IncidenteModel.obtenerRutaCompletaImagen(ruta);
        await promises_1.default.access(fullPath);
        res.sendFile(fullPath);
    }
    catch {
        res.status(404).json({ success: false, error: 'Imagen no encontrada' });
    }
};
