import { Router } from "express";
import { movimientoRouter } from "../modules/movimientos/movimiento.routes";
import { incidenteRouter } from "../modules/incidentes/incidente.routes";
import { rondaRouter } from "../modules/rondas/ronda.routes";
import { arrastreRouter } from "../modules/arrastres/arrastre.routes";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, status: "healthy", servicio: "ms_torreon" });
});

apiRouter.get("/estructura", (_req, res) => {
  res.json({
    servicio: "ms_torreon",
    dominio: "movimientos naturales y arrastres Torreon",
    tablas: [
      "movimiento_torreon_ferro",
      "ronda_torreon",
      "ronda_torreon_movimiento",
      "incidente_torreon_ferro",
      "movimiento_torreon_foto",
      "incidente_torreon_foto",
      "arrastre_torreon",
      "arrastre_torreon_vagon",
      "incidente_arrastre_torreon",
      "incidente_arrastre_foto",
    ],
    reglaIncidentes: "Solo existen ABIERTO y RESUELTO. ABIERTO bloquea la via/seccion hasta resolverse.",
    reglaArrastre: {
      capacidad: "Maximo 8 vacios equivalentes; VACIO=1, LLENO=2. Ejemplos validos: 8 vacios, 4 llenos, 2 llenos y 4 vacios, 3 llenos y 2 vacios.",
      zonas: "Cada vagon define su zona de arrastre con viaId y seccionId. Un arrastre puede tener vagones en una o muchas vias/secciones.",
      fotos: "Arrastre no toma fotos de inicio/proceso/final; solo incidente de arrastre con 4 capturas.",
    },
    reglaFotos: {
      movimiento: [
        "ANTES_MOVIMIENTO maximo 2",
        "PROCESO_MOVIMIENTO maximo 2",
        "FIN_MOVIMIENTO maximo 2",
      ],
      incidente: "Fotos ordenadas por incidente. La API valida 4 evidencias requeridas.",
      storage: "Capturas base64/dataUrl se optimizan y guardan en uploads/incidentes con nombre torreon_*; la DB guarda la ruta relativa en url/storageKey.",
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
apiRouter.use("/arrastres", arrastreRouter);
