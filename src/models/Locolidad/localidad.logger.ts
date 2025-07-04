// localidad.logger.ts
import { createLogger, transports, format } from 'winston';

export const localidadLogger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.prettyPrint()
  ),
  transports: [
    new transports.Console(),
  ],
});
