"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tornoTControllerLogger = void 0;
// src/controllers/Servicios/tornoT.controller.logger.ts
const winston_1 = __importDefault(require("winston"));
const { combine, timestamp, printf, colorize } = winston_1.default.format;
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0)
        msg += ` ${JSON.stringify(metadata)}`;
    return msg;
});
exports.tornoTControllerLogger = winston_1.default.createLogger({
    level: 'info',
    format: combine(colorize(), timestamp(), logFormat),
    transports: [new winston_1.default.transports.Console()],
});
