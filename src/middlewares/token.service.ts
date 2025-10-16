/**
 * src/middlewares/token.service.ts
 * Sesiones por JWT (ACCESS) con control por jti. No se guarda el JWT.
 */
import { PrismaClient, Token as TokenModel, TokenTipo } from '@prisma/client';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import ms, { StringValue } from 'ms';
import { tokenLogger } from './token.logger';
import { NotificadorFCM } from '../services/NotificadorFCM';

const prisma = new PrismaClient();

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */
const JWT_TTL: StringValue = (process.env.JWT_EXPIRES_IN ?? '8h') as StringValue;
const ISS = process.env.JWT_ISSUER;
const AUD = process.env.JWT_AUDIENCE;
const SECRET = process.env.JWT_SECRET;

/* -------------------------------------------------------------------------- */
/*  Tipos                                                                      */
/* -------------------------------------------------------------------------- */
export type SignUser = { id: number; nombre: string; rol?: string; tokenVersion?: number };
export type CrearTokenParams = {
  usuarioId: number;
  scope?: string | null;
  ip?: string | null;
  ua?: string | null;
  deviceId?: string | null;
  platform?: string | null;
  jti?: string;
  issuedAt?: Date;
  expiresAt?: Date;
  tipo?: TokenTipo; // ACCESS
};

/* -------------------------------------------------------------------------- */
/*  Firmado de Access                                                          */
/* -------------------------------------------------------------------------- */
export function signAccess(user: SignUser, ttl: StringValue = JWT_TTL): { token: string; jti: string; exp: number } {
  if (!SECRET) throw new Error('JWT_SECRET no definido');
  const jti = uuidv4();
  const payload = {
    sub: String(user.id),
    nombre: user.nombre,
    rol: user.rol,
    v: user.tokenVersion ?? 0,
    typ: 'access',
  };
  const opts: SignOptions = {
    expiresIn: ttl,
    issuer: ISS,
    audience: AUD,
    jwtid: jti,
    algorithm: 'HS256',
  };
  const token = jwt.sign(payload, SECRET, opts);
  const exp = (jwt.decode(token) as any)?.exp ?? Math.floor((Date.now() + ms(ttl)) / 1000);
  return { token, jti, exp };
}

/* -------------------------------------------------------------------------- */
/*  Persistencia (Token = sesión)                                              */
/* -------------------------------------------------------------------------- */
export async function crearToken(params: CrearTokenParams): Promise<TokenModel> {
  const now = params.issuedAt ?? new Date();
  const exp = params.expiresAt ?? new Date(now.getTime() + ms(JWT_TTL));
  const jti = params.jti ?? uuidv4();

  try {
    return await prisma.token.create({
      data: {
        jti,
        usuarioId: params.usuarioId,
        tipo: params.tipo ?? TokenTipo.ACCESS,
        scope: params.scope ?? null,
        ip: params.ip ?? null,
        ua: params.ua ?? null,
        deviceId: params.deviceId ?? null,
        platform: params.platform ?? null,
        issuedAt: now,
        expiresAt: exp,
      },
    });
  } catch (error: any) {
    tokenLogger.error(`Error al crear token para usuario ${params.usuarioId}`, { error });
    if (error?.code === 'P2002') throw new Error('Ya existe una sesión activa para ese dispositivo');
    throw new Error('Error inesperado al guardar el token');
  }
}

/* -------------------------------------------------------------------------- */
/*  Consultas                                                                  */
/* -------------------------------------------------------------------------- */
export async function obtenerTokens() {
  try {
    return await prisma.token.findMany({ include: { usuario: true }, orderBy: { createdAt: 'desc' } });
  } catch (error) {
    tokenLogger.error('Error al obtener tokens', { error });
    throw new Error('No se pudieron obtener los tokens');
  }
}

export async function obtenerTokensActivosPorUsuario(usuarioId: number) {
  try {
    return await prisma.token.findMany({
      where: { usuarioId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { issuedAt: 'desc' },
    });
  } catch (error) {
    tokenLogger.error('Error al obtener tokens activos', { error, usuarioId });
    throw new Error('No se pudieron obtener los tokens activos');
  }
}

/* -------------------------------------------------------------------------- */
/*  Revocación                                                                 */
/* -------------------------------------------------------------------------- */
export async function revocarTokenPorJti(jti: string, reason = 'logout') {
  try {
    return await prisma.token.update({ where: { jti }, data: { revokedAt: new Date(), reason } });
  } catch (error) {
    tokenLogger.error(`No se pudo revocar token ${jti}`, { error });
    throw new Error('Error al revocar el token');
  }
}

export async function revocarTokensPorUsuario(usuarioId: number, reason = 'logout_global') {
  try {
    const res = await prisma.token.updateMany({
      where: { usuarioId, revokedAt: null },
      data: { revokedAt: new Date(), reason },
    });
    if (res.count > 0) {
      await NotificadorFCM.enviarNotificacionPersonalizada({
        usuarioId,
        titulo: 'Sesiones cerradas',
        mensaje: 'Se cerraron todas tus sesiones activas.',
        data: { tipo: 'logout_global' },
        prioridad: 'alta',
      });
    }
    return res.count;
  } catch (error) {
    tokenLogger.error(`No se pudo revocar tokens de usuario ${usuarioId}`, { error });
    throw new Error('Error al revocar los tokens del usuario');
  }
}

/* -------------------------------------------------------------------------- */
/*  Validación                                                                 */
/* -------------------------------------------------------------------------- */
export async function esTokenVigente(jti: string): Promise<boolean> {
  try {
    const t = await prisma.token.findUnique({ where: { jti }, select: { expiresAt: true, revokedAt: true } });
    if (!t) return false;
    if (t.revokedAt) return false;
    return t.expiresAt > new Date();
  } catch (error) {
    tokenLogger.error(`Error al validar vigencia de ${jti}`, { error });
    return false;
  }
}

export async function getTokenOwner(jti: string): Promise<number | null> {
  const t = await prisma.token.findUnique({ where: { jti }, select: { usuarioId: true } });
  return t?.usuarioId ?? null;
}

/* -------------------------------------------------------------------------- */
/*  Limpieza                                                                   */
/* -------------------------------------------------------------------------- */
export async function purgarTokensVencidos() {
  try {
    const res = await prisma.token.deleteMany({
      where: { expiresAt: { lt: new Date() }, revokedAt: { not: null } },
    });
    return res.count;
  } catch (error) {
    tokenLogger.error('Error al purgar tokens vencidos', { error });
    throw new Error('No se pudieron purgar tokens vencidos');
  }
}

/* -------------------------------------------------------------------------- */
/*  Compat legada (opcional)                                                   */
/* -------------------------------------------------------------------------- */
// Mantiene la firma anterior pero ya no guarda `token` en DB.
// Usa signAccess + crearToken.
export function generateJwtToken(user: { id: number; nombre: string; rol?: string }) {
  return signAccess(user, JWT_TTL);
}

// Eliminación por string ya no aplica.
// Acepta `jti` y revoca.
export async function removeToken(jti: string): Promise<TokenModel | null> {
  try {
    return await revocarTokenPorJti(jti, 'manual_revoke');
  } catch {
    return null;
  }
}
// Añade estas funciones
export async function revocarActivasPorPlataforma(usuarioId: number, platform?: string) {
  if (!platform) return 0;
  const res = await prisma.token.updateMany({
    where: { usuarioId, platform, revokedAt: null },
    data: { revokedAt: new Date(), reason: 'replaced_login' },
  });
  return res.count;
}

export async function crearReemplazandoPorPlataforma(params: CrearTokenParams) {
  const now = params.issuedAt ?? new Date();
  const exp = params.expiresAt ?? new Date(now.getTime() + ms(JWT_TTL));
  const jti = params.jti ?? uuidv4();

  return prisma.$transaction(async (tx) => {
    if (params.platform) {
      await tx.token.updateMany({
        where: { usuarioId: params.usuarioId, platform: params.platform, revokedAt: null },
        data: { revokedAt: now, reason: 'replaced_login' },
      });
    }
    return tx.token.create({
      data: {
        jti,
        usuarioId: params.usuarioId,
        tipo: params.tipo ?? TokenTipo.ACCESS,
        scope: params.scope ?? null,
        ip: params.ip ?? null,
        ua: params.ua ?? null,
        deviceId: params.deviceId ?? null,
        platform: params.platform ?? null,
        issuedAt: now,
        expiresAt: exp,
      },
    });
  });
}


// Guardado legado: ignora `token` y crea registro de sesión.
export async function saveToken({ jti, userId, tipo }: { token?: string; jti: string; userId: number; tipo?: string }) {
  return crearToken({ usuarioId: userId, jti, tipo: TokenTipo.ACCESS });
}
