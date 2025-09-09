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

import { Router } from 'express';
import passport from '../../middlewares/passport';
import { TornoTController } from '../../controllers/Servicios/TornoTController';

const router = Router();

// 🔐 JWT para todas
router.use(passport.authenticate('jwt', { session: false }));

// Listado principal (paginado + filtros)
router.get('/', TornoTController.listarPaginado);

// Solo UNO en EN_SERVICIO
router.get('/en-servicio', TornoTController.enServicioUno);

// Siguiente para iniciar (solo 1)
router.get('/siguiente', TornoTController.siguienteParaIniciar);

// No en proceso (ni finalizados)
router.get('/pendientes', TornoTController.listarNoEnProceso);

// Crear
router.post('/', TornoTController.crear);

// Acciones
router.post('/:id/iniciar', TornoTController.iniciar);
router.post('/:id/finalizar', TornoTController.finalizar);
router.post('/:id/asignar-operador', TornoTController.asignarOperador);

// Editar
router.put('/:id', TornoTController.editar);

// Obtener por id (dejar al final)
router.get('/:id', TornoTController.obtener);

export default router;
