"use strict";
// src/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config"); // carga .env
require("./config/firebase"); // inicializa Firebase (si lo usas)
require("./Cron/cleanupTokens"); // ¡agenda el job de limpieza!
const Servidor_1 = require("./Servidor/Servidor");
(0, Servidor_1.iniciarServidor)();
