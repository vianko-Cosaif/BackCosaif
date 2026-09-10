import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';
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
  if (String(user?.rol).toUpperCase() !== 'ADMINISTRADOR') return userLocalidadId;
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

function tokenScope(user?: AuthenticatedUser): Prisma.FcmTokenWhereInput {
  if (!user) return { id: -1 };
  const role = String(user.rol).toUpperCase();
  if (role === 'ADMINISTRADOR') return {};
  if (role === 'COORDINADOR') return { usuario: { localidadId: user.localidad?.id ?? -1 } };
  return { usuarioId: user.id };
}

const tokenMetadata = (rows: { token: string; [key: string]: unknown }[]) =>
  rows.map(({ token, ...row }) => ({ ...row, token: `…${token.slice(-6)}` }));

async function mayManageUser(user: AuthenticatedUser | undefined, usuarioId: number) {
  if (!user) return false;
  if (user.id === usuarioId || String(user.rol) === 'ADMINISTRADOR') return true;
  if (String(user.rol) !== 'COORDINADOR' || !user.localidad?.id) return false;
  return Boolean(await prisma.usuario.findFirst({ where: { id: usuarioId, localidadId: user.localidad.id }, select: { id: true } }));
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
      const tokens = await FmcModel.obtenerTokens(tokenScope(user));
      res.json(tokenMetadata(tokens));
    } catch (error) {
      fmcControllerLogger.error('Error al obtener tokens FCM', { error });
      res.status(500).json({ error: 'Error al obtener tokens FCM' });
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

    try {
      if (!await mayManageUser(user, Number(usuarioId))) {
        res.status(403).json({ error: 'No autorizado' });
        return;
      }
      const tokens = await FmcModel.obtenerTokensPorUsuario(Number(usuarioId), tokenScope(user));
      res.json(tokenMetadata(tokens));
    } catch (error) {
      fmcControllerLogger.error(`Error al obtener tokens del usuario ${usuarioId}`, { error });
      res.status(500).json({ error: 'Error al obtener tokens' });
    }
  };

  /** POST /fcm — upsert token  */
  static registrarToken: RequestHandler = async (req, res) => {
    const user = getAuthUser(req);
    const token = readToken(req.body);
    const localidadId = resolveLocalidadId(req.body, user);
    const runtimeEnv = readRuntimeEnv(req.body);

    if (!user?.id || !token || token.length > 500) {
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
      res.status(500).json({ error: 'Error al registrar token' });
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
      const eliminados = await FmcModel.eliminarTokenEnAlcance(token, tokenScope(user));
      res.json({ eliminados });
    } catch (error) {
      fmcControllerLogger.error('Error al eliminar token FCM', { error });
      res.status(500).json({ error: 'Error al eliminar token' });
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

    try {
      if (!await mayManageUser(user, Number(usuarioId))) {
        res.status(403).json({ error: 'No autorizado' });
        return;
      }
      const eliminados = await FmcModel.eliminarTokensPorUsuario(Number(usuarioId), tokenScope(user));
      res.json({ eliminados });
    } catch (error) {
      fmcControllerLogger.error(`Error al eliminar tokens del usuario ${usuarioId}`, { error });
      res.status(500).json({ error: 'Error al eliminar tokens' });
    }
  };
}
