import {
  CargaVagonArrastreTorreon,
  EstadoArrastreTorreon,
  EstadoIncidenteArrastreTorreon,
  EstadoVagonArrastreTorreon,
  Prisma,
  PrismaClient,
} from "../../../generated";
import { prismaTorreon } from "../../db/prisma";
import { DomainError } from "../../utils/domainError";
import { guardarFotoTorreon } from "../../utils/imagenesTorreon";
import { fotoInputSchema } from "../movimientos/movimiento.schemas";
import {
  cancelarArrastreSchema,
  createArrastreSchema,
  crearIncidenteArrastreSchema,
  editarVagonArrastreSchema,
  finalizarArrastreSchema,
  finalizarVagonArrastreSchema,
  iniciarArrastreSchema,
  iniciarVagonArrastreSchema,
  reanudarArrastreSchema,
  resolverIncidenteArrastreSchema,
} from "./arrastre.schemas";
import { z } from "zod";

type Tx = Prisma.TransactionClient;
type FotoInput = z.infer<typeof fotoInputSchema>;

type ArrastreRefs = {
  id: number;
  localidadId: number;
  viaOrigenId: number | null;
  viaDestinoId: number | null;
  seccionOrigenId: number | null;
  seccionDestinoId: number | null;
  vagones?: Array<{ viaId: number; seccionId: number }>;
};

const includeArrastreDetalle = {
  vagones: { orderBy: { orden: "asc" as const } },
  incidentes: {
    include: {
      vagon: true,
      fotos: { orderBy: { orden: "asc" as const } },
    },
    orderBy: { createdAt: "desc" as const },
  },
};

type VagonConTiempos = {
  id: number;
  orden: number;
  estado: EstadoVagonArrastreTorreon;
  fechaSolicitud: Date;
  fechaInicio: Date | null;
  fechaFin: Date | null;
};

const compact = <T extends Record<string, unknown>>(data: T): T => {
  Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
  return data;
};

const normalizeIdList = (...values: Array<number | null | undefined>) => {
  return [...new Set(values.filter((value): value is number => typeof value === "number"))];
};

const minutesBetween = (start?: Date | null, end?: Date | null) => {
  if (!start || !end) return undefined;
  const ms = end.getTime() - start.getTime();
  return Number.isFinite(ms) && ms >= 0 ? Math.round(ms / 60000) : undefined;
};

function decorarArrastreDetalle<T extends {
  fechaSolicitud: Date;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  vagones: VagonConTiempos[];
}>(arrastre: T) {
  const vagones = arrastre.vagones.map((vagon) => ({
    ...vagon,
    metricas: {
      esperaMin: minutesBetween(vagon.fechaSolicitud, vagon.fechaInicio),
      operacionMin: minutesBetween(vagon.fechaInicio, vagon.fechaFin),
      solicitudTotalMin: minutesBetween(vagon.fechaSolicitud, vagon.fechaFin),
    },
  }));
  const activo = vagones.find((vagon) => vagon.estado === EstadoVagonArrastreTorreon.EN_PROCESO);
  const siguiente = vagones.find((vagon) => vagon.estado === EstadoVagonArrastreTorreon.PENDIENTE);

  return {
    ...arrastre,
    vagones,
    resumen: {
      totalVagones: vagones.length,
      pendientes: vagones.filter((vagon) => vagon.estado === EstadoVagonArrastreTorreon.PENDIENTE).length,
      enProceso: vagones.filter((vagon) => vagon.estado === EstadoVagonArrastreTorreon.EN_PROCESO).length,
      bloqueados: vagones.filter((vagon) => vagon.estado === EstadoVagonArrastreTorreon.BLOQUEADO).length,
      concluidos: vagones.filter((vagon) => vagon.estado === EstadoVagonArrastreTorreon.CONCLUIDO).length,
      vagonActivoId: activo?.id,
      siguienteVagonSugeridoId: siguiente?.id,
      solicitudTotalMin: minutesBetween(arrastre.fechaSolicitud, arrastre.fechaFin),
      operacionTotalMin: minutesBetween(arrastre.fechaInicio, arrastre.fechaFin),
    },
  };
}

const capacidadArrastre = (vagones: Array<{ carga: CargaVagonArrastreTorreon | "VACIO" | "LLENO" }>) =>
  vagones.reduce((total, vagon) => total + (String(vagon.carga) === "LLENO" ? 2 : 1), 0);

const assertCapacidadArrastre = (vagones: Array<{ carga: CargaVagonArrastreTorreon | "VACIO" | "LLENO" }>) => {
  const puntos = capacidadArrastre(vagones);
  if (puntos > 8) {
    const llenos = vagones.filter((vagon) => String(vagon.carga) === "LLENO").length;
    const vacios = vagones.length - llenos;
    throw new DomainError(400, "Arrastre excede capacidad", {
      regla: "vacio=1, lleno=2, maximo=8",
      llenos,
      vacios,
      puntos,
      maximo: 8,
    });
  }
};

const isArrastreCerrado = (estado: EstadoArrastreTorreon) => (
  estado === EstadoArrastreTorreon.CONCLUIDO || estado === EstadoArrastreTorreon.CANCELADO
);

function buildArrastreResourceFilters(refs: ArrastreRefs): Prisma.IncidenteArrastreTorreonWhereInput[] {
  const viaIds = normalizeIdList(
    refs.viaOrigenId,
    refs.viaDestinoId,
    ...(refs.vagones ?? []).map((vagon) => vagon.viaId)
  );
  const seccionIds = normalizeIdList(
    refs.seccionOrigenId,
    refs.seccionDestinoId,
    ...(refs.vagones ?? []).map((vagon) => vagon.seccionId)
  );
  const filters: Prisma.IncidenteArrastreTorreonWhereInput[] = [];

  if (viaIds.length) filters.push({ viaBloqueadaId: { in: viaIds } });
  if (seccionIds.length) filters.push({ seccionBloqueadaId: { in: seccionIds } });

  return filters;
}

async function getArrastreOrThrow(tx: Tx | PrismaClient, arrastreId: number) {
  const arrastre = await tx.arrastreTorreon.findUnique({
    where: { id: arrastreId },
    include: { vagones: { orderBy: { orden: "asc" } } },
  });
  if (!arrastre) throw new DomainError(404, "Arrastre no encontrado");
  return decorarArrastreDetalle(arrastre);
}

async function getArrastreDetalle(arrastreId: number) {
  const arrastre = await prismaTorreon.arrastreTorreon.findUnique({
    where: { id: arrastreId },
    include: includeArrastreDetalle,
  });
  if (!arrastre) throw new DomainError(404, "Arrastre no encontrado");
  return arrastre;
}

async function createIncidenteFotos(
  tx: Tx,
  incidenteId: number,
  fotos: FotoInput[],
  actorFallbackId: number
) {
  return Promise.all(
    fotos.map(async (foto, index) => {
      const orden = index + 1;
      const archivo = await guardarFotoTorreon(foto, {
        entidad: "incidente_arrastre",
        referenciaId: incidenteId,
        orden,
      });

      return tx.incidenteArrastreFoto.create({
        data: {
          incidenteId,
          orden,
          url: archivo.url,
          storageKey: archivo.storageKey,
          tomadaPorId: foto.tomadaPorId ?? actorFallbackId,
          comentario: foto.comentario,
          tomadaAt: foto.tomadaAt ?? new Date(),
        },
      });
    })
  );
}

export class ArrastreModel {
  static async listar(query: { localidadId?: number; empresaId?: number; estado?: string }) {
    return prismaTorreon.arrastreTorreon.findMany({
      where: compact({
        localidadId: query.localidadId,
        empresaId: query.empresaId,
        estado: query.estado as EstadoArrastreTorreon | undefined,
      }),
      include: includeArrastreDetalle,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  static async obtener(id: number) {
    return getArrastreDetalle(id);
  }

  static async obtenerActivo(tx: Tx | PrismaClient, arrastreId: number) {
    return tx.incidenteArrastreTorreon.findFirst({
      where: { arrastreId, estado: EstadoIncidenteArrastreTorreon.ABIERTO },
      orderBy: { fechaInicio: "desc" },
    });
  }

  static async findIncidenteBloqueante(
    tx: Tx | PrismaClient,
    refs: ArrastreRefs,
    excludeIncidentId?: number
  ) {
    const filters = buildArrastreResourceFilters(refs);
    if (!filters.length) return undefined;

    const incidente = await tx.incidenteArrastreTorreon.findFirst({
      where: {
        estado: EstadoIncidenteArrastreTorreon.ABIERTO,
        localidadId: refs.localidadId,
        ...(excludeIncidentId ? { id: { not: excludeIncidentId } } : {}),
        OR: filters,
      },
      orderBy: { fechaInicio: "asc" },
    });

    return incidente ?? undefined;
  }

  private static async assertPuedeEjecutar(tx: Tx, arrastre: ArrastreRefs) {
    const incidentePropio = await this.obtenerActivo(tx, arrastre.id);
    if (incidentePropio) {
      throw new DomainError(409, "Arrastre bloqueado por incidente abierto", {
        incidenteId: incidentePropio.id,
        accionPermitida: "Resolver incidente antes de continuar",
      });
    }

    const incidenteBloqueante = await this.findIncidenteBloqueante(tx, arrastre);
    if (incidenteBloqueante) {
      throw new DomainError(409, "La ruta del arrastre esta bloqueada por incidente abierto", {
        incidenteId: incidenteBloqueante.id,
        accionPermitida: "Resolver incidente antes de continuar",
      });
    }
  }

  static async crear(input: z.infer<typeof createArrastreSchema>) {
    assertCapacidadArrastre(input.vagones);

    const arrastreId = await prismaTorreon.$transaction(async (tx) => {
      const arrastre = await tx.arrastreTorreon.create({
        data: compact({
          empresaId: input.empresaId,
          creadoPorId: input.creadoPorId,
          operadorId: input.operadorId,
          localidadId: input.localidadId,
          viaOrigenId: input.viaOrigenId,
          viaDestinoId: input.viaDestinoId,
          seccionOrigenId: input.seccionOrigenId,
          seccionDestinoId: input.seccionDestinoId,
          instrucciones: input.instrucciones,
          vagones: {
            create: input.vagones.map((vagon, index) => compact({
              orden: index + 1,
              numeroVagon: vagon.numeroVagon,
              carga: vagon.carga,
              viaId: vagon.viaId,
              seccionId: vagon.seccionId,
              fechaSolicitud: vagon.fechaSolicitud,
            })),
          },
        }),
      });

      return arrastre.id;
    });

    return getArrastreDetalle(arrastreId);
  }

  static async iniciar(id: number, input: z.infer<typeof iniciarArrastreSchema>) {
    const arrastreId = await prismaTorreon.$transaction(async (tx) => {
      const arrastre = await getArrastreOrThrow(tx, id);
      if (isArrastreCerrado(arrastre.estado)) {
        throw new DomainError(409, `Arrastre no puede iniciar en estado ${arrastre.estado}`);
      }

      await this.assertPuedeEjecutar(tx, arrastre);

      const fechaInicio = arrastre.fechaInicio ?? input.fechaInicio ?? new Date();
      await tx.arrastreTorreon.update({
        where: { id },
        data: {
          estado: EstadoArrastreTorreon.EN_PROCESO,
          operadorId: input.operadorId ?? arrastre.operadorId,
          fechaInicio,
          fechaPausa: null,
        },
      });

      return id;
    });

    return getArrastreDetalle(arrastreId);
  }

  static async finalizar(id: number, input: z.infer<typeof finalizarArrastreSchema>) {
    const arrastreId = await prismaTorreon.$transaction(async (tx) => {
      const arrastre = await getArrastreOrThrow(tx, id);
      if (arrastre.estado === EstadoArrastreTorreon.CONCLUIDO) return id;
      if (arrastre.estado !== EstadoArrastreTorreon.EN_PROCESO) {
        throw new DomainError(409, `Arrastre debe estar EN_PROCESO para finalizar. Estado actual: ${arrastre.estado}`);
      }

      await this.assertPuedeEjecutar(tx, arrastre);

      const noConcluidos = arrastre.vagones.filter((vagon) => vagon.estado !== EstadoVagonArrastreTorreon.CONCLUIDO);
      if (noConcluidos.length) {
        throw new DomainError(409, "No se puede finalizar el arrastre hasta concluir todos los vagones", {
          pendientes: noConcluidos.map((vagon) => ({
            id: vagon.id,
            orden: vagon.orden,
            estado: vagon.estado,
          })),
        });
      }

      const fechaFin = input.fechaFin ?? new Date();
      await tx.arrastreTorreon.update({
        where: { id },
        data: {
          estado: EstadoArrastreTorreon.CONCLUIDO,
          fechaFin,
        },
      });

      return id;
    });

    return getArrastreDetalle(arrastreId);
  }

  static async cancelar(id: number, input: z.infer<typeof cancelarArrastreSchema>) {
    const arrastreId = await prismaTorreon.$transaction(async (tx) => {
      const arrastre = await getArrastreOrThrow(tx, id);
      if (arrastre.estado === EstadoArrastreTorreon.CANCELADO) return id;
      if (arrastre.estado === EstadoArrastreTorreon.CONCLUIDO) {
        throw new DomainError(409, "Arrastre concluido no se puede cancelar");
      }

      const vagonActivo = arrastre.vagones.find((vagon) => vagon.estado === EstadoVagonArrastreTorreon.EN_PROCESO);
      if (vagonActivo) {
        throw new DomainError(409, "No se puede cancelar con vagon en proceso", {
          vagonId: vagonActivo.id,
          orden: vagonActivo.orden,
        });
      }

      const fechaFin = input.fechaCancelacion ?? new Date();
      await tx.arrastreTorreon.update({
        where: { id },
        data: {
          estado: EstadoArrastreTorreon.CANCELADO,
          fechaFin,
          fechaPausa: null,
          instrucciones: input.motivo
            ? [arrastre.instrucciones, `Cancelado: ${input.motivo}`].filter(Boolean).join("\n")
            : arrastre.instrucciones,
        },
      });

      return id;
    });

    return getArrastreDetalle(arrastreId);
  }

  static async iniciarVagon(id: number, vagonId: number, input: z.infer<typeof iniciarVagonArrastreSchema>) {
    const arrastreId = await prismaTorreon.$transaction(async (tx) => {
      const arrastre = await getArrastreOrThrow(tx, id);
      if (isArrastreCerrado(arrastre.estado)) {
        throw new DomainError(409, `Arrastre no puede iniciar vagones en estado ${arrastre.estado}`);
      }
      if (arrastre.estado === EstadoArrastreTorreon.DETENIDO) {
        throw new DomainError(409, "Arrastre detenido por incidente abierto");
      }
      const vagon = arrastre.vagones.find((item) => item.id === vagonId);
      if (!vagon) throw new DomainError(404, "Vagon no pertenece al arrastre");
      if (vagon.estado === EstadoVagonArrastreTorreon.CONCLUIDO) {
        throw new DomainError(409, "Vagon ya concluido");
      }
      if (vagon.estado === EstadoVagonArrastreTorreon.BLOQUEADO) {
        throw new DomainError(409, "Vagon bloqueado por incidente abierto");
      }

      const activo = arrastre.vagones.find((item) => item.estado === EstadoVagonArrastreTorreon.EN_PROCESO);
      if (activo && activo.id !== vagonId) {
        throw new DomainError(409, "Ya hay un vagon en proceso dentro de este arrastre", {
          vagonActivoId: activo.id,
          ordenActivo: activo.orden,
        });
      }
      if (activo?.id === vagonId) return id;

      await this.assertPuedeEjecutar(tx, { ...arrastre, vagones: [vagon] });
      const fechaInicio = vagon.fechaInicio ?? input.fechaInicio ?? new Date();

      if (arrastre.estado === EstadoArrastreTorreon.SOLICITADO) {
        await tx.arrastreTorreon.update({
          where: { id },
          data: {
            estado: EstadoArrastreTorreon.EN_PROCESO,
            fechaInicio: arrastre.fechaInicio ?? fechaInicio,
          },
        });
      }

      await tx.arrastreTorreonVagon.update({
        where: { id: vagonId },
        data: {
          estado: EstadoVagonArrastreTorreon.EN_PROCESO,
          fechaInicio,
        },
      });

      return id;
    });

    return getArrastreDetalle(arrastreId);
  }

  static async finalizarVagon(id: number, vagonId: number, input: z.infer<typeof finalizarVagonArrastreSchema>) {
    const arrastreId = await prismaTorreon.$transaction(async (tx) => {
      const arrastre = await getArrastreOrThrow(tx, id);
      const vagon = arrastre.vagones.find((item) => item.id === vagonId);
      if (!vagon) throw new DomainError(404, "Vagon no pertenece al arrastre");
      if (arrastre.estado === EstadoArrastreTorreon.DETENIDO) {
        throw new DomainError(409, "Arrastre detenido por incidente abierto");
      }
      if (vagon.estado !== EstadoVagonArrastreTorreon.EN_PROCESO) {
        throw new DomainError(409, `Vagon debe estar EN_PROCESO para finalizar. Estado actual: ${vagon.estado}`);
      }

      await this.assertPuedeEjecutar(tx, { ...arrastre, vagones: [vagon] });
      const fechaFin = input.fechaFin ?? new Date();

      await tx.arrastreTorreonVagon.update({
        where: { id: vagonId },
        data: {
          estado: EstadoVagonArrastreTorreon.CONCLUIDO,
          fechaFin,
        },
      });

      const restantes = await tx.arrastreTorreonVagon.count({
        where: {
          arrastreId: id,
          id: { not: vagonId },
          estado: { not: EstadoVagonArrastreTorreon.CONCLUIDO },
        },
      });
      if (restantes === 0) {
        await tx.arrastreTorreon.update({
          where: { id },
          data: {
            estado: EstadoArrastreTorreon.CONCLUIDO,
            fechaFin,
          },
        });
      }

      return id;
    });

    return getArrastreDetalle(arrastreId);
  }

  static async editarVagon(id: number, vagonId: number, input: z.infer<typeof editarVagonArrastreSchema>) {
    const arrastreId = await prismaTorreon.$transaction(async (tx) => {
      const arrastre = await getArrastreOrThrow(tx, id);
      if (isArrastreCerrado(arrastre.estado)) {
        throw new DomainError(409, `Arrastre no puede editarse en estado ${arrastre.estado}`);
      }

      const vagon = arrastre.vagones.find((item) => item.id === vagonId);
      if (!vagon) throw new DomainError(404, "Vagon no pertenece al arrastre");

      if (vagon.estado === EstadoVagonArrastreTorreon.EN_PROCESO) {
        throw new DomainError(409, "Vagon en proceso no se puede editar");
      }

      assertCapacidadArrastre(arrastre.vagones.map((item) => ({
        carga: item.id === vagonId ? input.carga ?? item.carga : item.carga,
      })));

      await tx.arrastreTorreonVagon.update({
        where: { id: vagonId },
        data: compact({
          numeroVagon: input.numeroVagon,
          carga: input.carga,
          viaId: input.viaId,
          seccionId: input.seccionId,
        }),
      });

      return id;
    });

    return getArrastreDetalle(arrastreId);
  }

  static async crearIncidente(id: number, input: z.infer<typeof crearIncidenteArrastreSchema>) {
    const result = await prismaTorreon.$transaction(async (tx) => {
      const arrastre = await getArrastreOrThrow(tx, id);
      if (isArrastreCerrado(arrastre.estado)) {
        throw new DomainError(409, `Arrastre no puede detenerse en estado ${arrastre.estado}`);
      }

      const incidenteAbierto = await this.obtenerActivo(tx, id);
      if (incidenteAbierto) {
        throw new DomainError(409, "El arrastre ya tiene incidente abierto", {
          incidenteId: incidenteAbierto.id,
        });
      }

      const vagon = input.vagonId ? arrastre.vagones.find((item) => item.id === input.vagonId) : undefined;
      if (input.vagonId && !vagon) throw new DomainError(404, "Vagon no pertenece al arrastre");

      const viaBloqueadaId = input.viaBloqueadaId ?? vagon?.viaId ?? arrastre.viaDestinoId ?? arrastre.viaOrigenId;
      const seccionBloqueadaId = input.seccionBloqueadaId ?? vagon?.seccionId ?? arrastre.seccionDestinoId ?? arrastre.seccionOrigenId;

      if (!viaBloqueadaId && !seccionBloqueadaId) {
        throw new DomainError(400, "Debe existir via o seccion para bloquear");
      }

      const incidente = await tx.incidenteArrastreTorreon.create({
        data: {
          arrastreId: id,
          vagonId: vagon?.id,
          creadoPorId: input.creadoPorId,
          motivo: input.motivo,
          localidadId: arrastre.localidadId,
          viaBloqueadaId,
          seccionBloqueadaId,
          fechaInicio: input.fechaInicio ?? new Date(),
        },
      });

      await createIncidenteFotos(tx, incidente.id, input.fotos, input.creadoPorId);

      await tx.arrastreTorreon.update({
        where: { id },
        data: {
          estado: EstadoArrastreTorreon.DETENIDO,
          fechaPausa: new Date(),
        },
      });

      await tx.arrastreTorreonVagon.updateMany({
        where: {
          arrastreId: id,
          ...(vagon
            ? { id: vagon.id }
            : viaBloqueadaId && seccionBloqueadaId
              ? { viaId: viaBloqueadaId, seccionId: seccionBloqueadaId }
              : viaBloqueadaId
                ? { viaId: viaBloqueadaId }
                : seccionBloqueadaId
                  ? { seccionId: seccionBloqueadaId }
                  : {}),
          estado: { in: [EstadoVagonArrastreTorreon.PENDIENTE, EstadoVagonArrastreTorreon.EN_PROCESO] },
        },
        data: { estado: EstadoVagonArrastreTorreon.BLOQUEADO },
      });

      return { arrastreId: id, incidenteId: incidente.id };
    });

    return {
      arrastre: await getArrastreDetalle(result.arrastreId),
      incidenteId: result.incidenteId,
    };
  }

  static async resolverIncidente(
    id: number,
    incidenteId: number,
    input: z.infer<typeof resolverIncidenteArrastreSchema>
  ) {
    const arrastreId = await prismaTorreon.$transaction(async (tx) => {
      const incidente = await tx.incidenteArrastreTorreon.findUnique({
        where: { id: incidenteId },
      });
      if (!incidente || incidente.arrastreId !== id) {
        throw new DomainError(404, "Incidente de arrastre no encontrado");
      }

      if (incidente.estado === EstadoIncidenteArrastreTorreon.RESUELTO) return id;

      await tx.incidenteArrastreTorreon.update({
        where: { id: incidenteId },
        data: {
          estado: EstadoIncidenteArrastreTorreon.RESUELTO,
          solucion: input.solucion,
          resueltoPorId: input.resueltoPorId,
          fechaResolucion: input.fechaResolucion ?? new Date(),
        },
      });

      return id;
    });

    return getArrastreDetalle(arrastreId);
  }

  static async reanudar(id: number, input: z.infer<typeof reanudarArrastreSchema>) {
    const arrastreId = await prismaTorreon.$transaction(async (tx) => {
      const arrastre = await getArrastreOrThrow(tx, id);
      if (arrastre.estado !== EstadoArrastreTorreon.DETENIDO) {
        throw new DomainError(409, `Arrastre debe estar DETENIDO para reanudar. Estado actual: ${arrastre.estado}`);
      }

      await this.assertPuedeEjecutar(tx, arrastre);

      const fechaInicio = arrastre.fechaInicio ?? input.fechaReanudacion ?? new Date();
      await tx.arrastreTorreon.update({
        where: { id },
        data: {
          estado: EstadoArrastreTorreon.EN_PROCESO,
          operadorId: input.operadorId ?? arrastre.operadorId,
          fechaPausa: null,
          fechaInicio,
        },
      });

      await tx.arrastreTorreonVagon.updateMany({
        where: {
          arrastreId: id,
          estado: EstadoVagonArrastreTorreon.BLOQUEADO,
        },
        data: {
          estado: EstadoVagonArrastreTorreon.PENDIENTE,
        },
      });

      return id;
    });

    return getArrastreDetalle(arrastreId);
  }
}
