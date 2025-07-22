"use strict";
/**
 * ActualizacionRoutes.ts
 *
 * Archivo de definición de rutas HTTP para la entidad Actualizacion.
 *
 * Este módulo define los endpoints REST disponibles para operaciones sobre actualizaciones.
 * Todas las rutas están protegidas mediante autenticación JWT utilizando Passport.
 *
 * Middleware aplicado:
 * - passport.authenticate('jwt', { session: false }):
 *   Requiere un token JWT válido para acceder a las rutas.
 *
 * Controlador asociado:
 * - ActualizacionController: contiene la lógica de negocio para cada endpoint.
 *
 * Rutas definidas:
 * - GET    /               → Listar todas las actualizaciones
 * - GET    /ultima         → Obtener la última actualización
 * - POST   /               → Crear una nueva actualización
 * - PUT    /:id            → Actualizar una actualización existente
 *
 * Este módulo debe ser montado por el router principal de la aplicación. Ejemplo:
 * app.use('/actualizaciones', actualizacionRoutes);
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("../../middlewares/passport"));
const ActualizacionController_1 = require("./ActualizacionController");
const router = (0, express_1.Router)();
// Obtener la última actualización
router.get('/ultima', ActualizacionController_1.ActualizacionController.obtenerUltimaActualizacion);
// Protege todas las rutas con JWT
router.use(passport_1.default.authenticate('jwt', { session: false }));
// Obtener todas las actualizaciones
router.get('/', ActualizacionController_1.ActualizacionController.obtenerActualizaciones);
// Crear nueva actualización
router.post('/', ActualizacionController_1.ActualizacionController.crearActualizacion);
// Actualizar una actualización existente por ID
router.put('/:id', ActualizacionController_1.ActualizacionController.actualizarActualizacion);
exports.default = router;
