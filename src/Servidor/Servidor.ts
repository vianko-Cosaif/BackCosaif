import exportRoutes from '../reporteria/exports/exportRoutes';
import { verifyOperationalSchema } from '../jobs/schemaCheck';
import { startOperationalRetention } from '../jobs/retention';
import { startTornoRecovery } from '../jobs/tornoRecovery';
import { startRoundMaintenance } from '../jobs/roundMaintenance';
import { startServiceOutbox } from '../jobs/serviceOutbox';
import { startJobWorker } from '../jobs/durableJobs';
import { IncidenteModel } from '../models/Incidente/IncidenteModel';
import { authenticateAccess } from '../auth/authenticateAccess';
import { concurrencyLimit } from '../auth/requestLimits';
/**
 * Punto de arranque del servidor HTTP (API REST).
 *
 * Responsabilidades de este módulo:
 * 1. Cargar variables de entorno (.env).
 * 2. Registrar middlewares globales (JSON, CORS, Passport-JWT).
 * 3. Montar las rutas de cada módulo de negocio.
 * 4. Iniciar el servidor en el puerto indicado.
 */

import express, { Express, NextFunction, Request, Response } from "express";
import { createServer } from "http";
import dotenv from "dotenv";
import passport from "../middlewares/passport";
import { traceLoginTraffic } from "../auth/loginProbe";
import { securityHeaders } from "../auth/securityHeaders";
import { corsPolicy } from "../auth/corsPolicy";

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
import Excel from "../reporteria/rutas/rutasExcel";
import bannerRoutes from "../Rutas/Banner/BannerRoutes";
import tornoMsRoutes from "../Rutas/TornoMs/TornoMsRoutes";
import torreonMsRoutes from "../Rutas/TorreonMs/TorreonMsRoutes";
import realtimeRoutes from "../Rutas/Realtime/RealtimeRoutes";
import catalogosOperativosRoutes from "../Rutas/CatalogosOperativos/CatalogosOperativosRoutes";
import offlineRoutes from "../Rutas/Offline/OfflineRoutes";
import comercialMsRoutes from "../Rutas/ComercialMs/ComercialMsRoutes";
import { bindRealtimeWebSocketServer } from "../realtime/realtimeHub";
import { createGuardianAgent } from "../guardian/guardianAgent";
import { prisma } from "../lib/prisma";
import { initializeSecurityAudit, securityAuditMiddleware } from "../security/securityAudit";
// Carga variables de entorno
dotenv.config();

// Puerto de escucha
const PORT = process.env.PORT;
const HOST = process.env.HOST ;

function loopbackMetricsOnly(req: Request, res: Response, next: NextFunction) {
  const address = req.socket.remoteAddress || "";
  if (address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1") {
    return next();
  }
  return res.status(404).end();
}

/**
 * Inicializa y arranca el servidor Express.
 * Debe llamarse solo una vez desde el entrypoint (p. ej. src/index.ts).
 */
export async function iniciarServidor(): Promise<void> {
  try {
    const app: Express = express();
    app.disable('x-powered-by');
    const guardianAgent = createGuardianAgent({
      service: "cosaif-api",
      databaseCheck: async () => {
        await prisma.$queryRaw`SELECT 1`;
        return true;
      },
      movementsToday: async () => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return prisma.movimiento.count({ where: { createdAt: { gte: start } } });
      },
    });
    app.use(guardianAgent.middleware);


    // ---------------- Middlewares globales ----------------
    app.use(securityHeaders);
    app.use(traceLoginTraffic);

    // CORS gradual: compat conserva clientes actuales; enforce usa lista explícita.
    app.use(corsPolicy);

    // Parseo de JSON para todo el API
    app.use(passport.initialize());
    app.use((req, res, next) => {
      if ((req.method === 'GET' && ['/', '/metrics'].includes(req.path)) || (req.method === 'POST' && req.path === '/usuarios/login')) return next();
      return authenticateAccess(req, res, next);
    });
    const largeBody = express.json({ limit: '50mb' });
    const normalBody = express.json({ limit: '1mb' });
    const imageConcurrency = concurrencyLimit(2);
    app.use((req, res, next) => {
      if (/^\/(incidentes|torno|torreon)(\/|$)/.test(req.path) && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        return imageConcurrency(req, res, error => error ? next(error) : largeBody(req, res, next));
      }
      return normalBody(req, res, next);
    });

    app.get("/metrics", loopbackMetricsOnly, guardianAgent.metrics);

    app.use(securityAuditMiddleware);

    // ---------------- Rutas base ----------------

    // Healthcheck / prueba rápida
    app.get("/", (_req: Request, res: Response) => {
      res.json({ ok: true, mensaje: "Hola mundo" });
    });

    app.use("/reporteria", exportRoutes);

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
    app.use("/reporterias", Excel);
    app.use("/banner", bannerRoutes);
    app.use("/torno", tornoMsRoutes);
    app.use("/torreon", torreonMsRoutes);
    app.use("/realtime", realtimeRoutes);
    app.use("/catalogos-operativos", catalogosOperativosRoutes);
    app.use("/offline", offlineRoutes);
    app.use("/comercial", comercialMsRoutes);

    // ---------------- Arranque del servidor ----------------
    const server = createServer(app);
    server.requestTimeout = 60_000;
    server.headersTimeout = 15_000;
    bindRealtimeWebSocketServer(server);

    await initializeSecurityAudit();
    await verifyOperationalSchema();
    server.listen(Number(PORT), HOST, () => {
      IncidenteModel.ensureIncidentScheduler();
      startRoundMaintenance();
      startTornoRecovery();
      startJobWorker();
      startServiceOutbox();
      startOperationalRetention();
      console.log(`Servidor corriendo en ${HOST}:${PORT}`);
      console.log('Autenticacion por sesion cargada con renovacion por rol');
      guardianAgent.start();
    });
  } catch (error) {
    // Error crítico al iniciar el server: se termina el proceso
    console.error("Error al iniciar el servidor:", error);
    process.exit(1);
  }
}
