"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.obtenerTokens = obtenerTokens;
exports.crearToken = crearToken;
exports.eliminarTokenPorJti = eliminarTokenPorJti;
/**
 * src/middlewares/token.service.ts
 *
 * Servicio de acceso a datos para la entidad Token.
 */
const client_1 = require("@prisma/client");
const uuid_1 = require("uuid");
const token_logger_1 = require("./token.logger");
const prisma = new client_1.PrismaClient();
/* ────────────────────────────── */
/* 1. Obtener todos los tokens    */
/* ────────────────────────────── */
async function obtenerTokens() {
    try {
        return await prisma.token.findMany({ include: { usuario: true } });
    }
    catch (error) {
        token_logger_1.tokenLogger.error('Error al obtener tokens', { error });
        throw new Error('No se pudieron obtener los tokens');
    }
}
/* ────────────────────────────── */
/* 2. Crear token nuevo           */
/* ────────────────────────────── */
async function crearToken(token, usuarioId, tipo = 'auth') {
    try {
        return await prisma.token.create({
            data: {
                token,
                jti: (0, uuid_1.v4)(), // ¡campo obligatorio!
                tipo,
                usuarioId,
            },
        });
    }
    catch (error) {
        token_logger_1.tokenLogger.error(`Error al crear token para usuario ${usuarioId}`, { error });
        throw new Error('Error inesperado al guardar el token');
    }
}
/* ────────────────────────────── */
/* 3. Eliminar (revocar) token    */
/* ────────────────────────────── */
async function eliminarTokenPorJti(jti) {
    try {
        return await prisma.token.delete({ where: { jti } });
    }
    catch (error) {
        token_logger_1.tokenLogger.error(`No se pudo eliminar token con jti ${jti}`, { error });
        throw new Error('Error al revocar el token');
    }
}
