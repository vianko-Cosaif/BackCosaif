import path from "path";
import dotenv from "dotenv";

// PM2 ejecuta el build desde la raiz del backend. Resolver desde cwd evita
// buscar el archivo dentro de ms_torreon/dist despues de compilar.
const envPath = path.resolve(process.cwd(), "ms_torreon", ".env.torreon");
const envResult = dotenv.config({ path: envPath, override: true });

if (envResult.error) {
  console.error("Error cargando .env.torreon desde:", envPath, envResult.error);
}

// Cargar el servidor después de dotenv evita construir Prisma antes de que
// TORREON_DATABASE_URL esté disponible.
const { iniciarServidorTorreon } = require("./Servidor");
iniciarServidorTorreon();
