"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeccionViaController = void 0;
const SeccionViasModel_1 = require("../../../models/Via/Secciones/SeccionViasModel");
const seccion_logger_1 = require("../../../models/Via/Secciones//seccion.logger");
class SeccionViaController {
}
exports.SeccionViaController = SeccionViaController;
_a = SeccionViaController;
/**
 * GET /secciones
 * Devuelve todas las secciones.
 */
SeccionViaController.obtenerSecciones = async (_req, res) => {
    try {
        const secciones = await SeccionViasModel_1.SeccionViaModel.obtenerSecciones();
        res.json(secciones);
    }
    catch (error) {
        seccion_logger_1.seccionError.error('Error al obtener secciones', { error });
        res.status(500).json({ error: 'Error al obtener secciones', details: error.message });
    }
};
/**
 * GET /secciones/via/:viaId
 * Devuelve todas las secciones de una vía.
 */
SeccionViaController.obtenerSeccionesPorVia = async (req, res) => {
    const viaId = parseInt(req.params.viaId, 10);
    if (isNaN(viaId)) {
        res.status(400).json({ error: 'viaId inválido' });
        return;
    }
    try {
        const secciones = await SeccionViasModel_1.SeccionViaModel.obtenerSeccionesPorVia(viaId);
        res.json(secciones);
    }
    catch (error) {
        seccion_logger_1.seccionError.error('Error al obtener secciones por vía', { error, viaId });
        res.status(500).json({ error: 'Error al obtener secciones por vía', details: error.message });
    }
};
/**
 * POST /secciones/via/:viaId
 * Crea una nueva sección en una vía.
 */
SeccionViaController.crearSeccion = async (req, res) => {
    const viaId = parseInt(req.params.viaId, 10);
    const { numero, nombre } = req.body;
    if (isNaN(viaId) || isNaN(numero)) {
        res.status(400).json({ error: 'viaId y numero deben ser números' });
        return;
    }
    try {
        const seccion = await SeccionViasModel_1.SeccionViaModel.crearSeccion(viaId, numero, nombre);
        res.status(201).json(seccion);
    }
    catch (error) {
        seccion_logger_1.seccionError.error('Error al crear sección', { error, viaId, numero, nombre });
        res.status(500).json({ error: 'Error al crear sección', details: error.message });
    }
};
/**
 * PUT /secciones/:id
 * Edita una sección existente.
 */
SeccionViaController.editarSeccion = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    if (isNaN(id)) {
        res.status(400).json({ error: 'id de sección inválido' });
        return;
    }
    try {
        const seccion = await SeccionViasModel_1.SeccionViaModel.editarSeccion(id, data);
        res.json(seccion);
    }
    catch (error) {
        seccion_logger_1.seccionError.error('Error al editar sección', { error, id, data });
        res.status(500).json({ error: 'Error al editar sección', details: error.message });
    }
};
/**
 * DELETE /secciones/:id
 * Elimina una sección.
 */
SeccionViaController.eliminarSeccion = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        res.status(400).json({ error: 'id de sección inválido' });
        return;
    }
    try {
        await SeccionViasModel_1.SeccionViaModel.eliminarSeccion(id);
        res.json({ message: 'Sección eliminada exitosamente' });
    }
    catch (error) {
        seccion_logger_1.seccionError.error('Error al eliminar sección', { error, id });
        res.status(500).json({ error: 'Error al eliminar sección', details: error.message });
    }
};
