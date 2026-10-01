import path from "path";
import dotenv from "dotenv";
import { iniciarServidorTorreon } from "./Servidor";

const envPath = path.resolve(__dirname, "..", ".env.torreon");
const envResult = dotenv.config({ path: envPath, override: true });

if (envResult.error) {
  console.error("Error cargando .env.torreon desde:", envPath, envResult.error);
}

iniciarServidorTorreon();
