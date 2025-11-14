/**
 * logger.ts
 *
 * Logger centralizado usando Winston.
 * Soporta logs en consola y archivos, con formato JSON, timestamp y manejo de errores no capturados.
 * Se adapta automáticamente al entorno (desarrollo o producción).
 */

import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config();

// Asegúrate que la carpeta logs exista
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Obtén el nivel y servicio desde env, con defaults
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug');
const SERVICE_NAME = process.env.SERVICE_NAME || 'api-service';

const { combine, timestamp, json, errors } = winston.format;

const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: SERVICE_NAME },
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'auth-errors.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5 MB
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'rejections.log') }),
  ],
});

// Permite importar como "logger" en otros módulos
export { logger };
