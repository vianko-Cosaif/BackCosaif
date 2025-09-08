// src/controllers/Servicios/TornoRuta.ts
/**
 * Sugerido: app.use('/servicios/torno', router)
 * Endpoints:
 *  - POST /servicios/torno
 *  - PUT  /servicios/torno/:id
 *  - GET  /servicios/torno/:id
 */
import { Router } from 'express';
import passport from '../../middlewares/passport';
import { TornoTController } from './TornoTController';

const router = Router();
router.use(passport.authenticate('jwt', { session: false }));

router.post('/', TornoTController.crear);
router.put('/:id', TornoTController.editar);
router.get('/:id', TornoTController.obtener);

export default router;
