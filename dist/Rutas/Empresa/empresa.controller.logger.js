"use strict";
/**
 * empresa.controller.logger.ts
 *
 * Logger exclusivo para operaciones y errores del EmpresaController.
 * Este logger ayuda a registrar fallos en la capa HTTP (Express),
 * facilitando el análisis de errores y seguimiento de solicitudes.
 *
 * Salidas:
 * - logs/empresa-controller-errors.log → Errores del controlador
 * - consola                            → En todos los entornos
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.empresaControllerLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const { combine, timestamp, json, errors, printf, colorize } = winston_1.default.format;
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
    return `[${timestamp}] ${level.toUpperCase()} - ${stack || message}`;
});
exports.empresaControllerLogger = winston_1.default.createLogger({
    level: 'error',
    defaultMeta: { context: 'EmpresaController' },
    format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), json()),
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.resolve('logs/empresa-controller-errors.log'),
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
