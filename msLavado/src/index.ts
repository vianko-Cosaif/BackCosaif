import path from "path";
import dotenv from "dotenv";
import { iniciarServidorLavado } from "./Servidor";

const envPath = path.resolve(__dirname, "..", ".env.lavado");
const envResult = dotenv.config({ path: envPath, override: true });

if (envResult.error) {
  console.error("Error cargando .env.lavado desde:", envPath, envResult.error);
}

iniciarServidorLavado();
