"use strict";
/**
 * logger.ts
 *
 * Logger centralizado usando Winston.
 * Soporta logs en consola y archivos, con formato JSON, timestamp y manejo de errores no capturados.
 * Se adapta automáticamente al entorno (desarrollo o producción).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Cargar variables de entorno
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Asegúrate que la carpeta logs exista
const logDir = path_1.default.join(process.cwd(), 'logs');
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir);
}
// Obtén el nivel y servicio desde env, con defaults
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug');
const SERVICE_NAME = process.env.SERVICE_NAME || 'api-service';
const { combine, timestamp, json, errors } = winston_1.default.format;
const logger = winston_1.default.createLogger({
    level: LOG_LEVEL,
    defaultMeta: { service: SERVICE_NAME },
    format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), json()),
    transports: [
        new winston_1.default.transports.Console({
            handleExceptions: true,
            handleRejections: true,
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'auth-errors.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024, // 5 MB
            handleExceptions: true,
            handleRejections: true,
        }),
    ],
    exceptionHandlers: [
        new winston_1.default.transports.File({ filename: path_1.default.join(logDir, 'exceptions.log') }),
    ],
    rejectionHandlers: [
        new winston_1.default.transports.File({ filename: path_1.default.join(logDir, 'rejections.log') }),
    ],
});
exports.logger = logger;
