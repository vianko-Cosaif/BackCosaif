import {
  EstadoLavadoFase,
  EstadoLavadoProceso,
  Prisma,
  PrismaClient,
  TipoLavado,
} from "../../../../generated";
import { prismaLavado } from "../../../db/prisma";
import type { ListarLavadosQuery } from "../types/lavado.types";

type DbClient = PrismaClient | Prisma.TransactionClient;

const detalleInclude = {
  fases: {
    orderBy: { orden: "asc" as const },
  },
  bitacora: {
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.LavadoProcesoInclude;

const listadoInclude = {
  fases: {
    orderBy: { orden: "asc" as const },
  },
} satisfies Prisma.LavadoProcesoInclude;

export class LavadoRepository {
  constructor(private readonly db: DbClient = prismaLavado) {}

  async listar(query: ListarLavadosQuery) {
    const where: Prisma.LavadoProcesoWhereInput = {
      ...(query.estado ? { estado: query.estado as EstadoLavadoProceso } : {}),
      ...(query.tipoLavado ? { tipoLavado: query.tipoLavado as TipoLavado } : {}),
      ...(query.localidadId ? { localidadId: query.localidadId } : {}),
      ...(query.empresaId ? { empresaId: query.empresaId } : {}),
      ...(query.movimientoId ? { movimientoId: query.movimientoId } : {}),
      ...(query.locomotiveNumber ? { locomotiveNumber: query.locomotiveNumber } : {}),
    };

    const [data, total] = await Promise.all([
      this.db.lavadoProceso.findMany({
        where,
        include: listadoInclude,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.lavadoProceso.count({ where }),
    ]);

    return { data, total };
  }

  buscarProceso(id: string) {
    return this.db.lavadoProceso.findUnique({ where: { id } });
  }

  obtenerDetalle(id: string) {
    return this.db.lavadoProceso.findUnique({
      where: { id },
      include: detalleInclude,
    });
  }

  buscarPorMovimiento(movimientoId: number) {
    return this.db.lavadoProceso.findUnique({ where: { movimientoId } });
  }

  crearProceso(data: Prisma.LavadoProcesoCreateInput) {
    return this.db.lavadoProceso.create({ data });
  }

  actualizarProcesoPendiente(
    id: string,
    data: Prisma.LavadoProcesoUpdateManyMutationInput
  ) {
    return this.db.lavadoProceso.updateMany({
      where: { id, estado: EstadoLavadoProceso.PENDIENTE },
      data,
    });
  }

  iniciarProceso(id: string, fechaInicio: Date) {
    return this.db.lavadoProceso.updateMany({
      where: { id, estado: EstadoLavadoProceso.PENDIENTE },
      data: {
        estado: EstadoLavadoProceso.EN_PROCESO,
        fechaInicio,
      },
    });
  }

  finalizarProceso(id: string, fechaFin: Date, duracionRealSegundos: number) {
    return this.db.lavadoProceso.updateMany({
      where: { id, estado: EstadoLavadoProceso.EN_PROCESO },
      data: {
        estado: EstadoLavadoProceso.FINALIZADO,
        fechaFin,
        duracionRealSegundos,
      },
    });
  }

  buscarFase(id: string) {
    return this.db.lavadoFase.findUnique({ where: { id } });
  }

  buscarFasePorOrden(lavadoProcesoId: string, orden: number) {
    return this.db.lavadoFase.findUnique({
      where: {
        lavadoProcesoId_orden: {
          lavadoProcesoId,
          orden,
        },
      },
    });
  }

  contarFasesActivas(lavadoProcesoId: string) {
    return this.db.lavadoFase.count({
      where: {
        lavadoProcesoId,
        estado: EstadoLavadoFase.EN_PROCESO,
      },
    });
  }

  contarFasesNoFinalizadas(lavadoProcesoId: string) {
    return this.db.lavadoFase.count({
      where: {
        lavadoProcesoId,
        estado: { not: EstadoLavadoFase.FINALIZADA },
      },
    });
  }

  iniciarFase(id: string, lavadoProcesoId: string, actorId: number, fechaInicio: Date) {
    return this.db.lavadoFase.updateMany({
      where: {
        id,
        lavadoProcesoId,
        estado: EstadoLavadoFase.PENDIENTE,
      },
      data: {
        estado: EstadoLavadoFase.EN_PROCESO,
        fechaInicio,
        responsableId: actorId,
      },
    });
  }

  finalizarFase(
    id: string,
    lavadoProcesoId: string,
    data: {
      fechaFin: Date;
      duracionRealSegundos: number;
      observaciones?: string;
    }
  ) {
    return this.db.lavadoFase.updateMany({
      where: {
        id,
        lavadoProcesoId,
        estado: EstadoLavadoFase.EN_PROCESO,
      },
      data: {
        estado: EstadoLavadoFase.FINALIZADA,
        fechaFin: data.fechaFin,
        duracionRealSegundos: data.duracionRealSegundos,
        ...(data.observaciones !== undefined ? { observaciones: data.observaciones } : {}),
      },
    });
  }

  crearEvento(data: Prisma.LavadoBitacoraUncheckedCreateInput) {
    return this.db.lavadoBitacora.create({ data });
  }
}
