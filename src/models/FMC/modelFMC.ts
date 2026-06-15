import { FcmToken } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export class FmcModel {
  /**
   * Retorna todos los tokens registrados.
   */
  static async obtenerTokens(): Promise<FcmToken[]> {
    return await prisma.fcmToken.findMany();
  }

  /**
   * Retorna todos los tokens asociados a un usuario especifico.
   * @param usuarioId - ID del usuario
   */
  static async obtenerTokensPorUsuario(usuarioId: number): Promise<FcmToken[]> {
    return await prisma.fcmToken.findMany({
      where: { usuarioId },
    });
  }

  /**
   * Crea o actualiza un token FCM.
   * @param usuarioId - ID del usuario
   * @param token - Token FCM
   */
  static async upsertToken(usuarioId: number, token: string): Promise<FcmToken> {
    return await prisma.fcmToken.upsert({
      where: { token },
      update: { usuarioId },
      create: { usuarioId, token },
    });
  }

  /**
   * Elimina un token especifico.
   * @param token - Token FCM
   */
  static async eliminarToken(token: string, usuarioId?: number): Promise<number> {
    const result = await prisma.fcmToken.deleteMany({
      where: {
        token,
        ...(usuarioId ? { usuarioId } : {}),
      },
    });
    return result.count;
  }

  /**
   * Elimina todos los tokens de un usuario especifico.
   * @param usuarioId - ID del usuario
   * @returns Numero de tokens eliminados
   */
  static async eliminarTokensPorUsuario(usuarioId: number): Promise<number> {
    const result = await prisma.fcmToken.deleteMany({
      where: { usuarioId },
    });
    return result.count;
  }
}
