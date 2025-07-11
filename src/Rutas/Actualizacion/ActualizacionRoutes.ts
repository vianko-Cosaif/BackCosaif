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

import { Router } from 'express';
import passport from '../../middlewares/passport';
import { ActualizacionController } from './ActualizacionController';

const router = Router();

// Protege todas las rutas con JWT
router.use(passport.authenticate('jwt', { session: false }));

// Obtener todas las actualizaciones
router.get('/', ActualizacionController.obtenerActualizaciones);

// Obtener la última actualización
router.get('/ultima', ActualizacionController.obtenerUltimaActualizacion);

// Crear nueva actualización
router.post('/', ActualizacionController.crearActualizacion);

// Actualizar una actualización existente por ID
router.put('/:id', ActualizacionController.actualizarActualizacion);

export default router;
