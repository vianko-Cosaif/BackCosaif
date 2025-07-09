"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsuarioModel = void 0;
const client_1 = require("@prisma/client");
const argon2_1 = __importDefault(require("argon2"));
const logger_1 = require("../../utils/logger");
const prisma = new client_1.PrismaClient();
class UsuarioModel {
    /**
     * Obtiene todos los usuarios registrados en el sistema.
     */
    static async obtenerUsuarios() {
        try {
            const usuarios = await prisma.usuario.findMany({
                select: {
                    id: true,
                    contrasena: true,
                    nombre: true,
                    email: true,
                    empresaId: true,
                    localidadId: true,
                    rol: true,
                    empresa: { select: { id: true, nombre: true } },
                    localidad: { select: { id: true, nombre: true, estado: true } },
                    tokens: { select: { id: true, token: true } },
                },
            });
            return usuarios;
        }
        catch (error) {
            logger_1.logger.error('Error al obtener usuarios', error);
            throw new Error('Error de base de datos');
        }
    }
    /**
     * Crea un nuevo usuario en el sistema.
     */
    static async crearUsuario(nombre, email, contrasena, rol, empresaId, localidadId) {
        try {
            if (!nombre || !email || !contrasena || !rol || !empresaId || !localidadId) {
                throw new Error('Datos incompletos');
            }
            if (contrasena.length < 8) {
                throw new Error('La contraseña debe tener al menos 8 caracteres');
            }
            if (!Object.values(client_1.Rol).includes(rol)) {
                throw new Error('Rol no válido');
            }
            const empresaExistente = await prisma.empresa.findUnique({
                where: { id: empresaId },
            });
            if (!empresaExistente) {
                throw new Error('Empresa no válida');
            }
            const hashingOptions = {
                timeCost: 4,
                memoryCost: 4096,
                parallelism: 2,
                type: argon2_1.default.argon2id,
                saltLength: 16,
            };
            const contrasenaHasheada = await argon2_1.default.hash(contrasena, hashingOptions);
            const nuevoUsuario = await prisma.usuario.create({
                data: {
                    nombre,
                    email,
                    contrasena: contrasenaHasheada,
                    rol,
                    empresaId,
                    localidadId,
                },
                select: {
                    id: true,
                    nombre: true,
                    email: true,
                    rol: true,
                    empresa: { select: { id: true, nombre: true } },
                    localidad: { select: { id: true, nombre: true, estado: true } },
                },
            });
            return nuevoUsuario;
        }
        catch (error) {
            logger_1.logger.error('Error al crear usuario', {
                error: error instanceof Error ? error.message : 'Error desconocido',
                nombre,
                email,
                rol,
                empresaId,
                localidadId,
            });
            throw error instanceof Error ? error : new Error('Error inesperado');
        }
    }
    /**
   * Verifica las credenciales del usuario durante el proceso de login.
   * Si son correctas, marca al usuario como activo (activo = true).
   */
    static async obtenerUsuarioPorCredenciales(nombre, contrasena) {
        try {
            const usuarioEncontrado = await prisma.usuario.findFirst({
                where: { nombre },
            });
            if (!usuarioEncontrado) {
                return { autenticado: false, rol: null, id: null };
            }
            const valid = await argon2_1.default.verify(usuarioEncontrado.contrasena, contrasena);
            if (!valid) {
                return { autenticado: false, rol: null, id: null };
            }
            const usuarioConectado = await prisma.usuario.update({
                where: { id: usuarioEncontrado.id },
                data: { activo: true },
                select: {
                    id: true,
                    nombre: true,
                    email: true,
                    empresaId: true,
                    localidadId: true,
                    rol: true,
                    empresa: { select: { nombre: true } },
                    localidad: { select: { nombre: true, estado: true } },
                },
            });
            return { autenticado: true, ...usuarioConectado };
        }
        catch (error) {
            logger_1.logger.error('Error en obtenerUsuarioPorCredenciales', error);
            throw new Error('Error de autenticación');
        }
    }
    /**
     * Edita la información de un usuario existente.
     */
    static async editarUsuario(id, nombre, email, contrasena) {
        try {
            if (!nombre || !email) {
                throw new Error('Datos incompletos');
            }
            const dataToUpdate = {
                nombre,
                email,
            };
            if (contrasena) {
                if (contrasena.length < 8) {
                    throw new Error('La contraseña debe tener al menos 8 caracteres');
                }
                const hashingOptions = {
                    timeCost: 4,
                    memoryCost: 4096,
                    parallelism: 2,
                    type: argon2_1.default.argon2id,
                    saltLength: 16,
                };
                dataToUpdate.contrasena = await argon2_1.default.hash(contrasena, hashingOptions);
            }
            const usuarioActualizado = await prisma.usuario.update({
                where: { id },
                data: dataToUpdate,
                select: {
                    id: true,
                    nombre: true,
                    email: true,
                    rol: true,
                    empresa: { select: { id: true, nombre: true } },
                    localidad: { select: { id: true, nombre: true, estado: true } },
                },
            });
            return usuarioActualizado;
        }
        catch (error) {
            logger_1.logger.error('Error al editar usuario', {
                error: error instanceof Error ? error.message : 'Error desconocido',
                id,
                nombre,
                email,
            });
            throw error instanceof Error ? error : new Error('Error inesperado');
        }
    }
    /**
     * Registra o actualiza el playerId firebase en la tabla Token.
     */
    static async registrarPlayerId(usuarioId, playerId) {
        if (!usuarioId || !playerId) {
            throw new Error('Usuario o playerId inválido');
        }
        try {
            await prisma.token.upsert({
                where: { token: playerId },
                update: { usuarioId, tipo: 'onesignal' },
                create: { token: playerId, usuarioId, tipo: 'onesignal' },
            });
            logger_1.logger.info(`Player ID registrado correctamente para usuario ${usuarioId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error al registrar playerId', {
                error: error instanceof Error ? error.message : 'Error desconocido',
                usuarioId,
                playerId,
            });
            throw new Error('No se pudo registrar el token de notificación');
        }
    }
}
exports.UsuarioModel = UsuarioModel;
