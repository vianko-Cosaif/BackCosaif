// src/routes/fmc.routes.ts
import { Router } from 'express';
import { authenticateAccess } from '../auth/authenticateAccess';
import { FmcController } from './FmcController'; // ajusta si tu path difiere

const router = Router();

/* ---------------------------------------------------------------
 *  TODAS las rutas requieren JWT, porque el dispositivo ya inici
 *  sesin y obtuvo su token de acceso en /login.
 * --------------------------------------------------------------*/
router.use(authenticateAccess);

/* GET /fcm                ? Lista global de tokens (slo admin) */
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
