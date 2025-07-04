// movimiento.logger.ts

import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

export const movimientoError = winston.createLogger({
  level: 'error',
  format: combine(
    colorize(),
    timestamp(),
    logFormat
  ),
  transports: [
    new winston.transports.Console()
  ],
});
