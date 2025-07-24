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
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const NotificadorFCM_1 = require("../services/NotificadorFCM"); // Ajusta la ruta según tu estructura
const prisma = new client_1.PrismaClient();
// Esto lo tomamos del .env o por default '3m'
// Aserción a StringValue para que TypeScript lo acepte como literal válido para ms()
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '3m');
/**
 * Genera un JWT para el usuario, con expiración editable desde .env
 */
function generateJwtToken(user) {
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
    const options = {
        expiresIn: JWT_EXPIRES_IN, // ahora TypeScript lo acepta
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
        jwtid: (0, uuid_1.v4)(), // jti
    };
    return jsonwebtoken_1.default.sign(payload, secret, options);
}
/**
 * Guarda un nuevo token en la base de datos.
 */
async function saveToken({ token, userId, tipo = 'auth' }) {
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
async function removeToken(token) {
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
 * Verifica si un token está registrado en la base de datos.
 * Retorna TRUE si el token existe, FALSE si fue borrado/no existe.
 */
async function isTokenValid(token) {
    const dbToken = await prisma.token.findUnique({
        where: { token },
        select: { id: true },
    });
    return !!dbToken;
}
/**
 * Devuelve el usuario dueño del token, si existe.
 */
async function getTokenOwner(token) {
    const dbToken = await prisma.token.findUnique({
        where: { token },
        select: { usuarioId: true },
    });
    return dbToken?.usuarioId ?? null;
}
/**
 * Limpia todos los tokens de un usuario (logout global) y envía notificación.
 */
async function removeAllTokensByUser(userId) {
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
