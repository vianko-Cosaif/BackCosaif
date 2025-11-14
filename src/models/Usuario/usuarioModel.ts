// src/models/Usuario/usuarioModel.ts
import { PrismaClient, Rol } from '@prisma/client';
import argon2 from 'argon2';
import { logger as log } from '../../utils/logger';

const prisma = new PrismaClient();
const normalizeEmail = (e: string) => e.trim().toLowerCase();
const dt = (t0: bigint)=> Number(process.hrtime.bigint() - t0)/1e6;
const serPrisma = (e:any)=>({ name:e?.name, code:e?.code, clientVersion:e?.clientVersion, meta:e?.meta, message:e?.message, stack:e?.stack });

type Ctx = { reqId?: string };

export class UsuarioModel {
  static async obtenerUsuarios(ctx: Ctx = {}) {
    const t0 = process.hrtime.bigint();
    try {
      const rows = await prisma.usuario.findMany({
        select: {
          id: true, nombre: true, email: true, empresaId: true, localidadId: true, rol: true, activo: true,
          empresa: { select: { id: true, nombre: true } },
          localidad: { select: { id: true, nombre: true, estado: true } },
          tokens: { select: { jti: true, deviceId: true, ip: true, issuedAt: true, expiresAt: true, revokedAt: true, reason: true } },
          fcmTokens: { select: { id: true, token: true, createdAt: true } },
          ips: { select: { ip: true, tipoDispositivo: true } },
        },
        orderBy: { id: 'asc' },
      });
      log.info('usuarioModel:list:ok', { reqId: ctx.reqId, count: rows.length, ms: dt(t0) });
      return rows;
    } catch (error) {
      log.error('usuarioModel:list:error', { reqId: ctx.reqId, ms: dt(t0), error: serPrisma(error) });
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
      const refsMs = dt(tRefs);

      const tHash = process.hrtime.bigint();
      const contrasenaHasheada = await argon2.hash(contrasena, { timeCost: 4, memoryCost: 4096, parallelism: 2, type: argon2.argon2id });
      const hashMs = dt(tHash);

      const tIns = process.hrtime.bigint();
      const creado = await prisma.usuario.create({
        data: {
          nombre,
          email: normalizeEmail(email),
          contrasena: contrasenaHasheada,
          rol,
          empresaId,
          localidadId,
        },
        select: {
          id: true, nombre: true, email: true, rol: true,
          empresa: { select: { id: true, nombre: true } },
          localidad: { select: { id: true, nombre: true, estado: true } },
        },
      });
      const insMs = dt(tIns);

      log.info('usuarioModel:create:ok', { reqId: ctx.reqId, id: creado.id, refsMs, hashMs, insMs, totalMs: dt(t0) });
      return creado;
    } catch (error:any) {
      if (error?.code === 'P2002') {
        log.warn('usuarioModel:create:duplicate', { reqId: ctx.reqId, nombre, email });
        throw new Error('Nombre o email ya registrados');
      }
      if (error?.code === 'P2003') {
        log.error('usuarioModel:create:fk_violation', { reqId: ctx.reqId, empresaId, localidadId, error: serPrisma(error) });
        throw new Error('Relación inválida: empresaId/localidadId');
      }
      log.error('usuarioModel:create:error', { reqId: ctx.reqId, error: serPrisma(error) });
      throw error instanceof Error ? error : new Error('Error inesperado');
    }
  }

  static async obtenerUsuarioPorCredenciales(nombre: string, contrasena: string, ctx: Ctx = {}) {
    const t0 = process.hrtime.bigint();
    try {
      const tFind = process.hrtime.bigint();
      const usuario = await prisma.usuario.findFirst({
        where: { nombre },
        select: {
          id: true, nombre: true, email: true, contrasena: true,
          empresaId: true, localidadId: true, rol: true,
        },
      });
      const findMs = dt(tFind);
      if (!usuario) {
        log.warn('usuarioModel:login:not_found', { reqId: ctx.reqId, nombre, findMs, totalMs: dt(t0) });
        return { autenticado: false, rol: null, id: null };
      }

      const tVer = process.hrtime.bigint();
      const valid = await argon2.verify(usuario.contrasena, contrasena);
      const verMs = dt(tVer);
      if (!valid) {
        log.warn('usuarioModel:login:bad_password', { reqId: ctx.reqId, userId: usuario.id, verMs, totalMs: dt(t0) });
        return { autenticado: false, rol: null, id: null };
      }

      const tUpd = process.hrtime.bigint();
      const actualizado = await prisma.usuario.update({
        where: { id: usuario.id },
        data: { activo: true },
        select: {
          id: true, nombre: true, email: true, empresaId: true, localidadId: true, rol: true,
          empresa: { select: { nombre: true } },
          localidad: { select: { nombre: true, estado: true } },
        },
      });
      const updMs = dt(tUpd);

      log.info('usuarioModel:login:ok', {
        reqId: ctx.reqId, userId: actualizado.id, rol: actualizado.rol, findMs, verMs, updMs, totalMs: dt(t0),
      });
      return { autenticado: true, ...actualizado };
    } catch (error:any) {
      if (error?.code === 'P2022') {
        log.error('usuarioModel:login:p2022_missing_column', { reqId: ctx.reqId, hint: 'Agregar columna tokenVersion a Usuario', error: serPrisma(error) });
      } else {
        log.error('usuarioModel:login:error', { reqId: ctx.reqId, error: serPrisma(error) });
      }
      throw new Error('Error de autenticación');
    }
  }

  static async editarUsuario(id: number, nombre: string, email: string, contrasena?: string, ctx: Ctx = {}) {
    const t0 = process.hrtime.bigint();
    try {
      if (!nombre || !email) throw new Error('Datos incompletos');

      const dataToUpdate: { nombre: string; email: string; contrasena?: string } = {
        nombre,
        email: normalizeEmail(email),
      };

      let hashMs = 0;
      if (contrasena) {
        if (contrasena.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
        const tHash = process.hrtime.bigint();
        dataToUpdate.contrasena = await argon2.hash(contrasena, { timeCost: 4, memoryCost: 4096, parallelism: 2, type: argon2.argon2id });
        hashMs = dt(tHash);
      }

      const tUpd = process.hrtime.bigint();
      const upd = await prisma.usuario.update({
        where: { id },
        data: dataToUpdate,
        select: {
          id: true, nombre: true, email: true, rol: true,
          empresa: { select: { id: true, nombre: true } },
          localidad: { select: { id: true, nombre: true, estado: true } },
        },
      });
      const updMs = dt(tUpd);

      log.info('usuarioModel:update:ok', { reqId: ctx.reqId, id, hashMs, updMs, totalMs: dt(t0) });
      return upd;
    } catch (error:any) {
      if (error?.code === 'P2002') {
        log.warn('usuarioModel:update:duplicate', { reqId: ctx.reqId, id, nombre, email });
        throw new Error('Nombre o email ya registrados');
      }
      log.error('usuarioModel:update:error', { reqId: ctx.reqId, id, error: serPrisma(error) });
      throw error instanceof Error ? error : new Error('Error inesperado');
    }
  }

  static async registrarPlayerId(usuarioId: number, playerId: string, ctx: Ctx = {}) {
    const t0 = process.hrtime.bigint();
    if (!usuarioId || !playerId) throw new Error('Usuario o playerId inválido');
    try {
      await prisma.fcmToken.upsert({ where: { token: playerId }, update: { usuarioId }, create: { token: playerId, usuarioId } });
      log.info('usuarioModel:fcm:ok', { reqId: ctx.reqId, usuarioId, ms: dt(t0) });
      return true;
    } catch (error) {
      log.error('usuarioModel:fcm:error', { reqId: ctx.reqId, usuarioId, ms: dt(t0), error: serPrisma(error) });
      throw new Error('No se pudo registrar el token de notificación');
    }
  }
}
