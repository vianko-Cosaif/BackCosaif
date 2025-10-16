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
/** POST /usuarios/login  body: { nombre, contrasena, playerId?, deviceId?, platform?, tipoDispositivo? } */
static login: RequestHandler = async (req, res) => {
  const { nombre, contrasena, playerId, deviceId: bodyDeviceId, platform: bodyPlatform, tipoDispositivo } = req.body;
  const reqId = (req.headers['x-req-id'] as string) || uuidv4();
  const t0 = Date.now();

  const ip = extraerIp(req) || undefined;
  const ua = (req.headers['user-agent'] as string) || undefined;
  const devId = (bodyDeviceId || (req.headers['x-device-id'] as string)) || undefined;
  const platRaw = (bodyPlatform || (req.headers['x-platform'] as string)) || 'other';

  console.log(JSON.stringify({
    level: 'info', msg: 'login:start', reqId, ip, ua, deviceId: devId ?? null,
    platform: String(platRaw).toLowerCase(), nombre, hasPlayerId: Boolean(playerId)
  }));

  try {
    const tFind = Date.now();
    const result = await UsuarioModel.obtenerUsuarioPorCredenciales(nombre, contrasena);
    const findMs = Number((Date.now() - tFind).toFixed(3));

    if (!result.autenticado) {
      console.log(JSON.stringify({ level: 'warn', msg: 'login:fail', reqId, nombre, findMs }));
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result as any as SafeUser;
    console.log(JSON.stringify({
      level: 'info', msg: 'login:user', reqId, userId: user.id, rol: user.rol,
      empresaId: user.empresaId, localidadId: user.localidadId, findMs
    }));

    const tSign = Date.now();
    const { token, jti, exp } = tokenService.signAccess(
      { id: user.id, nombre: user.nombre, rol: user.rol, tokenVersion: 0 },
      undefined,
      { reqId, usuarioId: user.id }
    );
    const signMs = Number((Date.now() - tSign).toFixed(3));
    console.log(JSON.stringify({ level: 'info', msg: 'login:sign:ok', reqId, jti, exp, signMs }));

    const issuedAt = new Date();
    const expiresAt = new Date(exp * 1000);

    const tPersist = Date.now();
    await tokenService.crearReemplazandoPorPlataforma(
      {
        usuarioId: user.id,
        jti,
        ip,
        ua,
        deviceId: devId,
        platform: String(platRaw).toLowerCase(),
        issuedAt,
        expiresAt,
      },
      { reqId, usuarioId: user.id }
    );
    const persistMs = Number((Date.now() - tPersist).toFixed(3));
    console.log(JSON.stringify({ level: 'info', msg: 'login:session:ok', reqId, jti, persistMs }));

    if (ip) {
      try {
        await registrarIpUsuario({
          usuarioId: user.id,
          ip,
          tipoDispositivo: (['WEB','ANDROID','IOS','DESKTOP','OTHER'] as const)
            .includes(String(tipoDispositivo || platRaw).toUpperCase() as any)
            ? (String(tipoDispositivo || platRaw).toUpperCase() as any)
            : 'OTHER',
        });
        console.log(JSON.stringify({ level: 'info', msg: 'login:ip:ok', reqId, userId: user.id, ip }));
      } catch (e: any) {
        console.log(JSON.stringify({ level: 'warn', msg: 'login:ip:error', reqId, userId: user.id, err: e?.message ?? String(e) }));
      }
    }

    if (playerId && typeof playerId === 'string') {
      try {
        await UsuarioModel.registrarPlayerId(user.id, playerId);
        console.log(JSON.stringify({ level: 'info', msg: 'login:fcm:ok', reqId, userId: user.id }));
      } catch (e: any) {
        console.log(JSON.stringify({ level: 'warn', msg: 'login:fcm:error', reqId, userId: user.id, err: e?.message ?? String(e) }));
      }
    }

    const totalMs = Number((Date.now() - t0).toFixed(3));
    console.log(JSON.stringify({
      level: 'info', msg: 'login:ok', reqId, userId: user.id, jti,
      metrics: { findMs, signMs, persistMs, totalMs }
    }));

    return res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        empresaId: user.empresaId,
        localidadId: user.localidadId,
        empresa: user.empresa,
        localidad: user.localidad,
      },
    });
  } catch (error: any) {
    console.log(JSON.stringify({
      level: 'error', msg: 'login:error', reqId, nombre,
      code: error?.code ?? null, err: error?.message ?? String(error), stack: error?.stack ?? null
    }));
    return res.status(500).json({ error: 'Error en el login' });
  } finally {
    console.log(JSON.stringify({ level: 'info', msg: 'login:end', reqId, durMs: Number((Date.now() - t0).toFixed(3)) }));
  }
};

}
