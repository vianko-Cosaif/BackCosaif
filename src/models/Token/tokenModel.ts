/**
 * src/middlewares/token.service.ts
 *
 * Servicio de acceso a datos para la entidad Token.
 */
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { tokenLogger } from './token.logger';

const prisma = new PrismaClient();

/* ────────────────────────────── */
/* 1. Obtener todos los tokens    */
/* ────────────────────────────── */
export async function obtenerTokens() {
  try {
    return await prisma.token.findMany({ include: { usuario: true } });
  } catch (error) {
    tokenLogger.error('Error al obtener tokens', { error });
    throw new Error('No se pudieron obtener los tokens');
  }
}

/* ────────────────────────────── */
/* 2. Crear token nuevo           */
/* ────────────────────────────── */
export async function crearToken(token: string, usuarioId: number, tipo = 'auth') {
  try {
    return await prisma.token.create({
      data: {
        token,
        jti: uuidv4(),          // ¡campo obligatorio!
        tipo,
        usuarioId,
      },
    });
  } catch (error) {
    tokenLogger.error(`Error al crear token para usuario ${usuarioId}`, { error });
    throw new Error('Error inesperado al guardar el token');
  }
}

/* ────────────────────────────── */
/* 3. Eliminar (revocar) token    */
/* ────────────────────────────── */
export async function eliminarTokenPorJti(jti: string) {
  try {
    return await prisma.token.delete({ where: { jti } });
  } catch (error) {
    tokenLogger.error(`No se pudo eliminar token con jti ${jti}`, { error });
    throw new Error('Error al revocar el token');
  }
}
