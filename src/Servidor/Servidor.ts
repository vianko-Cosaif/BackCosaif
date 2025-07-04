import express, { Express } from "express";
import cors from "cors";
import dotenv from "dotenv";
import passport from "../middlewares/passport";
import localidadRoutes from "../Rutas/Localidad/LocalidadRutas";
import usuarioRoutes from "../Rutas/Usuario/UsuarioRoutes";
import empresaRoutes from "../Rutas/Empresa/EmpresaRoutes";
import ViaRoutes from "../Rutas/Via/ViasRoutes";
import MovimientoRoutes from "../Rutas/Movimientos/movimientosRoutes";
import rondaRoutes from "../Rutas/Movimientos/Ronda/RondaRoutes";
import IncidenteRoutes from "../Rutas/Incidente/IncidenteRutas";
import FmcRutas from  "../FMC/fmcRoutes"
// Carga variables del archivo .env
dotenv.config();

// Puerto de escucha, con fallback a 4500
const PORT = process.env.PORT || 4500;

/**
 * Inicializa y arranca el servidor Express.
 *
 * @function iniciarServidor
 * @remarks
 * Esta función:
 *  - Configura middleware global de JSON y CORS
 *  - Registra rutas agrupadas por entidad
 *  - Aplica autenticación JWT con Passport
 *  - Lanza el servidor en el puerto definido
 *
 * En caso de error crítico, finaliza el proceso con `process.exit(1)`.
 */
export function iniciarServidor(): void {
  try {
    const app: Express = express();

    // Middleware global para parseo de JSON en requests
    app.use(express.json());

    // Middleware para habilitar CORS
    app.use(cors());

    // Autenticación JWT
    app.use(passport.initialize());

    // Registro de rutas por módulo
    app.use("/usuarios", usuarioRoutes);
    app.use("/empresas", empresaRoutes);
    app.use("/localidades", localidadRoutes);
    app.use("/vias", ViaRoutes);
    app.use("/movimientos", MovimientoRoutes);
    app.use("/rondas", rondaRoutes);
    app.use("/fcm",FmcRutas);
    app.use("/incidentes", IncidenteRoutes);

    // Inicia el servidor Express
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });
  } catch (error) {
    process.exit(1);
  }
}

