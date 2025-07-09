"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("../../middlewares/passport"));
const IncidenteController_1 = require("./IncidenteController");
const router = (0, express_1.Router)();
// Autenticación JWT en todas las rutas
router.use(passport_1.default.authenticate('jwt', { session: false }));
// Rutas de consulta
router.get('/paginado', IncidenteController_1.IncidenteController.obtenerIncidentesPaginados);
router.get('/localidad/:localidadId', IncidenteController_1.IncidenteController.obtenerPorLocalidad);
router.get('/empresa/:empresaId', IncidenteController_1.IncidenteController.obtenerPorEmpresa);
router.get('/:id/imagenes', IncidenteController_1.IncidenteController.obtenerImagenes);
router.get('/imagen/:rutaImagen(*)', IncidenteController_1.IncidenteController.servirImagen);
router.get('/', IncidenteController_1.IncidenteController.obtenerIncidentes);
exports.default = router;
