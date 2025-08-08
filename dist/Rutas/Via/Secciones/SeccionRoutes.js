"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SeccionVIasController_1 = require("./SeccionVIasController");
const router = (0, express_1.Router)();
// Rutas para SeccionViaController
router.get('/secciones', SeccionVIasController_1.SeccionViaController.obtenerSecciones);
router.get('/secciones/via/:viaId', SeccionVIasController_1.SeccionViaController.obtenerSeccionesPorVia);
router.post('/secciones/via/:viaId', SeccionVIasController_1.SeccionViaController.crearSeccion);
router.put('/secciones/:id', SeccionVIasController_1.SeccionViaController.editarSeccion);
router.delete('/secciones/:id', SeccionVIasController_1.SeccionViaController.eliminarSeccion);
exports.default = router;
