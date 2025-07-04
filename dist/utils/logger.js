"use strict";
/**
 * logger.ts
 *
 * Configuración centralizada del sistema de logging utilizando Winston.
 *
 * Características:
 * - Múltiples niveles de log (debug, info, error, etc.).
 * - Manejo de errores y promesas no capturadas.
 * - Salida en consola y archivos persistentes en formato JSON.
 * - Mensajes enriquecidos con timestamp y stack trace en errores.
 * - Configuración adaptable según entorno (desarrollo/producción).
 *
 * Archivos de log generados:
 * - logs/auth-errors.log  → Registra errores de la aplicación.
 * - logs/exceptions.log   → Captura excepciones no controladas.
 * - logs/rejections.log   → Registra rechazos de promesas sin captura.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const env_1 = require("../env");
// Extraemos los formatos de Winston para mayor claridad en la configuración
const { combine, timestamp, json, errors } = winston_1.default.format;
const logger = winston_1.default.createLogger({
    // Configuración del nivel de log en función del entorno
    level: env_1.env.NODE_ENV === 'production' ? 'info' : 'debug',
    // Metadatos por defecto para todos los logs
    defaultMeta: { service: 'auth-service' },
    // Configuración del formato de salida de los logs
    format: combine(errors({ stack: true }), // Incluye el stack trace en los logs de error
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Timestamp legible
    json() // Estructura los logs en formato JSON
    ),
    transports: [
        // Salida en consola (útil en desarrollo y entornos containerizados)
        new winston_1.default.transports.Console({
            handleExceptions: true,
            handleRejections: true,
        }),
        // Archivo persistente para errores
        new winston_1.default.transports.File({
            filename: 'logs/auth-errors.log',
            level: 'error',
            maxsize: 5 * 1024 * 1024, // Máximo 5 MB por archivo
            handleExceptions: true,
            handleRejections: true,
        }),
    ],
    // Manejo centralizado de excepciones no capturadas
    exceptionHandlers: [
        new winston_1.default.transports.File({ filename: 'logs/exceptions.log' }),
    ],
    // Manejo centralizado de rechazos de promesas sin captura
    rejectionHandlers: [
        new winston_1.default.transports.File({ filename: 'logs/rejections.log' }),
    ],
});
exports.logger = logger;
