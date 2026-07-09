import {
  CargaVagonArrastreTorreon,
  EstadoArrastreTorreon,
  EstadoIncidenteArrastreTorreon,
  EstadoIncidenteTorreon,
  EstadoVagonArrastreTorreon,
  Prisma,
  PrismaClient,
} from "../../../generated";
import { prismaTorreon } from "../../db/prisma";
import { DomainError } from "../../utils/domainError";
import { guardarFotoTorreon } from "../../utils/imagenesTorreon";
import { fotoInputSchema } from "../movimientos/movimiento.schemas";
import { RondaModel } from "../rondas/ronda.model";
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
  reordenarSolicitudesArrastreSchema,
  reordenarVagonesArrastreSchema,
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

const buildArrastreDetalleInclude = (includeFotos: boolean) => ({
  vagones: { orderBy: { orden: "asc" as const } },
  incidentes: {
    include: {
      vagon: true,
      _count: { select: { fotos: true } },
      ...(includeFotos ? { fotos: { orderBy: { orden: "asc" as const } } } : {}),
    },
    orderBy: { createdAt: "desc" as const },
  },
}) satisfies Prisma.ArrastreTorreonInclude;

const buildArrastreListInclude = (includeFotos: boolean) => ({
  vagones: { orderBy: { orden: "asc" as const } },
  incidentes: {
    include: {
      vagon: true,
      _count: { select: { fotos: true } },
      ...(includeFotos ? { fotos: { orderBy: { orden: "asc" as const } } } : {}),
    },
    orderBy: { createdAt: "desc" as const },
  },
}) satisfies Prisma.ArrastreTorreonInclude;

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

const mergeComentarios = (...values: Array<string | null | undefined>) => {
  const clean = values
    .map((value) => typeof value === "string" ? value.trim() : "")
    .filter(Boolean);
  return clean.length ? clean.join("\n") : undefined;
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

const ORDER_SHIFT = 100000;

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

const isArrastreEditableOperativo = (estado: EstadoArrastreTorreon) => (
  estado === EstadoArrastreTorreon.SOLICITADO || estado === EstadoArrastreTorreon.DETENIDO
);

const assertArrastreEditable = (estado: EstadoArrastreTorreon) => {
  if (!isArrastreEditableOperativo(estado)) {
    throw new DomainError(409, `Arrastre no puede editarse en estado ${estado}`);
  }
};

const assertArrastreSinVagonEnProceso = (vagones: Array<{ id: number; orden: number; estado: EstadoVagonArrastreTorreon }>) => {
  const activo = vagones.find((vagon) => vagon.estado === EstadoVagonArrastreTorreon.EN_PROCESO);
  if (activo) {
    throw new DomainError(409, "Arrastre no puede editarse con vagon en proceso", {
      vagonId: activo.id,
      orden: activo.orden,
    });
  }
};

const ESTADOS_ARRASTRE_ACTIVO = [
  EstadoArrastreTorreon.SOLICITADO,
  EstadoArrastreTorreon.EN_PROCESO,
  EstadoArrastreTorreon.DETENIDO,
];

const ESTADOS_VAGON_RECALCULABLE = [
  EstadoVagonArrastreTorreon.PENDIENTE,
  EstadoVagonArrastreTorreon.EN_PROCESO,
  EstadoVagonArrastreTorreon.BLOQUEADO,
];

type BloqueoResourceFilter = {
  viaBloqueadaId?: number | null;
  seccionBloqueadaId?: number | null;
};

type ArrastreListQuery = {
  localidadId?: number;
  empresaId?: number;
  estado?: string;
  vista?: string;
  page?: number;
  pageSize?: number;
  includeFotos?: boolean;
};

function buildArrastreResourceFilters(refs: ArrastreRefs): BloqueoResourceFilter[] {
  const points = [
    { viaId: refs.viaOrigenId, seccionId: refs.seccionOrigenId },
    { viaId: refs.viaDestinoId, seccionId: refs.seccionDestinoId },
    ...(refs.vagones ?? []).map((vagon) => ({ viaId: vagon.viaId, seccionId: vagon.seccionId })),
  ];
  const filters = new Map<string, BloqueoResourceFilter>();

  const addFilter = (filter: BloqueoResourceFilter) => {
    filters.set(`${filter.viaBloqueadaId ?? "any"}:${filter.seccionBloqueadaId ?? "any"}`, filter);
  };

  points.forEach(({ viaId, seccionId }) => {
    const hasVia = typeof viaId === "number";
    const hasSeccion = typeof seccionId === "number";

    if (hasVia && hasSeccion) {
      addFilter({ viaBloqueadaId: viaId, seccionBloqueadaId: seccionId });
      addFilter({ viaBloqueadaId: viaId, seccionBloqueadaId: null });
      addFilter({ viaBloqueadaId: null, seccionBloqueadaId: seccionId });
      return;
    }

    if (hasVia) addFilter({ viaBloqueadaId: viaId });
    if (hasSeccion) addFilter({ seccionBloqueadaId: seccionId });
  });

  return Array.from(filters.values());
}

function vagonEstaBloqueadoPorIncidente(
  vagon: { viaId: number; seccionId: number },
  incidente: { viaBloqueadaId: number | null; seccionBloqueadaId: number | null }
) {
  const tieneVia = typeof incidente.viaBloqueadaId === "number";
  const tieneSeccion = typeof incidente.seccionBloqueadaId === "number";

  if (tieneVia && tieneSeccion) {
    return vagon.viaId === incidente.viaBloqueadaId && vagon.seccionId === incidente.seccionBloqueadaId;
  }

  if (tieneVia) return vagon.viaId === incidente.viaBloqueadaId;
  if (tieneSeccion) return vagon.seccionId === incidente.seccionBloqueadaId;
  return false;
}

async function getArrastreOrThrow(tx: Tx | PrismaClient, arrastreId: number) {
  const arrastre = await tx.arrastreTorreon.findUnique({
    where: { id: arrastreId },
    include: { vagones: { orderBy: { orden: "asc" } } },
  });
  if (!arrastre) throw new DomainError(404, "Arrastre no encontrado");
  return decorarArrastreDetalle(arrastre);
}

async function getArrastreDetalle(arrastreId: number, includeFotos = true) {
  const arrastre = await prismaTorreon.arrastreTorreon.findUnique({
    where: { id: arrastreId },
    include: buildArrastreDetalleInclude(includeFotos),
  });
  if (!arrastre) throw new DomainError(404, "Arrastre no encontrado");
  return decorarArrastreDetalle(arrastre);
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
  static async listar(query: ArrastreListQuery) {
    const vista = String(query.vista || "").toUpperCase();
    const isHistoryVista = ["HISTORIAL", "COMPLETADOS", "CERRADOS", "PASADOS"].includes(vista);
    const isActiveVista = ["ACTIVOS", "ABIERTOS", "PENDIENTES"].includes(vista);
    const pageSize = Math.min(100, Math.max(1, Math.trunc(query.pageSize ?? 50)));
    const page = Math.max(1, Math.trunc(query.page ?? 1));
    const estadoByVista = query.estado
      ? query.estado as EstadoArrastreTorreon
      : isActiveVista
        ? { in: ESTADOS_ARRASTRE_ACTIVO }
        : isHistoryVista
          ? { in: [EstadoArrastreTorreon.CONCLUIDO, EstadoArrastreTorreon.CANCELADO] }
          : undefined;

    const arrastres = await prismaTorreon.arrastreTorreon.findMany({
      where: compact({
        localidadId: query.localidadId,
        empresaId: query.empresaId,
        estado: estadoByVista,
      }) as Prisma.ArrastreTorreonWhereInput,
      include: buildArrastreListInclude(query.includeFotos === true),
      orderBy: isHistoryVista
        ? [{ fechaFin: "desc" }, { fechaSolicitud: "desc" }, { id: "desc" }]
        : [{ ordenSolicitud: "asc" }, { fechaSolicitud: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return arrastres.map(decorarArrastreDetalle);
  }

  static async obtener(id: number, includeFotos = true) {
    return getArrastreDetalle(id, includeFotos);
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

    const [incidenteArrastre, incidenteNatural] = await Promise.all([
      tx.incidenteArrastreTorreon.findFirst({
        where: {
          estado: EstadoIncidenteArrastreTorreon.ABIERTO,
          localidadId: refs.localidadId,
          ...(excludeIncidentId ? { id: { not: excludeIncidentId } } : {}),
          OR: filters,
        },
        orderBy: { fechaInicio: "asc" },
      }),
      tx.incidenteTorreonFerro.findFirst({
        where: {
          estado: EstadoIncidenteTorreon.ABIERTO,
          localidadId: refs.localidadId,
          OR: filters,
        },
        orderBy: { fechaInicio: "asc" },
      }),
    ]);

    if (!incidenteArrastre) return incidenteNatural ?? undefined;
    if (!incidenteNatural) return incidenteArrastre;
    return incidenteArrastre.fechaInicio <= incidenteNatural.fechaInicio ? incidenteArrastre : incidenteNatural;
  }

  static async recalcularBloqueosLocalidad(tx: Tx, localidadId: number) {
    const [incidentesArrastre, incidentesNaturales] = await Promise.all([
      tx.incidenteArrastreTorreon.findMany({
        where: {
          localidadId,
          estado: EstadoIncidenteArrastreTorreon.ABIERTO,
        },
        orderBy: [{ fechaInicio: "asc" }, { id: "asc" }],
        select: {
          id: true,
          viaBloqueadaId: true,
          seccionBloqueadaId: true,
        },
      }),
      tx.incidenteTorreonFerro.findMany({
        where: {
          localidadId,
          estado: EstadoIncidenteTorreon.ABIERTO,
        },
        orderBy: [{ fechaInicio: "asc" }, { id: "asc" }],
        select: {
          id: true,
          viaBloqueadaId: true,
          seccionBloqueadaId: true,
        },
      }),
    ]);
    const incidentesAbiertos = [...incidentesArrastre, ...incidentesNaturales];

    const arrastres = await tx.arrastreTorreon.findMany({
      where: {
        localidadId,
        estado: { in: ESTADOS_ARRASTRE_ACTIVO },
      },
      select: { id: true },
    });

    if (!arrastres.length) {
      return { arrastres: 0, evaluados: 0, bloqueados: 0, liberados: 0 };
    }

    const arrastreIds = arrastres.map((arrastre) => arrastre.id);
    const vagones = await tx.arrastreTorreonVagon.findMany({
      where: {
        arrastreId: { in: arrastreIds },
        estado: { in: ESTADOS_VAGON_RECALCULABLE },
      },
      orderBy: [{ arrastreId: "asc" }, { orden: "asc" }],
      select: {
        id: true,
        viaId: true,
        seccionId: true,
        estado: true,
      },
    });

    let bloqueados = 0;
    let liberados = 0;

    for (const vagon of vagones) {
      const bloqueado = incidentesAbiertos.some((incidente) =>
        vagonEstaBloqueadoPorIncidente(vagon, incidente)
      );

      if (bloqueado) {
        if (vagon.estado === EstadoVagonArrastreTorreon.PENDIENTE) {
          await tx.arrastreTorreonVagon.update({
            where: { id: vagon.id },
            data: { estado: EstadoVagonArrastreTorreon.BLOQUEADO },
          });
        }
        bloqueados += 1;
        continue;
      }

      if (vagon.estado === EstadoVagonArrastreTorreon.BLOQUEADO) {
        await tx.arrastreTorreonVagon.update({
          where: { id: vagon.id },
          data: { estado: EstadoVagonArrastreTorreon.PENDIENTE },
        });
        liberados += 1;
      }
    }

    return {
      arrastres: arrastreIds.length,
      evaluados: vagones.length,
      bloqueados,
      liberados,
    };
  }

  private static async assertPuedeEjecutar(tx: Tx, arrastre: ArrastreRefs, confirmarIncidente = false) {
    const incidenteBloqueante = await this.findIncidenteBloqueante(tx, arrastre);
    if (incidenteBloqueante && confirmarIncidente) return incidenteBloqueante;
    if (incidenteBloqueante) {
      throw new DomainError(409, "El vagon o ruta del arrastre esta bloqueado por incidente abierto", {
        incidenteId: incidenteBloqueante.id,
        requiereConfirmacion: true,
        accionPermitida: "Resolver incidente o elegir otro vagon/ruta disponible",
      });
    }
    return undefined;
  }

  private static async sincronizarEstadoOperativo(tx: Tx, arrastreId: number, fechaReferencia = new Date()) {
    const arrastre = await tx.arrastreTorreon.findUnique({
      where: { id: arrastreId },
      include: {
        vagones: {
          select: {
            estado: true,
            fechaInicio: true,
          },
        },
      },
    });
    if (!arrastre || isArrastreCerrado(arrastre.estado)) return;

    const incidentesAbiertos = await tx.incidenteArrastreTorreon.count({
      where: { arrastreId, estado: EstadoIncidenteArrastreTorreon.ABIERTO },
    });
    const primerInicio = arrastre.vagones
      .map((vagon) => vagon.fechaInicio)
      .filter((value): value is Date => Boolean(value))
      .sort((left, right) => left.getTime() - right.getTime())[0] ?? null;
    const tieneVagonEnProceso = arrastre.vagones.some((vagon) => vagon.estado === EstadoVagonArrastreTorreon.EN_PROCESO);
    const tienePendientesOperativos = arrastre.vagones.some((vagon) => vagon.estado !== EstadoVagonArrastreTorreon.CONCLUIDO);

    let siguienteEstado: EstadoArrastreTorreon;
    if (!tienePendientesOperativos && incidentesAbiertos === 0) {
      siguienteEstado = EstadoArrastreTorreon.CONCLUIDO;
    } else if (incidentesAbiertos > 0) {
      siguienteEstado = EstadoArrastreTorreon.DETENIDO;
    } else if (tieneVagonEnProceso || arrastre.fechaInicio || primerInicio) {
      siguienteEstado = EstadoArrastreTorreon.EN_PROCESO;
    } else {
      siguienteEstado = EstadoArrastreTorreon.SOLICITADO;
    }

    const data: Prisma.ArrastreTorreonUpdateInput = {};
    if (arrastre.estado !== siguienteEstado) data.estado = siguienteEstado;
    if (!arrastre.fechaInicio && primerInicio) data.fechaInicio = primerInicio;
    if (siguienteEstado === EstadoArrastreTorreon.CONCLUIDO && !arrastre.fechaFin) data.fechaFin = fechaReferencia;
    if (siguienteEstado === EstadoArrastreTorreon.DETENIDO && !arrastre.fechaPausa) data.fechaPausa = fechaReferencia;
    if (siguienteEstado !== EstadoArrastreTorreon.DETENIDO && arrastre.fechaPausa) data.fechaPausa = null;

    if (Object.keys(data).length) {
      await tx.arrastreTorreon.update({
        where: { id: arrastreId },
        data,
      });
    }
  }

  static async crear(input: z.infer<typeof createArrastreSchema>) {
    assertCapacidadArrastre(input.vagones);

    const arrastreId = await prismaTorreon.$transaction(async (tx) => {
      const last = await tx.arrastreTorreon.findFirst({
        where: { localidadId: input.localidadId },
        orderBy: [{ ordenSolicitud: "desc" }, { id: "desc" }],
        select: { ordenSolicitud: true },
      });
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
          ordenSolicitud: (last?.ordenSolicitud ?? 0) + 1,
          instrucciones: input.instrucciones,
          vagones: {
            create: input.vagones.map((vagon, index) => compact({
              orden: index + 1,
              numeroVagon: vagon.numeroVagon,
              carga: vagon.carga,
              viaId: vagon.viaId,
              seccionId: vagon.seccionId,
              comentario: vagon.comentario,
              fechaSolicitud: vagon.fechaSolicitud,
            })),
          },
        }),
      });

      await this.recalcularBloqueosLocalidad(tx, input.localidadId);
      return arrastre.id;
    });

    return getArrastreDetalle(arrastreId);
  }

  static async reordenarSolicitudes(input: z.infer<typeof reordenarSolicitudesArrastreSchema>) {
    const localidadId = await prismaTorreon.$transaction(async (tx) => {
      const selected = await tx.arrastreTorreon.findMany({
        where: { id: { in: input.arrastreIds } },
        include: { vagones: { orderBy: { orden: "asc" } } },
      });

      if (selected.length !== input.arrastreIds.length) {
        throw new DomainError(404, "Una o mas solicitudes de arrastre no existen");
      }

      const localidadIds = new Set(selected.map((arrastre) => arrastre.localidadId));
      if (localidadIds.size !== 1) {
        throw new DomainError(400, "Solo puedes reordenar solicitudes de una misma localidad");
      }

      const targetLocalidadId = selected[0].localidadId;
      if (input.empresaId && selected.some((arrastre) => arrastre.empresaId !== input.empresaId)) {
        throw new DomainError(403, "Solo puedes reordenar solicitudes de tu empresa");
      }

      for (const arrastre of selected) {
        assertArrastreEditable(arrastre.estado);
        assertArrastreSinVagonEnProceso(arrastre.vagones);
      }

      const solicitudes = await tx.arrastreTorreon.findMany({
        where: { localidadId: targetLocalidadId },
        include: { vagones: { orderBy: { orden: "asc" } } },
        orderBy: [
          { ordenSolicitud: "asc" },
          { fechaSolicitud: "asc" },
          { id: "asc" },
        ],
      });

      const isScopedEditable = (arrastre: typeof solicitudes[number]) => {
        const sameScope = input.empresaId ? arrastre.empresaId === input.empresaId : true;
        return sameScope
          && isArrastreEditableOperativo(arrastre.estado)
          && !arrastre.vagones.some((vagon) => vagon.estado === EstadoVagonArrastreTorreon.EN_PROCESO);
      };

      const editable = solicitudes.filter(isScopedEditable);
      const editableIds = new Set(editable.map((arrastre) => arrastre.id));
      const incluyeTodas = input.arrastreIds.length === editable.length
        && input.arrastreIds.every((arrastreId) => editableIds.has(arrastreId));

      if (!incluyeTodas) {
        throw new DomainError(400, "El orden debe incluir todas las solicitudes editables del alcance actual");
      }

      const byId = new Map(solicitudes.map((arrastre) => [arrastre.id, arrastre]));
      const reorderedEditable = input.arrastreIds.map((arrastreId) => byId.get(arrastreId)!);
      let editableCursor = 0;
      const finalOrder = solicitudes.map((arrastre) => (
        editableIds.has(arrastre.id) ? reorderedEditable[editableCursor++] : arrastre
      ));

      await tx.arrastreTorreon.updateMany({
        where: { localidadId: targetLocalidadId },
        data: { ordenSolicitud: { increment: ORDER_SHIFT } },
      });

      await Promise.all(
        finalOrder.map((arrastre, index) =>
          tx.arrastreTorreon.update({
            where: { id: arrastre.id },
            data: { ordenSolicitud: index + 1 },
          })
        )
      );

      return targetLocalidadId;
    });

    return this.listar({ localidadId });
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
      const vagon = arrastre.vagones.find((item) => item.id === vagonId);
      if (!vagon) throw new DomainError(404, "Vagon no pertenece al arrastre");
      if (vagon.estado === EstadoVagonArrastreTorreon.CONCLUIDO) {
        throw new DomainError(409, "Vagon ya concluido");
      }
      if (vagon.estado === EstadoVagonArrastreTorreon.BLOQUEADO) {
        if (!input.confirmarIncidente) {
          throw new DomainError(409, "Vagon bloqueado por incidente abierto", {
            requiereConfirmacion: true,
            accionPermitida: "Si el maquinista confirma que se puede realizar, vuelve a iniciar con confirmarIncidente=true",
          });
        }
      }

      const activo = arrastre.vagones.find((item) => item.estado === EstadoVagonArrastreTorreon.EN_PROCESO);
      if (activo && activo.id !== vagonId) {
        throw new DomainError(409, "Ya hay un vagon en proceso dentro de este arrastre", {
          vagonActivoId: activo.id,
          ordenActivo: activo.orden,
        });
      }
      if (activo?.id === vagonId) return id;

      const incidenteConfirmado = await this.assertPuedeEjecutar(tx, { ...arrastre, vagones: [vagon] }, Boolean(input.confirmarIncidente));
      const fechaInicio = vagon.fechaInicio ?? input.fechaInicio ?? new Date();
      const comentarioActual = (vagon as { comentario?: string | null }).comentario;
      const comentarioIncidente = incidenteConfirmado
        ? `Operacion autorizada con incidente abierto #${incidenteConfirmado.id}`
        : undefined;

      await tx.arrastreTorreonVagon.update({
        where: { id: vagonId },
        data: {
          estado: EstadoVagonArrastreTorreon.EN_PROCESO,
          fechaInicio,
          comentario: mergeComentarios(comentarioActual, comentarioIncidente, input.comentarioOperacion),
        },
      });
      await this.sincronizarEstadoOperativo(tx, id, fechaInicio);

      return id;
    });

    return getArrastreDetalle(arrastreId);
  }

  static async finalizarVagon(id: number, vagonId: number, input: z.infer<typeof finalizarVagonArrastreSchema>) {
    const arrastreId = await prismaTorreon.$transaction(async (tx) => {
      const arrastre = await getArrastreOrThrow(tx, id);
      const vagon = arrastre.vagones.find((item) => item.id === vagonId);
      if (!vagon) throw new DomainError(404, "Vagon no pertenece al arrastre");
      if (vagon.estado !== EstadoVagonArrastreTorreon.EN_PROCESO) {
        throw new DomainError(409, `Vagon debe estar EN_PROCESO para finalizar. Estado actual: ${vagon.estado}`);
      }

      const incidenteConfirmado = await this.assertPuedeEjecutar(tx, { ...arrastre, vagones: [vagon] }, Boolean(input.confirmarIncidente));
      const fechaFin = input.fechaFin ?? new Date();
      const comentarioActual = (vagon as { comentario?: string | null }).comentario;
      const comentarioIncidente = incidenteConfirmado
        ? `Cierre autorizado con incidente abierto #${incidenteConfirmado.id}`
        : undefined;

      await tx.arrastreTorreonVagon.update({
        where: { id: vagonId },
        data: {
          estado: EstadoVagonArrastreTorreon.CONCLUIDO,
          fechaFin,
          comentario: mergeComentarios(comentarioActual, comentarioIncidente, input.comentarioOperacion),
        },
      });
      await this.sincronizarEstadoOperativo(tx, id, fechaFin);

      return id;
    });

    return getArrastreDetalle(arrastreId);
  }

  static async editarVagon(id: number, vagonId: number, input: z.infer<typeof editarVagonArrastreSchema>) {
    const arrastreId = await prismaTorreon.$transaction(async (tx) => {
      const arrastre = await getArrastreOrThrow(tx, id);
      assertArrastreEditable(arrastre.estado);
      assertArrastreSinVagonEnProceso(arrastre.vagones);

      const vagon = arrastre.vagones.find((item) => item.id === vagonId);
      if (!vagon) throw new DomainError(404, "Vagon no pertenece al arrastre");

      if (vagon.estado === EstadoVagonArrastreTorreon.EN_PROCESO) {
        throw new DomainError(409, "Vagon en proceso no se puede editar");
      }
      if (vagon.estado === EstadoVagonArrastreTorreon.CONCLUIDO) {
        throw new DomainError(409, "Vagon concluido no se puede editar");
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
          comentario: input.comentario,
        }),
      });

      await this.recalcularBloqueosLocalidad(tx, arrastre.localidadId);
      return id;
    });

    return getArrastreDetalle(arrastreId);
  }

  static async reordenarVagones(id: number, input: z.infer<typeof reordenarVagonesArrastreSchema>) {
    const arrastreId = await prismaTorreon.$transaction(async (tx) => {
      const arrastre = await getArrastreOrThrow(tx, id);
      assertArrastreEditable(arrastre.estado);
      assertArrastreSinVagonEnProceso(arrastre.vagones);

      const existingIds = new Set(arrastre.vagones.map((vagon) => vagon.id));
      const incluyeTodos = input.vagonIds.length === arrastre.vagones.length
        && input.vagonIds.every((vagonId) => existingIds.has(vagonId));

      if (!incluyeTodos) {
        throw new DomainError(400, "El orden debe incluir todos los vagones del arrastre una sola vez");
      }

      await tx.arrastreTorreonVagon.updateMany({
        where: { arrastreId: id },
        data: { orden: { increment: ORDER_SHIFT } },
      });

      await Promise.all(
        input.vagonIds.map((vagonId, index) =>
          tx.arrastreTorreonVagon.update({
            where: { id: vagonId },
            data: { orden: index + 1 },
          })
        )
      );

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
          estado: EstadoVagonArrastreTorreon.PENDIENTE,
        },
        data: { estado: EstadoVagonArrastreTorreon.BLOQUEADO },
      });

      await this.recalcularBloqueosLocalidad(tx, arrastre.localidadId);
      await RondaModel.recalcularBloqueosLocalidad(tx, arrastre.localidadId);
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

      await this.recalcularBloqueosLocalidad(tx, incidente.localidadId);
      await RondaModel.recalcularBloqueosLocalidad(tx, incidente.localidadId);
      await this.sincronizarEstadoOperativo(tx, id, input.fechaResolucion ?? new Date());
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

      await this.recalcularBloqueosLocalidad(tx, arrastre.localidadId);

      return id;
    });

    return getArrastreDetalle(arrastreId);
  }
}
