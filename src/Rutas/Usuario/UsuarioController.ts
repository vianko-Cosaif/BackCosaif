import { Request, Response, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { UsuarioModel } from '../../models/Usuario/usuarioModel';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { usuarioControllerLogger } from './usuario.controller.logger';

const prisma = new PrismaClient();

/**
 * Representación interna del usuario autenticado.
 */
interface AuthenticatedUser {
  autenticado: false;
  id: number;
  nombre: string;
  contrasena: string;
  email: string;
  rol: string;
  empresaId: number;
  localidad: {
    nombre: string;
    estado: string;
  };
}

export class UsuarioController {
  /**
   * GET /usuarios
   * Devuelve todos los usuarios registrados.
   */
  static obtenerUsuarios: RequestHandler = async (_req: Request, res: Response) => {
    try {
      const usuarios = await UsuarioModel.obtenerUsuarios();
      res.json(usuarios);
    } catch (error) {
      usuarioControllerLogger.error('Error al obtener usuarios', { error });
      res.status(500).json({ error: 'Error al obtener usuarios', details: error });
    }
  };

  /**
   * POST /usuarios
   * Crea un nuevo usuario en el sistema.
   */
  static crearUsuario: RequestHandler = async (req: Request, res: Response) => {
    const { nombre, email, contrasena, rol, empresaId, localidadId } = req.body;

    try {
      const nuevoUsuario = await UsuarioModel.crearUsuario(
        nombre,
        email,
        contrasena,
        rol,
        empresaId,
        localidadId
      );
      res.status(201).json(nuevoUsuario);
    } catch (error) {
      usuarioControllerLogger.error('Error al crear usuario', { error, nombre, email });
      res.status(500).json({ error: 'Error al crear usuario', details: error });
    }
  };

  /**
   * PUT /usuarios/:id
   * Edita un usuario existente por ID.
   */
  static editarUsuario: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nombre, email, contrasena } = req.body;

    try {
      const usuarioActualizado = await UsuarioModel.editarUsuario(
        parseInt(id, 10),
        nombre,
        email,
        contrasena
      );
      res.json(usuarioActualizado);
    } catch (error) {
      usuarioControllerLogger.error(`Error al editar usuario con ID ${id}`, { error });
      res.status(500).json({ error: 'Error al editar usuario', details: error });
    }
  };

  /**
   * POST /login
   * Autenticación del usuario y emisión de token JWT.
   * También registra el playerId de OneSignal si se proporciona.
   */

  static login: RequestHandler = async (req: Request, res: Response) => {
    const { nombre, contrasena, playerId } = req.body;

    try {
      const resultado = await UsuarioModel.obtenerUsuarioPorCredenciales(nombre, contrasena);

      if (!resultado.autenticado) {
        usuarioControllerLogger.warn(`Intento fallido de login para usuario: ${nombre}`);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const usuarioAutenticado = resultado as unknown as AuthenticatedUser;
      const jti = uuidv4();                                  // ← nuevo identificador

      // Payload + claim estándar jti
      const payload = {
        id: usuarioAutenticado.id,
        nombre: usuarioAutenticado.nombre,
        email: usuarioAutenticado.email,
        rol: usuarioAutenticado.rol,
        empresaId: usuarioAutenticado.empresaId,
        localidad: usuarioAutenticado.localidad,
      };

      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'default_secret',
        {
          expiresIn: '1h',
          issuer: process.env.JWT_ISSUER,
          audience: process.env.JWT_AUDIENCE,
          jwtid: jti,                                        
        }
      );

      // Guarda **token + jti** en la tabla Token
      await prisma.token.create({
        data: {
          token,
          jti,                                               // ← nuevo campo
          usuarioId: usuarioAutenticado.id,
          tipo: 'auth',
        },
      });

      // Registrar playerId (sin cambios)
      if (playerId && typeof playerId === 'string') {
        try {
          await UsuarioModel.registrarPlayerId(usuarioAutenticado.id, playerId);
        } catch (err) {
          usuarioControllerLogger.warn('No se pudo registrar el playerId', { playerId, error: err });
        }
      }

      // Respuesta sin contraseña
      const { contrasena: omitida, ...usuarioData } = usuarioAutenticado;
      res.json({ token, user: usuarioData });

    } catch (error) {
      usuarioControllerLogger.error('Error en login', { error, nombre });
      res.status(500).json({ error: 'Error en el login', details: error });
    }
  };

}
