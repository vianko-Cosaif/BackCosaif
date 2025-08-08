"use strict";
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
// ─────────────────────────────────────────────────────────────
// Multer (memoria, máx. 4 imágenes de 10MB c/u, tipos permitidos)
// ─────────────────────────────────────────────────────────────
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 4 },
    fileFilter: (_req, file, cb) => {
        const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        ok.includes(file.mimetype)
            ? cb(null, true)
            : cb(new Error('Solo se permiten JPEG, JPG, PNG o WEBP'));
    },
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
 *
 * Reglas:
 * - Con empresa/localidad → se usan métodos específicos paginados del modelo.
 * - Sin filtros de empresa/localidad → obtenerIncidentesPaginados (acepta ABIERTO|CERRADO).
 * - Para RESUELTO/PASADOS → usar listarIncidentesPaginados (pageSize=20 fijo).
 */
IncidenteController.listar = async (req, res) => {
    try {
        const { estado: e, page: p, pageSize: ps, empresaId: emp, localidadId: loc } = req.query;
        const page = Math.max(1, Number(p) || 1);
        const pageSize = Math.max(1, Number(ps) || 20);
        const empresaId = emp ? Number(emp) : undefined;
        const localidadId = loc ? Number(loc) : undefined;
        const estadoStr = typeof e === 'string' ? e.toUpperCase() : undefined;
        const estado = ['ABIERTO', 'CERRADO', 'RESUELTO', 'PASADOS'].includes(estadoStr)
            ? estadoStr
            : undefined;
        // Rama con filtros de empresa/localidad (los métodos del modelo no filtran por RESUELTO/PASADOS)
        if (empresaId && localidadId) {
            const r = await IncidenteModel_1.IncidenteModel.obtenerIncidentesPorEmpresaYLocalidad(empresaId, localidadId, page, pageSize);
            return res.json({ success: true, data: r.data, meta: r.meta });
        }
        if (empresaId && !localidadId) {
            const r = await IncidenteModel_1.IncidenteModel.obtenerIncidentesPorEmpresa(empresaId, page, pageSize);
            return res.json({ success: true, data: r.data, meta: r.meta });
        }
        if (!empresaId && localidadId) {
            const r = await IncidenteModel_1.IncidenteModel.obtenerIncidentesPorLocalidad(localidadId, page, pageSize);
            return res.json({ success: true, data: r.data, meta: r.meta });
        }
        // Sin empresa/localidad:
        // - Si piden RESUELTO o PASADOS, usamos el helper con pageSize fijo (20)
        if (estado === 'RESUELTO' || estado === 'PASADOS') {
            const r = await (0, IncidenteModel_1.listarIncidentesPaginados)({ page, estado });
            return res.json({ success: true, data: r.data, meta: r.meta });
        }
        // - Si piden ABIERTO/CERRADO o nada → método del modelo (acepta pageSize)
        const estadoSimple = estado === 'ABIERTO' || estado === 'CERRADO' ? estado : undefined;
        const r = await IncidenteModel_1.IncidenteModel.obtenerIncidentesPaginados(page, pageSize, estadoSimple);
        return res.json({ success: true, data: r.data, meta: r.meta });
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
        const errorMsg = error instanceof Error ? error.message : String(error);
        const status = /no (se )?encontr|no existe/i.test(errorMsg) ? 404 : 500;
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
            return res.status(400).json({ success: false, error: 'Faltan campos obligatorios' });
        }
        const buffers = Array.isArray(req.files) ? req.files.map((f) => f.buffer) : [];
        const nuevo = await IncidenteModel_1.IncidenteModel.crearIncidente({
            descripcion: String(descripcion).trim(),
            movimientoId: Number(movimientoId),
            usuarioId: Number(usuarioId),
            imagenes: buffers.length ? buffers : undefined,
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
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const { descripcion, estado } = req.body;
        if (estado && !['ABIERTO', 'CERRADO', 'RESUELTO'].includes(estado.toUpperCase())) {
            return res.status(400).json({ success: false, error: 'Estado inválido (use ABIERTO, CERRADO o RESUELTO)' });
        }
        const buffers = Array.isArray(req.files) ? req.files.map((f) => f.buffer) : [];
        const actualizado = await IncidenteModel_1.IncidenteModel.editarIncidente(id, {
            descripcion: descripcion?.trim(),
            estado: estado ? estado.toUpperCase() : undefined,
            imagenes: buffers.length ? buffers : undefined,
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
 * Verifica periodo de verificación / bloqueo
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
 * Cambia estado a CERRADO (el modelo ya notifica si aplica)
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
 * Nota: si usas subcarpetas (aaaa/mm/dd/archivo.jpg) conviene usar query (?ruta=)
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
/**
 * POST /incidentes/:id/resuelto
 * Marca un incidente como RESUELTO.
 * (No llamamos a Notificador aquí: el modelo ya notifica al cambiar estado)
 */
IncidenteController.resolver = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const actualizado = await IncidenteModel_1.IncidenteModel.editarIncidente(id, { estado: 'RESUELTO' });
        return res.json({ success: true, data: actualizado });
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('resolver', { id: req.params.id, error });
        return res.status(500).json({ success: false, error: 'Error al resolver incidente' });
    }
};
