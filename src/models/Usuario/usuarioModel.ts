// src/models/UsuarioModel.ts
import { PrismaClient, Rol } from '@prisma/client';
import argon2 from 'argon2';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();
const normalizeEmail = (e: string) => e.trim().toLowerCase();

export class UsuarioModel {
  /** Lista usuarios sin exponer contraseñas. */
  static async obtenerUsuarios() {
    try {
      return await prisma.usuario.findMany({
        select: {
          id: true,
          nombre: true,
          email: true,
          empresaId: true,
          localidadId: true,
          rol: true,
          activo: true,
          empresa: { select: { id: true, nombre: true } },
          localidad: { select: { id: true, nombre: true, estado: true } },
          // Sesiones (Token de 8h)
          tokens: {
            select: {
              jti: true,
              deviceId: true,
              ip: true,
              issuedAt: true,
              expiresAt: true,
              revokedAt: true,
              reason: true,
            },
          },
          // Push (FCM/OneSignal)
          fcmTokens: { select: { id: true, token: true, createdAt: true } },
          // IPs registradas
          ips: { select: { ip: true, tipoDispositivo: true } },
        },
        orderBy: { id: 'asc' },
      });
    } catch (error) {
      logger.error('Error al obtener usuarios', error);
      throw new Error('Error de base de datos');
    }
  }

  /** Crea usuario con hash Argon2. */
  static async crearUsuario(
    nombre: string,
    email: string,
    contrasena: string,
    rol: Rol,
    empresaId: number,
    localidadId: number
  ) {
    try {
      if (!nombre || !email || !contrasena || !rol || !empresaId || !localidadId) {
        throw new Error('Datos incompletos');
      }
      if (contrasena.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
      if (!Object.values(Rol).includes(rol)) throw new Error('Rol no válido');

      const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
      if (!empresa) throw new Error('Empresa no válida');

      const hashingOptions = {
        timeCost: 4,
        memoryCost: 4096,
        parallelism: 2,
        type: argon2.argon2id,
        saltLength: 16,
      };
      const contrasenaHasheada = await argon2.hash(contrasena, hashingOptions);

      return await prisma.usuario.create({
        data: {
          nombre,
          email: normalizeEmail(email),
          contrasena: contrasenaHasheada,
          rol,
          empresaId,
          localidadId,
          // tokenVersion se crea por defecto = 0 (schema)
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
    } catch (error: any) {
      if (error?.code === 'P2002') throw new Error('Nombre o email ya registrados');
      logger.error('Error al crear usuario', {
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      throw error instanceof Error ? error : new Error('Error inesperado');
    }
  }

  /**
   * Login: valida credenciales y marca activo.
   * (Opcional: aquí puedes registrar IpUsuario fuera de este método.)
   */
  static async obtenerUsuarioPorCredenciales(nombre: string, contrasena: string) {
    try {
      const usuario = await prisma.usuario.findFirst({ where: { nombre } });
      if (!usuario) return { autenticado: false, rol: null, id: null };

      const valid = await argon2.verify(usuario.contrasena, contrasena);
      if (!valid) return { autenticado: false, rol: null, id: null };

      const actualizado = await prisma.usuario.update({
        where: { id: usuario.id },
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

      return { autenticado: true, ...actualizado };
    } catch (error) {
      logger.error('Error en obtenerUsuarioPorCredenciales', error);
      throw new Error('Error de autenticación');
    }
  }

  /** Edita datos básicos. */
  static async editarUsuario(
    id: number,
    nombre: string,
    email: string,
    contrasena?: string
  ) {
    try {
      if (!nombre || !email) throw new Error('Datos incompletos');

      const dataToUpdate: { nombre: string; email: string; contrasena?: string } = {
        nombre,
        email: normalizeEmail(email),
      };

      if (contrasena) {
        if (contrasena.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
        const hashingOptions = {
          timeCost: 4,
          memoryCost: 4096,
          parallelism: 2,
          type: argon2.argon2id,
          saltLength: 16,
        };
        dataToUpdate.contrasena = await argon2.hash(contrasena, hashingOptions);
      }

      return await prisma.usuario.update({
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
    } catch (error: any) {
      if (error?.code === 'P2002') throw new Error('Nombre o email ya registrados');
      logger.error('Error al editar usuario', { error, id, nombre, email });
      throw error instanceof Error ? error : new Error('Error inesperado');
    }
  }

  /**
   * Registra token de notificaciones en tabla FcmToken.
   * (Nombre legado mantenido para compat.)
   */
  static async registrarPlayerId(usuarioId: number, playerId: string) {
    if (!usuarioId || !playerId) throw new Error('Usuario o playerId inválido');

    try {
      await prisma.fcmToken.upsert({
        where: { token: playerId },
        update: { usuarioId },
        create: { token: playerId, usuarioId },
      });
      logger.info(`FCM/Player ID registrado para usuario ${usuarioId}`);
      return true;
    } catch (error) {
      logger.error('Error al registrar playerId', { error, usuarioId });
      throw new Error('No se pudo registrar el token de notificación');
    }
  }
}
