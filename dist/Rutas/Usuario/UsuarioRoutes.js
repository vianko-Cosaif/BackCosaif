"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("../../middlewares/passport"));
const UsuarioController_1 = require("./UsuarioController");
const router = (0, express_1.Router)();
// Ruta pública para inicio de sesión
router.post('/login', UsuarioController_1.UsuarioController.login);
// Crear nuevo usuario
router.post('/', UsuarioController_1.UsuarioController.crearUsuario);
// Middleware de autenticación JWT aplicado a todas las rutas siguientes
router.use(passport_1.default.authenticate('jwt', { session: false }));
// Obtener todos los usuarios
router.get('/', UsuarioController_1.UsuarioController.obtenerUsuarios);
// Editar usuario (ruta protegida, se espera el id en la URL)
router.put('/:id', UsuarioController_1.UsuarioController.editarUsuario);
exports.default = router;
