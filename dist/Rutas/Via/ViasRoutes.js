"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("../../middlewares/passport"));
const viaController_1 = require("./viaController");
const router = (0, express_1.Router)();
// Middleware de autenticación JWT para las rutas siguientes
router.use(passport_1.default.authenticate('jwt', { session: false }));
// Ruta pública: obtener todas las vías
router.get('/', viaController_1.ViaController.obtenerVias);
// Crear una nueva vía
router.post('/', viaController_1.ViaController.crearVia);
// Ruta para obtener vías filtradas por localidad (ej: GET /vias/localidad/1)
router.get('/localidad/:localidadId', viaController_1.ViaController.obtenerViasPorLocalidad);
// Editar una vía (se espera el id en la URL)
router.put('/:id', viaController_1.ViaController.editarVia);
// Eliminar una vía por su ID
router.delete('/:id', viaController_1.ViaController.eliminarVia);
exports.default = router;
