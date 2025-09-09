import { PrismaClient, LavadoT, ServicioEstado } from '@prisma/client';
import { movimientoError } from '../Movimientos/movimiento.logger';

const prisma: PrismaClient = (global as any).__PRISMA__ ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') (global as any).__PRISMA__ = prisma;

type Paginado<T> = { items: T[]; total: number; page: number; pageSize: number; hasMore: boolean };

const MOV_MIN_SELECT = {
  id: true, empresaId: true, localidadId: true, locomotiveNumber: true, prioridad: true, operadorId: true,
} as const;

function whereFromOpts(opts?: { empresaId?: number; localidadId?: number; movimientoId?: number }) {
  const mov: any = {};
  if (opts?.empresaId) mov.empresaId = opts.empresaId;
  if (opts?.localidadId) mov.localidadId = opts.localidadId;
  const where: any = {};
  if (opts?.movimientoId) where.movimientoId = opts.movimientoId;
  if (Object.keys(mov).length) where.movimiento = { is: mov };
  return where;
}

export class LavadoTModel {
  /** Crear registro de LavadoT. */
  static async crear(input: { movimientoId: number; status?: ServicioEstado; inicio?: Date | null; fin?: Date | null; }): Promise<LavadoT> {
    const { movimientoId, status, inicio = null, fin = null } = input;
    try {
      const mov = await prisma.movimiento.findUnique({ where: { id: movimientoId }, select: { id: true } });
      if (!mov) throw new Error(`Movimiento ${movimientoId} no existe`);
      if (inicio && fin && fin < inicio) throw new Error('fin no puede ser anterior a inicio');

      return await prisma.lavadoT.create({ data: { movimientoId, status: status as any, inicio, fin } });
    } catch (error: any) {
      movimientoError.error('Error creando LavadoT', { movimientoId, input, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
      throw new Error('Error al crear registro de lavado');
    }
  }

  /** Crear en blanco. */
  static async crearEnBlanco(movimientoId: number, status?: ServicioEstado): Promise<LavadoT> {
    try {
      const mov = await prisma.movimiento.findUnique({ where: { id: movimientoId }, select: { id: true } });
      if (!mov) throw new Error(`Movimiento ${movimientoId} no existe`);
      return await prisma.lavadoT.create({ data: { movimientoId, status: status as any, inicio: null, fin: null } });
    } catch (error: any) {
      movimientoError.error('Error creando LavadoT en blanco', { movimientoId, status, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
      throw new Error('Error al crear registro de lavado en blanco');
    }
  }

  /** Editar campos. */
  static async editar(id: number, input: { status?: ServicioEstado; inicio?: Date | null; fin?: Date | null }): Promise<LavadoT> {
    try {
      const actual = await prisma.lavadoT.findUnique({ where: { id } });
      if (!actual) throw new Error(`LavadoT ${id} no existe`);

      const inicio = input.inicio === undefined ? actual.inicio : input.inicio;
      const fin = input.fin === undefined ? actual.fin : input.fin;
      if (inicio && fin && fin < inicio) throw new Error('fin no puede ser anterior a inicio');

      return await prisma.lavadoT.update({ where: { id }, data: { status: input.status ?? actual.status, inicio, fin } });
    } catch (error: any) {
      movimientoError.error('Error editando LavadoT', { id, input, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
      throw new Error('Error al editar registro de lavado');
    }
  }

  /** Iniciar (marca EN_SERVICIO, setea inicio si no existe y opcionalmente asigna operador al movimiento). */
  static async iniciar(id: number, usuarioId?: number, inicio?: Date): Promise<LavadoT> {
    try {
      return await prisma.$transaction(async (tx) => {
        const row = await tx.lavadoT.findUnique({ where: { id }, include: { movimiento: { select: MOV_MIN_SELECT } } });
        if (!row) throw new Error(`LavadoT ${id} no existe`);
        if (row.status === 'FINALIZADO') throw new Error('No se puede iniciar: ya finalizado');

        const when = inicio ?? new Date();
        const up = await tx.lavadoT.update({
          where: { id },
          data: { status: 'EN_SERVICIO', inicio: row.inicio ?? when, fin: row.fin && row.fin < when ? null : row.fin },
        });

        if (usuarioId) {
          await tx.movimiento.update({ where: { id: row.movimientoId }, data: { operadorId: usuarioId } });
        }
        return up;
      });
    } catch (error: any) {
      movimientoError.error('Error iniciando LavadoT', { id, usuarioId, errName: error?.name, errMsg: error?.message });
      throw new Error('Error al iniciar el lavado');
    }
  }

  /** Finalizar (marca FINALIZADO y setea fin). */
  static async finalizar(id: number, fin?: Date): Promise<LavadoT> {
    try {
      return await prisma.$transaction(async (tx) => {
        const row = await tx.lavadoT.findUnique({ where: { id } });
        if (!row) throw new Error(`LavadoT ${id} no existe`);
        if (row.status === 'FINALIZADO') return row;
        const when = fin ?? new Date();
        const inicio = row.inicio ?? when; // si nunca se marcó inicio, igualarlo a fin
        return await tx.lavadoT.update({ where: { id }, data: { status: 'FINALIZADO', inicio, fin: when } });
      });
    } catch (error: any) {
      movimientoError.error('Error finalizando LavadoT', { id, errName: error?.name, errMsg: error?.message });
      throw new Error('Error al finalizar el lavado');
    }
  }

  /** Asignar operador (usuario) al movimiento dueño del LavadoT. */
  static async asignarOperador(id: number, usuarioId: number): Promise<void> {
    const row = await prisma.lavadoT.findUnique({ where: { id }, select: { movimientoId: true } });
    if (!row) throw new Error(`LavadoT ${id} no existe`);
    await prisma.movimiento.update({ where: { id: row.movimientoId }, data: { operadorId: usuarioId } });
  }

  /** Listar EN_SERVICIO (con filtros). */
  static async listarEnServicio(opts: { empresaId?: number; localidadId?: number; movimientoId?: number } = {}): Promise<LavadoT[]> {
    try {
      const where = { ...whereFromOpts(opts), status: 'EN_SERVICIO' as ServicioEstado };
      return await prisma.lavadoT.findMany({
        where,
        include: { movimiento: { select: MOV_MIN_SELECT } },
        orderBy: [{ movimiento: { prioridad: 'desc' } }, { createdAt: 'asc' }],
      });
    } catch (error: any) {
      movimientoError.error('Error listando LavadoT EN_SERVICIO', { opts, errName: error?.name, errMsg: error?.message });
      throw new Error('Error al listar lavados en servicio');
    }
  }

  /** Lista que NO están EN_SERVICIO NI FINALIZADO (pendientes). */
  static async listarNoEnProceso(opts: { empresaId?: number; localidadId?: number; movimientoId?: number } = {}): Promise<LavadoT[]> {
    try {
      const where = {
        ...whereFromOpts(opts),
        status: { notIn: [ServicioEstado.EN_SERVICIO, ServicioEstado.FINALIZADO] },
      };
      return await prisma.lavadoT.findMany({
        where,
        include: { movimiento: { select: MOV_MIN_SELECT } },
        orderBy: [{ movimiento: { prioridad: 'desc' } }, { createdAt: 'asc' }],
      });
    } catch (error: any) {
      movimientoError.error('Error listando LavadoT no en proceso', { opts, errName: error?.name, errMsg: error?.message });
      throw new Error('Error al listar lavados pendientes');
    }
  }

  /** Paginado con filtros y status opcional. */
  static async listarPaginado(opts: {
    page?: number; pageSize?: number;
    empresaId?: number; localidadId?: number; movimientoId?: number;
    status?: ServicioEstado | 'PENDIENTES'; // PENDIENTES = !EN_SERVICIO && !FINALIZADO
  } = {}): Promise<Paginado<LavadoT>> {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
    const base = whereFromOpts(opts);
    const where: any = { ...base };
    if (opts.status === 'PENDIENTES') where.status = { notIn: [ServicioEstado.EN_SERVICIO, ServicioEstado.FINALIZADO] };
    else if (opts.status) where.status = opts.status;

    const [total, items] = await prisma.$transaction([
      prisma.lavadoT.count({ where }),
      prisma.lavadoT.findMany({
        where,
        include: { movimiento: { select: MOV_MIN_SELECT } },
        orderBy: [{ movimiento: { prioridad: 'desc' } }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items, total, page, pageSize, hasMore: page * pageSize < total };
  }

  /** Siguientes para iniciar (máx `limit`, default 2). */
  static async siguientesParaIniciar(opts: { empresaId?: number; localidadId?: number; limit?: number } = {}) {
    const limit = Math.min(10, Math.max(1, opts.limit ?? 2));
    const where = {
      ...whereFromOpts(opts),
      status: { notIn: [ServicioEstado.EN_SERVICIO, ServicioEstado.FINALIZADO] },
    };
    return prisma.lavadoT.findMany({
      where,
      include: { movimiento: { select: MOV_MIN_SELECT } },
      orderBy: [{ movimiento: { prioridad: 'desc' } }, { createdAt: 'asc' }],
      take: limit,
    });
  }

  /** Obtener por id. */
  static async obtener(id: number): Promise<LavadoT> {
    try {
      const row = await prisma.lavadoT.findUnique({ where: { id } });
      if (!row) throw new Error(`LavadoT ${id} no existe`);
      return row;
    } catch (error: any) {
      movimientoError.error('Error obteniendo LavadoT', { id, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
      throw new Error('Error al obtener registro de lavado');
    }
  }
}
