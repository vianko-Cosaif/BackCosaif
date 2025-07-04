"use strict";
/**
 * incidente.controller.logger.ts
 *
 * Logger especializado para el controlador IncidenteController.
 *
 * Este modulo proporciona un logger configurado especificamente para registrar
 * eventos, errores y operaciones HTTP relacionadas con el controlador de incidentes.
 *
 * Funcionalidades:
 * - Log de requests HTTP y responses
 * - Registro de operaciones de upload de imagenes
 * - Seguimiento de validaciones y errores de entrada
 * - Monitoreo de operaciones de cierre de incidentes
 * - Trazabilidad de acceso a imagenes y archivos
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logUploadOperation = exports.logHttpRequest = exports.incidenteControllerLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
// Configuracion del formato de logs
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
}), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.prettyPrint());
// Logger especifico para el controlador de Incidentes
exports.incidenteControllerLogger = winston_1.default.createLogger({
    level: 'info',
    format: logFormat,
    defaultMeta: {
        service: 'IncidenteController',
        module: 'Controllers/Incidente',
        layer: 'HTTP'
    },
    transports: [
        // Archivo para errores del controlador
        new winston_1.default.transports.File({
            filename: path_1.default.join('logs', 'incidentes', 'controller-error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Archivo para todos los logs del controlador
        new winston_1.default.transports.File({
            filename: path_1.default.join('logs', 'incidentes', 'controller-combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 10,
        }),
        // Archivo especifico para operaciones de imagenes
        new winston_1.default.transports.File({
            filename: path_1.default.join('logs', 'incidentes', 'imagenes-operations.log'),
            level: 'info',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: winston_1.default.format.combine(logFormat, winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
                const messageStr = typeof message === 'string' ? message : String(message);
                if (messageStr.includes('imagen') || messageStr.includes('upload') || messageStr.includes('archivo')) {
                    return `${timestamp} [${level.toUpperCase()}]: ${messageStr} ${JSON.stringify(meta)}`;
                }
                return '';
            }))
        }),
        // Archivo para operaciones de cierre/timeout
        new winston_1.default.transports.File({
            filename: path_1.default.join('logs', 'incidentes', 'cierre-operations.log'),
            level: 'info',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: winston_1.default.format.combine(logFormat, winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
                const messageStr = typeof message === 'string' ? message : String(message);
                if (messageStr.includes('cerrar') || messageStr.includes('timeout') || messageStr.includes('vencido')) {
                    return `${timestamp} [${level.toUpperCase()}]: ${messageStr} ${JSON.stringify(meta)}`;
                }
                return '';
            }))
        }),
        // Console para desarrollo
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple(), winston_1.default.format.printf(({ timestamp, level, message, service, ...meta }) => {
                const messageStr = typeof message === 'string' ? message : String(message);
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                return `${timestamp} [${service}] ${level}: ${messageStr} ${metaStr}`;
            }))
        })
    ],
    // Manejo de excepciones no capturadas
    exceptionHandlers: [
        new winston_1.default.transports.File({
            filename: path_1.default.join('logs', 'incidentes', 'controller-exceptions.log')
        })
    ],
    // Manejo de rechazos de promesas no capturados
    rejectionHandlers: [
        new winston_1.default.transports.File({
            filename: path_1.default.join('logs', 'incidentes', 'controller-rejections.log')
        })
    ]
});
// Funcion helper para log de requests HTTP
const logHttpRequest = (method, endpoint, statusCode, responseTime, additional) => {
    exports.incidenteControllerLogger.info(`HTTP ${method} ${endpoint}`, {
        method,
        endpoint,
        statusCode,
        responseTime,
        timestamp: new Date().toISOString(),
        ...additional
    });
};
exports.logHttpRequest = logHttpRequest;
// Funcion helper para log de operaciones de upload
const logUploadOperation = (operation, fileCount, totalSize, incidenteId, additional) => {
    exports.incidenteControllerLogger.info(`Upload: ${operation}`, {
        operation,
        fileCount,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        incidenteId,
        timestamp: new Date().toISOString(),
        ...additional
    });
};
exports.logUploadOperation = logUploadOperation;
