// src/controllers/Usuario/usuario.controller.ts
import { RequestHandler } from 'express';
import { DeviceType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { UsuarioModel } from '../../models/Usuario/usuarioModel';
import * as tokenService from '../../middlewares/token.service';
import { registrarIpUsuario, extraerIp } from '../../models/Token/ipUsuario';
import { usuarioControllerLogger as log } from './usuario.controller.logger';

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
    const reqId = (req.headers['x-request-id'] as string) || randomUUID();
    const t0 = process.hrtime.bigint();
    const b = req.body || {};
    const nombre = String(b.nombre || '').trim();
    const contrasena = String(b.contrasena || '');
    const platHdr  = (req.headers['x-platform'] as string) || '';
    const devHdr   = (req.headers['x-device-id'] as string) || '';
    const platBody = (b.platform as string) || '';
    const devBody  = (b.deviceId as string) || '';
    const platform = (platBody || platHdr || 'OTHER').toUpperCase();
    const deviceId = devBody || devHdr || undefined;
    const ip = extraerIp(req) || undefined;
    const ua = (req.headers['user-agent'] as string) || undefined;

    if (!nombre || !contrasena) {
      log.warn('login:bad_request', { reqId, nombreLen: nombre.length, hasPass: Boolean(contrasena) });
      return res.status(400).json({ error: 'Faltan credenciales' });
    }

    log.info('login:start', { reqId, nombre, ip, platform, deviceId, hasUA: Boolean(ua) });

    try {
      const tFetch = process.hrtime.bigint();
      const result = await UsuarioModel.obtenerUsuarioPorCredenciales(nombre, contrasena, { reqId });
      const fetchMs = dt(tFetch);

      if (!result.autenticado) {
        log.warn('login:invalid_credentials', { reqId, nombre, fetchMs, totalMs: dt(t0) });
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const user = result as unknown as SafeUser;
      log.info('login:user_ok', {
        reqId, userId: user.id, rol: user.rol, empresaId: user.empresaId, localidadId: user.localidadId, fetchMs,
      });

      const tSign = process.hrtime.bigint();
      const { token, jti, exp } = tokenService.signAccess({
        id: user.id, nombre: user.nombre, rol: user.rol as any, tokenVersion: 0,
      });
      const signMs = dt(tSign);

      const issuedAt = new Date();
      const expiresAt = new Date(exp * 1000);

      const tSess = process.hrtime.bigint();
      await tokenService.crearReemplazandoPorPlataforma({
        usuarioId: user.id, jti, ip, ua, deviceId, platform, issuedAt, expiresAt,
      });
      const sessMs = dt(tSess);

      if (ip) {
        const tIp = process.hrtime.bigint();
        try {
          await registrarIpUsuario({ usuarioId: user.id, ip, tipoDispositivo: toDeviceType(b.tipoDispositivo || platform) });
          log.info('login:ip_reg_ok', { reqId, userId: user.id, ip, ms: dt(tIp) });
        } catch (e) {
          log.warn('login:ip_reg_fail', { reqId, userId: user.id, ip, ms: dt(tIp), error: ser(e) });
        }
      }

      if (b.playerId && typeof b.playerId === 'string') {
        const tFcm = process.hrtime.bigint();
        try {
          await UsuarioModel.registrarPlayerId(user.id, b.playerId);
          log.info('login:fcm_ok', { reqId, userId: user.id, ms: dt(tFcm) });
        } catch (e) {
          log.warn('login:fcm_fail', { reqId, userId: user.id, ms: dt(tFcm), error: ser(e) });
        }
      }

      log.info('login:ok', { reqId, userId: user.id, jti, signMs, sessMs, totalMs: dt(t0) });

      return res.json({
        token,
        user: {
          id: user.id, nombre: user.nombre, email: user.email, rol: user.rol,
          empresaId: user.empresaId, localidadId: user.localidadId, empresa: user.empresa, localidad: user.localidad,
        },
      });
    } catch (error) {
      log.error('login:error', {
        reqId, nombre, ip, platform, deviceId, totalMs: dt(t0), error: ser(error),
      });
      return res.status(500).json({ error: 'Error en el login' });
    }
  };
}
