/**
 * incidente.controller.logger.ts
 *
 * Logger especializado para el controlador IncidenteController.
 *
 * Este modulo proporciona un logger configurado especificamente para registrar
 * eventos, errores y operaciones HTTP relacionadas con el controlador de incidentes.
 * 
 * Funcionalidades:
 * - Log de requests HTTP y responses
 * - Registro de operaciones de upload de imagenes
 * - Seguimiento de validaciones y errores de entrada
 * - Monitoreo de operaciones de cierre de incidentes
 * - Trazabilidad de acceso a imagenes y archivos
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

// Logger especifico para el controlador de Incidentes
export const incidenteControllerLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'IncidenteController',
    module: 'Controllers/Incidente',
    layer: 'HTTP'
  },
  transports: [
    // Archivo para errores del controlador
    new winston.transports.File({
      filename: path.join('logs', 'incidentes', 'controller-error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Archivo para todos los logs del controlador
    new winston.transports.File({
      filename: path.join('logs', 'incidentes', 'controller-combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
    
    // Archivo especifico para operaciones de imagenes
    new winston.transports.File({
      filename: path.join('logs', 'incidentes', 'imagenes-operations.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        logFormat,
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const messageStr = typeof message === 'string' ? message : String(message);
          if (messageStr.includes('imagen') || messageStr.includes('upload') || messageStr.includes('archivo')) {
            return `${timestamp} [${level.toUpperCase()}]: ${messageStr} ${JSON.stringify(meta)}`;
          }
          return '';
        })
      )
    }),
    
    // Archivo para operaciones de cierre/timeout
    new winston.transports.File({
      filename: path.join('logs', 'incidentes', 'cierre-operations.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        logFormat,
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const messageStr = typeof message === 'string' ? message : String(message);
          if (messageStr.includes('cerrar') || messageStr.includes('timeout') || messageStr.includes('vencido')) {
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
      filename: path.join('logs', 'incidentes', 'controller-exceptions.log')
    })
  ],
  
  // Manejo de rechazos de promesas no capturados
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join('logs', 'incidentes', 'controller-rejections.log')
    })
  ]
});

// Funcion helper para log de requests HTTP
export const logHttpRequest = (
  method: string,
  endpoint: string,
  statusCode: number,
  responseTime?: number,
  additional?: any
) => {
  incidenteControllerLogger.info(`HTTP ${method} ${endpoint}`, {
    method,
    endpoint,
    statusCode,
    responseTime,
    timestamp: new Date().toISOString(),
    ...additional
  });
};

// Funcion helper para log de operaciones de upload
export const logUploadOperation = (
  operation: string,
  fileCount: number,
  totalSize: number,
  incidenteId?: number,
  additional?: any
) => {
  incidenteControllerLogger.info(`Upload: ${operation}`, {
    operation,
    fileCount,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    incidenteId,
    timestamp: new Date().toISOString(),
    ...additional
  });
};