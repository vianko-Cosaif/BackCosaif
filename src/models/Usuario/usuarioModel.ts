// src/models/Usuario/usuarioModel.ts
import { Prisma, Rol } from '@prisma/client';
import argon2 from 'argon2';
import { logger as log } from '../../utils/logger';
import { prisma } from '../../lib/prisma';

type Ctx = { reqId?: string };

const usuarioCredencialesSelect = {
  id: true,
  nombre: true,
  email: true,
  contrasena: true,
  empresaId: true,
  localidadId: true,
  rol: true,
  activo: true,
  tokenVersion: true,
  empresa: { select: { id: true, nombre: true } },
  localidad: { select: { id: true, nombre: true, estado: true } },
} as const satisfies Prisma.UsuarioSelect;

type UsuarioCredencialesRow = Prisma.UsuarioGetPayload<{ select: typeof usuarioCredencialesSelect }>;
type UsuarioAutenticado = Omit<UsuarioCredencialesRow, 'contrasena'> & { autenticado: true };
type UsuarioNoAutenticado = { autenticado: false; desactivado?: true; id?: number };
export type UsuarioCredencialesResultado = UsuarioAutenticado | UsuarioNoAutenticado;

type EditarUsuarioInput = {
  nombre?: string;
  email?: string;
  contrasena?: string;
  rol?: Rol;
  empresaId?: number;
  localidadId?: number;
};

type ObtenerUsuariosOptions = {
  includeAdminOnlyRoles?: boolean;
  localidadId?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readStringField(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === 'string' ? value : undefined;
}

export class UsuarioModel {
  private static normalizeEmail(e: string) {
    return e.trim().toLowerCase();
  }

  private static dt(t0: bigint) {
    return Number(process.hrtime.bigint() - t0) / 1e6;
  }

  private static prismaCode(error: unknown) {
    return isRecord(error) ? readStringField(error, 'code') : undefined;
  }

  private static serPrisma(e: unknown) {
    const error = isRecord(e) ? e : {};
    return {
      name: readStringField(error, 'name'),
      code: readStringField(error, 'code'),
      clientVersion: readStringField(error, 'clientVersion'),
      meta: error.meta,
      message: readStringField(error, 'message'),
      stack: readStringField(error, 'stack'),
    };
  }

  static async obtenerUsuarios(ctx: Ctx = {}, options: ObtenerUsuariosOptions = {}) {
    const t0 = process.hrtime.bigint();
    try {
      const rows = await prisma.usuario.findMany({
        where: {
          ...(options.includeAdminOnlyRoles
            ? {}
            : { rol: { notIn: [Rol.ADMINISTRADOR, Rol.COMERCIAL] } }),
          ...(options.localidadId ? { localidadId: options.localidadId } : {}),
        },
        select: {
          id: true, nombre: true, email: true, empresaId: true, localidadId: true, rol: true, activo: true,
          empresa: { select: { id: true, nombre: true } },
          localidad: { select: { id: true, nombre: true, estado: true } },
        },
        orderBy: { id: 'asc' },
      });
      log.info('usuarioModel:list:ok', { reqId: ctx.reqId, count: rows.length, ms: this.dt(t0) });
      return rows;
    } catch (error) {
      log.error('usuarioModel:list:error', { reqId: ctx.reqId, ms: this.dt(t0), error: this.serPrisma(error) });
      throw new Error('Error de base de datos');
    }
  }

  static async obtenerUsuarioResumen(id: number, ctx: Ctx = {}) {
    try {
      return await prisma.usuario.findUnique({
        where: { id },
        select: { id: true, rol: true, activo: true, localidadId: true },
      });
    } catch (error) {
      log.error('usuarioModel:summary:error', { reqId: ctx.reqId, id, error: this.serPrisma(error) });
      throw new Error('Error de base de datos');
    }
  }

  static async crearUsuario(
    nombre: string, email: string, contrasena: string, rol: Rol, empresaId: number, localidadId: number,
    ctx: Ctx = {}
  ) {
    const t0 = process.hrtime.bigint();
    try {
      if (!nombre || !email || !contrasena || !rol || !empresaId || !localidadId) {
        log.warn('usuarioModel:create:bad_input', { reqId: ctx.reqId, nombre, email, rol, empresaId, localidadId });
        throw new Error('Datos incompletos');
      }
      if (contrasena.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
      if (!Object.values(Rol).includes(rol)) throw new Error('Rol no válido');

      const tRefs = process.hrtime.bigint();
      const [empresa, localidad] = await Promise.all([
        prisma.empresa.findUnique({ where: { id: empresaId } }),
        prisma.localidad.findUnique({ where: { id: localidadId } }),
      ]);
      if (!empresa) { log.warn('usuarioModel:create:empresa_invalida', { reqId: ctx.reqId, empresaId }); throw new Error('Empresa no válida'); }
      if (!localidad){ log.warn('usuarioModel:create:localidad_invalida', { reqId: ctx.reqId, localidadId }); throw new Error('Localidad no válida'); }
      const refsMs = this.dt(tRefs);

      const tHash = process.hrtime.bigint();
      const contrasenaHasheada = await argon2.hash(contrasena, { timeCost: 4, memoryCost: 4096, parallelism: 2, type: argon2.argon2id });
      const hashMs = this.dt(tHash);

      const tIns = process.hrtime.bigint();
      const creado = await prisma.usuario.create({
        data: {
          nombre,
          email: this.normalizeEmail(email),
          contrasena: contrasenaHasheada,
          rol,
          empresaId,
          localidadId,
          activo: true,
        },
        select: {
          id: true, nombre: true, email: true, rol: true, empresaId: true, localidadId: true, activo: true,
          empresa: { select: { id: true, nombre: true } },
          localidad: { select: { id: true, nombre: true, estado: true } },
        },
      });
      const insMs = this.dt(tIns);

      log.info('usuarioModel:create:ok', { reqId: ctx.reqId, id: creado.id, refsMs, hashMs, insMs, totalMs: this.dt(t0) });
      return creado;
    } catch (error) {
      const code = this.prismaCode(error);
      if (code === 'P2002') {
        log.warn('usuarioModel:create:duplicate', { reqId: ctx.reqId, nombre, email });
        throw new Error('Nombre o email ya registrados');
      }
      if (code === 'P2003') {
        log.error('usuarioModel:create:fk_violation', { reqId: ctx.reqId, empresaId, localidadId, error: this.serPrisma(error) });
        throw new Error('Relación inválida: empresaId/localidadId');
      }
      log.error('usuarioModel:create:error', { reqId: ctx.reqId, error: this.serPrisma(error) });
      throw error instanceof Error ? error : new Error('Error inesperado');
    }
  }

  static async obtenerUsuarioPorCredenciales(
    nombre: string,
    contrasena: string,
    ctx: Ctx = {}
  ): Promise<UsuarioCredencialesResultado> {
    const t0 = process.hrtime.bigint();
    try {
      const tFind = process.hrtime.bigint();
      const usuario = await prisma.usuario.findFirst({
        where: { nombre },
        select: usuarioCredencialesSelect,
      });
      const findMs = this.dt(tFind);
      if (!usuario) {
        log.warn('usuarioModel:login:not_found', { reqId: ctx.reqId, nombre, findMs, totalMs: this.dt(t0) });
        return { autenticado: false };
      }

      const tVer = process.hrtime.bigint();
      const valid = await argon2.verify(usuario.contrasena, contrasena);
      const verMs = this.dt(tVer);
      if (!valid) {
        log.warn('usuarioModel:login:bad_password', { reqId: ctx.reqId, userId: usuario.id, verMs, totalMs: this.dt(t0) });
        return { autenticado: false };
      }

      if (!usuario.activo) {
        log.warn('usuarioModel:login:inactive', { reqId: ctx.reqId, userId: usuario.id, verMs, totalMs: this.dt(t0) });
        return { autenticado: false, desactivado: true, id: usuario.id };
      }

      log.info('usuarioModel:login:ok', {
        reqId: ctx.reqId, userId: usuario.id, rol: usuario.rol, findMs, verMs, totalMs: this.dt(t0),
      });
      const { contrasena: _contrasena, ...safeUsuario } = usuario;
      return { autenticado: true, ...safeUsuario };
    } catch (error) {
      if (this.prismaCode(error) === 'P2022') {
        log.error('usuarioModel:login:p2022_missing_column', { reqId: ctx.reqId, hint: 'Agregar columna tokenVersion a Usuario', error: this.serPrisma(error) });
      } else {
        log.error('usuarioModel:login:error', { reqId: ctx.reqId, error: this.serPrisma(error) });
      }
      throw new Error('Error de autenticación');
    }
  }

  static async editarUsuario(id: number, input: EditarUsuarioInput, ctx: Ctx = {}) {
    const t0 = process.hrtime.bigint();
    try {
      if (!Number.isInteger(id) || id <= 0) throw new Error('Usuario inválido');

      const dataToUpdate: Prisma.UsuarioUncheckedUpdateInput = {};
      let invalidarSesiones = false;

      if (input.nombre !== undefined) {
        const nombre = String(input.nombre).trim();
        if (!nombre) throw new Error('El nombre es obligatorio');
        dataToUpdate.nombre = nombre;
      }

      if (input.email !== undefined) {
        const email = String(input.email).trim();
        if (!email) throw new Error('El email es obligatorio');
        dataToUpdate.email = this.normalizeEmail(email);
      }

      if (input.rol !== undefined) {
        if (!Object.values(Rol).includes(input.rol)) throw new Error('Rol no válido');
        dataToUpdate.rol = input.rol;
        invalidarSesiones = true;
      }

      const validarEmpresa = input.empresaId !== undefined;
      const validarLocalidad = input.localidadId !== undefined;
      if (validarEmpresa || validarLocalidad) {
        const [empresa, localidad] = await Promise.all([
          validarEmpresa ? prisma.empresa.findUnique({ where: { id: Number(input.empresaId) } }) : Promise.resolve(true),
          validarLocalidad ? prisma.localidad.findUnique({ where: { id: Number(input.localidadId) } }) : Promise.resolve(true),
        ]);
        if (!empresa) throw new Error('Empresa no válida');
        if (!localidad) throw new Error('Localidad no válida');
      }

      if (validarEmpresa) {
        dataToUpdate.empresaId = Number(input.empresaId);
        invalidarSesiones = true;
      }

      if (validarLocalidad) {
        dataToUpdate.localidadId = Number(input.localidadId);
        invalidarSesiones = true;
      }

      let hashMs = 0;
      const contrasena = String(input.contrasena ?? '').trim();
      if (contrasena) {
        if (contrasena.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
        const tHash = process.hrtime.bigint();
        dataToUpdate.contrasena = await argon2.hash(contrasena, { timeCost: 4, memoryCost: 4096, parallelism: 2, type: argon2.argon2id });
        hashMs = this.dt(tHash);
        invalidarSesiones = true;
      }

      if (Object.keys(dataToUpdate).length === 0) {
        throw new Error('No hay cambios para guardar');
      }

      if (invalidarSesiones) {
        dataToUpdate.tokenVersion = { increment: 1 };
      }

      const tUpd = process.hrtime.bigint();
      const upd = invalidarSesiones
        ? await prisma.$transaction(async (tx) => {
            const usuario = await tx.usuario.update({
              where: { id },
              data: dataToUpdate,
              select: {
                id: true, nombre: true, email: true, rol: true, empresaId: true, localidadId: true, activo: true, tokenVersion: true,
                empresa: { select: { id: true, nombre: true } },
                localidad: { select: { id: true, nombre: true, estado: true } },
              },
            });

            await tx.token.updateMany({
              where: { usuarioId: id, revokedAt: null },
              data: { revokedAt: new Date(), reason: 'account_profile_changed' },
            });

            return usuario;
          })
        : await prisma.usuario.update({
            where: { id },
            data: dataToUpdate,
            select: {
              id: true, nombre: true, email: true, rol: true, empresaId: true, localidadId: true, activo: true, tokenVersion: true,
              empresa: { select: { id: true, nombre: true } },
              localidad: { select: { id: true, nombre: true, estado: true } },
            },
          });
      const updMs = this.dt(tUpd);

      log.info('usuarioModel:update:ok', { reqId: ctx.reqId, id, hashMs, updMs, totalMs: this.dt(t0) });
      return upd;
    } catch (error) {
      const code = this.prismaCode(error);
      if (code === 'P2002') {
        log.warn('usuarioModel:update:duplicate', { reqId: ctx.reqId, id, nombre: input.nombre, email: input.email });
        throw new Error('Nombre o email ya registrados');
      }
      if (code === 'P2025') {
        log.warn('usuarioModel:update:not_found', { reqId: ctx.reqId, id });
        throw new Error('Usuario no encontrado');
      }
      log.error('usuarioModel:update:error', { reqId: ctx.reqId, id, error: this.serPrisma(error) });
      throw error instanceof Error ? error : new Error('Error inesperado');
    }
  }

  static async cambiarEstadoUsuario(id: number, activo: boolean, ctx: Ctx = {}) {
    const t0 = process.hrtime.bigint();
    try {
      if (!Number.isInteger(id) || id <= 0) throw new Error('Usuario inválido');
      if (typeof activo !== 'boolean') throw new Error('Estado inválido');

      const reason = activo ? 'account_reactivated' : 'account_deactivated';
      const updated = await prisma.$transaction(async (tx) => {
        const usuario = await tx.usuario.update({
          where: { id },
          data: {
            activo,
            tokenVersion: { increment: 1 },
          },
          select: {
            id: true, nombre: true, email: true, rol: true, empresaId: true, localidadId: true,
            activo: true, tokenVersion: true,
            empresa: { select: { id: true, nombre: true } },
            localidad: { select: { id: true, nombre: true, estado: true } },
          },
        });

        await tx.token.updateMany({
          where: { usuarioId: id, revokedAt: null },
          data: { revokedAt: new Date(), reason },
        });

        return usuario;
      });

      log.info('usuarioModel:status:ok', { reqId: ctx.reqId, id, activo, totalMs: this.dt(t0) });
      return updated;
    } catch (error) {
      if (this.prismaCode(error) === 'P2025') {
        log.warn('usuarioModel:status:not_found', { reqId: ctx.reqId, id });
        throw new Error('Usuario no encontrado');
      }
      log.error('usuarioModel:status:error', { reqId: ctx.reqId, id, activo, error: this.serPrisma(error) });
      throw error instanceof Error ? error : new Error('Error inesperado');
    }
  }

  static async registrarPlayerId(usuarioId: number, playerId: string, ctx: Ctx = {}) {
    const t0 = process.hrtime.bigint();
    if (!usuarioId || !playerId) throw new Error('Usuario o playerId inválido');
    try {
      await prisma.fcmToken.upsert({ where: { token: playerId }, update: { usuarioId }, create: { token: playerId, usuarioId } });
      log.info('usuarioModel:fcm:ok', { reqId: ctx.reqId, usuarioId, ms: this.dt(t0) });
      return true;
    } catch (error) {
      log.error('usuarioModel:fcm:error', { reqId: ctx.reqId, usuarioId, ms: this.dt(t0), error: this.serPrisma(error) });
      throw new Error('No se pudo registrar el token de notificación');
    }
  }
}
