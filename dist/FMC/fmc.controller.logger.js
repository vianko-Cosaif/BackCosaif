"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fmcControllerLogger = void 0;
// src/controllers/fmc.controller.logger.ts
const winston_1 = require("winston");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Aseguramos que exista la carpeta de logs
const logDir = path_1.default.resolve(__dirname, '../../logs');
if (!fs_1.default.existsSync(logDir))
    fs_1.default.mkdirSync(logDir);
exports.fmcControllerLogger = (0, winston_1.createLogger)({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.format.combine(winston_1.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.format.errors({ stack: true }), winston_1.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const base = `${timestamp} | ${level.toUpperCase()} | ${message}`;
        const details = stack ? `\n${stack}` : Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
        return base + details;
    })),
    transports: [
        new winston_1.transports.Console({
            format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.printf(({ timestamp, level, message }) => `${timestamp} | ${level}: ${message}`)),
        }),
        new winston_1.transports.File({
            filename: path_1.default.join(logDir, 'fmc.log'),
            maxsize: 5 * 1024 * 1024, // 5 MB
            maxFiles: 3,
            tailable: true,
        }),
    ],
});
