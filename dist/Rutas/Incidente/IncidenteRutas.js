"use strict";
// src/routes/IncidenteRoutes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("../../middlewares/passport"));
const IncidenteController_1 = require("./IncidenteController");
const router = (0, express_1.Router)();
// Todas las rutas requieren JWT
router.use(passport_1.default.authenticate('jwt', { session: false }));
// ——— RUTAS DE CONSULTA ———
// Listar incidentes paginados y/o filtrados by estadox, empresa, localidad
// GET /incidentes?estado=&page=&pageSize=&empresaId=&localidadId=
router.get('/', IncidenteController_1.IncidenteController.listar);
// Obtener un incidente por su ID
// GET /incidentes/:id
router.get('/:id', IncidenteController_1.IncidenteController.obtenerPorId);
// Verificar periodo de verificación / bloqueo
// GET /incidentes/:id/verificacion
router.get('/:id/verificacion', IncidenteController_1.IncidenteController.verificarPeriodo);
// Servir imagen de incidente
// GET /incidentes/imagen/:ruta
router.get('/imagen/:ruta(*)', IncidenteController_1.IncidenteController.servirImagen);
// ——— RUTAS DE ESCRITURA ———
// Crear un nuevo incidente (hasta 4 imágenes)
// POST /incidentes
router.post('/', IncidenteController_1.uploadImagenes, IncidenteController_1.IncidenteController.crear);
// Editar un incidente existente (descripcion, estado, imágenes)
// PUT /incidentes/:id
router.put('/:id', IncidenteController_1.uploadImagenes, IncidenteController_1.IncidenteController.editar);
// Eliminar un incidente y sus imágenes
// DELETE /incidentes/:id
router.delete('/:id', IncidenteController_1.IncidenteController.eliminar);
// Cerrar manualmente un incidente (cambia estado a CERRADO)
// POST /incidentes/:id/cerrar
router.post('/:id/cerrar', IncidenteController_1.IncidenteController.cerrar);
exports.default = router;
