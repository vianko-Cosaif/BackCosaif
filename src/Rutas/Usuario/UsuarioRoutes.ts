import { Router } from 'express';
import { authenticateAccess } from '../../auth/authenticateAccess';
import { UsuarioController } from './UsuarioController';
import { PERMISSIONS } from '../../auth/accessPolicy';
import { requirePermission } from '../../auth/authorize';
import { loginRateLimit } from '../../auth/loginRateLimit';

const router = Router();

 
// Ruta pública para inicio de sesión
router.post('/login', loginRateLimit, UsuarioController.login);

// Middleware de autenticación JWT aplicado a todas las rutas siguientes
router.use(authenticateAccess);

// Perfil de sesión y capacidades consumibles por web/móvil.
router.get('/me', UsuarioController.me);

// Obtener todos los usuarios
router.get('/', requirePermission(PERMISSIONS.USERS_READ), UsuarioController.obtenerUsuarios);

// Crear nuevo usuario
router.post('/', requirePermission(PERMISSIONS.USERS_MANAGE), UsuarioController.crearUsuario);

// Activar/desactivar usuario y revocar sesiones vigentes
router.patch('/:id/estado', requirePermission(PERMISSIONS.USERS_MANAGE), UsuarioController.cambiarEstadoUsuario);

// Editar usuario (ruta protegida, se espera el id en la URL)
router.put('/:id', requirePermission(PERMISSIONS.USERS_MANAGE), UsuarioController.editarUsuario);
router.patch('/:id', requirePermission(PERMISSIONS.USERS_MANAGE), UsuarioController.editarUsuario);

export default router;
