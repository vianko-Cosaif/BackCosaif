"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.viaError = void 0;
// via.logger.ts
const winston_1 = __importDefault(require("winston"));
exports.viaError = winston_1.default.createLogger({
    level: 'error',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console(),
        // Descomenta la siguiente línea para guardar los logs en un archivo
        // new winston.transports.File({ filename: 'via-error.log' })
    ],
});
