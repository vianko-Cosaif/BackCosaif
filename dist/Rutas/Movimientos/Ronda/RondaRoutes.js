"use strict";
/**
 * @file RondaRoutes.ts
 * @author Isaac Serrano Campos <isaac.serrano@vianko.com.mx>
 * @version 1.1.0 2025-04-28
 *
 * @description
 * Define las rutas HTTP para la entidad **Ronda** y las asocia con los
 * manejadores del `RondaController`. Este router se monta bajo el prefijo
 * `/rondas` en el archivo principal de rutas.
 *
 * @routes
 *  - POST    /rondas/generar                          → Genera todas las rondas de forma automática
 *  - DELETE  /rondas                                  → Elimina todas las rondas existentes
 *  - POST    /rondas/movimiento/:movimientoId         → Crea una ronda para un movimiento específico
 *  - GET     /rondas                                  → Obtiene todas las rondas registradas
 *  - DELETE  /rondas/:id                              → Elimina una ronda por su ID
 *  - GET     /rondas/localidad/:localidadId           → Obtiene todas las rondas de una localidad
 *  - GET     /rondas/localidad/:localidadId/estado/:concluido → Obtiene rondas por localidad y estado (true|false)
 *  - GET     /rondas/localidad/:localidadId/siguiente → Obtiene el siguiente en la ronda (por orden y número)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const RondaController_1 = require("./RondaController");
const passport_1 = __importDefault(require("../../../middlewares/passport"));
const router = (0, express_1.Router)();
// Protege todas las rutas con autenticación JWT
router.use(passport_1.default.authenticate("jwt", { session: false }));
// Genera todas las rondas de forma inteligente
router.post("/generar", RondaController_1.RondaController.generarRondaInteligente);
// Elimina todas las rondas (uso administrativo)
router.delete("/", RondaController_1.RondaController.eliminarTodasLasRondas);
// Crea una ronda para un movimiento individual
router.post("/movimiento/:movimientoId", RondaController_1.RondaController.generarRondaParaMovimiento);
// Lista todas las rondas existentes
router.get("/", RondaController_1.RondaController.obtenerRondas);
// Elimina una ronda por su ID
router.delete("/:id", RondaController_1.RondaController.eliminarRonda);
// Obtiene todas las rondas para una localidad
router.get("/localidad/:localidadId", RondaController_1.RondaController.obtenerRondasPorLocalidad);
// Obtiene las rondas de una localidad según su estado (concluido o no)
router.get("/localidad/:localidadId/estado/:concluido", RondaController_1.RondaController.obtenerRondasPorLocalidadConEstado);
// Obtiene el siguiente en la ronda por localidad
router.get("/localidad/:localidadId/siguiente", RondaController_1.RondaController.obtenerSiguienteEnRonda);
exports.default = router;
