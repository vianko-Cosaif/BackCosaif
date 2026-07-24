import { Router } from "express";
import { lavadoRouter } from "../modules/lavado/routes/lavado.routes";

export const apiRouter = Router();

apiRouter.use("/lavados", lavadoRouter);
