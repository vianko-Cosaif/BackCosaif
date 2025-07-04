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

import { Router } from "express";
import { RondaController } from "./RondaController";
import passport from "../../../middlewares/passport";

const router = Router();

// Protege todas las rutas con autenticación JWT
router.use(passport.authenticate("jwt", { session: false }));

// Genera todas las rondas de forma inteligente
router.post("/generar", RondaController.generarRondaInteligente);

// Elimina todas las rondas (uso administrativo)
router.delete("/", RondaController.eliminarTodasLasRondas);

// Crea una ronda para un movimiento individual
router.post("/movimiento/:movimientoId", RondaController.generarRondaParaMovimiento);

// Lista todas las rondas existentes
router.get("/", RondaController.obtenerRondas);

// Elimina una ronda por su ID
router.delete("/:id", RondaController.eliminarRonda);

// Obtiene todas las rondas para una localidad
router.get("/localidad/:localidadId", RondaController.obtenerRondasPorLocalidad);

// Obtiene las rondas de una localidad según su estado (concluido o no)
router.get(
  "/localidad/:localidadId/estado/:concluido",
  RondaController.obtenerRondasPorLocalidadConEstado
);

// Obtiene el siguiente en la ronda por localidad
router.get(
  "/localidad/:localidadId/siguiente",
  RondaController.obtenerSiguienteEnRonda
);

export default router;
