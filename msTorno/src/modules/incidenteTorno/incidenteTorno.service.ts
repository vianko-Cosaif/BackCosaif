import { prismaTorno } from "../../db/prisma";

type TransactionClient = Parameters<Parameters<typeof prismaTorno.$transaction>[0]>[0];

export class TornoIncidentDomainError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "TornoIncidentDomainError";
  }
}

const INCIDENTE_PADRE_INCLUDE = {
  hijos: true,
  ruedaSolicitud: true,
  rondaServicio: true,
} as const;

const openChildWhere = (incidenteTornoId: number) => ({
  incidenteTornoId,
  OR: [{ resuelto: false }, { status: { not: "RESUELTO" as const } }],
});

function now() {
  return new Date();
}

function isResolvedPatch(input: { status?: string; resuelto?: boolean }) {
  return input.status === "RESUELTO" || input.resuelto === true;
}

async function deriveLocalidadId(
  tx: TransactionClient,
  input: { localidadId?: number | null; rondaServicioId?: number | null; ruedaSolicitudId?: number | null }
) {
  if (input.localidadId !== undefined) return input.localidadId ?? null;

  if (input.rondaServicioId) {
    const ronda = await tx.rondaServicio.findUnique({
      where: { id: input.rondaServicioId },
      select: { localidadId: true },
    });
    return ronda?.localidadId ?? undefined;
  }

  if (input.ruedaSolicitudId) {
    const ronda = await tx.rondaServicio.findUnique({
      where: { ruedaSolicitudId: input.ruedaSolicitudId },
      select: { localidadId: true },
    });
    return ronda?.localidadId ?? undefined;
  }

  return undefined;
}

async function pauseRondaForIncident(
  tx: TransactionClient,
  incidente: { id: number; rondaServicioId: number | null }
) {
  if (!incidente.rondaServicioId) return;

  const ronda = await tx.rondaServicio.findUnique({
    where: { id: incidente.rondaServicioId },
    include: { tornoG: true },
  });
  if (!ronda) throw new TornoIncidentDomainError(404, "Ronda de servicio no encontrada");
  if (ronda.status === "CONCLUIDO" || ronda.status === "CANCELADO") {
    throw new TornoIncidentDomainError(409, `Ronda ${ronda.status} no puede detenerse por incidente`);
  }

  await tx.rondaServicio.update({
    where: { id: ronda.id },
    data: {
      status: "DETENIDO",
      detenidoPorIncidenteId: incidente.id,
    },
  });

  if (ronda.tornoG) {
    await tx.tornoG.update({
      where: { id: ronda.tornoG.id },
      data: { estado: "PAUSADO" },
    });
    await tx.tornoRuedaTrabajo.updateMany({
      where: { tornoGId: ronda.tornoG.id, estado: "EN_PROCESO" },
      data: { estado: "PAUSADO" },
    });
  }
}

async function resumeRondaIfAllowed(
  tx: TransactionClient,
  incidente: { id: number; rondaServicioId: number | null }
) {
  if (!incidente.rondaServicioId) return;

  const ronda = await tx.rondaServicio.findUnique({
    where: { id: incidente.rondaServicioId },
    include: { tornoG: true },
  });
  if (!ronda || ronda.status !== "DETENIDO") return;

  const openParents = await tx.incidenteTorno.count({
    where: {
      rondaServicioId: ronda.id,
      OR: [{ resuelto: false }, { status: { not: "RESUELTO" } }],
    },
  });
  if (openParents > 0) return;
  if (!ronda.torneroId) return;

  await tx.rondaServicio.update({
    where: { id: ronda.id },
    data: {
      status: "EN_PROCESO",
      detenidoPorIncidenteId: null,
    },
  });

  if (ronda.tornoG && ronda.tornoG.estado === "PAUSADO") {
    await tx.tornoG.update({
      where: { id: ronda.tornoG.id },
      data: { estado: "EN_PROCESO" },
    });
  }
}

export const incidenteTornoService = {
  async createParent(input: {
    tipoFalla: "FALLO_SISTEMA" | "NAVAJAS";
    status?: "EN_PROCESO" | "RESUELTO";
    resuelto?: boolean;
    comentario?: string | null;
    creadoPorId: number;
    atendidoPorId?: number | null;
    localidadId?: number | null;
    numeroLocomotora?: number | null;
    fechaAtencion?: Date | null;
    fechaTerminacion?: Date | null;
    ruedaSolicitudId?: number | null;
    rondaServicioId?: number | null;
  }) {
    return prismaTorno.$transaction(async (tx) => {
      const resolved = isResolvedPatch(input);
      const localidadId = await deriveLocalidadId(tx, input);
      const incidente = await tx.incidenteTorno.create({
        data: {
          tipoFalla: input.tipoFalla,
          status: resolved ? "RESUELTO" : input.status ?? "EN_PROCESO",
          resuelto: resolved,
          comentario: input.comentario ?? undefined,
          creadoPorId: input.creadoPorId,
          atendidoPorId: input.atendidoPorId ?? undefined,
          localidadId: localidadId ?? undefined,
          numeroLocomotora: input.numeroLocomotora ?? undefined,
          fechaAtencion: input.fechaAtencion ?? undefined,
          fechaTerminacion: resolved ? input.fechaTerminacion ?? now() : input.fechaTerminacion ?? undefined,
          ruedaSolicitudId: input.ruedaSolicitudId ?? undefined,
          rondaServicioId: input.rondaServicioId ?? undefined,
        } as any,
      });

      if (!resolved) await pauseRondaForIncident(tx, incidente);

      return tx.incidenteTorno.findUniqueOrThrow({
        where: { id: incidente.id },
        include: INCIDENTE_PADRE_INCLUDE,
      });
    });
  },

  async updateParent(
    id: number,
    input: {
      tipoFalla?: "FALLO_SISTEMA" | "NAVAJAS";
      status?: "EN_PROCESO" | "RESUELTO";
      resuelto?: boolean;
      comentario?: string | null;
      atendidoPorId?: number | null;
      localidadId?: number | null;
      numeroLocomotora?: number | null;
      fechaAtencion?: Date | null;
      fechaTerminacion?: Date | null;
      ruedaSolicitudId?: number | null;
      rondaServicioId?: number | null;
    }
  ) {
    if (isResolvedPatch(input)) {
      return this.resolveParent(id, input);
    }

    return prismaTorno.$transaction(async (tx) => {
      const current = await tx.incidenteTorno.findUnique({ where: { id } });
      if (!current) throw new TornoIncidentDomainError(404, "Incidente no encontrado");
      if (current.status === "RESUELTO" || current.resuelto) {
        throw new TornoIncidentDomainError(409, "Incidente resuelto no puede reabrirse desde PATCH generico");
      }

      const localidadId = await deriveLocalidadId(tx, input);
      const localidadPatch = localidadId === undefined ? {} : { localidadId };
      const data = await tx.incidenteTorno.update({
        where: { id },
        data: {
          ...input,
          ...localidadPatch,
          comentario: input.comentario ?? undefined,
          atendidoPorId: input.atendidoPorId ?? undefined,
          fechaAtencion: input.fechaAtencion ?? undefined,
          fechaTerminacion: input.fechaTerminacion ?? undefined,
          ruedaSolicitudId: input.ruedaSolicitudId ?? undefined,
          rondaServicioId: input.rondaServicioId ?? undefined,
        } as any,
        include: INCIDENTE_PADRE_INCLUDE,
      });

      if (data.rondaServicioId) await pauseRondaForIncident(tx, data);
      return data;
    });
  },

  async resolveParent(
    id: number,
    input: {
      comentario?: string | null;
      atendidoPorId?: number | null;
      fechaAtencion?: Date | null;
      fechaTerminacion?: Date | null;
    } = {}
  ) {
    return prismaTorno.$transaction(async (tx) => {
      const current = await tx.incidenteTorno.findUnique({
        where: { id },
        include: { hijos: true },
      });
      if (!current) throw new TornoIncidentDomainError(404, "Incidente no encontrado");
      if (current.status === "RESUELTO" && current.resuelto) {
        return tx.incidenteTorno.findUniqueOrThrow({
          where: { id },
          include: INCIDENTE_PADRE_INCLUDE,
        });
      }

      const openChildren = current.hijos.filter(
        (child) => !child.resuelto || child.status !== "RESUELTO"
      );
      if (openChildren.length) {
        throw new TornoIncidentDomainError(
          409,
          "No se puede resolver el incidente padre: existen seguimientos hijos pendientes",
          {
            hijosPendientes: openChildren.length,
            hijosPendientesIds: openChildren.map((child) => child.id),
          }
        );
      }

      const data = await tx.incidenteTorno.update({
        where: { id },
        data: {
          status: "RESUELTO",
          resuelto: true,
          comentario: input.comentario ?? current.comentario ?? undefined,
          atendidoPorId: input.atendidoPorId ?? current.atendidoPorId ?? undefined,
          fechaAtencion: input.fechaAtencion ?? current.fechaAtencion ?? now(),
          fechaTerminacion: input.fechaTerminacion ?? now(),
        },
        include: INCIDENTE_PADRE_INCLUDE,
      });

      await resumeRondaIfAllowed(tx, data);
      return data;
    });
  },

  async resolutionSummary(id: number) {
    const current = await prismaTorno.incidenteTorno.findUnique({
      where: { id },
      include: { hijos: true },
    });
    if (!current) throw new TornoIncidentDomainError(404, "Incidente no encontrado");

    const hijosPendientes = current.hijos.filter(
      (child) => !child.resuelto || child.status !== "RESUELTO"
    );

    return {
      incidenteTornoId: current.id,
      status: current.status,
      resuelto: current.resuelto,
      totalHijos: current.hijos.length,
      hijosPendientes: hijosPendientes.length,
      hijosPendientesIds: hijosPendientes.map((child) => child.id),
      puedeResolverPadre: hijosPendientes.length === 0,
    };
  },

  async createChild(input: {
    incidenteTornoId: number;
    status?: "EN_PROCESO" | "RESUELTO";
    resuelto?: boolean;
    comentario?: string | null;
  }) {
    return prismaTorno.$transaction(async (tx) => {
      const parent = await tx.incidenteTorno.findUnique({
        where: { id: input.incidenteTornoId },
      });
      if (!parent) throw new TornoIncidentDomainError(404, "Incidente padre no encontrado");
      if (parent.status === "RESUELTO" || parent.resuelto) {
        throw new TornoIncidentDomainError(409, "No se pueden agregar seguimientos a un incidente resuelto");
      }

      const resolved = isResolvedPatch(input);
      return tx.incidenteTornoHijo.create({
        data: {
          incidenteTornoId: input.incidenteTornoId,
          status: resolved ? "RESUELTO" : input.status ?? "EN_PROCESO",
          resuelto: resolved,
          comentario: input.comentario ?? undefined,
        },
      });
    });
  },

  async updateChild(
    id: number,
    input: {
      status?: "EN_PROCESO" | "RESUELTO";
      resuelto?: boolean;
      comentario?: string | null;
    }
  ) {
    if (isResolvedPatch(input)) {
      return this.resolveChild(id, input);
    }

    const current = await prismaTorno.incidenteTornoHijo.findUnique({ where: { id } });
    if (!current) throw new TornoIncidentDomainError(404, "Seguimiento no encontrado");
    if (current.status === "RESUELTO" || current.resuelto) {
      throw new TornoIncidentDomainError(409, "Seguimiento resuelto no puede reabrirse desde PATCH generico");
    }

    return prismaTorno.incidenteTornoHijo.update({
      where: { id },
      data: {
        ...input,
        comentario: input.comentario ?? undefined,
      },
    });
  },

  async resolveChild(
    id: number,
    input: { comentario?: string | null } = {}
  ) {
    return prismaTorno.$transaction(async (tx) => {
      const current = await tx.incidenteTornoHijo.findUnique({ where: { id } });
      if (!current) throw new TornoIncidentDomainError(404, "Seguimiento no encontrado");

      const hijo = await tx.incidenteTornoHijo.update({
        where: { id },
        data: {
          status: "RESUELTO",
          resuelto: true,
          comentario: input.comentario ?? current.comentario ?? undefined,
        },
      });

      const hijosPendientes = await tx.incidenteTornoHijo.count({
        where: openChildWhere(hijo.incidenteTornoId),
      });

      return {
        hijo,
        padre: {
          incidenteTornoId: hijo.incidenteTornoId,
          hijosPendientes,
          puedeResolverPadre: hijosPendientes === 0,
        },
      };
    });
  },
};
