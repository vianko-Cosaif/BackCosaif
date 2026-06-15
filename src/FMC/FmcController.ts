// src/controllers/FmcController.ts
import { Request, Response, RequestHandler } from 'express';
import { FmcModel } from '../models/FMC/modelFMC';      // nuevo modelo en forma de clase
import { fmcControllerLogger } from './fmc.controller.logger';
import type { AuthenticatedUser } from '../types/auth';

const ADMIN_ROLES = new Set(['ADMINISTRADOR', 'COORDINADOR']);

function getAuthUser(req: Request) {
  return req.user as AuthenticatedUser | undefined;
}

function isAdminRole(user?: AuthenticatedUser) {
  return ADMIN_ROLES.has(String(user?.rol ?? '').toUpperCase());
}

function readToken(body: unknown) {
  if (!body || typeof body !== 'object') return '';
  return String((body as { token?: unknown }).token ?? '').trim();
}

/**
 * Controlador para gestionar los tokens FCM
 */
export class FmcController {
  /** GET /fcm — lista todos los tokens (debug / panel admin) */
  static obtenerTokens: RequestHandler = async (req, res) => {
    const user = getAuthUser(req);
    if (!isAdminRole(user)) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }

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
    const user = getAuthUser(req);

    if (!/^\d+$/.test(usuarioId)) {
      res.status(400).json({ error: 'usuarioId debe ser numérico' });
      return;
    }

    if (!isAdminRole(user) && Number(usuarioId) !== user?.id) {
      res.status(403).json({ error: 'No autorizado' });
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
    const user = getAuthUser(req);
    const token = readToken(req.body);

    if (!user?.id || !token) {
      res.status(400).json({ error: 'Faltan usuario autenticado o token' });
      return;
    }

    try {
      await FmcModel.upsertToken(user.id, token);
      res.status(201).json({ ok: true });
    } catch (error) {
      fmcControllerLogger.error('Error al registrar token FCM', { error, usuarioId: user.id });
      res.status(500).json({ error: 'Error al registrar token', details: error });
    }
  };

  /** DELETE /fcm/:token — elimina token concreto */
  static eliminarToken: RequestHandler = async (req, res) => {
    const token = String(req.params.token);
    const user = getAuthUser(req);

    if (!token) {
      res.status(400).json({ error: 'Token requerido' });
      return;
    }

    try {
      const eliminados = await FmcModel.eliminarToken(token, isAdminRole(user) ? undefined : user?.id);
      res.json({ eliminados });
    } catch (error) {
      fmcControllerLogger.error(`Error al eliminar token ${token}`, { error });
      res.status(500).json({ error: 'Error al eliminar token', details: error });
    }
  };

  /** DELETE /fcm/usuario/:usuarioId — elimina todos los tokens de un usuario */
  static eliminarTokensPorUsuario: RequestHandler = async (req, res) => {
    const usuarioId = String(req.params.usuarioId);
    const user = getAuthUser(req);

    if (!/^\d+$/.test(usuarioId)) {
      res.status(400).json({ error: 'usuarioId debe ser numérico' });
      return;
    }

    if (!isAdminRole(user) && Number(usuarioId) !== user?.id) {
      res.status(403).json({ error: 'No autorizado' });
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
