"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FmcController = void 0;
const modelFMC_1 = require("../models/FMC/modelFMC"); // nuevo modelo en forma de clase
const fmc_controller_logger_1 = require("./fmc.controller.logger");
/**
 * Controlador para gestionar los tokens FCM
 */
class FmcController {
}
exports.FmcController = FmcController;
_a = FmcController;
/** GET /fcm � lista todos los tokens (debug / panel admin) */
FmcController.obtenerTokens = async (_req, res) => {
    try {
        const tokens = await modelFMC_1.FmcModel.obtenerTokens();
        res.json(tokens);
    }
    catch (error) {
        fmc_controller_logger_1.fmcControllerLogger.error('Error al obtener tokens FCM', { error });
        res.status(500).json({ error: 'Error al obtener tokens FCM', details: error });
    }
};
/** GET /fcm/usuario/:usuarioId � tokens de un usuario */
FmcController.obtenerTokensPorUsuario = async (req, res) => {
    const { usuarioId } = req.params;
    if (!/^\d+$/.test(usuarioId)) {
        res.status(400).json({ error: 'usuarioId debe ser num�rico' });
        return;
    }
    try {
        const tokens = await modelFMC_1.FmcModel.obtenerTokensPorUsuario(Number(usuarioId));
        res.json(tokens);
    }
    catch (error) {
        fmc_controller_logger_1.fmcControllerLogger.error(`Error al obtener tokens del usuario ${usuarioId}`, { error });
        res.status(500).json({ error: 'Error al obtener tokens', details: error });
    }
};
/** POST /fcm � upsert token  */
FmcController.registrarToken = async (req, res) => {
    const { usuarioId, token } = req.body;
    if (!usuarioId || !token) {
        res.status(400).json({ error: 'Faltan usuarioId o token' });
        return;
    }
    try {
        await modelFMC_1.FmcModel.upsertToken(Number(usuarioId), token);
        res.sendStatus(204); // No Content
    }
    catch (error) {
        fmc_controller_logger_1.fmcControllerLogger.error('Error al registrar token FCM', { error, usuarioId, token });
        res.status(500).json({ error: 'Error al registrar token', details: error });
    }
};
/** DELETE /fcm/:token � elimina token concreto */
FmcController.eliminarToken = async (req, res) => {
    const { token } = req.params;
    if (!token) {
        res.status(400).json({ error: 'Token requerido' });
        return;
    }
    try {
        await modelFMC_1.FmcModel.eliminarToken(token);
        res.sendStatus(204);
    }
    catch (error) {
        fmc_controller_logger_1.fmcControllerLogger.error(`Error al eliminar token ${token}`, { error });
        res.status(500).json({ error: 'Error al eliminar token', details: error });
    }
};
/** DELETE /fcm/usuario/:usuarioId � elimina todos los tokens de un usuario */
FmcController.eliminarTokensPorUsuario = async (req, res) => {
    const { usuarioId } = req.params;
    if (!/^\d+$/.test(usuarioId)) {
        res.status(400).json({ error: 'usuarioId debe ser num�rico' });
        return;
    }
    try {
        const eliminados = await modelFMC_1.FmcModel.eliminarTokensPorUsuario(Number(usuarioId));
        res.json({ eliminados });
    }
    catch (error) {
        fmc_controller_logger_1.fmcControllerLogger.error(`Error al eliminar tokens del usuario ${usuarioId}`, { error });
        res.status(500).json({ error: 'Error al eliminar tokens', details: error });
    }
};
