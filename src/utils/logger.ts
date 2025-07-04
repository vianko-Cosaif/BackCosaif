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

import winston from 'winston';
import { env } from '../env';

// Extraemos los formatos de Winston para mayor claridad en la configuración
const { combine, timestamp, json, errors } = winston.format;

const logger = winston.createLogger({
  // Configuración del nivel de log en función del entorno
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  // Metadatos por defecto para todos los logs
  defaultMeta: { service: 'auth-service' },
  // Configuración del formato de salida de los logs
  format: combine(
    errors({ stack: true }), // Incluye el stack trace en los logs de error
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Timestamp legible
    json() // Estructura los logs en formato JSON
  ),
  transports: [
    // Salida en consola (útil en desarrollo y entornos containerizados)
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
    // Archivo persistente para errores
    new winston.transports.File({
      filename: 'logs/auth-errors.log',
      level: 'error',
      maxsize: 5 * 1024 * 1024, // Máximo 5 MB por archivo
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  // Manejo centralizado de excepciones no capturadas
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  // Manejo centralizado de rechazos de promesas sin captura
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

export { logger };
