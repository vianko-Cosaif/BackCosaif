"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// secciones.routes.ts
const express_1 = require("express");
const SeccionVIasController_1 = require("./SeccionVIasController"); // <- fijate el nombre/case
const router = (0, express_1.Router)();
// LISTADOS
// Opción con query param (modelo NO expone "obtener todas", así que pedimos viaId)
router.get('/secciones', SeccionVIasController_1.SeccionViaController.obtenerSecciones);
// Opción REST explícita por vía
router.get('/secciones/via/:viaId', SeccionVIasController_1.SeccionViaController.obtenerSeccionesPorVia);
// CRUD (si en tu modelo aún no existen, el controller responde 501 Not Implemented)
router.post('/secciones/via/:viaId', SeccionVIasController_1.SeccionViaController.crearSeccion);
router.put('/secciones/:id', SeccionVIasController_1.SeccionViaController.editarSeccion);
router.delete('/secciones/:id', SeccionVIasController_1.SeccionViaController.eliminarSeccion);
// OCUPACIÓN (alineado al modelo actual)
router.post('/secciones/via/:viaId/asignar', SeccionVIasController_1.SeccionViaController.asignarMovimiento);
router.post('/secciones/via/:viaId/liberar', SeccionVIasController_1.SeccionViaController.liberarSeccion);
router.post('/secciones/via/:viaId/liberar-todas', SeccionVIasController_1.SeccionViaController.liberarTodasPorMovimiento);
exports.default = router;
