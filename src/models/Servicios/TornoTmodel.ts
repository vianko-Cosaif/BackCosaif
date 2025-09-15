import { PrismaClient, TornoT, ServicioEstado } from '@prisma/client';
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

export class TornoTModel {
  static async crear(input: { movimientoId: number; status?: ServicioEstado; inicio?: Date | null; fin?: Date | null; }): Promise<TornoT> {
    const { movimientoId, status, inicio = null, fin = null } = input;
    try {
      const mov = await prisma.movimiento.findUnique({ where: { id: movimientoId }, select: { id: true, localidadId: true } });
      if (!mov) throw new Error(`Movimiento ${movimientoId} no existe`);
      if (inicio && fin && fin < inicio) throw new Error('fin no puede ser anterior a inicio');

      return await prisma.tornoT.create({
          data: {
    movimientoId,
    localidadId: mov.localidadId,            // ← agregar
    status: ServicioEstado.EN_SERVICIO,      // ← usar enum
    inicio: new Date(),
  },

      });
    } catch (error: any) {
      movimientoError.error('Error creando TornoT', { movimientoId, input, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
      throw new Error('Error al crear registro de torno');
    }
  }

  static async crearEnBlanco(movimientoId: number, status?: ServicioEstado): Promise<TornoT> {
    try {
      const mov = await prisma.movimiento.findUnique({ where: { id: movimientoId }, select: { id: true, localidadId: true } });
      if (!mov) throw new Error(`Movimiento ${movimientoId} no existe`);

      return await prisma.tornoT.create({
        data: {
          movimientoId,
          localidadId: mov.localidadId,
          status: status ?? ServicioEstado.DETENIDO,
          inicio: null,
          fin: null,
        },
      });
    } catch (error: any) {
      movimientoError.error('Error creando TornoT en blanco', { movimientoId, status, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
      throw new Error('Error al crear registro de torno en blanco');
    }
  }

  static async editar(id: number, input: { status?: ServicioEstado; inicio?: Date | null; fin?: Date | null }): Promise<TornoT> {
    try {
      const actual = await prisma.tornoT.findUnique({ where: { id } });
      if (!actual) throw new Error(`TornoT ${id} no existe`);

      const inicio = input.inicio === undefined ? actual.inicio : input.inicio;
      const fin = input.fin === undefined ? actual.fin : input.fin;
      if (inicio && fin && fin < inicio) throw new Error('fin no puede ser anterior a inicio');

      return await prisma.tornoT.update({ where: { id }, data: { status: input.status ?? actual.status, inicio, fin } });
    } catch (error: any) {
      movimientoError.error('Error editando TornoT', { id, input, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
      throw new Error('Error al editar registro de torno');
    }
  }

  static async iniciar(id: number, usuarioId?: number, inicio?: Date): Promise<TornoT> {
    try {
      return await prisma.$transaction(async (tx) => {
        const row = await tx.tornoT.findUnique({ where: { id }, include: { movimiento: { select: MOV_MIN_SELECT } } });
        if (!row) throw new Error(`TornoT ${id} no existe`);
        if (row.status === 'FINALIZADO') throw new Error('No se puede iniciar: ya finalizado');

        const when = inicio ?? new Date();
        const up = await tx.tornoT.update({
          where: { id },
          data: { status: 'EN_SERVICIO', inicio: row.inicio ?? when, fin: row.fin && row.fin < when ? null : row.fin },
        });

        if (usuarioId) {
          await tx.movimiento.update({ where: { id: row.movimientoId }, data: { operadorId: usuarioId } });
        }
        return up;
      });
    } catch (error: any) {
      movimientoError.error('Error iniciando TornoT', { id, usuarioId, errName: error?.name, errMsg: error?.message });
      throw new Error('Error al iniciar el torno');
    }
  }

  static async finalizar(id: number, fin?: Date): Promise<TornoT> {
    try {
      return await prisma.$transaction(async (tx) => {
        const row = await tx.tornoT.findUnique({ where: { id } });
        if (!row) throw new Error(`TornoT ${id} no existe`);
        if (row.status === 'FINALIZADO') return row;
        const when = fin ?? new Date();
        const inicio = row.inicio ?? when;
        return await tx.tornoT.update({ where: { id }, data: { status: 'FINALIZADO', inicio, fin: when } });
      });
    } catch (error: any) {
      movimientoError.error('Error finalizando TornoT', { id, errName: error?.name, errMsg: error?.message });
      throw new Error('Error al finalizar el torno');
    }
  }

  static async asignarOperador(id: number, usuarioId: number): Promise<void> {
    const row = await prisma.tornoT.findUnique({ where: { id }, select: { movimientoId: true } });
    if (!row) throw new Error(`TornoT ${id} no existe`);
    await prisma.movimiento.update({ where: { id: row.movimientoId }, data: { operadorId: usuarioId } });
  }

  static async enServicioUno(opts: { empresaId?: number; localidadId?: number; movimientoId?: number } = {}): Promise<TornoT | null> {
    try {
      const where = { ...whereFromOpts(opts), status: 'EN_SERVICIO' as ServicioEstado };
      return await prisma.tornoT.findFirst({
        where,
        include: { movimiento: { select: MOV_MIN_SELECT } },
        orderBy: [{ movimiento: { prioridad: 'desc' } }, { createdAt: 'asc' }],
      });
    } catch (error: any) {
      movimientoError.error('Error obteniendo TornoT EN_SERVICIO (uno)', { opts, errName: error?.name, errMsg: error?.message });
      throw new Error('Error al obtener torno en servicio');
    }
  }

  static async listarEnServicio(opts: { empresaId?: number; localidadId?: number; movimientoId?: number } = {}): Promise<TornoT[]> {
    try {
      const where = { ...whereFromOpts(opts), status: 'EN_SERVICIO' as ServicioEstado };
      return await prisma.tornoT.findMany({
        where,
        include: { movimiento: { select: MOV_MIN_SELECT } },
        orderBy: [{ movimiento: { prioridad: 'desc' } }, { createdAt: 'asc' }],
      });
    } catch (error: any) {
      movimientoError.error('Error listando TornoT EN_SERVICIO', { opts, errName: error?.name, errMsg: error?.message });
      throw new Error('Error al listar tornos en servicio');
    }
  }

  static async listarNoEnProceso(opts: { empresaId?: number; localidadId?: number; movimientoId?: number } = {}): Promise<TornoT[]> {
    try {
      const where = {
        ...whereFromOpts(opts),
        status: { notIn: [ServicioEstado.EN_SERVICIO, ServicioEstado.FINALIZADO] },
      };
      return await prisma.tornoT.findMany({
        where,
        include: { movimiento: { select: MOV_MIN_SELECT } },
        orderBy: [{ movimiento: { prioridad: 'desc' } }, { createdAt: 'asc' }],
      });
    } catch (error: any) {
      movimientoError.error('Error listando TornoT no en proceso', { opts, errName: error?.name, errMsg: error?.message });
      throw new Error('Error al listar tornos pendientes');
    }
  }

  static async listarPaginado(opts: {
    page?: number; pageSize?: number; empresaId?: number; localidadId?: number; movimientoId?: number; status?: ServicioEstado | 'PENDIENTES';
  } = {}): Promise<Paginado<TornoT>> {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
    const base = whereFromOpts(opts);
    const where: any = { ...base };
    if (opts.status === 'PENDIENTES') where.status = { notIn: [ServicioEstado.EN_SERVICIO, ServicioEstado.FINALIZADO] };
    else if (opts.status) where.status = opts.status;

    const [total, items] = await prisma.$transaction([
      prisma.tornoT.count({ where }),
      prisma.tornoT.findMany({
        where,
        include: { movimiento: { select: MOV_MIN_SELECT } },
        orderBy: [{ movimiento: { prioridad: 'desc' } }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items, total, page, pageSize, hasMore: page * pageSize < total };
  }

  static async siguienteParaIniciar(opts: { empresaId?: number; localidadId?: number } = {}): Promise<TornoT | null> {
    const where = {
      ...whereFromOpts(opts),
      status: { notIn: [ServicioEstado.EN_SERVICIO, ServicioEstado.FINALIZADO] },
    };
    return prisma.tornoT.findFirst({
      where,
      include: { movimiento: { select: MOV_MIN_SELECT } },
      orderBy: [{ movimiento: { prioridad: 'desc' } }, { createdAt: 'asc' }],
    });
  }

  static async obtener(id: number): Promise<TornoT> {
    try {
      const row = await prisma.tornoT.findUnique({ where: { id } });
      if (!row) throw new Error(`TornoT ${id} no existe`);
      return row;
    } catch (error: any) {
      movimientoError.error('Error obteniendo TornoT', { id, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
      throw new Error('Error al obtener registro de torno');
    }
  }
}
