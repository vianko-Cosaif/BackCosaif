// src/middlewares/token.service.ts
import { PrismaClient, Token as TokenModel } from '@prisma/client';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import ms, { StringValue } from 'ms';
import { NotificadorFCM } from '../services/NotificadorFCM'; // Mantén o quita según necesites

const prisma = new PrismaClient();
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '8h') as StringValue;

/* -------------------------------------------------------------------------- */
/*  Tipos                                                                     */
/* -------------------------------------------------------------------------- */

export interface TokenData {
  token: string;
  jti: string;          // ← nuevo campo
  userId: number;
  tipo?: string;
}

/* -------------------------------------------------------------------------- */
/*  Generar JWT                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Firma un JWT con `jti` único y devuelve { token, jti }.
 */
export function generateJwtToken(user: { id: number; nombre: string; rol?: string }): {
  token: string;
  jti: string;
} {
  const jti = uuidv4();
  const payload = { id: user.id, nombre: user.nombre, rol: user.rol };
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined in environment variables');

  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    jwtid: jti, 
  };

  const token = jwt.sign(payload, secret, options);
  return { token, jti };
}

/* -------------------------------------------------------------------------- */
/*  Persistencia                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Guarda un nuevo registro en la tabla Token.
 */
export async function saveToken({
  token,
  jti,
  userId,
  tipo = 'auth',
}: TokenData): Promise<TokenModel> {
  return prisma.token.create({
    data: {
      token,
      jti,               // ‹‑‑ nuevo campo
      tipo,
      usuarioId: userId,
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Revocación / Validación                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Elimina (revoca) un token por su cadena completa y notifica al usuario.
 * Lo dejamos igual porque el job de limpieza sigue usándolo.
 */
export async function removeToken(token: string): Promise<TokenModel | null> {
  try {
    const dbToken = await prisma.token.findUnique({
      where: { token },
      select: { usuarioId: true },
    });

    const eliminado = await prisma.token.delete({ where: { token } });

    if (dbToken?.usuarioId) {
      await NotificadorFCM.enviarNotificacionPersonalizada({
        usuarioId: dbToken.usuarioId,
        titulo: 'Token expirado',
        mensaje: 'Upss, tu token ya expiró. Por favor inicia sesión de nuevo.',
        data: { tipo: 'token_expirado' },
        prioridad: 'alta',
      });
    }
    return eliminado;
  } catch {
    return null;
  }
}

/**
 * Comprueba si un `jti` está registrado (token vigente).
 */
export async function isTokenValid(jti: string): Promise<boolean> {
  const dbToken = await prisma.token.findFirst({
    where: { jti },
    select: { id: true },
  });
  return !!dbToken;
}

/**
 * Obtiene el usuario dueño de un `jti`.
 */
export async function getTokenOwner(jti: string): Promise<number | null> {
  const dbToken = await prisma.token.findFirst({
    where: { jti },
    select: { usuarioId: true },
  });
  return dbToken?.usuarioId ?? null;
}

/**
 * Cierra sesión en todos los dispositivos (revoca todos los tokens de un usuario).
 */
export async function removeAllTokensByUser(userId: number): Promise<number> {
  const tokens = await prisma.token.findMany({
    where: { usuarioId: userId },
    select: { token: true },
  });

  const result = await prisma.token.deleteMany({ where: { usuarioId: userId } });

  if (tokens.length > 0) {
    await NotificadorFCM.enviarNotificacionPersonalizada({
      usuarioId: userId,
      titulo: 'Sesión cerrada',
      mensaje: 'Has cerrado sesión en todos tus dispositivos.',
      data: { tipo: 'logout_global' },
      prioridad: 'alta',
    });
  }
  return result.count;
}
