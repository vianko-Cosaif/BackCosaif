import { Router } from "express";
import { authenticateAccess } from "../../auth/authenticateAccess";
import { CatalogosOperativosController } from "./CatalogosOperativosController";

const router = Router();

router.use(authenticateAccess);

router.get("/resumen", CatalogosOperativosController.resumen);
router.post("/localidades-operativas", CatalogosOperativosController.guardarLocalidadOperativa);

export default router;
