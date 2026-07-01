import { Router } from "express";
import { movimientoRouter } from "../modules/movimientos/movimiento.routes";
import { incidenteRouter } from "../modules/incidentes/incidente.routes";
import { rondaRouter } from "../modules/rondas/ronda.routes";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, status: "healthy", servicio: "ms_torreon" });
});

apiRouter.get("/estructura", (_req, res) => {
  res.json({
    servicio: "ms_torreon",
    dominio: "movimientos naturales Torreon",
    tablas: [
      "movimiento_torreon_ferro",
      "ronda_torreon",
      "ronda_torreon_movimiento",
      "incidente_torreon_ferro",
      "movimiento_torreon_foto",
      "incidente_torreon_foto",
    ],
    reglaIncidentes: "Solo existen ABIERTO y RESUELTO. ABIERTO bloquea la via/seccion hasta resolverse.",
    reglaFotos: {
      movimiento: [
        "ANTES_MOVIMIENTO",
        "PROCESO_MOVIMIENTO",
        "FIN_MOVIMIENTO",
      ],
      incidente: "Fotos ordenadas por incidente. La API debe validar 4 evidencias requeridas.",
    },
    referenciasExternas: [
      "empresa_id",
      "localidad_id",
      "via_origen_id",
      "via_destino_id",
      "seccion_origen_id",
      "seccion_destino_id",
    ],
  });
});

apiRouter.use("/movimientos", movimientoRouter);
apiRouter.use("/incidentes", incidenteRouter);
apiRouter.use("/rondas", rondaRouter);
