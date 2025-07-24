"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const passport_1 = __importDefault(require("passport"));
const passport_jwt_1 = require("passport-jwt");
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const tokenService = __importStar(require("./token.service"));
if (!process.env.JWT_SECRET) {
    logger_1.logger.error('JWT_SECRET no está definido en el archivo .env');
    throw new Error('JWT_SECRET no está definido');
}
const prisma = new client_1.PrismaClient();
const opts = {
    jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    algorithms: ['HS256'],
    ignoreExpiration: process.env.NODE_ENV === 'development',
};
passport_1.default.use(new passport_jwt_1.Strategy(opts, async (jwtPayload, done) => {
    try {
        if (!jwtPayload?.id ||
            (typeof jwtPayload.id !== 'number' && typeof jwtPayload.id !== 'string')) {
            logger_1.logger.warn('Token inválido: ID faltante/tipo incorrecto', { jwtPayload });
            return done(null, false, { message: 'Token inválido: ID faltante' });
        }
        // Verifica si el token JWT está registrado (no ha sido eliminado/revocado)
        if (jwtPayload.jti) {
            const isValid = await tokenService.isTokenValid(jwtPayload.jti);
            if (!isValid) {
                logger_1.logger.info('Token eliminado/no válido', { jti: jwtPayload.jti, userId: jwtPayload.id });
                // Aquí NO necesitas enviar la notificación, ya la manda removeToken cuando se revoca
                return done(null, false, { message: 'Token eliminado/no válido' });
            }
        }
        // Busca el usuario autenticado
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
            logger_1.logger.warn('Usuario no encontrado', { userId: jwtPayload.id });
            return done(null, false, { message: 'Usuario no encontrado' });
        }
        const safeUser = {
            id: user.id,
            nombre: user.nombre,
            rol: user.rol,
            empresa: user.empresa,
            localidad: user.localidad,
        };
        logger_1.logger.info('JWT válido, usuario autenticado', { userId: user.id });
        return done(null, safeUser);
    }
    catch (error) {
        logger_1.logger.error('Error en validación JWT', { error, jwtPayload });
        return done(error, false);
    }
}));
exports.default = passport_1.default;
