import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

/**
 * Define el formato de los logs: incluye fecha/hora (timestamp), nivel y mensaje.
 * Si hay metadata adicional, se convierte a JSON y se agrega al mensaje.
 */
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

/**
 * movimientoControllerLogger
 *
 * Logger dedicado al controlador de Movimientos.
 * Se configura con nivel "info" y con transportes que muestran los logs en la consola.
 */
export const movimientoControllerLogger = winston.createLogger({
  level: 'info',
  format: combine(
    colorize(),
    timestamp(),
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
  ],
});
