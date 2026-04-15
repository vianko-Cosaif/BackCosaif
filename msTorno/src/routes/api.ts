import { Router } from "express";

import { ruedaSolicitudRouter } from "../modules/ruedaSolicitud/ruedaSolicitud.routes";
import { ruedasFinalRouter } from "../modules/ruedasFinal/ruedasFinal.routes";
import { tornoGRouter } from "../modules/tornoG/tornoG.routes";
import { tornoRuedaTrabajoRouter } from "../modules/tornoRuedaTrabajo/tornoRuedaTrabajo.routes";
import { rondaServicioRouter } from "../modules/rondaServicio/rondaServicio.routes";
import { incidenteTornoRouter } from "../modules/incidenteTorno/incidenteTorno.routes";
import { incidenteTornoHijoRouter } from "../modules/incidenteTornoHijo/incidenteTornoHijo.routes";
import { navaRouter } from "../modules/nava/nava.routes";
import { cambioRouter } from "../modules/cambio/cambio.routes";

export const apiRouter = Router();

apiRouter.use("/rueda-solicitudes", ruedaSolicitudRouter);
apiRouter.use("/ruedas-finales", ruedasFinalRouter);
apiRouter.use("/rondas-servicio", rondaServicioRouter);
apiRouter.use("/torno-g", tornoGRouter);
apiRouter.use("/torno-ruedas", tornoRuedaTrabajoRouter);
apiRouter.use("/incidentes", incidenteTornoRouter);
apiRouter.use("/incidentes-hijos", incidenteTornoHijoRouter);
apiRouter.use("/navajas", navaRouter);
apiRouter.use("/cambios-navaja", cambioRouter);
