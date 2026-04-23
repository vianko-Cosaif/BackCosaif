import path from "path";
import dotenv from "dotenv";
import { iniciarServidorTorno } from "./Servidor";

// Carga variables del microservicio Torno
dotenv.config({ path: path.resolve(__dirname, "..", ".env.torno") });

iniciarServidorTorno();
