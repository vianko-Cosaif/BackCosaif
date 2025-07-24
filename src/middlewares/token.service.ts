// src/middlewares/token.service.ts

import { PrismaClient, Token as TokenModel } from '@prisma/client';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import ms, { StringValue } from 'ms';
import { NotificadorFCM } from '../services/NotificadorFCM'; // Ajusta si tu ruta es distinta

const prisma = new PrismaClient();
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '3m') as StringValue;

export interface TokenData {
  token: string;
  userId: number;
  tipo?: string;
}

/**
 * Genera un JWT para el usuario, con expiración configurable.
 */
export function generateJwtToken(user: { id: number; nombre: string; rol?: string }): string {
  const payload = { id: user.id, nombre: user.nombre, rol: user.rol };
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined in environment variables');

  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    jwtid: uuidv4(),
  };

  return jwt.sign(payload, secret, options);
}

/**
 * Guarda un nuevo token en la base de datos.
 */
export async function saveToken({ token, userId, tipo = 'auth' }: TokenData): Promise<TokenModel> {
  return prisma.token.create({
    data: {
      token,
      tipo,
      usuarioId: userId,
    },
  });
}

/**
 * Borra (revoca) un token y envía notificación FCM al usuario.
 */
export async function removeToken(token: string): Promise<TokenModel | null> {
  try {
    const dbToken = await prisma.token.findUnique({
      where: { token },
      select: { usuarioId: true },
    });

    const eliminado = await prisma.token.delete({
      where: { token },
    });

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
 * Verifica si un token sigue vigente (existe en BD).
 */
export async function isTokenValid(token: string): Promise<boolean> {
  const dbToken = await prisma.token.findUnique({
    where: { token },
    select: { id: true },
  });
  return !!dbToken;
}

/**
 * Obtiene el usuario dueño de un token.
 */
export async function getTokenOwner(token: string): Promise<number | null> {
  const dbToken = await prisma.token.findUnique({
    where: { token },
    select: { usuarioId: true },
  });
  return dbToken?.usuarioId ?? null;
}

/**
 * Revoca todos los tokens de un usuario (logout global) y notifica.
 */
export async function removeAllTokensByUser(userId: number): Promise<number> {
  const tokens = await prisma.token.findMany({
    where: { usuarioId: userId },
    select: { token: true },
  });

  const result = await prisma.token.deleteMany({
    where: { usuarioId: userId },
  });

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
