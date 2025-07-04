"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localidadLogger = void 0;
// localidad.logger.ts
const winston_1 = require("winston");
exports.localidadLogger = (0, winston_1.createLogger)({
    level: 'info',
    format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.prettyPrint()),
    transports: [
        new winston_1.transports.Console(),
    ],
});
