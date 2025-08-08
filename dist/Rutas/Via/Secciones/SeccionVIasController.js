"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeccionViaController = void 0;
const SeccionViasModel_1 = require("../../../models/Via/Secciones/SeccionViasModel");
const seccion_logger_1 = require("../../../models/Via/Secciones/seccion.logger");
// Helper: mapear errores de dominio → HTTP
function sendError(res, error, msg) {
    if (error instanceof SeccionViasModel_1.NotFoundError) {
        return res.status(404).json({ error: msg, details: error.message });
    }
    if (error instanceof SeccionViasModel_1.ConflictError) {
        return res.status(409).json({ error: msg, details: error.message });
    }
    if (error?.code === 'P2002') {
        return res
            .status(409)
            .json({ error: msg, details: 'Registro duplicado (violación de unique).' });
    }
    return res
        .status(500)
        .json({ error: msg, details: error?.message ?? String(error) });
}
class SeccionViaController {
}
exports.SeccionViaController = SeccionViaController;
_a = SeccionViaController;
/**
 * GET /secciones?viaId=123
 * Lista las secciones de una vía (usa query param porque el modelo NO expone "obtener todas").
 */
SeccionViaController.obtenerSecciones = async (req, res) => {
    const viaId = Number(req.query.viaId);
    if (!Number.isInteger(viaId)) {
        return res
            .status(400)
            .json({ error: 'viaId es requerido y debe ser numérico' });
    }
    try {
        const secciones = await SeccionViasModel_1.SeccionViaModel.obtenerSeccionesPorVia(viaId);
        res.status(200).json(secciones);
    }
    catch (error) {
        seccion_logger_1.seccionError.error('Error al obtener secciones (por viaId)', {
            error,
            viaId,
        });
        sendError(res, error, 'Error al obtener secciones');
    }
};
/**
 * GET /secciones/via/:viaId
 * Lista las secciones de una vía (ruta REST explícita).
 */
SeccionViaController.obtenerSeccionesPorVia = async (req, res) => {
    const viaId = Number(req.params.viaId);
    if (!Number.isInteger(viaId)) {
        return res.status(400).json({ error: 'viaId inválido' });
    }
    try {
        const secciones = await SeccionViasModel_1.SeccionViaModel.obtenerSeccionesPorVia(viaId);
        res.status(200).json(secciones);
    }
    catch (error) {
        seccion_logger_1.seccionError.error('Error al obtener secciones por vía', { error, viaId });
        sendError(res, error, 'Error al obtener secciones por vía');
    }
};
// ------------------- CRUD de secciones (no implementado en el modelo) -------------------
/** POST /secciones/via/:viaId  */
SeccionViaController.crearSeccion = async (_req, res) => {
    return res
        .status(501)
        .json({ error: 'No implementado en el dominio (SeccionViaModel).' });
};
/** PUT /secciones/:id */
SeccionViaController.editarSeccion = async (_req, res) => {
    return res
        .status(501)
        .json({ error: 'No implementado en el dominio (SeccionViaModel).' });
};
/** DELETE /secciones/:id */
SeccionViaController.eliminarSeccion = async (_req, res) => {
    return res
        .status(501)
        .json({ error: 'No implementado en el dominio (SeccionViaModel).' });
};
// ------------------- Ocupación de secciones -------------------
/**
 * POST /secciones/via/:viaId/asignar
 * body: { numero: number, movimientoId: number }
 */
SeccionViaController.asignarMovimiento = async (req, res) => {
    const viaId = Number(req.params.viaId);
    const { numero, movimientoId } = req.body ?? {};
    if (!Number.isInteger(viaId) ||
        !Number.isInteger(Number(numero)) ||
        !Number.isInteger(Number(movimientoId))) {
        return res.status(400).json({
            error: 'viaId, numero y movimientoId deben ser numéricos',
        });
    }
    try {
        const seccion = await SeccionViasModel_1.SeccionViaModel.asignarMovimientoASeccion(viaId, Number(numero), Number(movimientoId));
        res.status(200).json(seccion);
    }
    catch (error) {
        seccion_logger_1.seccionError.error('Error al asignar movimiento a sección', {
            error,
            viaId,
            numero,
            movimientoId,
        });
        sendError(res, error, 'Error al asignar movimiento a sección');
    }
};
/**
 * POST /secciones/via/:viaId/liberar
 * body: { numero: number, movimientoId: number }
 */
SeccionViaController.liberarSeccion = async (req, res) => {
    const viaId = Number(req.params.viaId);
    const { numero, movimientoId } = req.body ?? {};
    if (!Number.isInteger(viaId) ||
        !Number.isInteger(Number(numero)) ||
        !Number.isInteger(Number(movimientoId))) {
        return res.status(400).json({
            error: 'viaId, numero y movimientoId deben ser numéricos',
        });
    }
    try {
        const seccion = await SeccionViasModel_1.SeccionViaModel.liberarSeccion(viaId, Number(numero), Number(movimientoId));
        res.status(200).json(seccion);
    }
    catch (error) {
        seccion_logger_1.seccionError.error('Error al liberar sección', {
            error,
            viaId,
            numero,
            movimientoId,
        });
        sendError(res, error, 'Error al liberar sección');
    }
};
/**
 * POST /secciones/via/:viaId/liberar-todas
 * body: { movimientoId: number }
 * Libera TODAS las secciones de la vía ocupadas por ese movimiento.
 */
SeccionViaController.liberarTodasPorMovimiento = async (req, res) => {
    const viaId = Number(req.params.viaId);
    const { movimientoId } = req.body ?? {};
    if (!Number.isInteger(viaId) || !Number.isInteger(Number(movimientoId))) {
        return res
            .status(400)
            .json({ error: 'viaId y movimientoId deben ser numéricos' });
    }
    try {
        const via = await SeccionViasModel_1.SeccionViaModel.liberarMovimientoDeSeccion(viaId, Number(movimientoId));
        res.status(200).json(via);
    }
    catch (error) {
        seccion_logger_1.seccionError.error('Error al liberar todas las secciones del movimiento', {
            error,
            viaId,
            movimientoId,
        });
        sendError(res, error, 'Error al liberar secciones del movimiento');
    }
};
