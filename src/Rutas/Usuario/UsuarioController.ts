// src/controllers/Usuario/usuario.controller.ts
import { Request, Response, RequestHandler } from 'express';
import { PrismaClient, DeviceType } from '@prisma/client';
import { UsuarioModel } from '../../models/Usuario/usuarioModel';
import * as tokenService from '../../middlewares/token.service';
import { registrarIpUsuario, extraerIp } from '../../models/Token/ipUsuario';
import { usuarioControllerLogger } from './usuario.controller.logger';

const prisma = new PrismaClient();

type SafeUser = {
  id: number; nombre: string; email: string; rol: string;
  empresaId: number; localidadId: number;
  empresa?: { nombre: string }; localidad?: { nombre: string; estado: string };
};

// util mínimo
const toDeviceType = (v?: string): DeviceType =>
  (['WEB','ANDROID','IOS','DESKTOP','OTHER'] as const).includes((v||'').toUpperCase() as any)
    ? (v!.toUpperCase() as DeviceType) : 'OTHER';

export class UsuarioController {
  static obtenerUsuarios: RequestHandler = async (_req, res) => {
    try {
      const usuarios = await UsuarioModel.obtenerUsuarios();
      res.json(usuarios);
    } catch (error) {
      usuarioControllerLogger.error('Error al obtener usuarios', { error });
      res.status(500).json({ error: 'Error al obtener usuarios' });
    }
  };

  static crearUsuario: RequestHandler = async (req, res) => {
    const { nombre, email, contrasena, rol, empresaId, localidadId } = req.body;
    try {
      const nuevo = await UsuarioModel.crearUsuario(nombre, email, contrasena, rol, empresaId, localidadId);
      res.status(201).json(nuevo);
    } catch (error) {
      usuarioControllerLogger.error('Error al crear usuario', { error, nombre, email });
      res.status(500).json({ error: 'Error al crear usuario' });
    }
  };

  static editarUsuario: RequestHandler = async (req, res) => {
    const { id } = req.params;
    const { nombre, email, contrasena } = req.body;
    try {
      const upd = await UsuarioModel.editarUsuario(Number(id), nombre, email, contrasena);
      res.json(upd);
    } catch (error) {
      usuarioControllerLogger.error(`Error al editar usuario ${id}`, { error });
      res.status(500).json({ error: 'Error al editar usuario' });
    }
  };

  /** POST /login */
  static login: RequestHandler = async (req, res) => {
    const { nombre, contrasena, playerId, deviceId: bodyDeviceId, platform: bodyPlatform, tipoDispositivo } = req.body;

    try {
      const result = await UsuarioModel.obtenerUsuarioPorCredenciales(nombre, contrasena);
      if (!result.autenticado) {
        usuarioControllerLogger.warn(`Login fallido: ${nombre}`);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const user = result as unknown as SafeUser;

      // Firmar access (typ=access, jti y exp incluidos)
      const { token, jti, exp } = tokenService.signAccess({
        id: user.id, nombre: user.nombre, rol: user.rol as any, tokenVersion: 0,
      });

      // Metadatos de sesión
      const ip = extraerIp(req) || undefined;
      const ua = req.headers['user-agent'] || undefined;
      const devId = (bodyDeviceId || req.headers['x-device-id']) as string | undefined;
      const plat = (bodyPlatform || req.headers['x-platform']) as string | undefined;
      const issuedAt = new Date();
      const expiresAt = new Date(exp * 1000);

await tokenService.crearReemplazandoPorPlataforma({
  usuarioId: user.id,
  jti,
  ip,
  ua: typeof ua === 'string' ? ua : undefined,
  deviceId: devId,
  platform: typeof plat === 'string' ? plat.toLowerCase() : 'other',
  issuedAt,
  expiresAt,
});

      // Registrar IP-usuario-dispositivo (idempotente)
      if (ip) {
        await registrarIpUsuario({
          usuarioId: user.id,
          ip,
          tipoDispositivo: toDeviceType(tipoDispositivo || (plat as string) || 'OTHER'),
        });
      }

      // Registrar push en su tabla correcta
      if (playerId && typeof playerId === 'string') {
        try { await UsuarioModel.registrarPlayerId(user.id, playerId); }
        catch (e) { usuarioControllerLogger.warn('No se pudo registrar playerId', { playerId, e }); }
      }

      // Respuesta segura
      res.json({ token, user: {
        id: user.id, nombre: user.nombre, email: user.email, rol: user.rol,
        empresaId: user.empresaId, localidadId: user.localidadId, empresa: user.empresa, localidad: user.localidad,
      }});
    } catch (error) {
      usuarioControllerLogger.error('Error en login', { error, nombre });
      res.status(500).json({ error: 'Error en el login' });
    }
  };
}
