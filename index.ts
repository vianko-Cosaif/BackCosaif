// src/index.ts

import 'dotenv/config';               // carga .env
import './src/config/firebase';           // inicializa Firebase 
import { iniciarServidor } from './src/Servidor/Servidor';

iniciarServidor();
