import {
  EstadoIncidenteTorreon,
  EstadoMovimientoTorreon,
  Prisma,
  PrismaClient,
  TipoFotoMovimientoTorreon,
} from "../../../generated";
import { prismaTorreon } from "../../db/prisma";
import { DomainError } from "../../utils/domainError";
import { IncidenteModel } from "../incidentes/incidente.model";
import { crearIncidenteMovimientoSchema } from "../incidentes/incidente.schemas";
import { RondaModel } from "../rondas/ronda.model";
import {
  createMovimientoSchema,
  finalizarMovimientoSchema,
  fotoInputSchema,
  iniciarMovimientoSchema,
  registrarFotosMovimientoSchema,
  reanudarMovimientoSchema,
} from "./movimiento.schemas";
import { z } from "zod";

type Tx = Prisma.TransactionClient;
type FotoInput = z.infer<typeof fotoInputSchema>;

const includeMovimientoDetalle = {
  rondas: {
    include: {
      ronda: true,
      bloqueadoPorIncidente: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
  incidentes: {
    include: {
      fotos: { orderBy: { orden: "asc" as const } },
    },
    orderBy: { createdAt: "desc" as const },
  },
  fotos: {
    orderBy: [
      { tipo: "asc" as const },
      { orden: "asc" as const },
    ],
  },
};

const compact = <T extends Record<string, unknown>>(data: T): T => {
  Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
  return data;
};

const isMovimientoCerrado = (estado: EstadoMovimientoTorreon) => (
  estado === EstadoMovimientoTorreon.CONCLUIDO || estado === EstadoMovimientoTorreon.CANCELADO
);

async function getMovimientoOrThrow(tx: Tx | PrismaClient, movimientoId: number) {
  const movimiento = await tx.movimientoTorreonFerro.findUnique({ where: { id: movimientoId } });
  if (!movimiento) throw new DomainError(404, "Movimiento no encontrado");
  return movimiento;
}

async function getMovimientoDetalle(movimientoId: number) {
  const movimiento = await prismaTorreon.movimientoTorreonFerro.findUnique({
    where: { id: movimientoId },
    include: includeMovimientoDetalle,
  });
  if (!movimiento) throw new DomainError(404, "Movimiento no encontrado");
  return movimiento;
}

async function createMovimientoFotos(
  tx: Tx,
  movimientoId: number,
  tipo: TipoFotoMovimientoTorreon,
  fotos: FotoInput[],
  actorFallbackId: number
) {
  if (!fotos.length) return [];

  const last = await tx.movimientoTorreonFoto.findFirst({
    where: { movimientoId, tipo },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });
  const start = (last?.orden ?? 0) + 1;

  return Promise.all(
    fotos.map((foto, index) => tx.movimientoTorreonFoto.create({
      data: {
        movimientoId,
        tipo,
        orden: start + index,
        url: foto.url,
        storageKey: foto.storageKey,
        tomadaPorId: foto.tomadaPorId ?? actorFallbackId,
        comentario: foto.comentario,
        tomadaAt: foto.tomadaAt ?? new Date(),
      },
    }))
  );
}

export class MovimientoModel {
  static async listar(query: { localidadId?: number; empresaId?: number; estado?: string }) {
    return prismaTorreon.movimientoTorreonFerro.findMany({
      where: compact({
        localidadId: query.localidadId,
        empresaId: query.empresaId,
        estado: query.estado as EstadoMovimientoTorreon | undefined,
      }),
      include: includeMovimientoDetalle,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  static async obtener(id: number) {
    return getMovimientoDetalle(id);
  }

  static async crear(input: z.infer<typeof createMovimientoSchema>) {
    const movimientoId = await prismaTorreon.$transaction(async (tx) => {
      const movimiento = await tx.movimientoTorreonFerro.create({
        data: compact({
          empresaId: input.empresaId,
          creadoPorId: input.creadoPorId,
          clienteId: input.clienteId,
          supervisorId: input.supervisorId,
          coordinadorId: input.coordinadorId,
          operadorId: input.operadorId,
          localidadId: input.localidadId,
          viaOrigenId: input.viaOrigenId,
          viaDestinoId: input.viaDestinoId,
          seccionOrigenId: input.seccionOrigenId,
          seccionDestinoId: input.seccionDestinoId,
          locomotiveNumber: input.locomotiveNumber,
          prioridad: input.prioridad,
          tipoMovimiento: input.tipoMovimiento,
          estado: input.operadorId ? EstadoMovimientoTorreon.ASIGNADO : EstadoMovimientoTorreon.SOLICITADO,
          instrucciones: input.instrucciones,
          posicionChimenea: input.posicionChimenea,
          posicionCabina: input.posicionCabina,
          direccionEmpuje: input.direccionEmpuje,
          empresaNombreSnapshot: input.empresaNombreSnapshot,
          localidadNombreSnapshot: input.localidadNombreSnapshot,
          viaOrigenNombreSnapshot: input.viaOrigenNombreSnapshot,
          viaDestinoNombreSnapshot: input.viaDestinoNombreSnapshot,
          seccionOrigenNombreSnapshot: input.seccionOrigenNombreSnapshot,
          seccionDestinoNombreSnapshot: input.seccionDestinoNombreSnapshot,
        }),
      });

      const incidenteBloqueante = await IncidenteModel.findIncidenteBloqueante(tx, movimiento);
      await RondaModel.insertarMovimiento(tx, movimiento, incidenteBloqueante?.id);

      return movimiento.id;
    });

    return getMovimientoDetalle(movimientoId);
  }

  static async iniciar(id: number, input: z.infer<typeof iniciarMovimientoSchema>) {
    const movimientoId = await prismaTorreon.$transaction(async (tx) => {
      const movimiento = await getMovimientoOrThrow(tx, id);

      if (isMovimientoCerrado(movimiento.estado)) {
        throw new DomainError(409, `Movimiento no puede iniciar en estado ${movimiento.estado}`);
      }

      const incidenteDelMovimiento = await IncidenteModel.obtenerActivoDeMovimiento(tx, id);
      if (incidenteDelMovimiento) {
        throw new DomainError(409, "Movimiento bloqueado por incidente abierto", {
          incidenteId: incidenteDelMovimiento.id,
        });
      }

      const incidenteBloqueante = await IncidenteModel.findIncidenteBloqueante(tx, movimiento);
      if (incidenteBloqueante) {
        await RondaModel.marcarMovimientoBloqueado(tx, id, incidenteBloqueante.id);
        throw new DomainError(409, "La ruta del movimiento esta bloqueada por incidente abierto", {
          incidenteId: incidenteBloqueante.id,
        });
      }

      await createMovimientoFotos(
        tx,
        id,
        TipoFotoMovimientoTorreon.ANTES_MOVIMIENTO,
        input.fotos,
        input.iniciadoPorId
      );

      const fechaInicio = movimiento.fechaInicio ?? input.fechaInicio ?? new Date();
      await tx.movimientoTorreonFerro.update({
        where: { id },
        data: {
          estado: EstadoMovimientoTorreon.EN_PROCESO,
          operadorId: input.operadorId ?? movimiento.operadorId,
          fechaInicio,
          fechaPausa: null,
        },
      });

      await RondaModel.marcarMovimientoActivo(tx, id, fechaInicio);
      return id;
    });

    return getMovimientoDetalle(movimientoId);
  }

  static async registrarFotos(id: number, input: z.infer<typeof registrarFotosMovimientoSchema>) {
    await prismaTorreon.$transaction(async (tx) => {
      await getMovimientoOrThrow(tx, id);
      await createMovimientoFotos(
        tx,
        id,
        input.tipo as TipoFotoMovimientoTorreon,
        input.fotos,
        input.tomadaPorId
      );
    });

    return getMovimientoDetalle(id);
  }

  static async finalizar(id: number, input: z.infer<typeof finalizarMovimientoSchema>) {
    const movimientoId = await prismaTorreon.$transaction(async (tx) => {
      const movimiento = await getMovimientoOrThrow(tx, id);
      if (movimiento.estado !== EstadoMovimientoTorreon.EN_PROCESO) {
        throw new DomainError(409, `Movimiento debe estar EN_PROCESO para finalizar. Estado actual: ${movimiento.estado}`);
      }

      const incidenteAbierto = await IncidenteModel.obtenerActivoDeMovimiento(tx, id);
      if (incidenteAbierto) {
        throw new DomainError(409, "No se puede finalizar con incidente abierto", {
          incidenteId: incidenteAbierto.id,
        });
      }

      await createMovimientoFotos(
        tx,
        id,
        TipoFotoMovimientoTorreon.FIN_MOVIMIENTO,
        input.fotos,
        input.finalizadoPorId
      );

      const fechaFin = input.fechaFin ?? new Date();
      await tx.movimientoTorreonFerro.update({
        where: { id },
        data: {
          estado: EstadoMovimientoTorreon.CONCLUIDO,
          finalizado: true,
          fechaFin,
        },
      });

      await RondaModel.marcarMovimientoConcluido(tx, id, fechaFin);
      return id;
    });

    return getMovimientoDetalle(movimientoId);
  }

  static async detenerConIncidente(id: number, input: z.infer<typeof crearIncidenteMovimientoSchema>) {
    const result = await prismaTorreon.$transaction(async (tx) => {
      const movimiento = await getMovimientoOrThrow(tx, id);
      if (isMovimientoCerrado(movimiento.estado)) {
        throw new DomainError(409, `Movimiento no puede detenerse en estado ${movimiento.estado}`);
      }

      const incidente = await IncidenteModel.crearParaMovimiento(tx, movimiento, input);

      await tx.movimientoTorreonFerro.update({
        where: { id },
        data: {
          estado: EstadoMovimientoTorreon.DETENIDO,
          fechaPausa: new Date(),
        },
      });

      return { movimientoId: id, incidenteId: incidente.id };
    });

    return {
      movimiento: await getMovimientoDetalle(result.movimientoId),
      incidenteId: result.incidenteId,
    };
  }

  static async reanudar(id: number, input: z.infer<typeof reanudarMovimientoSchema>) {
    const movimientoId = await prismaTorreon.$transaction(async (tx) => {
      const movimiento = await getMovimientoOrThrow(tx, id);
      if (movimiento.estado !== EstadoMovimientoTorreon.DETENIDO) {
        throw new DomainError(409, `Movimiento debe estar DETENIDO para reanudar. Estado actual: ${movimiento.estado}`);
      }

      const incidente = input.incidenteId
        ? await tx.incidenteTorreonFerro.findUnique({ where: { id: input.incidenteId } })
        : await IncidenteModel.obtenerActivoDeMovimiento(tx, id);

      if (!incidente) throw new DomainError(404, "Incidente activo no encontrado para reanudar");
      if (incidente.movimientoId !== id) {
        throw new DomainError(409, "El incidente no pertenece al movimiento");
      }

      if (incidente.estado === EstadoIncidenteTorreon.ABIERTO) {
        if (!input.resueltoPorId || !input.solucion) {
          throw new DomainError(400, "Reanudar requiere resueltoPorId y solucion para resolver el incidente");
        }

        await IncidenteModel.resolverTx(tx, incidente.id, {
          resueltoPorId: input.resueltoPorId,
          solucion: input.solucion,
          fechaResolucion: input.fechaResolucion,
        });
      }

      const stillBlocked = await IncidenteModel.findIncidenteBloqueante(tx, movimiento, incidente.id);
      if (stillBlocked) {
        await RondaModel.marcarMovimientoBloqueado(tx, id, stillBlocked.id);
        throw new DomainError(409, "El movimiento sigue bloqueado por otro incidente abierto", {
          incidenteId: stillBlocked.id,
        });
      }

      if (input.fotos.length) {
        const actorId = input.resueltoPorId ?? input.operadorId;
        if (!actorId) throw new DomainError(400, "Las capturas de reanudacion requieren actor");
        await createMovimientoFotos(
          tx,
          id,
          TipoFotoMovimientoTorreon.PROCESO_MOVIMIENTO,
          input.fotos,
          actorId
        );
      }

      const fechaInicio = movimiento.fechaInicio ?? new Date();
      await tx.movimientoTorreonFerro.update({
        where: { id },
        data: {
          estado: EstadoMovimientoTorreon.EN_PROCESO,
          operadorId: input.operadorId ?? movimiento.operadorId,
          fechaPausa: null,
          fechaInicio,
        },
      });

      await RondaModel.marcarMovimientoActivo(tx, id, fechaInicio);
      return id;
    });

    return getMovimientoDetalle(movimientoId);
  }
}
