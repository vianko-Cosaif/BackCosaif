"use strict";
// src/cron/cleanupTokens.ts
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
const node_cron_1 = __importDefault(require("node-cron"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const tokenService = __importStar(require("../middlewares/token.service"));
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
node_cron_1.default.schedule('0 * * * *', // cada hora en el minuto 0
async () => {
    let revokedCount = 0;
    const nowMs = Date.now();
    try {
        const stored = await prisma.token.findMany({ select: { token: true } });
        for (const { token } of stored) {
            let shouldRevoke = false;
            try {
                const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET, { ignoreExpiration: true });
                if (payload.exp && payload.exp * 1000 < nowMs)
                    shouldRevoke = true;
            }
            catch {
                shouldRevoke = true;
            }
            if (shouldRevoke) {
                await tokenService.removeToken(token);
                revokedCount++;
            }
        }
        if (revokedCount > 0) {
            console.log(`[${new Date().toISOString()}] Revocados ${revokedCount} tokens expirados.`);
        }
    }
    catch (err) {
        console.error('Error en limpieza de tokens expirados:', err);
    }
}, {
    timezone: 'America/Mexico_City',
});
