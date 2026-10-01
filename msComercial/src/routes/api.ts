import { Router } from "express";
import { clienteRouter } from "../modules/clientes/cliente.routes";
import { contratoRouter } from "../modules/contratos/contrato.routes";
import { planRouter } from "../modules/planes/plan.routes";
import { tarifaRouter } from "../modules/tarifas/tarifa.routes";
import { paqueteRouter } from "../modules/paquetes/paquete.routes";
import { cobranzaRouter } from "../modules/cobranza/cobranza.routes";

export const comercialApiRouter = Router();

comercialApiRouter.use("/clientes", clienteRouter);
comercialApiRouter.use("/contratos", contratoRouter);
comercialApiRouter.use("/tarifas", tarifaRouter);
comercialApiRouter.use("/planes", planRouter);
comercialApiRouter.use("/paquetes", paqueteRouter);
comercialApiRouter.use("/cobranza", cobranzaRouter);
