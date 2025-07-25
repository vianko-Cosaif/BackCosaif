// src/index.ts

import 'dotenv/config';               // carga .env
import './config/firebase';           // inicializa Firebase (si lo usas)
import './Cron/cleanupTokens';        // ¡agenda el job de limpieza!
import { iniciarServidor } from './Servidor/Servidor';

iniciarServidor();
