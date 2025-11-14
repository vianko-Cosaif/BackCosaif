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

import winston from 'winston';
import path from 'path';

const { combine, timestamp, json, errors, printf, colorize } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level.toUpperCase()} - ${stack || message}`;
});

export const empresaControllerLogger = winston.createLogger({
  level: 'error',
  defaultMeta: { context: 'EmpresaController' },
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.resolve('logs/empresa-controller-errors.log'),
      maxsize: 5 * 1024 * 1024,
      handleExceptions: true,
      handleRejections: true,
    }),
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
  exitOnError: false,
});
