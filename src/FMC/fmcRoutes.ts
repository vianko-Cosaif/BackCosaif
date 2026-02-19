// src/routes/fmc.routes.ts
import { Router } from 'express';
import passport from '../middlewares/passport';
import { renewAccessTokenIfNeeded } from '../middlewares/token.renew';
import { FmcController } from './FmcController'; // ajusta si tu path difiere

const router = Router();

/* ---------------------------------------------------------------
 *  TODAS las rutas requieren JWT, porque el dispositivo ya inició
 *  sesión y obtuvo su token de acceso en /login.
 * --------------------------------------------------------------*/
router.use(passport.authenticate('jwt', { session: false }), renewAccessTokenIfNeeded);

/* GET /fcm                ? Lista global de tokens (sólo admin) */
router.get('/', FmcController.obtenerTokens);

/* GET /fcm/usuario/:id    ? Tokens de un usuario concreto       */
router.get('/usuario/:usuarioId', FmcController.obtenerTokensPorUsuario);

/* POST /fcm               ? Upsert de token { usuarioId, token } */
router.post('/', FmcController.registrarToken);

/* DELETE /fcm/:token      ? Elimina un token por valor          */
router.delete('/:token', FmcController.eliminarToken);

/* DELETE /fcm/usuario/:id ? Elimina todos los tokens de usuario */
router.delete('/usuario/:usuarioId', FmcController.eliminarTokensPorUsuario);

export default router;
