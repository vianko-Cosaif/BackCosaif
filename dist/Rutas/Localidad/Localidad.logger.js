"use strict";
/**
 * localidad.controller.logger.ts
 *
 * Logger especializado para registrar errores en el controlador de Localidad.
 *
 * Este logger utiliza Winston para mantener registros estructurados y consistentes
 * sobre los eventos y errores ocurridos en el controlador HTTP para Localidad.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.localidadControllerLogger = void 0;
const winston_1 = require("winston");
// Configuración del logger usando Winston.
exports.localidadControllerLogger = (0, winston_1.createLogger)({
    level: 'error', // Registra sólo errores y niveles superiores (error, criticos, etc.).
    format: winston_1.format.combine(winston_1.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Añadir timestamp
    winston_1.format.errors({ stack: true }), // Incluye pila de errores (stack trace)
    winston_1.format.json() // Registros en formato JSON estructurado
    ),
    defaultMeta: { service: 'LocalidadController' }, // Información adicional del servicio
    transports: [
        new winston_1.transports.File({ filename: 'logs/localidad-controller-error.log', level: 'error' }),
        new winston_1.transports.Console() // Opcional: muestra también en consola para desarrollo
    ],
});
