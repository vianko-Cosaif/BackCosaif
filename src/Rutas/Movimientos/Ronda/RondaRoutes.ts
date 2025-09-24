/**
 * @file RondaRoutes.ts
 * @author Isaac Serrano
 * @version 1.2.1 2025-05-16
 *
 * @description
 * Rutas HTTP para **Ronda**, alineadas con el RondaController actual.
 *
 * @routes
 *  - POST    /rondas/movimiento/:movimientoId                  → Crear ronda para un movimiento
 *  - GET     /rondas                                           → Listar rondas
 *  - DELETE  /rondas/:id                                       → Eliminar una ronda
 *  - GET     /rondas/localidad/:localidadId                    → Rondas por localidad
 *  - GET     /rondas/localidad/:localidadId/estado/:concluido  → Rondas por localidad y estado
 *  - GET     /rondas/localidad/:localidadId/siguiente          → Siguiente (uno a la vez – maquinista)
 *  - GET     /rondas/localidad/:localidadId/siguiente-inteligente → Alias del anterior
 *  - PATCH   /rondas/intercambiar-movimientos                  → Intercambiar movimientos entre dos rondas
 *  - PATCH   /rondas/:id/intercambiar-movimiento               → Reemplazar el movimiento de una ronda
 *  - GET     /rondas/:id/info                                  → Info detallada de una ronda
 *  - PATCH   /rondas/:id/concluir                              → Marcar ronda como concluida
 */

import { Router } from "express";
import { RondaController } from "./RondaController";
import passport from "../../../middlewares/passport";

const router = Router();

// Protege todas las rutas con autenticación JWT
router.use(passport.authenticate("jwt", { session: false }));

// Crear ronda para un movimiento
router.post("/movimiento/:movimientoId", RondaController.generarRondaParaMovimiento);

// Listar rondas
router.get("/", RondaController.obtenerRondas);

// Eliminar una ronda por ID
router.delete("/:id", RondaController.eliminarRonda);

// Rondas por localidad
router.get("/localidad/:localidadId", RondaController.obtenerRondasPorLocalidad);

// Rondas por localidad y estado
router.get("/localidad/:localidadId/estado/:concluido", RondaController.obtenerRondasPorLocalidadConEstado);

// Siguiente en ronda (uno a la vez – maquinista)
router.get("/localidad/:localidadId/siguiente", RondaController.obtenerSiguienteInteligente);

// Alias: siguiente inteligente
router.get("/localidad/:localidadId/siguiente-inteligente", RondaController.obtenerSiguienteInteligente);

// Intercambiar movimientos entre dos rondas
router.patch("/intercambiar-movimientos", RondaController.intercambiarMovimientosEntreRondas);

// Reemplazar el movimiento de una ronda
router.patch("/:id/intercambiar-movimiento", RondaController.intercambiarMovimientoEnRonda);

// Info detallada de una ronda
router.get("/:id/info", RondaController.obtenerInfoRonda);

// Marcar ronda como concluida
router.patch("/:id/concluir", RondaController.marcarRondaComoConcluida);

export default router;
