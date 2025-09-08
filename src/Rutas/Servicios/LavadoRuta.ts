/**
 * @file lavadoRuta.ts
 * @description
 * Rutas HTTP para **LavadoT**. TODAS protegidas con JWT.
 *
 * Sugerido montado: app.use('/servicios/lavado', router)
 * Endpoints resultantes:
 *  - POST   /servicios/lavado           → crear
 *  - PUT    /servicios/lavado/:id       → editar
 *  - GET    /servicios/lavado/:id       → obtener
 */

import { Router } from 'express';
import passport from '../../middlewares/passport';
import { LavadoTController } from './LavadoTController';

const router = Router();

// 🔐 Protección JWT para todas las rutas
router.use(passport.authenticate('jwt', { session: false }));

// Crear registro LavadoT (opcionalmente con status/fechas)
router.post('/', LavadoTController.crear);

// Editar registro LavadoT (status, inicio, fin)A
router.put('/:id', LavadoTController.editar);

// Obtener registro LavadoT por id
router.get('/:id', LavadoTController.obtener);

export default router;
