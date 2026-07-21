// src/controllers/Usuario/usuario.controller.ts
import { Request, RequestHandler } from 'express';
import { DeviceType, Rol } from '@prisma/client';
import { randomUUID } from 'crypto';
import { UsuarioModel } from '../../models/Usuario';
import * as tokenService from '../../middlewares/token.service';
import { registrarIpUsuario, extraerIp } from '../../models/Token';
import { usuarioControllerLogger as log } from './usuario.controller.logger';
import { v4 as uuidv4 } from 'uuid';
import { getAccessTtlForRole } from '../../auth/sessionPolicy';
import { buildOperacionLocalidad } from '../../utils/operacionLocalidad';
import type { AuthenticatedUser } from '../../types/auth';

type ErrorShape = {
  name?: string;
  message?: string;
  code?: string;
  clientVersion?: string;
  meta?: unknown;
  stack?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readStringField = (source: Record<string, unknown>, key: string) => {
  const value = source[key];
  return typeof value === 'string' ? value : undefined;
};

const ser = (e: unknown): ErrorShape => {
  const error = isRecord(e) ? e : {};
  return {
    name: readStringField(error, 'name'),
    message: readStringField(error, 'message'),
    code: readStringField(error, 'code'),
    clientVersion: readStringField(error, 'clientVersion'),
    meta: error.meta,
    stack: readStringField(error, 'stack'),
  };
};

const errorMessage = (error: unknown, fallback: string) => {
  const message = ser(error).message;
  return message || fallback;
};

const dt = (t0: bigint)=> Number(process.hrtime.bigint() - t0)/1e6;
const toDeviceType = (value?: unknown): DeviceType => {
  const normalized = String(value || DeviceType.OTHER).toUpperCase();
  return Object.values(DeviceType).includes(normalized as DeviceType)
    ? (normalized as DeviceType)
    : DeviceType.OTHER;
};

const USER_MANAGER_ROLES = new Set(['ADMINISTRADOR', 'COORDINADOR']);
const ADMINISTRADOR = 'ADMINISTRADOR';
const COORDINADOR = 'COORDINADOR';
const COORDINADOR_LOCAL_ALLOWED_ROLES = new Set<Rol>([
  Rol.CLIENTE,
  Rol.ARRASTRE_TORREON,
  Rol.MAQUINISTA,
  Rol.MAQUINISTA_ARRASTRE,
]);
const ADMIN_ONLY_USER_ROLES = new Set<Rol>([
  Rol.ADMINISTRADOR,
  Rol.COMERCIAL,
]);

const getActor = (req: Request) => req.user as AuthenticatedUser | undefined;
const getActorRole = (req: Request) => String(getActor(req)?.rol ?? '').toUpperCase();
const canManageUsers = (req: Request) => USER_MANAGER_ROLES.has(getActorRole(req));
const isAdministrator = (req: Request) => getActorRole(req) === ADMINISTRADOR;

const normalizeLocalidadName = (value?: string | null) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

const isGdlLocalidad = (value?: string | null) => {
  const name = normalizeLocalidadName(value);
  return name === 'GDL' || name.includes('GUADALAJARA');
};

const isRestrictedLocalCoordinator = (req: Request) => {
  const actor = getActor(req);
  return getActorRole(req) === COORDINADOR && !isGdlLocalidad(actor?.localidad?.nombre);
};

const validateRestrictedCoordinatorScope = (
  req: Request,
  role: Rol,
  localidadId: number,
  action: 'crear' | 'editar' | 'desactivar'
) => {
  if (!isRestrictedLocalCoordinator(req)) return undefined;

  const actor = getActor(req);
  const actorLocalidadId = actor?.localidad?.id;
  if (!actorLocalidadId || localidadId !== actorLocalidadId) {
    return `Coordinador local solo puede ${action} usuarios de su localidad`;
  }

  if (!COORDINADOR_LOCAL_ALLOWED_ROLES.has(role)) {
    return 'Coordinador local solo puede gestionar CLIENTE, ARRASTRE_TORREON, MAQUINISTA o MAQUINISTA_ARRASTRE';
  }

  return undefined;
};

const toPositiveInt = (value: unknown) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

const errorStatus = (message?: string) => {
  if (!message) return 500;
  if (/no encontrado/i.test(message)) return 404;
  if (/registrados/i.test(message)) return 409;
  if (/inv[aá]lid|obligatorio|incompleto|contraseña|cambios/i.test(message)) return 400;
  return 500;
};

const parseRequestedRole = (value: unknown): Rol | undefined => {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return undefined;
  return Object.values(Rol).includes(raw as Rol) ? (raw as Rol) : undefined;
};

const isAdminOnlyUserRole = (role?: Rol) => Boolean(role && ADMIN_ONLY_USER_ROLES.has(role));
const forbiddenAdminMessage = 'Solo ADMINISTRADOR puede crear o modificar usuarios ADMINISTRADOR o COMERCIAL';

export class UsuarioController {
  static obtenerUsuarios: RequestHandler = async (req, res) => {
    const reqId = (req.headers['x-request-id'] as string) || randomUUID();
    const t0 = process.hrtime.bigint();
    if (!canManageUsers(req)) {
      log.warn('usuarios:list:forbidden', { reqId, actorId: getActor(req)?.id, actorRole: getActorRole(req) });
      return res.status(403).json({ error: 'No tienes permisos para ver usuarios' });
    }
    try {
      const data = await UsuarioModel.obtenerUsuarios({ reqId }, { includeAdminOnlyRoles: isAdministrator(req) });
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
    if (!canManageUsers(req)) {
      log.warn('usuarios:create:forbidden', { reqId, actorId: getActor(req)?.id, actorRole: getActorRole(req) });
      return res.status(403).json({ error: 'No tienes permisos para crear usuarios' });
    }
    const { nombre, email, contrasena, empresaId, localidadId } = req.body || {};
    const rol = parseRequestedRole(req.body?.rol);
    const empresaIdNum = toPositiveInt(empresaId);
    const localidadIdNum = toPositiveInt(localidadId);
    if (!nombre || !email || !contrasena || !rol || !empresaIdNum || !localidadIdNum) {
      log.warn('usuarios:create:bad_request', { reqId, bodyKeys: Object.keys(req.body||{}), ms: dt(t0) });
      return res.status(400).json({ error: 'Datos incompletos' });
    }
    if (isAdminOnlyUserRole(rol) && !isAdministrator(req)) {
      return res.status(403).json({ error: forbiddenAdminMessage });
    }
    const scopeError = validateRestrictedCoordinatorScope(req, rol, localidadIdNum, 'crear');
    if (scopeError) {
      return res.status(403).json({ error: scopeError });
    }
    try {
      log.info('usuarios:create:start', { reqId, nombre, email, rol, empresaId: empresaIdNum, localidadId: localidadIdNum });
      const nuevo = await UsuarioModel.crearUsuario(nombre, email, contrasena, rol, empresaIdNum, localidadIdNum, { reqId });
      log.info('usuarios:create:ok', { reqId, id: nuevo.id, ms: dt(t0) });
      res.status(201).json(nuevo);
    } catch (error) {
      log.error('usuarios:create:error', { reqId, ms: dt(t0), nombre, email, empresaId, localidadId, error: ser(error) });
      const message = errorMessage(error, 'Error al crear usuario');
      res.status(errorStatus(message)).json({ error: message });
    }
  };

  static editarUsuario: RequestHandler = async (req, res) => {
    const reqId = (req.headers['x-request-id'] as string) || randomUUID();
    const t0 = process.hrtime.bigint();
    if (!canManageUsers(req)) {
      log.warn('usuarios:update:forbidden', { reqId, actorId: getActor(req)?.id, actorRole: getActorRole(req) });
      return res.status(403).json({ error: 'No tienes permisos para editar usuarios' });
    }
    const { id } = req.params;
    const userId = toPositiveInt(id);
    if (!userId) {
      log.warn('usuarios:update:bad_request', { reqId, id, bodyKeys: Object.keys(req.body||{}), ms: dt(t0) });
      return res.status(400).json({ error: 'Usuario inválido' });
    }

    const body = req.body || {};
    const empresaId = body.empresaId === undefined ? undefined : toPositiveInt(body.empresaId);
    const localidadId = body.localidadId === undefined ? undefined : toPositiveInt(body.localidadId);
    if (body.empresaId !== undefined && !empresaId) return res.status(400).json({ error: 'Empresa inválida' });
    if (body.localidadId !== undefined && !localidadId) return res.status(400).json({ error: 'Localidad inválida' });

    const rol = body.rol === undefined ? undefined : parseRequestedRole(body.rol);
    if (body.rol !== undefined && !rol) return res.status(400).json({ error: 'Rol no válido' });

    const target = await UsuarioModel.obtenerUsuarioResumen(userId, { reqId });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    const touchesAdminOnlyRole = isAdminOnlyUserRole(target.rol) || isAdminOnlyUserRole(rol);
    if (touchesAdminOnlyRole && !isAdministrator(req)) {
      return res.status(403).json({ error: forbiddenAdminMessage });
    }

    const finalRole = rol ?? target.rol;
    const finalLocalidadId = localidadId ?? target.localidadId;
    const scopeError = validateRestrictedCoordinatorScope(req, finalRole, finalLocalidadId, 'editar');
    if (scopeError) {
      return res.status(403).json({ error: scopeError });
    }

    const input = {
      ...(body.nombre !== undefined ? { nombre: String(body.nombre) } : {}),
      ...(body.email !== undefined ? { email: String(body.email) } : {}),
      ...(body.contrasena !== undefined ? { contrasena: String(body.contrasena) } : {}),
      ...(rol ? { rol } : {}),
      ...(empresaId !== undefined ? { empresaId } : {}),
      ...(localidadId !== undefined ? { localidadId } : {}),
    };

    if (Object.keys(input).length === 0) {
      return res.status(400).json({ error: 'No hay cambios para guardar' });
    }
    try {
      log.info('usuarios:update:start', {
        reqId,
        id: userId,
        hasPass: Boolean(body.contrasena),
        fields: Object.keys(input),
      });
      const upd = await UsuarioModel.editarUsuario(userId, input, { reqId });
      log.info('usuarios:update:ok', { reqId, id: upd.id, ms: dt(t0) });
      res.json(upd);
    } catch (error) {
      log.error('usuarios:update:error', { reqId, id, ms: dt(t0), error: ser(error) });
      const message = errorMessage(error, 'Error al editar usuario');
      res.status(errorStatus(message)).json({ error: message });
    }
  };

  static cambiarEstadoUsuario: RequestHandler = async (req, res) => {
    const reqId = (req.headers['x-request-id'] as string) || randomUUID();
    const t0 = process.hrtime.bigint();
    if (!canManageUsers(req)) {
      log.warn('usuarios:status:forbidden', { reqId, actorId: getActor(req)?.id, actorRole: getActorRole(req) });
      return res.status(403).json({ error: 'No tienes permisos para cambiar el estado del usuario' });
    }

    const id = toPositiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Usuario inválido' });
    if (typeof req.body?.activo !== 'boolean') return res.status(400).json({ error: 'El campo activo debe ser booleano' });

    const actor = getActor(req);
    if (actor?.id === id && req.body.activo === false) {
      return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta desde esta sesión' });
    }

    const target = await UsuarioModel.obtenerUsuarioResumen(id, { reqId });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (isAdminOnlyUserRole(target.rol) && !isAdministrator(req)) {
      return res.status(403).json({ error: forbiddenAdminMessage });
    }
    const scopeError = validateRestrictedCoordinatorScope(req, target.rol, target.localidadId, 'desactivar');
    if (scopeError) {
      return res.status(403).json({ error: scopeError });
    }

    try {
      const usuario = await UsuarioModel.cambiarEstadoUsuario(id, req.body.activo, { reqId });
      log.info('usuarios:status:ok', { reqId, id, activo: usuario.activo, ms: dt(t0) });
      res.json(usuario);
    } catch (error) {
      log.error('usuarios:status:error', { reqId, id, ms: dt(t0), error: ser(error) });
      const message = errorMessage(error, 'Error al cambiar el estado del usuario');
      res.status(errorStatus(message)).json({ error: message });
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
    level: 'info', msg: 'login:start', reqId, ip, ua, deviceId: devId,
    platform: String(platRaw).toLowerCase(), nombre, hasPlayerId: Boolean(playerId)
  }));

  try {
    const tFind = Date.now();
    const result = await UsuarioModel.obtenerUsuarioPorCredenciales(nombre, contrasena, { reqId });
    const findMs = Number((Date.now() - tFind).toFixed(3));

    if (!result.autenticado) {
      const inactive = Boolean((result as { desactivado?: boolean }).desactivado);
      console.log(JSON.stringify({ level: 'warn', msg: inactive ? 'login:inactive' : 'login:fail', reqId, nombre, findMs }));
      return res.status(inactive ? 403 : 401).json({ error: inactive ? 'Usuario desactivado' : 'Credenciales inválidas' });
    }

    const user = result;
    console.log(JSON.stringify({
      level: 'info', msg: 'login:user', reqId, userId: user.id, rol: user.rol,
      empresaId: user.empresaId, localidadId: user.localidadId, findMs
    }));

    const tSign = Date.now();
    const ttl = getAccessTtlForRole(user.rol);
    const { token, jti, exp } = tokenService.signAccess(
      { id: user.id, nombre: user.nombre, rol: user.rol, tokenVersion: user.tokenVersion ?? 0 },
      ttl,
      { reqId, usuarioId: user.id }
    );
    const signMs = Number((Date.now() - tSign).toFixed(3));
    console.log(JSON.stringify({ level: 'info', msg: 'login:sign:ok', reqId, jti, exp, ttl, signMs }));

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
          tipoDispositivo: toDeviceType(tipoDispositivo || platRaw),
        });
        console.log(JSON.stringify({ level: 'info', msg: 'login:ip:ok', reqId, userId: user.id, ip }));
      } catch (e) {
        console.log(JSON.stringify({ level: 'warn', msg: 'login:ip:error', reqId, userId: user.id, err: errorMessage(e, String(e)) }));
      }
    }

    if (playerId && typeof playerId === 'string') {
      try {
        await UsuarioModel.registrarPlayerId(user.id, playerId);
        console.log(JSON.stringify({ level: 'info', msg: 'login:fcm:ok', reqId, userId: user.id }));
      } catch (e) {
        console.log(JSON.stringify({ level: 'warn', msg: 'login:fcm:error', reqId, userId: user.id, err: errorMessage(e, String(e)) }));
      }
    }

    const totalMs = Number((Date.now() - t0).toFixed(3));
    console.log(JSON.stringify({
      level: 'info', msg: 'login:ok', reqId, userId: user.id, jti,
      metrics: { findMs, signMs, persistMs, totalMs }
    }));

    const operacionLocalidad = buildOperacionLocalidad(user.localidad);

    return res.json({
      token,
      expiresAt: new Date(exp * 1000).toISOString(),
      operacionLocalidad,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        empresaId: user.empresaId,
        localidadId: user.localidadId,
        empresa: user.empresa,
        localidad: user.localidad,
        operacionLocalidad,
      },
    });
  } catch (error) {
    const details = ser(error);
    console.log(JSON.stringify({
      level: 'error', msg: 'login:error', reqId, nombre,
      code: details.code, err: details.message ?? String(error), stack: details.stack
    }));
    return res.status(500).json({ error: 'Error en el login' });
  } finally {
    console.log(JSON.stringify({ level: 'info', msg: 'login:end', reqId, durMs: Number((Date.now() - t0).toFixed(3)) }));
  }
};
}
