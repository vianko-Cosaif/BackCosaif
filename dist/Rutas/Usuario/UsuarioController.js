"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsuarioController = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const usuarioModel_1 = require("../../models/Usuario/usuarioModel");
const client_1 = require("@prisma/client");
const uuid_1 = require("uuid");
const usuario_controller_logger_1 = require("./usuario.controller.logger");
const prisma = new client_1.PrismaClient();
class UsuarioController {
}
exports.UsuarioController = UsuarioController;
_a = UsuarioController;
/**
 * GET /usuarios
 * Devuelve todos los usuarios registrados.
 */
UsuarioController.obtenerUsuarios = async (_req, res) => {
    try {
        const usuarios = await usuarioModel_1.UsuarioModel.obtenerUsuarios();
        res.json(usuarios);
    }
    catch (error) {
        usuario_controller_logger_1.usuarioControllerLogger.error('Error al obtener usuarios', { error });
        res.status(500).json({ error: 'Error al obtener usuarios', details: error });
    }
};
/**
 * POST /usuarios
 * Crea un nuevo usuario en el sistema.
 */
UsuarioController.crearUsuario = async (req, res) => {
    const { nombre, email, contrasena, rol, empresaId, localidadId } = req.body;
    try {
        const nuevoUsuario = await usuarioModel_1.UsuarioModel.crearUsuario(nombre, email, contrasena, rol, empresaId, localidadId);
        res.status(201).json(nuevoUsuario);
    }
    catch (error) {
        usuario_controller_logger_1.usuarioControllerLogger.error('Error al crear usuario', { error, nombre, email });
        res.status(500).json({ error: 'Error al crear usuario', details: error });
    }
};
/**
 * PUT /usuarios/:id
 * Edita un usuario existente por ID.
 */
UsuarioController.editarUsuario = async (req, res) => {
    const { id } = req.params;
    const { nombre, email, contrasena } = req.body;
    try {
        const usuarioActualizado = await usuarioModel_1.UsuarioModel.editarUsuario(parseInt(id, 10), nombre, email, contrasena);
        res.json(usuarioActualizado);
    }
    catch (error) {
        usuario_controller_logger_1.usuarioControllerLogger.error(`Error al editar usuario con ID ${id}`, { error });
        res.status(500).json({ error: 'Error al editar usuario', details: error });
    }
};
/**
 * POST /login
 * Autenticación del usuario y emisión de token JWT.
 * También registra el playerId de OneSignal si se proporciona.
 */
UsuarioController.login = async (req, res) => {
    const { nombre, contrasena, playerId } = req.body;
    try {
        const resultado = await usuarioModel_1.UsuarioModel.obtenerUsuarioPorCredenciales(nombre, contrasena);
        if (!resultado.autenticado) {
            usuario_controller_logger_1.usuarioControllerLogger.warn(`Intento fallido de login para usuario: ${nombre}`);
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        const usuarioAutenticado = resultado;
        const jti = (0, uuid_1.v4)(); // ← nuevo identificador
        // Payload + claim estándar jti
        const payload = {
            id: usuarioAutenticado.id,
            nombre: usuarioAutenticado.nombre,
            email: usuarioAutenticado.email,
            rol: usuarioAutenticado.rol,
            empresaId: usuarioAutenticado.empresaId,
            localidad: usuarioAutenticado.localidad,
        };
        const token = jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET || 'default_secret', {
            expiresIn: '1h',
            issuer: process.env.JWT_ISSUER,
            audience: process.env.JWT_AUDIENCE,
            jwtid: jti,
        });
        // Guarda **token + jti** en la tabla Token
        await prisma.token.create({
            data: {
                token,
                jti, // ← nuevo campo
                usuarioId: usuarioAutenticado.id,
                tipo: 'auth',
            },
        });
        // Registrar playerId (sin cambios)
        if (playerId && typeof playerId === 'string') {
            try {
                await usuarioModel_1.UsuarioModel.registrarPlayerId(usuarioAutenticado.id, playerId);
            }
            catch (err) {
                usuario_controller_logger_1.usuarioControllerLogger.warn('No se pudo registrar el playerId', { playerId, error: err });
            }
        }
        // Respuesta sin contraseña
        const { contrasena: omitida, ...usuarioData } = usuarioAutenticado;
        res.json({ token, user: usuarioData });
    }
    catch (error) {
        usuario_controller_logger_1.usuarioControllerLogger.error('Error en login', { error, nombre });
        res.status(500).json({ error: 'Error en el login', details: error });
    }
};
