"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_jwt_1 = require("passport-jwt");
const client_1 = require("@prisma/client");
const env_1 = require("../env");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
// Validación crítica de configuración
if (!env_1.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no está definido');
}
// Opciones de estrategia JWT
const opts = {
    jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: env_1.env.JWT_SECRET,
    issuer: env_1.env.JWT_ISSUER,
    audience: env_1.env.JWT_AUDIENCE,
    algorithms: ['HS256'],
    ignoreExpiration: false,
};
passport_1.default.use(new passport_jwt_1.Strategy(opts, async (jwtPayload, done) => {
    try {
        if (!jwtPayload?.id || typeof jwtPayload.id !== 'number') {
            return done(null, false, { message: 'Token inválido: ID faltante' });
        }
        // Verificar si el token fue revocado (si se guarda el token JWT literal en la base de datos)
        if (jwtPayload.jti) {
            const tokenRevocado = await prisma.token.findUnique({
                where: { token: jwtPayload.jti },
            });
            if (tokenRevocado) {
                return done(null, false, { message: 'Token revocado' });
            }
        }
        // Obtener usuario
        const user = await prisma.usuario.findUnique({
            where: { id: jwtPayload.id },
            select: {
                id: true,
                nombre: true,
                rol: true,
                empresa: { select: { id: true, nombre: true } },
                localidad: { select: { id: true, nombre: true, estado: true } },
            },
        });
        if (!user) {
            return done(null, false, { message: 'Usuario no encontrado' });
        }
        // Usuario válido
        const safeUser = {
            id: user.id,
            nombre: user.nombre,
            rol: user.rol,
            empresa: user.empresa,
            localidad: user.localidad,
        };
        return done(null, safeUser);
    }
    catch (error) {
        logger_1.logger.error('Error en validación de JWT con Passport', error);
        return done(error, false);
    }
}));
exports.default = passport_1.default;
