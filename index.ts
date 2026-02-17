// src/index.ts

import 'dotenv/config';               // carga .env
import './src/config/firebase';           // inicializa Firebase 
import './src/Cron/Tokens';       
import { iniciarServidor } from './src/Servidor/Servidor';

iniciarServidor();
