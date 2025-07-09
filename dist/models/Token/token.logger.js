"use strict";
/**
 * token.logger.ts
 *
 * Logger especializado para errores en operaciones relacionadas con tokens.
 * Permite llevar trazabilidad de errores en generación, recuperación o uso de tokens.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const { combine, timestamp, json, errors, printf, colorize } = winston_1.default.format;
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
    return `[${timestamp}] ${level.toUpperCase()} - ${stack || message}`;
});
exports.tokenLogger = winston_1.default.createLogger({
    level: 'error',
    defaultMeta: { context: 'TokenModule' },
    format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), json()),
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.resolve('logs/token-errors.log'),
            maxsize: 5 * 1024 * 1024,
            handleExceptions: true,
            handleRejections: true,
        }),
        new winston_1.default.transports.Console({
            format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), consoleFormat),
            handleExceptions: true,
            handleRejections: true,
        }),
    ],
    exitOnError: false,
});
