// src/index.ts

import 'dotenv/config';               // carga .env
import './config/firebase';           // inicializa Firebase 
import { iniciarServidor } from './Servidor/Servidor';

iniciarServidor();
