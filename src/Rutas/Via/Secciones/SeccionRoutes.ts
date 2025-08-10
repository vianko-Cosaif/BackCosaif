// secciones.routes.ts
import { Router } from 'express';
import passport from '../../../middlewares/passport';
import { SeccionViaController } from './SeccionVIasController';

const router = Router();

// Protegemos todo con JWT
router.use(passport.authenticate('jwt', { session: false }));

// ===== LISTADOS =====
// GET /secciones?viaId=123
router.get('/', SeccionViaController.obtenerSecciones);

// GET /secciones/via/:viaId
router.get('/via/:viaId', SeccionViaController.obtenerSeccionesPorVia);

// GET /secciones/:id
router.get('/:id', SeccionViaController.obtenerSeccionPorId);

// GET /secciones/via/:viaId/numero/:numero
router.get('/via/:viaId/numero/:numero', SeccionViaController.obtenerSeccionPorClave);

// ===== CRUD =====
// POST /secciones           (body: { viaId, nombre?, numero? })
router.post('/', SeccionViaController.crearSeccion);

// POST /secciones/via/:viaId (body: { nombre?, numero? })
router.post('/via/:viaId', SeccionViaController.crearSeccionEnVia);

// PUT /secciones/:id         (body: { nombre?, numero? })
router.put('/:id', SeccionViaController.editarSeccion);

// DELETE /secciones/:id
router.delete('/:id', SeccionViaController.eliminarSeccion);

// ===== OCUPACIÓN =====
// POST /secciones/via/:viaId/asignar       (body: { numero, movimientoId })
router.post('/via/:viaId/asignar', SeccionViaController.asignarMovimiento);

// POST /secciones/via/:viaId/liberar       (body: { numero, movimientoId })
router.post('/via/:viaId/liberar', SeccionViaController.liberarSeccion);

// POST /secciones/via/:viaId/liberar-todas (body: { movimientoId })
router.post('/via/:viaId/liberar-todas', SeccionViaController.liberarTodasPorMovimiento);

export default router;
