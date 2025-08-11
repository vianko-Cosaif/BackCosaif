/**
 * @file RondaRoutes.ts
 * @version 1.3.0 2025-08-11
 *
 * Define rutas HTTP para **Ronda**.
 */

import { Router } from "express";
import passport from "../../../middlewares/passport";
import { RondaController } from "./RondaController";

const router = Router();

// Protege todas las rutas con JWT
router.use(passport.authenticate("jwt", { session: false }));

// ---- Generación / reorganización ----
router.post("/generar", RondaController.generarRondaInteligente);
router.post("/reorganizar", RondaController.reorganizarRondas);

// ---- CRUD básico ----
router.get("/", RondaController.obtenerRondas);
router.delete("/", RondaController.eliminarTodasLasRondas);
router.delete("/:id", RondaController.eliminarRonda);

// ---- Por movimiento / localidad ----
router.post("/movimiento/:movimientoId", RondaController.generarRondaParaMovimiento);
router.get("/localidad/:localidadId", RondaController.obtenerRondasPorLocalidad);
router.get("/localidad/:localidadId/estado/:concluido", RondaController.obtenerRondasPorLocalidadConEstado);
router.get("/localidad/:localidadId/siguiente", RondaController.obtenerSiguienteEnRonda);

// ---- Operaciones avanzadas ----
router.patch("/intercambiar-movimientos", RondaController.intercambiarMovimientosEntreRondas);
router.patch("/:id/intercambiar-movimiento", RondaController.intercambiarMovimientoEnRonda);

// ---- Info y conclusión ----
router.get("/:id/info", RondaController.obtenerInfoRonda);
router.patch("/:id/concluir", RondaController.marcarRondaComoConcluida);

export default router;
