"use strict";
/**
 * server.logger.ts
 *
 * Logger especializado para eventos del servidor principal Express.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const { combine, timestamp, json, errors, printf, colorize } = winston_1.default.format;
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
    return `[${timestamp}] ${level.toUpperCase()} - ${stack || message}`;
});
exports.serverLogger = winston_1.default.createLogger({
    level: 'info',
    defaultMeta: { context: 'ServidorExpress' },
    format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), json()),
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.resolve('logs/server.log'),
            maxsize: 5 * 1024 * 1024,
            handleExceptions: true,
            handleRejections: true,
        }),
        new winston_1.default.transports.Console({
            format: combine(colorize(), timestamp(), errors({ stack: true }), consoleFormat),
        }),
    ],
});
