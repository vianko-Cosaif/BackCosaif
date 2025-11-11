/**
 * localidad.controller.logger.ts
 *
 * Logger especializado para registrar errores en el controlador de Localidad.
 *
 * Este logger utiliza Winston para mantener registros estructurados y consistentes
 * sobre los eventos y errores ocurridos en el controlador HTTP para Localidad.
 */

import { createLogger, format, transports } from 'winston';

// Configuración del logger usando Winston.
export const localidadControllerLogger = createLogger({
  level: 'error', // Registra sólo errores y niveles superiores (error, criticos, etc.).
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Añadir timestamp
    format.errors({ stack: true }), // Incluye pila de errores (stack trace)
    format.json() // Registros en formato JSON estructurado
  ),
  defaultMeta: { service: 'LocalidadController' }, // Información adicional del servicio
  transports: [
    new transports.File({ filename: 'logs/localidad-controller-error.log', level: 'error' }),
    new transports.Console() // Opcional: muestra también en consola para desarrollo
  ],
});
