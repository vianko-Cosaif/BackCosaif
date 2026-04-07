import fs from 'fs';
import path from 'path';
import winston from 'winston';

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

export const loginProbeLogger = winston.createLogger({
  level: 'info',
  defaultMeta: { scope: 'login-probe' },
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'login-access.log'),
      maxsize: 5 * 1024 * 1024,
    }),
    new winston.transports.Console(),
  ],
  exitOnError: false,
});
