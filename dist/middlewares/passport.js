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
// src/middlewares/passport.ts
require("dotenv/config"); // carga variables antes de todo
const passport_1 = __importDefault(require("passport"));
const passport_jwt_1 = require("passport-jwt");
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const tokenService = __importStar(require("./token.service"));
// ────────────────────────────────
// Variables de entorno
// ────────────────────────────────
const { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE, NODE_ENV, } = process.env;
if (!JWT_SECRET) {
    logger_1.logger.error('JWT_SECRET no está definido en .env');
    throw new Error('JWT_SECRET no está definido en .env');
}
if (!JWT_ISSUER) {
    logger_1.logger.warn('JWT_ISSUER no está definido en .env');
}
if (!JWT_AUDIENCE) {
    logger_1.logger.warn('JWT_AUDIENCE no está definido en .env');
}
// ────────────────────────────────
// Prisma client
// ────────────────────────────────
const prisma = new client_1.PrismaClient();
// ────────────────────────────────
// Configuración de la estrategia JWT
// ────────────────────────────────
const opts = {
    jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    algorithms: ['HS256'],
    ignoreExpiration: NODE_ENV === 'development',
};
// ────────────────────────────────
// Estrategia Passport‑JWT
// ────────────────────────────────
passport_1.default.use(new passport_jwt_1.Strategy(opts, async (jwtPayload, done) => {
    try {
        /* 1) Validación de claims básicos */
        if (!jwtPayload?.id || typeof jwtPayload.id !== 'number') {
            logger_1.logger.warn('Token inválido: ID faltante o tipo incorrecto', { jwtPayload });
            return done(null, false, { message: 'Token inválido: ID faltante' });
        }
        if (!jwtPayload?.jti || typeof jwtPayload.jti !== 'string') {
            logger_1.logger.warn('Token inválido: jti faltante', { jwtPayload });
            return done(null, false, { message: 'Token inválido: jti faltante' });
        }
        /* 2) Revocación: comprobar jti contra la BD */
        const esValido = await tokenService.isTokenValid(jwtPayload.jti);
        if (!esValido) {
            logger_1.logger.info('Token revocado o no registrado', {
                jti: jwtPayload.jti,
                userId: jwtPayload.id,
            });
            return done(null, false, { message: 'Token revocado' });
        }
        /* 3) Recuperar datos de usuario */
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
        /* 4) Construir objeto “seguro” para req.user */
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
        logger_1.logger.error('Error en validación de JWT con Passport', { error, jwtPayload });
        return done(error, false);
    }
}));
exports.default = passport_1.default;
