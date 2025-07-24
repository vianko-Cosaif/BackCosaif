import { PrismaClient, Token as TokenModel } from '@prisma/client';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import ms, { StringValue } from 'ms';
import { NotificadorFCM } from '../services/NotificadorFCM'; // Ajusta la ruta según tu estructura

const prisma = new PrismaClient();

// Esto lo tomamos del .env o por default '3m'
// Aserción a StringValue para que TypeScript lo acepte como literal válido para ms()
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '3m') as StringValue;

export interface TokenData {
  token: string;
  userId: number;
  tipo?: string;
}

/**
 * Genera un JWT para el usuario, con expiración editable desde .env
 */
export function generateJwtToken(user: { id: number; nombre: string; rol?: string }): string {
  const payload = {
    id: user.id,
    nombre: user.nombre,
    rol: user.rol,
    // añade más info si es necesario
  };

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  // Opciones de firma, con expiresIn aceptando StringValue
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN,             // ahora TypeScript lo acepta
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    jwtid: uuidv4(),                       // jti
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
 * Borra (revoca) un token y envía una notificación al usuario afectado.
 */
export async function removeToken(token: string): Promise<TokenModel | null> {
  try {
    // Buscar el dueño del token ANTES de borrarlo
    const dbToken = await prisma.token.findUnique({
      where: { token },
      select: { usuarioId: true },
    });

    // Elimina el token
    const eliminado = await prisma.token.delete({
      where: { token },
    });

    // Si existe dueño, manda la notificación push
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
 * Verifica si un token está registrado en la base de datos.
 * Retorna TRUE si el token existe, FALSE si fue borrado/no existe.
 */
export async function isTokenValid(token: string): Promise<boolean> {
  const dbToken = await prisma.token.findUnique({
    where: { token },
    select: { id: true },
  });
  return !!dbToken;
}

/**
 * Devuelve el usuario dueño del token, si existe.
 */
export async function getTokenOwner(token: string): Promise<number | null> {
  const dbToken = await prisma.token.findUnique({
    where: { token },
    select: { usuarioId: true },
  });
  return dbToken?.usuarioId ?? null;
}

/**
 * Limpia todos los tokens de un usuario (logout global) y envía notificación.
 */
export async function removeAllTokensByUser(userId: number): Promise<number> {
  // Busca tokens activos
  const tokens = await prisma.token.findMany({
    where: { usuarioId: userId },
    select: { token: true },
  });

  // Elimina todos los tokens del usuario
  const result = await prisma.token.deleteMany({
    where: { usuarioId: userId },
  });

  // Si tenía tokens, manda notificación de logout global
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
