// src/middlewares/token.service.ts
// Sesiones por JWT (ACCESS) con control por jti. No se guarda el JWT.

import 'dotenv/config';
import { Token as TokenModel, DeviceType, TokenTipo } from '@prisma/client';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import ms, { StringValue } from 'ms';
import { NotificadorFCM } from '../services/NotificadorFCM';
import { logger as tokenLogger } from '../utils/logger';
import { prisma } from '../lib/prisma';

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */
const SECRET = process.env.JWT_SECRET || '';
if (!SECRET) throw new Error('JWT_SECRET no definido');

const JWT_TTL: StringValue = (process.env.JWT_EXPIRES_IN ?? '8h') as StringValue;
const ISS = process.env.JWT_ISSUER;
const AUD = process.env.JWT_AUDIENCE;

/* -------------------------------------------------------------------------- */
/*  Tipos y helpers de logging                                                */
/* -------------------------------------------------------------------------- */
export type SignUser = { id: number; nombre: string; rol?: string; tokenVersion?: number };
type PlatformInput = string | null | undefined | DeviceType;

export type CrearTokenParams = {
  usuarioId: number;
  scope?: string | null;
  ip?: string | null;
  ua?: string | null;
  deviceId?: string | null;
  platform?: PlatformInput;
  jti?: string;
  issuedAt?: Date;
  expiresAt?: Date;
  tipo?: TokenTipo; // ACCESS
};

type Ctx = {
  reqId?: string | null;
  usuarioId?: number | null;
  note?: string | null;
};

const withCtx = (extra: Record<string, any>, ctx?: Ctx) => ({
  ...extra,
  ...(ctx?.reqId ? { reqId: ctx.reqId } : {}),
  ...(ctx?.usuarioId ? { usuarioId: ctx.usuarioId } : {}),
});

const now = () => Date.now();
const dt = (t0: number) => Number((Date.now() - t0).toFixed(3));

/* -------------------------------------------------------------------------- */
/*  Normalización de plataforma                                               */
/* -------------------------------------------------------------------------- */
const normPlatform = (p: PlatformInput): DeviceType => {
  if (p && Object.values(DeviceType).includes(p as DeviceType)) return p as DeviceType;
  const v = String(p ?? '').toUpperCase();
  switch (v) {
    case 'WEB': return DeviceType.WEB;
    case 'ANDROID': return DeviceType.ANDROID;
    case 'IOS': return DeviceType.IOS;
    case 'DESKTOP': return DeviceType.DESKTOP;
    default: return DeviceType.OTHER;
  }
};

/* -------------------------------------------------------------------------- */
/*  Firmado de Access                                                         */
/* -------------------------------------------------------------------------- */
export function signAccess(
  user: SignUser,
  ttl: StringValue = JWT_TTL,
  ctx?: { reqId?: string | null; usuarioId?: number | null }
): { token: string; jti: string; exp: number } {
  const t0 = Date.now();
  const jti = uuidv4();

  const payload = {
    sub: String(user.id),
    nombre: user.nombre,
    rol: user.rol,
    v: user.tokenVersion ?? 0,
    typ: 'access',
    // jti fuera del payload
  };

  const opts: SignOptions = {
    expiresIn: ttl,
    issuer: ISS,
    audience: AUD,
    jwtid: jti,      // jti aquí
    algorithm: 'HS256',
  };

  console.log(JSON.stringify({ level:'info', msg:'token:sign:start',
    iss: ISS ?? null, aud: AUD ?? null, ttl: typeof ttl === 'string' ? ttl : `${ttl}ms`,
    ...(ctx?.reqId ? { reqId: ctx.reqId } : {}), ...(ctx?.usuarioId ? { usuarioId: ctx.usuarioId } : {}),
  }));

  const token = jwt.sign(payload, SECRET, opts);
  const exp =
    (jwt.decode(token) as any)?.exp ??
    Math.floor((Date.now() + (typeof ttl === 'string' ? ms(ttl) : Number(ttl))) / 1000);

  console.log(JSON.stringify({ level:'info', msg:'token:sign:ok',
    jti, sub: payload.sub, rol: user.rol ?? null, v: payload.v, exp,
    signMs: Number((Date.now() - t0).toFixed(3)),
    ...(ctx?.reqId ? { reqId: ctx.reqId } : {}), ...(ctx?.usuarioId ? { usuarioId: ctx.usuarioId } : {}),
  }));

  return { token, jti, exp };
}


/* -------------------------------------------------------------------------- */
/*  Persistencia (Token = sesión)                                             */
/* -------------------------------------------------------------------------- */
export async function crearToken(params: CrearTokenParams, ctx?: Ctx): Promise<TokenModel> {
  const t0 = now();
  const nowD = params.issuedAt ?? new Date();
  const ttlMs = typeof JWT_TTL === 'string' ? ms(JWT_TTL) : Number(JWT_TTL);
  const exp = params.expiresAt ?? new Date(nowD.getTime() + ttlMs);
  const jti = params.jti ?? uuidv4();
  const platform = normPlatform(params.platform);

  tokenLogger.info('token:create:start', withCtx({
    jti, platform, deviceId: params.deviceId ?? null, ip: params.ip ?? null,
  }, ctx));

  try {
    const created = await prisma.token.create({
      data: {
        jti,
        usuarioId: params.usuarioId,
        tipo: params.tipo ?? TokenTipo.ACCESS,
        scope: params.scope ?? null,
        ip: params.ip ?? null,
        ua: params.ua ?? null,
        deviceId: params.deviceId ?? null,
        platform,
        issuedAt: nowD,
        expiresAt: exp,
      },
    });

    tokenLogger.info('token:create:ok', withCtx({
      jti: created.jti,
      platform: created.platform,
      issuedAt: created.issuedAt,
      expiresAt: created.expiresAt,
      ms: dt(t0),
    }, ctx));

    return created;
  } catch (error: any) {
    tokenLogger.error('token:create:error', withCtx({
      jti, platform,
      code: error?.code ?? null,
      meta: error?.meta ?? null,
      message: error?.message ?? null,
      ms: dt(t0),
    }, ctx));
    if (error?.code === 'P2002') throw new Error('Ya existe una sesión activa para ese dispositivo');
    throw new Error('Error inesperado al guardar el token');
  }
}

/* -------------------------------------------------------------------------- */
/*  Consultas                                                                 */
/* -------------------------------------------------------------------------- */
export async function obtenerTokens(ctx?: Ctx) {
  const t0 = now();
  try {
    const rows = await prisma.token.findMany({
      include: { usuario: true },
      orderBy: { createdAt: 'desc' },
    });
    tokenLogger.info('token:list:ok', withCtx({ count: rows.length, ms: dt(t0) }, ctx));
    return rows;
  } catch (error: any) {
    tokenLogger.error('token:list:error', withCtx({
      code: error?.code ?? null, message: error?.message ?? null, ms: dt(t0),
    }, ctx));
    throw new Error('No se pudieron obtener los tokens');
  }
}

export async function obtenerTokensActivosPorUsuario(usuarioId: number, ctx?: Ctx) {
  const t0 = now();
  try {
    const rows = await prisma.token.findMany({
      where: { usuarioId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { issuedAt: 'desc' },
    });
    tokenLogger.info('token:listActive:ok', withCtx({
      usuarioId, count: rows.length, ms: dt(t0),
    }, ctx));
    return rows;
  } catch (error: any) {
    tokenLogger.error('token:listActive:error', withCtx({
      usuarioId, code: error?.code ?? null, message: error?.message ?? null, ms: dt(t0),
    }, ctx));
    throw new Error('No se pudieron obtener los tokens activos');
  }
}

/* -------------------------------------------------------------------------- */
/*  Revocación                                                                */
/* -------------------------------------------------------------------------- */
export async function revocarTokenPorJti(jti: string, reason = 'logout', ctx?: Ctx) {
  const t0 = now();
  try {
    const res = await prisma.token.update({
      where: { jti },
      data: { revokedAt: new Date(), reason },
    });
    tokenLogger.info('token:revoke:ok', withCtx({ jti, reason, ms: dt(t0) }, ctx));
    return res;
  } catch (error: any) {
    tokenLogger.error('token:revoke:error', withCtx({
      jti, reason, code: error?.code ?? null, message: error?.message ?? null, ms: dt(t0),
    }, ctx));
    throw new Error('Error al revocar el token');
  }
}

export async function revocarTokensPorUsuario(usuarioId: number, reason = 'logout_global', ctx?: Ctx) {
  const t0 = now();
  try {
    const res = await prisma.token.updateMany({
      where: { usuarioId, revokedAt: null },
      data: { revokedAt: new Date(), reason },
    });

    tokenLogger.info('token:revokeUser:ok', withCtx({ usuarioId, count: res.count, ms: dt(t0) }, ctx));

    if (res.count > 0) {
      try {
        await NotificadorFCM.enviarNotificacionPersonalizada({
          usuarioId,
          titulo: 'Sesiones cerradas',
          mensaje: 'Se cerraron todas tus sesiones activas.',
          data: { tipo: 'logout_global' },
          prioridad: 'alta',
        });
        tokenLogger.info('token:revokeUser:fcm:ok', withCtx({ usuarioId }, ctx));
      } catch (e: any) {
        tokenLogger.warn('token:revokeUser:fcm:error', withCtx({
          usuarioId, message: e?.message ?? null,
        }, ctx));
      }
    }
    return res.count;
  } catch (error: any) {
    tokenLogger.error('token:revokeUser:error', withCtx({
      usuarioId, code: error?.code ?? null, message: error?.message ?? null, ms: dt(t0),
    }, ctx));
    throw new Error('Error al revocar los tokens del usuario');
  }
}

export async function revocarActivasPorPlataforma(usuarioId: number, platform?: PlatformInput, ctx?: Ctx) {
  const t0 = now();
  if (!platform) {
    tokenLogger.info('token:revokeByPlatform:skip', withCtx({ usuarioId, reason: 'no_platform' }, ctx));
    return 0;
  }
  const plat = normPlatform(platform);
  const res = await prisma.token.updateMany({
    where: { usuarioId, platform: plat, revokedAt: null },
    data: { revokedAt: new Date(), reason: 'replaced_login' },
  });
  tokenLogger.info('token:revokeByPlatform:ok', withCtx({
    usuarioId, platform: plat, count: res.count, ms: dt(t0),
  }, ctx));
  return res.count;
}

/* -------------------------------------------------------------------------- */
/*  Reemplazo por plataforma (UNIQUE [usuarioId, platform])                   */
/* -------------------------------------------------------------------------- */
export async function crearReemplazandoPorPlataforma(params: CrearTokenParams, ctx?: Ctx) {
  const t0 = now();
  const nowD = params.issuedAt ?? new Date();
  const ttlMs = typeof JWT_TTL === 'string' ? ms(JWT_TTL) : Number(JWT_TTL);
  const exp = params.expiresAt ?? new Date(nowD.getTime() + ttlMs);
  const jti = params.jti ?? uuidv4();
  const plat = normPlatform(params.platform);

  tokenLogger.info('token:replace:start', withCtx({
    usuarioId: params.usuarioId, platform: plat, deviceId: params.deviceId ?? null,
  }, ctx));

  return prisma.$transaction(async (tx) => {
    const t1 = now();
    const del = await tx.token.deleteMany({ where: { usuarioId: params.usuarioId, platform: plat } });
    tokenLogger.info('token:replace:deleted', withCtx({
      usuarioId: params.usuarioId, platform: plat, removed: del.count, ms: dt(t1),
    }, ctx));

    const t2 = now();
    const created = await tx.token.create({
      data: {
        jti,
        usuarioId: params.usuarioId,
        tipo: params.tipo ?? TokenTipo.ACCESS,
        scope: params.scope ?? null,
        ip: params.ip ?? null,
        ua: params.ua ?? null,
        deviceId: params.deviceId ?? null,
        platform: plat,
        issuedAt: nowD,
        expiresAt: exp,
      },
    });

    tokenLogger.info('token:replace:created', withCtx({
      jti: created.jti,
      platform: created.platform,
      issuedAt: created.issuedAt,
      expiresAt: created.expiresAt,
      totalMs: dt(t0),
      createMs: dt(t2),
    }, ctx));

    return created;
  }).catch((error: any) => {
    tokenLogger.error('token:replace:error', withCtx({
      usuarioId: params.usuarioId,
      platform: plat,
      code: error?.code ?? null,
      meta: error?.meta ?? null,
      message: error?.message ?? null,
      totalMs: dt(t0),
    }, ctx));
    throw new Error('Error al reemplazar sesión por plataforma');
  });
}

/* -------------------------------------------------------------------------- */
/*  Validación                                                                */
/* -------------------------------------------------------------------------- */
export async function esTokenVigente(jti: string, ctx?: Ctx): Promise<boolean> {
  const t0 = now();
  try {
    const t = await prisma.token.findUnique({
      where: { jti },
      select: { expiresAt: true, revokedAt: true },
    });
    const ok = !!t && !t.revokedAt && t.expiresAt > new Date();
    tokenLogger.info('token:isValid', withCtx({ jti, ok, ms: dt(t0) }, ctx));
    return ok;
  } catch (error: any) {
    tokenLogger.error('token:isValid:error', withCtx({
      jti, code: error?.code ?? null, message: error?.message ?? null, ms: dt(t0),
    }, ctx));
    return false;
  }
}

export async function esSesionVigenteDeUsuario(
  jti: string,
  usuarioId: number,
  ctx?: Ctx,
): Promise<boolean> {
  const t0 = now();
  try {
    const session = await prisma.token.findUnique({
      where: { jti },
      select: {
        usuarioId: true,
        tipo: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
    const ok = Boolean(
      session
      && session.usuarioId === usuarioId
      && session.tipo === TokenTipo.ACCESS
      && !session.revokedAt
      && session.expiresAt > new Date(),
    );
    tokenLogger.info('token:isValidForUser', withCtx({ jti, ok, ms: dt(t0) }, ctx));
    return ok;
  } catch (error: any) {
    tokenLogger.error('token:isValidForUser:error', withCtx({
      jti,
      code: error?.code ?? null,
      message: error?.message ?? null,
      ms: dt(t0),
    }, ctx));
    return false;
  }
}

export async function getTokenOwner(jti: string, ctx?: Ctx): Promise<number | null> {
  const t0 = now();
  const t = await prisma.token.findUnique({ where: { jti }, select: { usuarioId: true } });
  tokenLogger.info('token:owner', withCtx({ jti, usuarioId: t?.usuarioId ?? null, ms: dt(t0) }, ctx));
  return t?.usuarioId ?? null;
}

export async function extenderSesionPorJti(jti: string, ttl: StringValue = JWT_TTL, ctx?: Ctx): Promise<Date> {
  const t0 = now();
  const ttlMs = typeof ttl === 'string' ? ms(ttl) : Number(ttl);
  const expiresAt = new Date(Date.now() + ttlMs);

  try {
    const updated = await prisma.token.updateMany({
      where: {
        jti,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        expiresAt,
      },
    });

    if (updated.count !== 1) {
      throw new Error('La sesión ya no está vigente');
    }

    tokenLogger.info('token:extend:ok', withCtx({ jti, expiresAt: expiresAt.toISOString(), ms: dt(t0) }, ctx));
    return expiresAt;
  } catch (error: any) {
    tokenLogger.error('token:extend:error', withCtx({
      jti, code: error?.code ?? null, message: error?.message ?? null, ms: dt(t0),
    }, ctx));
    throw new Error('No se pudo extender la sesión');
  }
}

/* -------------------------------------------------------------------------- */
/*  Limpieza                                                                  */
/* -------------------------------------------------------------------------- */
export async function purgarTokensVencidos(ctx?: Ctx) {
  const t0 = now();
  try {
    const res = await prisma.token.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
      },
    });
    tokenLogger.info('token:purge:ok', withCtx({ removed: res.count, ms: dt(t0) }, ctx));
    return res.count;
  } catch (error: any) {
    tokenLogger.error('token:purge:error', withCtx({
      code: error?.code ?? null, message: error?.message ?? null, ms: dt(t0),
    }, ctx));
    throw new Error('No se pudieron purgar tokens vencidos');
  }
}

/* -------------------------------------------------------------------------- */
/*  Compat legada                                                             */
/* -------------------------------------------------------------------------- */
export function generateJwtToken(user: { id: number; nombre: string; rol?: string }, ctx?: Ctx) {
  return signAccess(user, JWT_TTL, ctx);
}

export async function removeToken(jti: string, ctx?: Ctx): Promise<TokenModel | null> {
  try {
    return await revocarTokenPorJti(jti, 'manual_revoke', ctx);
  } catch {
    return null;
  }
}

export async function saveToken({
  jti,
  userId,
  tipo,
}: {
  token?: string;
  jti: string;
  userId: number;
  tipo?: string;
}, ctx?: Ctx) {
  return crearToken(
    { usuarioId: userId, jti, tipo: TokenTipo.ACCESS },
    ctx
  );
}
