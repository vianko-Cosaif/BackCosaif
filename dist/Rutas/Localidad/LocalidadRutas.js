"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("../../middlewares/passport"));
const LocalidadController_1 = require("./LocalidadController");
const router = (0, express_1.Router)();
// Ruta pública para crear una nueva localidad
router.post('/', LocalidadController_1.LocalidadController.crearLocalidad);
// Middleware de autenticación JWT aplicado a todas las rutas siguientes
router.use(passport_1.default.authenticate('jwt', { session: false }));
// Obtener todas las localidades (ruta protegida)
router.get('/', LocalidadController_1.LocalidadController.obtenerLocalidades);
// Buscar localidad por nombre (ruta protegida, se espera el parámetro de consulta "nombre")
router.get('/buscar', LocalidadController_1.LocalidadController.buscarLocalidadPorNombre);
// Obtener una localidad por ID (ruta protegida)
router.get('/:id', LocalidadController_1.LocalidadController.obtenerLocalidadPorId);
exports.default = router;
