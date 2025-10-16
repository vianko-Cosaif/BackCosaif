import { PrismaClient, Rol } from '@prisma/client';
import argon2 from 'argon2';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();
const normalizeEmail = (e: string) => e.trim().toLowerCase();

function logPrismaError(ctx: string, error: any, extra: Record<string, any> = {}) {
  const payload = {
    ctx,
    name: error?.name,
    code: error?.code,
    clientVersion: error?.clientVersion,
    meta: error?.meta,
    message: error?.message,
    stack: error?.stack,
    ...extra,
  };
  logger.error(`PRISMA_ERROR:${ctx}`, payload);
}

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
          tokens: {
            select: {
              jti: true, deviceId: true, ip: true, issuedAt: true,
              expiresAt: true, revokedAt: true, reason: true,
            },
          },
          fcmTokens: { select: { id: true, token: true, createdAt: true } },
          ips: { select: { ip: true, tipoDispositivo: true } },
        },
        orderBy: { id: 'asc' },
      });
    } catch (error) {
      logPrismaError('obtenerUsuarios', error);
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
        logger.warn('crearUsuario: datos incompletos', { nombre, email, rol, empresaId, localidadId });
        throw new Error('Datos incompletos');
      }
      if (contrasena.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
      if (!Object.values(Rol).includes(rol)) throw new Error('Rol no válido');

      const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
      if (!empresa) {
        logger.warn('crearUsuario: empresa no válida', { empresaId });
        throw new Error('Empresa no válida');
      }

      const localidad = await prisma.localidad.findUnique({ where: { id: localidadId } });
      if (!localidad) {
        logger.warn('crearUsuario: localidad no válida', { localidadId });
        throw new Error('Localidad no válida');
      }

      const contrasenaHasheada = await argon2.hash(contrasena, {
        timeCost: 4, memoryCost: 4096, parallelism: 2, type: argon2.argon2id, saltLength: 16,
      });

      const creado = await prisma.usuario.create({
        data: {
          nombre,
          email: normalizeEmail(email),
          contrasena: contrasenaHasheada,
          rol,
          empresaId,
          localidadId,
          // tokenVersion debe existir en DB con default 0
        },
        select: {
          id: true, nombre: true, email: true, rol: true,
          empresa: { select: { id: true, nombre: true } },
          localidad: { select: { id: true, nombre: true, estado: true } },
        },
      });

      logger.info('crearUsuario: usuario creado', { id: creado.id, nombre: creado.nombre, empresaId, localidadId });
      return creado;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        logger.warn('crearUsuario: duplicado nombre/email', { nombre, email });
        throw new Error('Nombre o email ya registrados');
      }
      if (error?.code === 'P2003') {
        logPrismaError('crearUsuario:P2003', error, { empresaId, localidadId });
        throw new Error('Relación inválida: empresaId/localidadId');
      }
      logPrismaError('crearUsuario', error, { nombre, email, empresaId, localidadId });
      throw error instanceof Error ? error : new Error('Error inesperado');
    }
  }

  /**
   * Login: valida credenciales y marca activo.
   * Selección explícita para evitar leer columnas inexistentes (tokenVersion) si la DB está desfasada.
   */
  static async obtenerUsuarioPorCredenciales(nombre: string, contrasena: string) {
    try {
      logger.info('login: intento', { nombre });

      const usuario = await prisma.usuario.findFirst({
        where: { nombre },
        select: {
          id: true,
          nombre: true,
          email: true,
          contrasena: true,
          empresaId: true,
          localidadId: true,
          rol: true,
          // NO seleccionamos tokenVersion aquí para esquivar P2022 si falta en DB
        },
      });

      if (!usuario) {
        logger.warn('login: usuario no encontrado', { nombre });
        return { autenticado: false, rol: null, id: null };
      }

      const valid = await argon2.verify(usuario.contrasena, contrasena);
      if (!valid) {
        logger.warn('login: contraseña inválida', { id: usuario.id, nombre: usuario.nombre });
        return { autenticado: false, rol: null, id: null };
      }

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

      logger.info('login: ok', { id: actualizado.id, rol: actualizado.rol });
      return { autenticado: true, ...actualizado };
    } catch (error: any) {
      if (error?.code === 'P2022') {
        // Columna inexistente en DB
        logPrismaError('login:P2022_probable_tokenVersion', error, { hint: 'Agregar columna tokenVersion a Usuario' });
      } else {
        logPrismaError('login', error, { nombre });
      }
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
        dataToUpdate.contrasena = await argon2.hash(contrasena, {
          timeCost: 4, memoryCost: 4096, parallelism: 2, type: argon2.argon2id, saltLength: 16,
        });
      }

      const upd = await prisma.usuario.update({
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

      logger.info('editarUsuario: ok', { id });
      return upd;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        logger.warn('editarUsuario: duplicado nombre/email', { id, nombre, email });
        throw new Error('Nombre o email ya registrados');
      }
      logPrismaError('editarUsuario', error, { id, nombre, email });
      throw error instanceof Error ? error : new Error('Error inesperado');
    }
  }

  /** Registra token de notificaciones en tabla FcmToken. */
  static async registrarPlayerId(usuarioId: number, playerId: string) {
    if (!usuarioId || !playerId) throw new Error('Usuario o playerId inválido');
    try {
      await prisma.fcmToken.upsert({
        where: { token: playerId },
        update: { usuarioId },
        create: { token: playerId, usuarioId },
      });
      logger.info('fcm: registrado', { usuarioId });
      return true;
    } catch (error) {
      logPrismaError('registrarPlayerId', error, { usuarioId });
      throw new Error('No se pudo registrar el token de notificación');
    }
  }
}
