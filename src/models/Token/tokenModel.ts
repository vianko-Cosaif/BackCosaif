// src/models/Token/tokenModel.ts
/**
 * Acceso a datos para sesiones Token.
 * No se almacena el JWT, solo el jti y metadatos.
 */
import { PrismaClient, DeviceType, TokenTipo, Token } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import ms, { StringValue } from 'ms';
import { logger as tokenLogger } from '../../utils/logger';

const prisma = new PrismaClient();

/* Helpers */
type PlatformInput = string | null | undefined | DeviceType;

class TokenModelInternal {
  private static readonly DEFAULT_TTL: StringValue = (process.env.JWT_EXPIRES_IN ?? '8h') as StringValue;

  private static normPlatform(p: PlatformInput): DeviceType {
    if (p && Object.values(DeviceType).includes(p as DeviceType)) return p as DeviceType;
    switch (String(p ?? '').toUpperCase()) {
      case 'WEB': return DeviceType.WEB;
      case 'ANDROID': return DeviceType.ANDROID;
      case 'IOS': return DeviceType.IOS;
      case 'DESKTOP': return DeviceType.DESKTOP;
      default: return DeviceType.OTHER;
    }
  }

  static async obtenerTokens() {
    try {
      return await prisma.token.findMany({
        include: { usuario: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      tokenLogger.error('Error al obtener tokens', { error });
      throw new Error('No se pudieron obtener los tokens');
    }
  }

  static async crearToken(args: CrearTokenArgs): Promise<Token> {
    const now = args.issuedAt ?? new Date();
    const ttlMs = typeof (args.ttl ?? this.DEFAULT_TTL) === 'string'
      ? ms(args.ttl ?? this.DEFAULT_TTL)
      : Number(args.ttl ?? this.DEFAULT_TTL);
    const exp = args.expiresAt ?? new Date(now.getTime() + ttlMs);
    const jti = args.jti ?? uuidv4();
    const plat = this.normPlatform(args.platform);

    try {
      return await prisma.$transaction(async (tx) => {
        if (args.replaceSamePlatform) {
          await tx.token.updateMany({
            where: { usuarioId: args.usuarioId, platform: plat, revokedAt: null },
            data: { revokedAt: now, reason: 'replaced_login' },
          });
        }

        return tx.token.create({
          data: {
            jti,
            usuarioId: args.usuarioId,
            tipo: args.tipo ?? TokenTipo.ACCESS,
            scope: args.scope ?? null,
            ip: args.ip ?? null,
            ua: args.ua ?? null,
            deviceId: args.deviceId ?? null,
            platform: plat,
            issuedAt: now,
            expiresAt: exp,
          },
        });
      });
    } catch (error: any) {
      tokenLogger.error(`Error al crear token para usuario ${args.usuarioId}`, { error });
      if (error?.code === 'P2002') throw new Error('Ya existe una sesión activa para esa plataforma');
      throw new Error('Error inesperado al guardar el token');
    }
  }

  static async eliminarTokenPorJti(jti: string) {
    try {
      return await prisma.token.update({
        where: { jti },
        data: { revokedAt: new Date(), reason: 'manual_revoke' },
      });
    } catch (error) {
      tokenLogger.error(`No se pudo revocar token con jti ${jti}`, { error });
      throw new Error('Error al revocar el token');
    }
  }

  static async obtenerTokensActivosPorUsuario(usuarioId: number) {
    return prisma.token.findMany({
      where: { usuarioId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { issuedAt: 'desc' },
    });
  }

  static async revocarActivasPorPlataforma(usuarioId: number, platform?: PlatformInput) {
    if (!platform) return 0;
    const plat = this.normPlatform(platform);
    const res = await prisma.token.updateMany({
      where: { usuarioId, platform: plat, revokedAt: null },
      data: { revokedAt: new Date(), reason: 'replaced_login' },
    });
    return res.count;
  }

  static async purgarTokensVencidos() {
    const res = await prisma.token.deleteMany({
      where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }] },
    });
    return res.count;
  }
}

/* Tipos */
export type CrearTokenArgs = {
  usuarioId: number;
  platform?: PlatformInput;
  scope?: string | null;
  ip?: string | null;
  ua?: string | null;
  deviceId?: string | null;
  jti?: string;
  issuedAt?: Date;
  expiresAt?: Date;
  ttl?: StringValue;               // si no das expiresAt, se usa ttl
  tipo?: TokenTipo;                // default ACCESS
  replaceSamePlatform?: boolean;   // revoca activos en misma plataforma antes de crear
};

/* 1) Listar tokens */
export async function obtenerTokens() {
  return TokenModelInternal.obtenerTokens();
}

/* 2) Crear sesión de token (sin guardar el JWT) */
export async function crearToken(args: CrearTokenArgs): Promise<Token> {
  return TokenModelInternal.crearToken(args);
}

/* 3) Revocar por jti */
export async function eliminarTokenPorJti(jti: string) {
  return TokenModelInternal.eliminarTokenPorJti(jti);
}

/* Extras útiles */
export async function obtenerTokensActivosPorUsuario(usuarioId: number) {
  return TokenModelInternal.obtenerTokensActivosPorUsuario(usuarioId);
}

export async function revocarActivasPorPlataforma(usuarioId: number, platform?: PlatformInput) {
  return TokenModelInternal.revocarActivasPorPlataforma(usuarioId, platform);
}

export async function purgarTokensVencidos() {
  return TokenModelInternal.purgarTokensVencidos();
}
