// src/controllers/fmc.controller.logger.ts
import { createLogger, format, transports } from 'winston';
import path from 'path';
import fs from 'fs';

// Aseguramos que exista la carpeta de logs
const logDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

export const fmcControllerLogger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack, ...meta }) => {
      const base = `${timestamp} | ${level.toUpperCase()} | ${message}`;
      const details = stack ? `\n${stack}` : Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
      return base + details;
    })
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message }) => `${timestamp} | ${level}: ${message}`)
      ),
    }),
    new transports.File({
      filename: path.join(logDir, 'fmc.log'),
      maxsize: 5 * 1024 * 1024,   // 5 MB
      maxFiles: 3,
      tailable: true,
    }),
  ],
});
