// src/controllers/FmcController.ts
import { Request, Response, RequestHandler } from 'express';
import { FmcModel } from '../models/FMC/modelFMC';      // nuevo modelo en forma de clase
import { fmcControllerLogger } from './fmc.controller.logger';

/**
 * Controlador para gestionar los tokens FCM
 */
export class FmcController {
  /** GET /fcm — lista todos los tokens (debug / panel admin) */
  static obtenerTokens: RequestHandler = async (_req, res) => {
    try {
      const tokens = await FmcModel.obtenerTokens();
      res.json(tokens);
    } catch (error) {
      fmcControllerLogger.error('Error al obtener tokens FCM', { error });
      res.status(500).json({ error: 'Error al obtener tokens FCM', details: error });
    }
  };

  /** GET /fcm/usuario/:usuarioId — tokens de un usuario */
  static obtenerTokensPorUsuario: RequestHandler = async (req, res) => {
    const usuarioId = String(req.params.usuarioId);

    if (!/^\d+$/.test(usuarioId)) {
      res.status(400).json({ error: 'usuarioId debe ser numérico' });
      return;
    }

    try {
      const tokens = await FmcModel.obtenerTokensPorUsuario(Number(usuarioId));
      res.json(tokens);
    } catch (error) {
      fmcControllerLogger.error(`Error al obtener tokens del usuario ${usuarioId}`, { error });
      res.status(500).json({ error: 'Error al obtener tokens', details: error });
    }
  };

  /** POST /fcm — upsert token  */
  static registrarToken: RequestHandler = async (req, res) => {
    const { usuarioId, token } = req.body;

    if (!usuarioId || !token) {
      res.status(400).json({ error: 'Faltan usuarioId o token' });
      return;
    }

    try {
      await FmcModel.upsertToken(Number(usuarioId), token);
      res.sendStatus(204); // No Content
    } catch (error) {
      fmcControllerLogger.error('Error al registrar token FCM', { error, usuarioId, token });
      res.status(500).json({ error: 'Error al registrar token', details: error });
    }
  };

  /** DELETE /fcm/:token — elimina token concreto */
  static eliminarToken: RequestHandler = async (req, res) => {
    const token = String(req.params.token);

    if (!token) {
      res.status(400).json({ error: 'Token requerido' });
      return;
    }

    try {
      await FmcModel.eliminarToken(token);
      res.sendStatus(204);
    } catch (error) {
      fmcControllerLogger.error(`Error al eliminar token ${token}`, { error });
      res.status(500).json({ error: 'Error al eliminar token', details: error });
    }
  };

  /** DELETE /fcm/usuario/:usuarioId — elimina todos los tokens de un usuario */
  static eliminarTokensPorUsuario: RequestHandler = async (req, res) => {
    const usuarioId = String(req.params.usuarioId);

    if (!/^\d+$/.test(usuarioId)) {
      res.status(400).json({ error: 'usuarioId debe ser numérico' });
      return;
    }

    try {
      const eliminados = await FmcModel.eliminarTokensPorUsuario(Number(usuarioId));
      res.json({ eliminados });
    } catch (error) {
      fmcControllerLogger.error(`Error al eliminar tokens del usuario ${usuarioId}`, { error });
      res.status(500).json({ error: 'Error al eliminar tokens', details: error });
    }
  };
}
