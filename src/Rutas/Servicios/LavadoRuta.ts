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

import { Router } from 'express';
import passport from '../../middlewares/passport';
import { LavadoTController } from './LavadoTController';

const router = Router();

// 🔐 JWT para todas
router.use(passport.authenticate('jwt', { session: false }));

// Listado principal (paginado + filtros)
router.get('/', LavadoTController.listar);

// Solo EN_SERVICIO
router.get('/en-servicio', LavadoTController.enServicio);

// Siguientes para iniciar (por defecto 2)
router.get('/siguientes', LavadoTController.siguientes);

// Compat: no en proceso (ni finalizados)
router.get('/no-en-proceso', LavadoTController.listarNoEnProceso);

// Crear
router.post('/', LavadoTController.crear);

// Acciones rápidas
router.post('/:id/iniciar', LavadoTController.iniciar);
router.post('/:id/finalizar', LavadoTController.finalizar);

// Editar
router.put('/:id', LavadoTController.editar);

// Obtener por id (dejar al final para no colisionar con rutas anteriores)
router.get('/:id', LavadoTController.obtener);

export default router;
