"use strict";
// src/Rutas/Servicios/TornoRuta.ts
/**
 * Rutas HTTP para TornoT (todas con JWT).
 *
 * Montaje sugerido en el servidor:
 *   app.use('/torno', router)
 *
 * Endpoints:
 *  - GET    /torno                      → listar paginado (?status=EN_SERVICIO|FINALIZADO|DETENIDO|PENDIENTES&empresaId&localidadId&movimientoId&page&pageSize)
 *  - GET    /torno/en-servicio          → devuelve SOLO UNO en EN_SERVICIO (filtros opcionales)
 *  - GET    /torno/siguiente            → siguiente para iniciar (solo 1)
 *  - GET    /torno/pendientes           → no EN_SERVICIO ni FINALIZADO
 *  - POST   /torno                      → crear
 *  - POST   /torno/:id/iniciar          → iniciar ({ usuarioId?, inicio? })
 *  - POST   /torno/:id/finalizar        → finalizar ({ fin? })
 *  - POST   /torno/:id/asignar-operador → asignar operador ({ usuarioId })
 *  - PUT    /torno/:id                  → editar
 *  - GET    /torno/:id                  → obtener por id
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("../../middlewares/passport"));
const TornoTController_1 = require("./TornoTController");
const router = (0, express_1.Router)();
// 🔐 JWT para todas
router.use(passport_1.default.authenticate('jwt', { session: false }));
// Listado principal (paginado + filtros)
router.get('/', TornoTController_1.TornoTController.listarPaginado);
// Solo UNO en EN_SERVICIO
router.get('/en-servicio', TornoTController_1.TornoTController.enServicioUno);
// Siguiente para iniciar (solo 1)
router.get('/siguiente', TornoTController_1.TornoTController.siguienteParaIniciar);
// No en proceso (ni finalizados)
router.get('/pendientes', TornoTController_1.TornoTController.listarNoEnProceso);
// Crear
router.post('/', TornoTController_1.TornoTController.crear);
// Acciones
router.post('/:id/iniciar', TornoTController_1.TornoTController.iniciar);
router.post('/:id/finalizar', TornoTController_1.TornoTController.finalizar);
router.post('/:id/asignar-operador', TornoTController_1.TornoTController.asignarOperador);
// Editar
router.put('/:id', TornoTController_1.TornoTController.editar);
// Obtener por id (dejar al final)
router.get('/:id', TornoTController_1.TornoTController.obtener);
exports.default = router;
