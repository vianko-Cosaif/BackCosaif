"use strict";
// src/Rutas/Servicios/LavadoRuta.ts
/**
 * Rutas HTTP para LavadoT (todas con JWT).
 *
 * Montaje sugerido en server:
 *   app.use('/lavado', router)
 *
 * Endpoints:
 *  - GET    /lavado                      → listar paginado (filtros: ?status=EN_SERVICIO|FINALIZADO|DETENIDO|PENDIENTES&empresaId&localidadId&movimientoId&page&pageSize)
 *  - GET    /lavado/en-servicio          → listar solo EN_SERVICIO (con filtros opcionales)
 *  - GET    /lavado/siguientes           → “siguientes para iniciar” (?empresaId&localidadId&limit=2)
 *  - GET    /lavado/no-en-proceso        → compat: no EN_SERVICIO ni FINALIZADO
 *  - POST   /lavado                      → crear
 *  - POST   /lavado/:id/iniciar          → iniciar (opcional { usuarioId, inicio })
 *  - POST   /lavado/:id/finalizar        → finalizar (opcional { fin })
 *  - PUT    /lavado/:id                  → editar
 *  - GET    /lavado/:id                  → obtener por id
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("../../middlewares/passport"));
const LavadoTController_1 = require("./LavadoTController");
const router = (0, express_1.Router)();
// 🔐 JWT para todas
router.use(passport_1.default.authenticate('jwt', { session: false }));
// Listado principal (paginado + filtros)
router.get('/', LavadoTController_1.LavadoTController.listar);
// Solo EN_SERVICIO
router.get('/en-servicio', LavadoTController_1.LavadoTController.enServicio);
// Siguientes para iniciar (por defecto 2)
router.get('/siguientes', LavadoTController_1.LavadoTController.siguientes);
// Compat: no en proceso (ni finalizados)
router.get('/no-en-proceso', LavadoTController_1.LavadoTController.listarNoEnProceso);
// Crear
router.post('/', LavadoTController_1.LavadoTController.crear);
// Acciones rápidas
router.post('/:id/iniciar', LavadoTController_1.LavadoTController.iniciar);
router.post('/:id/finalizar', LavadoTController_1.LavadoTController.finalizar);
// Editar
router.put('/:id', LavadoTController_1.LavadoTController.editar);
// Obtener por id (dejar al final para no colisionar con rutas anteriores)
router.get('/:id', LavadoTController_1.LavadoTController.obtener);
exports.default = router;
