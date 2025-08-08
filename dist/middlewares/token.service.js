"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJwtToken = generateJwtToken;
exports.saveToken = saveToken;
exports.removeToken = removeToken;
exports.isTokenValid = isTokenValid;
exports.getTokenOwner = getTokenOwner;
exports.removeAllTokensByUser = removeAllTokensByUser;
// src/middlewares/token.service.ts
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const NotificadorFCM_1 = require("../services/NotificadorFCM"); // Mantén o quita según necesites
const prisma = new client_1.PrismaClient();
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '8h');
/* -------------------------------------------------------------------------- */
/*  Generar JWT                                                               */
/* -------------------------------------------------------------------------- */
/**
 * Firma un JWT con `jti` único y devuelve { token, jti }.
 */
function generateJwtToken(user) {
    const jti = (0, uuid_1.v4)();
    const payload = { id: user.id, nombre: user.nombre, rol: user.rol };
    const secret = process.env.JWT_SECRET;
    if (!secret)
        throw new Error('JWT_SECRET is not defined in environment variables');
    const options = {
        expiresIn: JWT_EXPIRES_IN,
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
        jwtid: jti,
    };
    const token = jsonwebtoken_1.default.sign(payload, secret, options);
    return { token, jti };
}
/* -------------------------------------------------------------------------- */
/*  Persistencia                                                              */
/* -------------------------------------------------------------------------- */
/**
 * Guarda un nuevo registro en la tabla Token.
 */
async function saveToken({ token, jti, userId, tipo = 'auth', }) {
    return prisma.token.create({
        data: {
            token,
            jti, // ‹‑‑ nuevo campo
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
async function removeToken(token) {
    try {
        const dbToken = await prisma.token.findUnique({
            where: { token },
            select: { usuarioId: true },
        });
        const eliminado = await prisma.token.delete({ where: { token } });
        if (dbToken?.usuarioId) {
            await NotificadorFCM_1.NotificadorFCM.enviarNotificacionPersonalizada({
                usuarioId: dbToken.usuarioId,
                titulo: 'Token expirado',
                mensaje: 'Upss, tu token ya expiró. Por favor inicia sesión de nuevo.',
                data: { tipo: 'token_expirado' },
                prioridad: 'alta',
            });
        }
        return eliminado;
    }
    catch {
        return null;
    }
}
/**
 * Comprueba si un `jti` está registrado (token vigente).
 */
async function isTokenValid(jti) {
    const dbToken = await prisma.token.findFirst({
        where: { jti },
        select: { id: true },
    });
    return !!dbToken;
}
/**
 * Obtiene el usuario dueño de un `jti`.
 */
async function getTokenOwner(jti) {
    const dbToken = await prisma.token.findFirst({
        where: { jti },
        select: { usuarioId: true },
    });
    return dbToken?.usuarioId ?? null;
}
/**
 * Cierra sesión en todos los dispositivos (revoca todos los tokens de un usuario).
 */
async function removeAllTokensByUser(userId) {
    const tokens = await prisma.token.findMany({
        where: { usuarioId: userId },
        select: { token: true },
    });
    const result = await prisma.token.deleteMany({ where: { usuarioId: userId } });
    if (tokens.length > 0) {
        await NotificadorFCM_1.NotificadorFCM.enviarNotificacionPersonalizada({
            usuarioId: userId,
            titulo: 'Sesión cerrada',
            mensaje: 'Has cerrado sesión en todos tus dispositivos.',
            data: { tipo: 'logout_global' },
            prioridad: 'alta',
        });
    }
    return result.count;
}
