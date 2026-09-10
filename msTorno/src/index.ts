import path from "path";
import dotenv from "dotenv";

// Carga variables del microservicio Torno
// PM2 ejecuta el build desde la raiz del backend. Resolver desde cwd evita
// buscar el archivo dentro de msTorno/dist despues de compilar.
const envPath = path.resolve(process.cwd(), "msTorno", ".env.torno");
const envResult = dotenv.config({ path: envPath, override: true });
if (envResult.error) {
  console.error("Error cargando .env.torno desde:", envPath, envResult.error);
}

const { iniciarServidorTorno } = require("./Servidor");
iniciarServidorTorno();
