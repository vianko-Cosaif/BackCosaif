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

function toPositiveInt(value: unknown) {
  const parsed = Number(value ?? NaN);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
}

function readRequestedLocalidadId(body: unknown) {
  const raw = body && typeof body === 'object' ? (body as { localidadId?: unknown }).localidadId : undefined;
  return toPositiveInt(raw);
}

function resolveLocalidadId(body: unknown, user?: AuthenticatedUser) {
  const userLocalidadId = toPositiveInt(user?.localidad?.id);
  if (!isAdminRole(user)) return userLocalidadId;
  return readRequestedLocalidadId(body) ?? userLocalidadId;
}

function readRuntimeEnv(body: unknown) {
  const raw = body && typeof body === 'object' ? (body as { runtimeEnv?: unknown }).runtimeEnv : undefined;
  const normalized = String(raw ?? 'production').trim().toLowerCase();
  return normalized === 'development' ? 'development' : 'production';
}

function allowRuntimeRegistration(runtimeEnv: 'development' | 'production') {
  if (runtimeEnv === 'production') return true;
  return String(process.env.FCM_ALLOW_DEV_REGISTRATION ?? '').trim().toLowerCase() === 'true';
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
    const localidadId = resolveLocalidadId(req.body, user);
    const runtimeEnv = readRuntimeEnv(req.body);

    if (!user?.id || !token) {
      res.status(400).json({ error: 'Faltan usuario autenticado o token' });
      return;
    }

    if (!allowRuntimeRegistration(runtimeEnv)) {
      res.status(403).json({ error: 'Registro FCM de desarrollo deshabilitado' });
      return;
    }

    try {
      await FmcModel.upsertToken(user.id, token, localidadId);
      fmcControllerLogger.info('Token FCM registrado', { usuarioId: user.id, localidadId, runtimeEnv });
      res.status(201).json({ ok: true, localidadId, runtimeEnv });
    } catch (error) {
      fmcControllerLogger.error('Error al registrar token FCM', { error, usuarioId: user.id, localidadId, runtimeEnv });
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
