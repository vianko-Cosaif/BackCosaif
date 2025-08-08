"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seccionError = void 0;
const winston_1 = require("winston");
// Logger específico para operaciones de SeccionVia
exports.seccionError = (0, winston_1.createLogger)({
    level: 'error',
    format: winston_1.format.combine(winston_1.format.label({ label: 'SeccionVia' }), winston_1.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.format.errors({ stack: true }), // incluye stack trace en json
    winston_1.format.json()),
    transports: [
        new winston_1.transports.Console(),
        // Puedes descomentar la siguiente línea para habilitar logging en archivo
        // new transports.File({ filename: 'logs/seccion-error.log', level: 'error' })
    ],
});
