// winston-daily-rotate-file.d.ts
declare module 'winston-daily-rotate-file' {
    import Transport from 'winston-transport';
    import { TransportStreamOptions } from 'winston';
  
    export interface DailyRotateFileTransportOptions extends TransportStreamOptions {
      filename: string;
      datePattern?: string;
      zippedArchive?: boolean;
      maxSize?: string | number;
      maxFiles?: string | number;
      auditFile?: string;
      dirname?: string;
      extension?: string;
      createSymlink?: boolean;
      symlinkName?: string;
      /** Nivel de log. Se agrega para permitir configurarlo en la instancia de DailyRotateFile. */
      level?: string;
      format?: string; // Formato de log, puede ser un objeto o función
    }
  
    export default class DailyRotateFile extends Transport {
      constructor(options: DailyRotateFileTransportOptions);
    }
  }
  