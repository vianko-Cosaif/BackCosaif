"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const IncidenteController_1 = require("./IncidenteController");
const passport_1 = __importDefault(require("../../middlewares/passport"));
const router = (0, express_1.Router)();
// Middleware de autenticación aplicado a todas las rutas
router.use(passport_1.default.authenticate('jwt', { session: false }));
// === RUTAS DE CONSULTA PAGINADAS (NUEVAS - DEBEN IR ANTES) ===
// Ruta para obtener incidentes paginados (DEBE IR ANTES que /:id)
router.get('/paginado', IncidenteController_1.IncidenteController.obtenerIncidentesPaginados);
// Ruta para obtener incidentes por localidad paginados
router.get('/localidad/:localidadId', IncidenteController_1.IncidenteController.obtenerIncidentesPorLocalidad);
// Ruta para obtener incidentes por empresa y localidad paginados
router.get('/empresa/:empresaId/localidad/:localidadId', IncidenteController_1.IncidenteController.obtenerIncidentesPorEmpresaYLocalidad);
// Ruta para obtener incidentes por empresa paginados
router.get('/empresa/:empresaId', IncidenteController_1.IncidenteController.obtenerIncidentesPorEmpresa);
// === RUTAS DE CONSULTA EXISTENTES ===
// Ruta para obtener estadísticas (DEBE IR ANTES que /:id)
router.get('/estadisticas', IncidenteController_1.IncidenteController.obtenerEstadisticas);
// Ruta para obtener incidentes de un movimiento específico
router.get('/movimiento/:movimientoId', IncidenteController_1.IncidenteController.obtenerIncidentesPorMovimiento);
// Ruta para verificar período de verificación (DEBE IR ANTES que /:id)
router.get('/:id/verificacion', IncidenteController_1.IncidenteController.verificarPeriodoVerificacion);
// Ruta para servir imágenes
router.get('/imagen/:rutaImagen(*)', IncidenteController_1.IncidenteController.servirImagen);
// Ruta para obtener incidente por ID (DEBE IR AL FINAL de los GETs)
router.get('/:id', IncidenteController_1.IncidenteController.obtenerIncidentePorId);
// Ruta para obtener todos los incidentes (con filtros opcionales)
router.get('/', IncidenteController_1.IncidenteController.obtenerIncidentes);
// === RUTAS DE MODIFICACIÓN ===
// Ruta para crear un nuevo incidente
router.post('/', IncidenteController_1.uploadImagenes, IncidenteController_1.IncidenteController.crearIncidente);
// Ruta para cerrar un incidente manualmente
router.post('/:id/cerrar', IncidenteController_1.IncidenteController.cerrarIncidenteGenerico);
// Ruta para editar un incidente
router.put('/:id', IncidenteController_1.uploadImagenes, IncidenteController_1.IncidenteController.editarIncidente);
// Ruta para eliminar un incidente
router.delete('/:id', IncidenteController_1.IncidenteController.eliminarIncidente);
exports.default = router;
