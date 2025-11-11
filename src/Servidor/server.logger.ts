/**
 * server.logger.ts
 * 
 * Logger especializado para eventos del servidor principal Express.
 */

import winston from 'winston';
import path from 'path';

const { combine, timestamp, json, errors, printf, colorize } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level.toUpperCase()} - ${stack || message}`;
});

export const serverLogger = winston.createLogger({
  level: 'info',
  defaultMeta: { context: 'ServidorExpress' },
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.resolve('logs/server.log'),
      maxsize: 5 * 1024 * 1024,
      handleExceptions: true,
      handleRejections: true,
    }),
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), errors({ stack: true }), consoleFormat),
    }),
  ],
});
