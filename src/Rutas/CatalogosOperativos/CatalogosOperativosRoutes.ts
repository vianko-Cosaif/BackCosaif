import { Router } from "express";
import { authenticateAccess } from "../../auth/authenticateAccess";
import { CatalogosOperativosController } from "./CatalogosOperativosController";
import { PERMISSIONS } from "../../auth/accessPolicy";
import { requirePermission } from "../../auth/authorize";

const router = Router();

router.use(authenticateAccess);
router.use(requirePermission(PERMISSIONS.CATALOG_CONFIGURATION_MANAGE));

router.get("/resumen", CatalogosOperativosController.resumen);
router.post("/localidades-operativas", CatalogosOperativosController.guardarLocalidadOperativa);

export default router;
