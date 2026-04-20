import path from "path";
import dotenv from "dotenv";

// Carga variables del microservicio Torno
const envPath = path.resolve(__dirname, "..", ".env.torno");
const envResult = dotenv.config({ path: envPath, override: true });
if (envResult.error) {
  console.error("Error cargando .env.torno desde:", envPath, envResult.error);
}

const { iniciarServidorTorno } = require("./Servidor");

iniciarServidorTorno();
