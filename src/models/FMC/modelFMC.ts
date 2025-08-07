import { PrismaClient, FcmToken } from '@prisma/client';

const prisma = new PrismaClient();

export class FmcModel {
  /**
   * Retorna todos los tokens registrados.
   */
  static async obtenerTokens(): Promise<FcmToken[]> {
    return await prisma.fcmToken.findMany();
  }

  /**
   * Retorna todos los tokens asociados a un usuario espec�fico.
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
   * Elimina un token espec�fico.
   * @param token - Token FCM
   */
  static async eliminarToken(token: string): Promise<void> {
    await prisma.fcmToken.delete({
      where: { token },
    });
  }

  /**
   * Elimina todos los tokens de un usuario espec�fico.
   * @param usuarioId - ID del usuario
   * @returns N�mero de tokens eliminados
   */
  static async eliminarTokensPorUsuario(usuarioId: number): Promise<number> {
    const result = await prisma.fcmToken.deleteMany({
      where: { usuarioId },
    });
    return result.count;
  }
}
