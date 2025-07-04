"use strict";
/**
 * incidente.logger.ts
 *
 * Logger especializado para el modelo Incidente.
 *
 * Este modulo proporciona un logger configurado especificamente para registrar
 * eventos, errores y operaciones relacionadas con la gestion de incidentes.
 *
 * Funcionalidades:
 * - Log de creacion y edicion de incidentes
 * - Registro de reorganizacion de rondas por incidentes
 * - Seguimiento de procesamiento de imagenes
 * - Monitoreo de timeouts y cierres automaticos
 * - Trazabilidad completa de operaciones de incidentes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logIncidenteOperation = exports.incidenteError = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
// Configuracion del formato de logs
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
}), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.prettyPrint());
// Logger especifico para el modelo Incidente
exports.incidenteError = winston_1.default.createLogger({
    level: 'info',
    format: logFormat,
    defaultMeta: {
        service: 'IncidenteModel',
        module: 'Movimientos/Incidente'
    },
    transports: [
        // Archivo para errores de incidentes
        new winston_1.default.transports.File({
            filename: path_1.default.join('logs', 'incidentes', 'incidente-error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Archivo para todos los logs de incidentes
        new winston_1.default.transports.File({
            filename: path_1.default.join('logs', 'incidentes', 'incidente-combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 10,
        }),
        // Archivo especifico para reorganizacion de rondas
        new winston_1.default.transports.File({
            filename: path_1.default.join('logs', 'incidentes', 'reorganizacion-rondas.log'),
            level: 'info',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: winston_1.default.format.combine(logFormat, winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
                const messageStr = typeof message === 'string' ? message : String(message);
                if (messageStr.includes('reorganiz') || messageStr.includes('ronda')) {
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
            filename: path_1.default.join('logs', 'incidentes', 'incidente-exceptions.log')
        })
    ],
    // Manejo de rechazos de promesas no capturados
    rejectionHandlers: [
        new winston_1.default.transports.File({
            filename: path_1.default.join('logs', 'incidentes', 'incidente-rejections.log')
        })
    ]
});
// Crear directorios de logs si no existen
const fs_1 = __importDefault(require("fs"));
const logsDir = path_1.default.join('logs', 'incidentes');
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
// Funcion helper para log de operaciones de incidentes
const logIncidenteOperation = (operation, incidenteId, movimientoId, additional) => {
    exports.incidenteError.info(`Operacion de incidente: ${operation}`, {
        operation,
        incidenteId,
        movimientoId,
        timestamp: new Date().toISOString(),
        ...additional
    });
};
exports.logIncidenteOperation = logIncidenteOperation;
