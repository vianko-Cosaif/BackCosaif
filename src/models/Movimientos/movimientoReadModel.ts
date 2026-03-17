import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { parseMetaFromInstrucciones } from './movimiento.meta';
import { movimientoError } from './movimiento.logger';
import { EDITABLE_KEYS, ESTADOS_EDITABLES } from './movimiento.shared';
import type { MovimientoPagination } from './movimiento.types';

type MovimientoPageMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

const MOVIMIENTOS_ORDER_DESC = [
  { createdAt: 'desc' },
  { id: 'desc' },
] satisfies Prisma.MovimientoOrderByWithRelationInput[];

const MOVIMIENTOS_ORDER_PENDIENTES = [
  { prioridad: 'desc' },
  { createdAt: 'asc' },
  { id: 'asc' },
] satisfies Prisma.MovimientoOrderByWithRelationInput[];

const MOVIMIENTO_LIST_INCLUDE = {
  empresa: true,
  creadoPor: true,
  localidad: true,
  viaOrigen: true,
  viaDestino: true,
  incidentes: true,
  ronda: true,
} satisfies Prisma.MovimientoInclude;

type MovimientoListado = Prisma.MovimientoGetPayload<{
  include: typeof MOVIMIENTO_LIST_INCLUDE;
}>;

type MovimientoListadoPaginado = {
  data: MovimientoListado[];
  meta: MovimientoPageMeta;
};

export class MovimientoReadModel {
  private static async listarMovimientosColeccion(args: {
    where?: Prisma.MovimientoWhereInput;
    orderBy?: Prisma.MovimientoOrderByWithRelationInput[];
    pagination: MovimientoPagination;
  }): Promise<MovimientoListadoPaginado> {
    const { where = {}, orderBy = MOVIMIENTOS_ORDER_DESC, pagination } = args;
    const skip = (pagination.page - 1) * pagination.pageSize;

    const [data, total] = await Promise.all([
      prisma.movimiento.findMany({
        where,
        include: MOVIMIENTO_LIST_INCLUDE,
        orderBy,
        skip,
        take: pagination.pageSize,
      }),
      prisma.movimiento.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: total === 0 ? 1 : Math.ceil(total / pagination.pageSize),
        hasNextPage: pagination.page * pagination.pageSize < total,
        hasPreviousPage: pagination.page > 1,
      },
    };
  }

  static async obtenerMovimientoPorId(id: number) {
    try {
      return await prisma.movimiento.findUnique({
        where: { id },
        include: MOVIMIENTO_LIST_INCLUDE,
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimiento por id', {
        id,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimiento');
    }
  }

  static async obtenerMovimientos() {
    try {
      return await prisma.movimiento.findMany({
        include: MOVIMIENTO_LIST_INCLUDE,
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos', {
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos');
    }
  }

  static async obtenerMovimientosPaginados(pagination: MovimientoPagination) {
    try {
      return await this.listarMovimientosColeccion({ pagination, orderBy: MOVIMIENTOS_ORDER_DESC });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos paginados', {
        pagination,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos');
    }
  }

  static async obtenerServiciosPendientes(filters: { localidadId?: number; empresaId?: number } = {}) {
    try {
      const where: any = {
        finalizado: false,
        OR: [{ lavado: true }, { torno: true }],
        estado: { in: ['SOLICITADO', 'DETENIDO', 'ESPERA'] },
      };
      if (filters.localidadId) where.localidadId = filters.localidadId;
      if (filters.empresaId) where.empresaId = filters.empresaId;

      return await prisma.movimiento.findMany({
        where,
        include: {
          empresa: true,
          localidad: true,
          viaOrigen: true,
          viaDestino: true,
          ronda: true,
        },
        orderBy: [{ prioridad: 'desc' }, { createdAt: 'asc' }],
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener servicios pendientes', {
        filters,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener servicios pendientes');
    }
  }

  static async obtenerMovimientosPendientes() {
    try {
      return await prisma.movimiento.findMany({
        where: { finalizado: false, estado: { in: ['EN_PROCESO', 'DETENIDO', 'ESPERA'] } },
        include: MOVIMIENTO_LIST_INCLUDE,
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos pendientes', {
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos pendientes');
    }
  }

  static async obtenerMovimientosPendientesPaginados(pagination: MovimientoPagination) {
    try {
      return await this.listarMovimientosColeccion({
        where: { finalizado: false, estado: { in: ['EN_PROCESO', 'DETENIDO', 'ESPERA'] } },
        orderBy: MOVIMIENTOS_ORDER_PENDIENTES,
        pagination,
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos pendientes paginados', {
        pagination,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos pendientes');
    }
  }

  static async obtenerMovimientosPendientesPorEmpresa(empresaId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { empresaId, finalizado: false, estado: { in: ['SOLICITADO', 'EN_PROCESO', 'DETENIDO', 'ESPERA'] } },
        include: MOVIMIENTO_LIST_INCLUDE,
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos pendientes por empresa', {
        empresaId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos pendientes por empresa');
    }
  }

  static async obtenerMovimientosPendientesPorEmpresaPaginados(empresaId: number, pagination: MovimientoPagination) {
    try {
      return await this.listarMovimientosColeccion({
        where: { empresaId, finalizado: false, estado: { in: ['SOLICITADO', 'EN_PROCESO', 'DETENIDO', 'ESPERA'] } },
        orderBy: MOVIMIENTOS_ORDER_PENDIENTES,
        pagination,
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos pendientes por empresa paginados', {
        empresaId, pagination,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos pendientes por empresa');
    }
  }

  static async obtenerTodosLosMovimientos() {
    try {
      return await prisma.movimiento.findMany({
        include: MOVIMIENTO_LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener todos los movimientos', {
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener todos los movimientos');
    }
  }

  static async obtenerTodosLosMovimientosPaginados(pagination: MovimientoPagination) {
    try {
      return await this.listarMovimientosColeccion({ pagination, orderBy: MOVIMIENTOS_ORDER_DESC });
    } catch (error: any) {
      movimientoError.error('Error al obtener todos los movimientos paginados', {
        pagination,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener todos los movimientos');
    }
  }

  static async obtenerMovimientosPorEmpresa(empresaId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { empresaId },
        include: MOVIMIENTO_LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos por empresa', {
        empresaId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos por empresa');
    }
  }

  static async obtenerMovimientosPorEmpresaPaginados(empresaId: number, pagination: MovimientoPagination) {
    try {
      return await this.listarMovimientosColeccion({
        where: { empresaId },
        orderBy: MOVIMIENTOS_ORDER_DESC,
        pagination,
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos por empresa paginados', {
        empresaId, pagination,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos por empresa');
    }
  }

  static async obtenerMovimientosPendientesPorLocalidad(localidadId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { localidadId, finalizado: false, estado: { in: ['SOLICITADO', 'EN_PROCESO', 'DETENIDO', 'ESPERA'] } },
        include: MOVIMIENTO_LIST_INCLUDE,
        orderBy: { createdAt: 'asc' },
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos pendientes por localidad', {
        localidadId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos pendientes por localidad');
    }
  }

  static async obtenerMovimientosPendientesPorLocalidadPaginados(localidadId: number, pagination: MovimientoPagination) {
    try {
      return await this.listarMovimientosColeccion({
        where: { localidadId, finalizado: false, estado: { in: ['SOLICITADO', 'EN_PROCESO', 'DETENIDO', 'ESPERA'] } },
        orderBy: MOVIMIENTOS_ORDER_PENDIENTES,
        pagination,
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos pendientes por localidad paginados', {
        localidadId, pagination,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos pendientes por localidad');
    }
  }

  static async obtenerTodosMovimientosPorLocalidad(localidadId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { localidadId },
        include: MOVIMIENTO_LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener todos los movimientos por localidad', {
        localidadId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener todos los movimientos por localidad');
    }
  }

  static async obtenerTodosMovimientosPorLocalidadPaginados(localidadId: number, pagination: MovimientoPagination) {
    try {
      return await this.listarMovimientosColeccion({
        where: { localidadId },
        orderBy: MOVIMIENTOS_ORDER_DESC,
        pagination,
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener todos los movimientos por localidad paginados', {
        localidadId, pagination,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener todos los movimientos por localidad');
    }
  }

  static async obtenerMovimientosPorLocalidadEmpresa(localidadId: number, empresaId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { localidadId, empresaId },
        include: MOVIMIENTO_LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos por localidad y empresa', {
        localidadId, empresaId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos por localidad y empresa');
    }
  }

  static async obtenerMovimientosPorLocalidadEmpresaPaginados(localidadId: number, empresaId: number, pagination: MovimientoPagination) {
    try {
      return await this.listarMovimientosColeccion({
        where: { localidadId, empresaId },
        orderBy: MOVIMIENTOS_ORDER_DESC,
        pagination,
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos por localidad y empresa paginados', {
        localidadId, empresaId, pagination,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos por localidad y empresa');
    }
  }

  static async obtenerMovimientosPorEmpresaYLocalidad(empresaId: number, localidadId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { empresaId, localidadId },
        include: MOVIMIENTO_LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos por empresa y localidad', {
        empresaId, localidadId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos por empresa y localidad');
    }
  }

  static async obtenerMovimientosPorEmpresaYLocalidadPaginados(empresaId: number, localidadId: number, pagination: MovimientoPagination) {
    try {
      return await this.listarMovimientosColeccion({
        where: { empresaId, localidadId },
        orderBy: MOVIMIENTOS_ORDER_DESC,
        pagination,
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos por empresa y localidad paginados', {
        empresaId, localidadId, pagination,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos por empresa y localidad');
    }
  }

  static async obtenerMovimientosNoConcluidosPorEmpresaYLocalidad(empresaId: number, localidadId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { empresaId, localidadId, finalizado: false },
        include: MOVIMIENTO_LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos no concluidos por empresa y localidad', {
        empresaId, localidadId,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos no concluidos por empresa y localidad');
    }
  }

  static async obtenerMovimientosNoConcluidosPorEmpresaYLocalidadPaginados(
    empresaId: number,
    localidadId: number,
    pagination: MovimientoPagination
  ) {
    try {
      return await this.listarMovimientosColeccion({
        where: { empresaId, localidadId, finalizado: false },
        orderBy: MOVIMIENTOS_ORDER_DESC,
        pagination,
      });
    } catch (error: any) {
      movimientoError.error('Error al obtener movimientos no concluidos por empresa y localidad paginados', {
        empresaId, localidadId, pagination,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener movimientos no concluidos por empresa y localidad');
    }
  }

  static async obtenerInfoEdicion(id: number) {
    const movimiento = await prisma.movimiento.findUnique({
      where: { id },
      include: {
        empresa: { select: { id: true, nombre: true } },
        localidad: { select: { id: true, nombre: true } },
        viaOrigen: { select: { id: true, nombre: true, localidadId: true } },
        viaDestino: { select: { id: true, nombre: true, localidadId: true } },
      },
    });
    if (!movimiento) throw new Error(`Movimiento ${id} no encontrado`);

    const meta = parseMetaFromInstrucciones(movimiento.instrucciones ?? undefined);
    const editable = !movimiento.finalizado && ESTADOS_EDITABLES.has(movimiento.estado as any);

    return {
      editable,
      restricciones: {
        motivo: editable ? null : 'Finalizado o en estado no editable',
        estadosPermitidos: Array.from(ESTADOS_EDITABLES),
        mismaLocalidadParaVias: true,
      },
      movimiento: {
        id: movimiento.id,
        empresa: movimiento.empresa,
        localidad: movimiento.localidad,
        estado: movimiento.estado,
        finalizado: movimiento.finalizado,
        instrucciones: movimiento.instrucciones,
        locomotiveNumber: movimiento.locomotiveNumber,
        viaOrigen: movimiento.viaOrigen,
        viaDestino: movimiento.viaDestino,
        torno: movimiento.torno,
        Lavado: movimiento.lavado,
        tipoMovimiento: movimiento.tipoMovimiento,
        posicionCabina: movimiento.posicionCabina,
        posicionChimenea: movimiento.posicionChimenea,
        direccionEmpuje: movimiento.direccionEmpuje,
        meta,
      },
      editableKeys: Array.from(EDITABLE_KEYS),
    };
  }

  static async listarServiciosPendientesFIFO(filters: { localidadId?: number; empresaId?: number } = {}) {
    try {
      const where: any = {
        finalizado: false,
        OR: [{ lavado: true }, { torno: true }],
        estado: { in: ['SOLICITADO', 'DETENIDO'] },
      };
      if (filters.localidadId) where.localidadId = filters.localidadId;
      if (filters.empresaId) where.empresaId = filters.empresaId;

      return await prisma.movimiento.findMany({
        where,
        include: {
          empresa: true,
          localidad: true,
          viaOrigen: true,
          viaDestino: true,
          ronda: true,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
    } catch (error: any) {
      movimientoError.error('Error al listar servicios pendientes (FIFO)', {
        filters,
        errName: error?.name, errMsg: error?.message, errStack: error?.stack, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al listar servicios pendientes');
    }
  }

  static async obtenerInfoPorRonda(rondaId: number) {
    const ronda = await prisma.ronda.findUnique({
      where: { id: rondaId },
      include: {
        empresa: { select: { id: true, nombre: true } },
        movimiento: {
          include: {
            empresa: { select: { id: true, nombre: true } },
            localidad: { select: { id: true, nombre: true } },
            viaOrigen: { select: { id: true, nombre: true } },
            viaDestino: { select: { id: true, nombre: true } },
            creadoPor: { select: { id: true, nombre: true, rol: true } },
            cliente: { select: { id: true, nombre: true } },
            supervisor: { select: { id: true, nombre: true } },
            coordinador: { select: { id: true, nombre: true } },
            operador: { select: { id: true, nombre: true } },
            ronda: { select: { id: true, rondaNumero: true, orden: true, concluido: true } },
            incidentes: { select: { id: true, estado: true, createdAt: true } },
          },
        },
      },
    });

    if (!ronda || !ronda.movimiento) throw new Error(`No se encontró la ronda con ID ${rondaId}`);

    const movimiento = ronda.movimiento;
    const meta = parseMetaFromInstrucciones(movimiento.instrucciones ?? undefined);

    return {
      rondaId: ronda.id,
      rondaNumero: (ronda as any).rondaNumero,
      orden: (ronda as any).orden,
      concluido: (ronda as any).concluido,
      empresa: ronda.empresa,
      movimiento: {
        id: movimiento.id,
        locomotiveNumber: movimiento.locomotiveNumber,
        estado: movimiento.estado,
        prioridad: movimiento.prioridad,
        tipoMovimiento: movimiento.tipoMovimiento,
        posicionCabina: movimiento.posicionCabina,
        posicionChimenea: movimiento.posicionChimenea,
        direccionEmpuje: movimiento.direccionEmpuje,
        lavado: movimiento.lavado,
        torno: movimiento.torno,
        fechaSolicitud: movimiento.fechaSolicitud,
        fechaInicio: movimiento.fechaInicio,
        fechaFin: movimiento.fechaFin,
        fechaPausa: movimiento.fechaPausa,
        instrucciones: movimiento.instrucciones,
        empresa: movimiento.empresa,
        localidad: movimiento.localidad,
        viaOrigen: movimiento.viaOrigen,
        viaDestino: movimiento.viaDestino,
        creadoPor: movimiento.creadoPor,
        cliente: movimiento.cliente,
        supervisor: movimiento.supervisor,
        coordinador: movimiento.coordinador,
        operador: movimiento.operador,
        ronda: movimiento.ronda,
        incidentes: movimiento.incidentes,
      },
      meta,
    };
  }
}
