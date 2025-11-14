/**
 * token.logger.ts
 * 
 * Logger especializado para errores en operaciones relacionadas con tokens.
 * Permite llevar trazabilidad de errores en generación, recuperación o uso de tokens.
 */

import winston from 'winston';
import path from 'path';

const { combine, timestamp, json, errors, printf, colorize } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level.toUpperCase()} - ${stack || message}`;
});

export const tokenLogger = winston.createLogger({
  level: 'error',
  defaultMeta: { context: 'TokenModule' },
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.resolve('logs/token-errors.log'),
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
