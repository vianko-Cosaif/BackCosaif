import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

export const lavadoTControllerLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(colorize(), timestamp(), logFormat),
  transports: [new winston.transports.Console()],
});
