"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const EmpresaController_1 = require("./EmpresaController");
const passport_1 = __importDefault(require("../../middlewares/passport"));
const router = (0, express_1.Router)();
// Ruta para crear una nueva empresa
router.post('/', EmpresaController_1.EmpresaController.crearEmpresa);
// Middleware de autenticación aplicado a todas las rutas de este módulo.
// Protege las rutas usando la estrategia JWT definida en Passport.
router.use(passport_1.default.authenticate('jwt', { session: false }));
// Ruta para obtener la lista de empresas
router.get('/', EmpresaController_1.EmpresaController.obtenerEmpresas);
// Ruta para editar una empresa existente (por ID)
router.put('/:id', EmpresaController_1.EmpresaController.editarEmpresa);
// Ruta para eliminar una empresa (por ID)
router.delete('/:id', EmpresaController_1.EmpresaController.eliminarEmpresa);
exports.default = router;
