"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FmcModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class FmcModel {
    /**
     * Retorna todos los tokens registrados.
     */
    static async obtenerTokens() {
        return await prisma.fcmToken.findMany();
    }
    /**
     * Retorna todos los tokens asociados a un usuario espec�fico.
     * @param usuarioId - ID del usuario
     */
    static async obtenerTokensPorUsuario(usuarioId) {
        return await prisma.fcmToken.findMany({
            where: { usuarioId },
        });
    }
    /**
     * Crea o actualiza un token FCM.
     * @param usuarioId - ID del usuario
     * @param token - Token FCM
     */
    static async upsertToken(usuarioId, token) {
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
    static async eliminarToken(token) {
        await prisma.fcmToken.delete({
            where: { token },
        });
    }
    /**
     * Elimina todos los tokens de un usuario espec�fico.
     * @param usuarioId - ID del usuario
     * @returns N�mero de tokens eliminados
     */
    static async eliminarTokensPorUsuario(usuarioId) {
        const result = await prisma.fcmToken.deleteMany({
            where: { usuarioId },
        });
        return result.count;
    }
}
exports.FmcModel = FmcModel;
