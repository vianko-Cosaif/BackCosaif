import { createLogger, format, transports } from 'winston';

// Logger específico para operaciones de SeccionVia
export const seccionError = createLogger({
  level: 'error',
  format: format.combine(
    format.label({ label: 'SeccionVia' }),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }), // incluye stack trace en json
    format.json()
  ),
  transports: [
    new transports.Console(),
    // Puedes descomentar la siguiente línea para habilitar logging en archivo
    // new transports.File({ filename: 'logs/seccion-error.log', level: 'error' })
  ],
});
