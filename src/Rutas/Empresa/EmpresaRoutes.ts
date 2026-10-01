/**
 * EmpresaRoutes.ts
 *
 * Archivo de definición de rutas HTTP para la entidad Empresa.
 *
 * Este módulo define los endpoints REST disponibles para operaciones CRUD sobre empresas.
 * Todas las rutas están protegidas mediante autenticación JWT utilizando Passport.
 *
 * Middleware aplicado:
 * - passport.authenticate('jwt', { session: false }): 
 *   Requiere un token JWT válido para acceder a las rutas.
 *
 * Controlador asociado:
 * - EmpresaController: contiene la lógica de negocio para cada una de las rutas.
 *
 * Rutas definidas:
 * - GET    /         → Listar todas las empresas
 * - POST   /         → Crear una nueva empresa
 * - PUT    /:id      → Editar una empresa por ID
 * - DELETE /:id      → Eliminar una empresa por ID
 *
 * Este módulo debe ser montado por el router principal de la aplicación en servidor. ejemplo:
 * app.use('/empresas', empresaRoutes);
 */

import { Router } from 'express';
import { EmpresaController } from './EmpresaController';
import { authenticateAccess } from '../../auth/authenticateAccess';
import { PERMISSIONS } from '../../auth/accessPolicy';
import { requirePermission } from '../../auth/authorize';

const router = Router();

// Middleware de autenticación aplicado a todas las rutas de este módulo.
// Protege las rutas usando la estrategia JWT definida en Passport.
router.use(authenticateAccess);
// Ruta para crear una nueva empresa
router.post('/', requirePermission(PERMISSIONS.COMPANIES_MANAGE), EmpresaController.crearEmpresa);

// Ruta para obtener la lista de empresas
router.get('/', requirePermission(PERMISSIONS.CATALOGS_READ), EmpresaController.obtenerEmpresas);

// Ruta para obtener la lista ligera de empresas
router.get('/lite', requirePermission(PERMISSIONS.CATALOGS_READ), EmpresaController.obtenerEmpresasLite);



// Ruta para editar una empresa existente (por ID)
router.put('/:id', requirePermission(PERMISSIONS.COMPANIES_MANAGE), EmpresaController.editarEmpresa);

// Ruta para eliminar una empresa (por ID)
router.delete('/:id', requirePermission(PERMISSIONS.COMPANIES_MANAGE), EmpresaController.eliminarEmpresa);

export default router;
