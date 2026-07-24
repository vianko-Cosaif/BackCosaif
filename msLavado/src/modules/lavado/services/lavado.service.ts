import crypto from "crypto";
import {
  AccionLavadoBitacora,
  EstadoLavadoFase,
  EstadoLavadoProceso,
  Prisma,
  TipoLavado,
} from "../../../../generated";
import { prismaLavado } from "../../../db/prisma";
import { DomainError } from "../../../utils/domainError";
import type { CreateLavadoCommand } from "../dto/create-lavado.dto";
import type { FinalizarFaseCommand } from "../dto/finalizar-fase.dto";
import type { UpdateLavadoCommand } from "../dto/update-lavado.dto";
import {
  crearFolioLavado,
  duracionSegundos,
  FASES_LAVADO,
} from "../models/lavado.model";
import { LavadoRepository } from "../repositories/lavado.repository";
import {
  ESTADOS_LAVADO_FASE,
  ESTADOS_LAVADO_PROCESO,
  ListarLavadosQuery,
  TIPOS_LAVADO,
} from "../types/lavado.types";

const runSerializable = async <T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> => {
  try {
    return await prismaLavado.$transaction(operation, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error) {
    if (error instanceof DomainError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new DomainError(409, "La operacion compitio con otra actualizacion; intente de nuevo");
    }
    throw error;
  }
};

const requireDetalle = async (repository: LavadoRepository, id: string) => {
  const detalle = await repository.obtenerDetalle(id);
  if (!detalle) throw new DomainError(404, "Proceso de lavado no encontrado");
  return detalle;
};

export class LavadoService {
  static catalogos() {
    return {
      tiposLavado: [...TIPOS_LAVADO],
      estadosProceso: [...ESTADOS_LAVADO_PROCESO],
      estadosFase: [...ESTADOS_LAVADO_FASE],
      fases: FASES_LAVADO.map((fase) => ({ ...fase })),
    };
  }

  static async listar(query: ListarLavadosQuery) {
    const repository = new LavadoRepository();
    const { data, total } = await repository.listar(query);
    return {
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  static async obtener(id: string) {
    return requireDetalle(new LavadoRepository(), id);
  }

  static async crear(input: CreateLavadoCommand) {
    try {
      return await runSerializable(async (tx) => {
        const repository = new LavadoRepository(tx);
        const existing = await repository.buscarPorMovimiento(input.movimientoId);
        if (existing) {
          throw new DomainError(409, "El movimiento ya tiene un proceso de lavado", {
            lavadoProcesoId: existing.id,
          });
        }

        const id = crypto.randomUUID();
        const folio = crearFolioLavado(id);
        await repository.crearProceso({
          id,
          folio,
          movimientoId: input.movimientoId,
          locomotiveNumber: input.locomotiveNumber,
          empresaId: input.empresaId,
          empresaNombreSnapshot: input.empresaNombreSnapshot,
          localidadId: input.localidadId,
          localidadNombreSnapshot: input.localidadNombreSnapshot,
          tipoLavado: input.tipoLavado as TipoLavado,
          duracionEstimadaMinutos: input.duracionEstimadaMinutos,
          creadoPorId: input.creadoPorId,
          fases: {
            create: FASES_LAVADO.map((fase) => ({
              clave: fase.clave,
              nombre: fase.nombre,
              orden: fase.orden,
            })),
          },
        });

        await repository.crearEvento({
          lavadoProcesoId: id,
          accion: AccionLavadoBitacora.PROCESO_CREADO,
          descripcion: `Proceso ${folio} creado para la locomotora ${input.locomotiveNumber}`,
          realizadoPorId: input.creadoPorId,
        });

        return requireDetalle(repository, id);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.map(String)
          : [String(error.meta?.target ?? "")];
        if (target.some((field) => field.includes("folio"))) {
          throw new DomainError(409, "No se pudo generar un folio unico; intente nuevamente");
        }
        throw new DomainError(409, "El movimiento ya tiene un proceso de lavado");
      }
      throw error;
    }
  }

  static async actualizar(id: string, input: UpdateLavadoCommand) {
    return runSerializable(async (tx) => {
      const repository = new LavadoRepository(tx);
      const proceso = await repository.buscarProceso(id);
      if (!proceso) throw new DomainError(404, "Proceso de lavado no encontrado");
      if (proceso.estado !== EstadoLavadoProceso.PENDIENTE) {
        throw new DomainError(409, "El proceso solo puede editarse antes de iniciar");
      }

      const result = await repository.actualizarProcesoPendiente(id, {
        ...(input.tipoLavado !== undefined
          ? { tipoLavado: input.tipoLavado as TipoLavado }
          : {}),
        ...(input.duracionEstimadaMinutos !== undefined
          ? { duracionEstimadaMinutos: input.duracionEstimadaMinutos }
          : {}),
      });

      if (result.count !== 1) {
        throw new DomainError(409, "El proceso cambio de estado durante la edicion");
      }

      const campos = [
        input.tipoLavado !== undefined ? "tipo de lavado" : null,
        input.duracionEstimadaMinutos !== undefined ? "duracion estimada" : null,
      ].filter(Boolean).join(", ");

      await repository.crearEvento({
        lavadoProcesoId: id,
        accion: AccionLavadoBitacora.PROCESO_ACTUALIZADO,
        descripcion: `Proceso actualizado: ${campos}`,
        realizadoPorId: input.actorId,
      });

      return requireDetalle(repository, id);
    });
  }

  static async iniciarFase(procesoId: string, faseId: string, actorId: number) {
    return runSerializable(async (tx) => {
      const repository = new LavadoRepository(tx);
      const [proceso, fase] = await Promise.all([
        repository.buscarProceso(procesoId),
        repository.buscarFase(faseId),
      ]);

      if (!proceso) throw new DomainError(404, "Proceso de lavado no encontrado");
      if (!fase || fase.lavadoProcesoId !== procesoId) {
        throw new DomainError(404, "Fase de lavado no encontrada");
      }
      if (proceso.estado === EstadoLavadoProceso.FINALIZADO) {
        throw new DomainError(409, "El proceso de lavado ya esta finalizado");
      }
      if (fase.estado !== EstadoLavadoFase.PENDIENTE) {
        throw new DomainError(409, `La fase no puede iniciar en estado ${fase.estado}`);
      }

      if (fase.orden > 1) {
        const anterior = await repository.buscarFasePorOrden(procesoId, fase.orden - 1);
        if (!anterior || anterior.estado !== EstadoLavadoFase.FINALIZADA) {
          throw new DomainError(409, "La fase anterior debe estar finalizada");
        }
      }

      const activas = await repository.contarFasesActivas(procesoId);
      if (activas > 0) {
        throw new DomainError(409, "Ya existe una fase en proceso");
      }

      const now = new Date();
      const faseActualizada = await repository.iniciarFase(faseId, procesoId, actorId, now);
      if (faseActualizada.count !== 1) {
        throw new DomainError(409, "La fase fue iniciada por otra operacion");
      }

      if (fase.orden === 1) {
        const procesoActualizado = await repository.iniciarProceso(procesoId, now);
        if (procesoActualizado.count !== 1) {
          throw new DomainError(409, "El proceso no pudo iniciar desde su estado actual");
        }
      } else if (proceso.estado !== EstadoLavadoProceso.EN_PROCESO) {
        throw new DomainError(409, "El proceso no se encuentra en ejecucion");
      }

      await repository.crearEvento({
        lavadoProcesoId: procesoId,
        lavadoFaseId: faseId,
        accion: AccionLavadoBitacora.FASE_INICIADA,
        descripcion: `Fase ${fase.nombre} iniciada`,
        realizadoPorId: actorId,
      });

      return requireDetalle(repository, procesoId);
    });
  }

  static async finalizarFase(
    procesoId: string,
    faseId: string,
    input: FinalizarFaseCommand
  ) {
    return runSerializable(async (tx) => {
      const repository = new LavadoRepository(tx);
      const [proceso, fase] = await Promise.all([
        repository.buscarProceso(procesoId),
        repository.buscarFase(faseId),
      ]);

      if (!proceso) throw new DomainError(404, "Proceso de lavado no encontrado");
      if (!fase || fase.lavadoProcesoId !== procesoId) {
        throw new DomainError(404, "Fase de lavado no encontrada");
      }
      if (proceso.estado !== EstadoLavadoProceso.EN_PROCESO) {
        throw new DomainError(409, "El proceso de lavado no esta en ejecucion");
      }
      if (fase.estado !== EstadoLavadoFase.EN_PROCESO || !fase.fechaInicio) {
        throw new DomainError(409, "La fase debe estar EN_PROCESO para finalizar");
      }

      const now = new Date();
      const faseActualizada = await repository.finalizarFase(faseId, procesoId, {
        fechaFin: now,
        duracionRealSegundos: duracionSegundos(fase.fechaInicio, now),
        observaciones: input.observaciones,
      });
      if (faseActualizada.count !== 1) {
        throw new DomainError(409, "La fase fue finalizada por otra operacion");
      }

      await repository.crearEvento({
        lavadoProcesoId: procesoId,
        lavadoFaseId: faseId,
        accion: AccionLavadoBitacora.FASE_FINALIZADA,
        descripcion: `Fase ${fase.nombre} finalizada`,
        realizadoPorId: input.actorId,
      });

      if (fase.orden === FASES_LAVADO.length) {
        const pendientes = await repository.contarFasesNoFinalizadas(procesoId);
        if (pendientes !== 0) {
          throw new DomainError(409, "No se puede cerrar el proceso con fases pendientes");
        }
        if (!proceso.fechaInicio) {
          throw new DomainError(409, "El proceso no tiene fecha de inicio");
        }

        const procesoActualizado = await repository.finalizarProceso(
          procesoId,
          now,
          duracionSegundos(proceso.fechaInicio, now)
        );
        if (procesoActualizado.count !== 1) {
          throw new DomainError(409, "El proceso fue finalizado por otra operacion");
        }

        await repository.crearEvento({
          lavadoProcesoId: procesoId,
          accion: AccionLavadoBitacora.PROCESO_FINALIZADO,
          descripcion: `Proceso ${proceso.folio} finalizado`,
          realizadoPorId: input.actorId,
        });
      }

      return requireDetalle(repository, procesoId);
    });
  }
}
