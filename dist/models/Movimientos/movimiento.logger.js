"use strict";
// movimiento.logger.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.movimientoError = void 0;
const winston_1 = __importDefault(require("winston"));
const { combine, timestamp, printf, colorize } = winston_1.default.format;
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});
exports.movimientoError = winston_1.default.createLogger({
    level: 'error',
    format: combine(colorize(), timestamp(), logFormat),
    transports: [
        new winston_1.default.transports.Console()
    ],
});
