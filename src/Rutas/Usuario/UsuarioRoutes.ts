import { Router } from 'express';
import { authenticateAccess } from '../../auth/authenticateAccess';
import { UsuarioController } from './UsuarioController';

const router = Router();

 
// Ruta pública para inicio de sesión
router.post('/login', UsuarioController.login);
// Crear nuevo usuario


router.post('/', UsuarioController.crearUsuario);


// Middleware de autenticación JWT aplicado a todas las rutas siguientes

router.use(authenticateAccess);


// Obtener todos los usuarios
router.get('/', UsuarioController.obtenerUsuarios);

// Editar usuario (ruta protegida, se espera el id en la URL)
router.put('/:id', UsuarioController.editarUsuario);

export default router;
