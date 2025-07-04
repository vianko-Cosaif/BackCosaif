"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViaController = void 0;
const viaModel_1 = require("../../models/Via/viaModel");
const via_controller_logger_1 = require("./via.controller.logger");
class ViaController {
}
exports.ViaController = ViaController;
_a = ViaController;
/**
 * GET /vias
 * Devuelve todas las vías.
 */
ViaController.obtenerVias = async (req, res) => {
    try {
        const vias = await viaModel_1.ViaModel.obtenerVias();
        res.json(vias);
    }
    catch (error) {
        via_controller_logger_1.viaControllerLogger.error('Error al obtener vías', { error });
        res.status(500).json({ error: 'Error al obtener vías', details: error });
    }
};
/**
 * GET /vias/localidad/:localidadId
 * Devuelve todas las vías asociadas a una localidad.
 */
ViaController.obtenerViasPorLocalidad = async (req, res) => {
    const localidadId = parseInt(req.params.localidadId, 10);
    if (isNaN(localidadId)) {
        res.status(400).json({ error: 'localidadId inválido' });
        return;
    }
    try {
        const vias = await viaModel_1.ViaModel.obtenerViasPorLocalidad(localidadId);
        res.json(vias);
    }
    catch (error) {
        via_controller_logger_1.viaControllerLogger.error('Error al obtener vías por localidad', { error, localidadId });
        res.status(500).json({ error: 'Error al obtener vías por localidad', details: error });
    }
};
/**
 * POST /vias
 * Crea una nueva vía.
 */
ViaController.crearVia = async (req, res) => {
    const { numero, nombre, localidadId } = req.body;
    if (numero === undefined || !nombre || localidadId === undefined) {
        res
            .status(400)
            .json({ error: 'Datos incompletos. Se requieren numero, nombre y localidadId' });
        return;
    }
    try {
        const nuevaVia = await viaModel_1.ViaModel.crearVia(numero, nombre, parseInt(localidadId, 10));
        res.status(201).json(nuevaVia);
    }
    catch (error) {
        via_controller_logger_1.viaControllerLogger.error('Error al crear vía', { error, numero, nombre, localidadId });
        res.status(500).json({ error: 'Error al crear vía', details: error });
    }
};
/**
 * PUT /vias/:id
 * Edita una vía existente.
 */
ViaController.editarVia = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { numero, nombre, localidadId } = req.body;
    if (isNaN(id)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
    }
    try {
        const data = {};
        if (numero !== undefined)
            data.numero = numero;
        if (nombre)
            data.nombre = nombre;
        if (localidadId !== undefined)
            data.localidadId = parseInt(localidadId, 10);
        const viaActualizada = await viaModel_1.ViaModel.editarVia(id, data);
        res.json(viaActualizada);
    }
    catch (error) {
        via_controller_logger_1.viaControllerLogger.error('Error al editar vía', { error, id, data: { numero, nombre, localidadId } });
        res.status(500).json({ error: 'Error al editar vía', details: error });
    }
};
/**
 * DELETE /vias/:id
 * Elimina una vía por su ID.
 */
ViaController.eliminarVia = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
    }
    try {
        const viaEliminada = await viaModel_1.ViaModel.eliminarVia(id);
        res.json({ message: 'Vía eliminada exitosamente', viaEliminada });
    }
    catch (error) {
        via_controller_logger_1.viaControllerLogger.error('Error al eliminar vía', { error, id });
        res.status(500).json({ error: 'Error al eliminar vía', details: error });
    }
};
