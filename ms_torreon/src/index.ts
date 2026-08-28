import path from "path";
import dotenv from "dotenv";

const envPath = path.resolve(__dirname, "..", ".env.torreon");
const envResult = dotenv.config({ path: envPath, override: true });

if (envResult.error) {
  console.error("Error cargando .env.torreon desde:", envPath, envResult.error);
}

// Cargar el servidor después de dotenv evita construir Prisma antes de que
// TORREON_DATABASE_URL esté disponible.
const { iniciarServidorTorreon } = require("./Servidor");
iniciarServidorTorreon();
