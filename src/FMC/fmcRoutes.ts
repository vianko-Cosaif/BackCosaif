// src/routes/fmc.routes.ts
import { Router } from 'express';
import { authenticateAccess } from '../auth/authenticateAccess';
import { FmcController } from './FmcController'; // ajusta si tu path difiere

const router = Router();

/* ---------------------------------------------------------------
 *  Todas las rutas requieren JWT, porque el dispositivo ya inicio
 *  sesion y obtuvo su token de acceso en /login.
 * --------------------------------------------------------------*/
router.use(authenticateAccess);

/* GET /fcm                ? Lista global de tokens (solo admin) */
router.get('/', FmcController.obtenerTokens);

/* GET /fcm/usuario/:id    ? Tokens de un usuario concreto       */
router.get('/usuario/:usuarioId', FmcController.obtenerTokensPorUsuario);

/* POST /fcm               ? Upsert de token { token } para el usuario autenticado */
router.post('/', FmcController.registrarToken);

/* DELETE /fcm/usuario/:id ? Elimina todos los tokens de usuario */
router.delete('/usuario/:usuarioId', FmcController.eliminarTokensPorUsuario);

/* DELETE /fcm/:token      ? Elimina un token por valor          */
router.delete('/:token', FmcController.eliminarToken);

export default router;
