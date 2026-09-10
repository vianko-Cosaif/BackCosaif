import { FcmToken, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export class FmcModel {
  static async eliminarTokenEnAlcance(token: string, scope: Prisma.FcmTokenWhereInput) {
    const result = await prisma.fcmToken.deleteMany({ where: { AND: [{ token }, scope] } });
    return result.count;
  }

  /**
   * Retorna todos los tokens registrados.
   */
  static async obtenerTokens(where: Prisma.FcmTokenWhereInput = {}): Promise<FcmToken[]> {
    return await prisma.fcmToken.findMany({ where, take: 1000 });
  }

  /**
   * Retorna todos los tokens asociados a un usuario especifico.
   * @param usuarioId - ID del usuario
   */
  static async obtenerTokensPorUsuario(usuarioId: number, scope: Prisma.FcmTokenWhereInput = {}): Promise<FcmToken[]> {
    return await prisma.fcmToken.findMany({
      take: 1000,
      where: { AND: [{ usuarioId }, scope] },
    });
  }

  /**
   * Crea o actualiza un token FCM.
   * @param usuarioId - ID del usuario
   * @param token - Token FCM
   */
  static async upsertToken(usuarioId: number, token: string, localidadId?: number | null): Promise<FcmToken> {
    const data = {
      usuarioId,
      localidadId: localidadId && localidadId > 0 ? localidadId : null,
    };

    return await prisma.fcmToken.upsert({
      where: { token },
      update: data,
      create: { ...data, token },
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
  static async eliminarTokensPorUsuario(usuarioId: number, scope: Prisma.FcmTokenWhereInput = {}): Promise<number> {
    const result = await prisma.fcmToken.deleteMany({
      where: { AND: [{ usuarioId }, scope] },
    });
    return result.count;
  }
}
