// src/controllers/Usuario/usuario.controller.ts
import { RequestHandler } from 'express';
import { DeviceType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { UsuarioModel } from '../../models/Usuario/usuarioModel';
import * as tokenService from '../../middlewares/token.service';
import { registrarIpUsuario, extraerIp } from '../../models/Token/ipUsuario';
import { usuarioControllerLogger as log } from './usuario.controller.logger';
import { v4 as uuidv4 } from 'uuid';

const ser = (e:any)=>({
  name: e?.name, message: e?.message, code: e?.code,
  clientVersion: e?.clientVersion, meta: e?.meta, stack: e?.stack,
});
const dt = (t0: bigint)=> Number(process.hrtime.bigint() - t0)/1e6;
const toDeviceType = (v?: string): DeviceType => {
  const t = String(v || 'OTHER').toUpperCase();
  return ['WEB','ANDROID','IOS','DESKTOP','OTHER'].includes(t) ? (t as DeviceType) : 'OTHER';
};

type SafeUser = {
  id: number; nombre: string; email: string; rol: string;
  empresaId: number; localidadId: number;
  empresa?: { nombre: string }; localidad?: { nombre: string; estado: string };
};

export class UsuarioController {
  static obtenerUsuarios: RequestHandler = async (req, res) => {
    const reqId = (req.headers['x-request-id'] as string) || randomUUID();
    const t0 = process.hrtime.bigint();
    try {
      const data = await UsuarioModel.obtenerUsuarios({ reqId });
      log.info('usuarios:list:ok', { reqId, count: data.length, ms: dt(t0) });
      res.json(data);
    } catch (error) {
      log.error('usuarios:list:error', { reqId, ms: dt(t0), error: ser(error) });
      res.status(500).json({ error: 'Error al obtener usuarios' });
    }
  };

  static crearUsuario: RequestHandler = async (req, res) => {
    const reqId = (req.headers['x-request-id'] as string) || randomUUID();
    const t0 = process.hrtime.bigint();
    const { nombre, email, contrasena, rol, empresaId, localidadId } = req.body || {};
    if (!nombre || !email || !contrasena || !rol || !empresaId || !localidadId) {
      log.warn('usuarios:create:bad_request', { reqId, bodyKeys: Object.keys(req.body||{}), ms: dt(t0) });
      return res.status(400).json({ error: 'Datos incompletos' });
    }
    try {
      log.info('usuarios:create:start', { reqId, nombre, email, rol, empresaId, localidadId });
      const nuevo = await UsuarioModel.crearUsuario(nombre, email, contrasena, rol, Number(empresaId), Number(localidadId), { reqId });
      log.info('usuarios:create:ok', { reqId, id: nuevo.id, ms: dt(t0) });
      res.status(201).json(nuevo);
    } catch (error) {
      log.error('usuarios:create:error', { reqId, ms: dt(t0), nombre, email, empresaId, localidadId, error: ser(error) });
      res.status(500).json({ error: (error as any)?.message || 'Error al crear usuario' });
    }
  };

  static editarUsuario: RequestHandler = async (req, res) => {
    const reqId = (req.headers['x-request-id'] as string) || randomUUID();
    const t0 = process.hrtime.bigint();
    const { id } = req.params;
    const { nombre, email, contrasena } = req.body || {};
    if (!id || !nombre || !email) {
      log.warn('usuarios:update:bad_request', { reqId, id, bodyKeys: Object.keys(req.body||{}), ms: dt(t0) });
      return res.status(400).json({ error: 'Datos incompletos' });
    }
    try {
      log.info('usuarios:update:start', { reqId, id: Number(id), nombre, email, hasPass: Boolean(contrasena) });
      const upd = await UsuarioModel.editarUsuario(Number(id), nombre, email, contrasena, { reqId });
      log.info('usuarios:update:ok', { reqId, id: upd.id, ms: dt(t0) });
      res.json(upd);
    } catch (error) {
      log.error('usuarios:update:error', { reqId, id, ms: dt(t0), error: ser(error) });
      res.status(500).json({ error: 'Error al editar usuario' });
    }
  };

  /** POST /usuarios/login  body: { nombre, contrasena, playerId?, deviceId?, platform?, tipoDispositivo? } */
 static login: RequestHandler = async (req, res) => {
  const { nombre, contrasena, playerId, deviceId: bodyDeviceId, platform: bodyPlatform, tipoDispositivo } = req.body;
  const reqId = (req.headers['x-req-id'] as string) || uuidv4();

  try {
    const result = await UsuarioModel.obtenerUsuarioPorCredenciales(nombre, contrasena);
    if (!result.autenticado) {
      usuarioControllerLogger.warn('login:fail', { reqId, nombre });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result as any as SafeUser;
    const { token, jti, exp } = tokenService.signAccess(
      { id: user.id, nombre: user.nombre, rol: user.rol, tokenVersion: 0 },
      undefined,
      { reqId, usuarioId: user.id }
    );

    const ip = extraerIp(req) || undefined;
    const ua = req.headers['user-agent'] || undefined;
    const devId = (bodyDeviceId || req.headers['x-device-id']) as string | undefined;
    const plat = (bodyPlatform || req.headers['x-platform']) as string | undefined;
    const issuedAt = new Date();
    const expiresAt = new Date(exp * 1000);

    await tokenService.crearReemplazandoPorPlataforma({
      usuarioId: user.id, jti, ip, ua: typeof ua === 'string' ? ua : undefined,
      deviceId: devId, platform: typeof plat === 'string' ? plat.toLowerCase() : 'other',
      issuedAt, expiresAt,
    }, { reqId, usuarioId: user.id });

    // resto igual...
    return res.json({ token, user: { /* ... */ } });
  } catch (error: any) {
    usuarioControllerLogger.error('login:error', {
      reqId,
      nombre,
      name: error?.name ?? null,
      message: error?.message ?? String(error),
      stack: error?.stack ?? null,
    });
    return res.status(500).json({ error: 'Error en el login' });
  }
};
}
