/**
 * incidente.logger.ts
 *
 * Logger especializado para el modelo Incidente.
 *
 * Este modulo proporciona un logger configurado especificamente para registrar
 * eventos, errores y operaciones relacionadas con la gestion de incidentes.
 * 
 * Funcionalidades:
 * - Log de creacion y edicion de incidentes
 * - Registro de reorganizacion de rondas por incidentes
 * - Seguimiento de procesamiento de imagenes
 * - Monitoreo de timeouts y cierres automaticos
 * - Trazabilidad completa de operaciones de incidentes
 */

import winston from 'winston';
import path from 'path';

// Configuracion del formato de logs
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Logger especifico para el modelo Incidente
export const incidenteError = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'IncidenteModel',
    module: 'Movimientos/Incidente'
  },
  transports: [
    // Archivo para errores de incidentes
    new winston.transports.File({
      filename: path.join('logs', 'incidentes', 'incidente-error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Archivo para todos los logs de incidentes
    new winston.transports.File({
      filename: path.join('logs', 'incidentes', 'incidente-combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
    
    // Archivo especifico para reorganizacion de rondas
    new winston.transports.File({
      filename: path.join('logs', 'incidentes', 'reorganizacion-rondas.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        logFormat,
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const messageStr = typeof message === 'string' ? message : String(message);
          if (messageStr.includes('reorganiz') || messageStr.includes('ronda')) {
            return `${timestamp} [${level.toUpperCase()}]: ${messageStr} ${JSON.stringify(meta)}`;
          }
          return '';
        })
      )
    }),
    
    // Console para desarrollo
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const messageStr = typeof message === 'string' ? message : String(message);
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${service}] ${level}: ${messageStr} ${metaStr}`;
        })
      )
    })
  ],
  
  // Manejo de excepciones no capturadas
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join('logs', 'incidentes', 'incidente-exceptions.log')
    })
  ],
  
  // Manejo de rechazos de promesas no capturados
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join('logs', 'incidentes', 'incidente-rejections.log')
    })
  ]
});

// Crear directorios de logs si no existen
import fs from 'fs';
const logsDir = path.join('logs', 'incidentes');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Funcion helper para log de operaciones de incidentes
export const logIncidenteOperation = (
  operation: string, 
  incidenteId: number, 
  movimientoId: number, 
  additional?: any
) => {
  incidenteError.info(`Operacion de incidente: ${operation}`, {
    operation,
    incidenteId,
    movimientoId,
    timestamp: new Date().toISOString(),
    ...additional
  });
};