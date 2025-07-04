/**
 * empresa.logger.ts
 * 
 * Logger dedicado exclusivamente para el módulo Empresa.
 * 
 * Este logger registra únicamente eventos de nivel `error`,
 * y está diseñado para ayudar en el monitoreo y depuración
 * de fallos relacionados con las operaciones del modelo Empresa.
 * 
 * Salidas:
 * - logs/empresa-errors.log → Errores persistentes
 * - consola                 → En desarrollo y producción
 */

import winston from 'winston';
import path from 'path';

// Formatos desestructurados para mayor claridad
const { combine, timestamp, json, errors, printf, colorize } = winston.format;

// Formato legible para consola
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level.toUpperCase()} → ${stack || message}`;
});

export const empresaError = winston.createLogger({
  level: 'error',
  defaultMeta: { service: 'empresa-model' },
  format: combine(
    errors({ stack: true }), // Captura stack traces de errores
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json() // Persistencia en JSON estructurado
  ),
  transports: [
    // Archivo persistente para errores críticos
    new winston.transports.File({
      filename: path.resolve('logs/empresa-errors.log'),
      maxsize: 5 * 1024 * 1024, // 5MB por archivo
      handleExceptions: true,
      handleRejections: true,
    }),

    // Salida a consola (en todos los entornos)
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        consoleFormat
      ),
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false, // Evita que el proceso finalice en errores no controlados
});
