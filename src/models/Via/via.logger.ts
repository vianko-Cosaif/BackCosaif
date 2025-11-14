// via.logger.ts
import winston from 'winston';

export const viaError = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    // Descomenta la siguiente línea para guardar los logs en un archivo
    // new winston.transports.File({ filename: 'via-error.log' })
  ],
});
