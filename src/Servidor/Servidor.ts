/**
 * Punto de arranque del servidor HTTP (API REST).
 *
 * Responsabilidades de este módulo:
 * 1. Cargar variables de entorno (.env).
 * 2. Registrar middlewares globales (JSON, CORS, Passport-JWT).
 * 3. Montar las rutas de cada módulo de negocio.
 * 4. Iniciar el servidor en el puerto indicado.
 * 5. IMPORTANTE: inicializar tareas en background (cron) al inicio del proceso.
 *
 * Nota sobre el cron:
 *  - El import `../Cron/Tokens` no exporta nada, solo registra un job recurrente.
 *  - Ese job se ejecuta cada 2 horas y revoca/borrar tokens y FCM en BD.
 *  - Se hace el import aquí para que se active al levantar el backend,
 *    no cuando alguien consuma una ruta.
 */

import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import passport from "../middlewares/passport";

// --------------- Cron de limpieza/revocación ---------------
// Este import evalúa el archivo y registra el cron con node-cron.
// No quitar: si se elimina, el job deja de ejecutarse.
import "../Cron/Tokens";

// --------------- Rutas de dominio ---------------
import localidadRoutes from "../Rutas/Localidad/LocalidadRutas";
import usuarioRoutes from "../Rutas/Usuario/UsuarioRoutes";
import empresaRoutes from "../Rutas/Empresa/EmpresaRoutes";
import ViaRoutes from "../Rutas/Via/ViasRoutes";
import MovimientoRoutes from "../Rutas/Movimientos/movimientosRoutes";
import rondaRoutes from "../Rutas/Movimientos/Ronda/RondaRoutes";
import IncidenteRoutes from "../Rutas/Incidente/IncidenteRutas";
import FmcRutas from "../FMC/fmcRoutes";
import actualizacionRoutes from "../Rutas/Actualizacion/ActualizacionRoutes";
import Secciones from "../Rutas/Via/Secciones/SeccionRoutes";
import Reporte from "../reporteria/rutas/rutasPdf";
// Carga variables de entorno
dotenv.config();

// Puerto de escucha
const PORT = process.env.PORT;

/**
 * Inicializa y arranca el servidor Express.
 * Debe llamarse solo una vez desde el entrypoint (p. ej. src/index.ts).
 */
export function iniciarServidor(): void {
  try {
    const app: Express = express();

    // ---------------- Middlewares globales ----------------

    // Parseo de JSON para todo el API
    app.use(express.json());

    // CORS abierto (ajustar origin en producción)
    app.use(cors());

    // Inicializa estrategia JWT de Passport
    app.use(passport.initialize());

    // ---------------- Rutas base ----------------

    // Healthcheck / prueba rápida
    app.get("/", (_req: Request, res: Response) => {
      res.json({ ok: true, mensaje: "Hola mundo" });
    });

    // Módulos de negocio
    app.use("/usuarios", usuarioRoutes);
    app.use("/empresas", empresaRoutes);
    app.use("/localidades", localidadRoutes);
    app.use("/vias", ViaRoutes);
    app.use("/movimientos", MovimientoRoutes);
    app.use("/rondas", rondaRoutes);
    app.use("/fcm", FmcRutas);
    app.use("/incidentes", IncidenteRoutes);
    app.use("/actualizaciones", actualizacionRoutes);
    app.use("/secciones", Secciones);
    app.use("/reporteria", Reporte);

    // ---------------- Arranque del servidor ----------------
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
      console.log(`Cron de tokens y FCM cargado (src/Cron/Tokens.ts)`);
    });
  } catch (error) {
    // Error crítico al iniciar el server: se termina el proceso
    console.error("Error al iniciar el servidor:", error);
    process.exit(1);
  }
}
