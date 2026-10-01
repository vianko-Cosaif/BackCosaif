import { z } from "zod";
import { Prisma } from "../../../generated";

const states = ["SOLICITADO", "EN_PROCESO", "DETENIDO", "CONCLUIDO", "CANCELADO"] as const;
const closed = ["CONCLUIDO", "CANCELADO"] as const;
export const arrastrePageQuery = z.object({
  localidadId: z.coerce.number().int().positive(),
  empresaId: z.coerce.number().int().positive().optional(),
  priorityEmpresaId: z.coerce.number().int().positive().optional(),
  conIncidentes: z.enum(["1"]).optional(),
  vista: z.enum(["activos", "historial"]).default("activos"),
  estado: z.enum(states).optional(),
  vagonEstado: z.enum(["PENDIENTE", "EN_PROCESO", "BLOQUEADO", "CONCLUIDO"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(120).default(""),
  fechaCampo: z.enum(["solicitud", "inicio", "fin"]).default("solicitud"),
  desde: z.string().datetime({ offset: true }).optional(),
  hasta: z.string().datetime({ offset: true }).optional(),
}).refine((query) => !query.desde || !query.hasta || Date.parse(query.desde) <= Date.parse(query.hasta), {
  message: "La fecha inicial no puede ser posterior a la final", path: ["desde"],
}).refine((query) => !query.estado || closed.includes(query.estado as typeof closed[number]) === (query.vista === "historial"), {
  message: "El estado no corresponde al periodo seleccionado", path: ["estado"],
});

export type ArrastrePageQuery = z.infer<typeof arrastrePageQuery>;

export function arrastrePageWhere(query: ArrastrePageQuery): Prisma.ArrastreTorreonWhereInput {
  const where: Prisma.ArrastreTorreonWhereInput = {
    localidadId: query.localidadId,
    ...(query.empresaId ? { empresaId: query.empresaId } : {}),
    estado: query.estado ?? (query.vista === "historial" ? { in: [...closed] } : { notIn: [...closed] }),
  };
  if (query.desde || query.hasta) {
    const field = { solicitud: "fechaSolicitud", inicio: "fechaInicio", fin: "fechaFin" }[query.fechaCampo];
    Object.assign(where, { [field]: { ...(query.desde ? { gte: new Date(query.desde) } : {}), ...(query.hasta ? { lte: new Date(query.hasta) } : {}) } });
  }
  if (query.vagonEstado) where.vagones = { some: { estado: query.vagonEstado } };
  if (query.conIncidentes) where.incidentes = { some: {} };
  if (query.q) {
    const text = { contains: query.q, mode: "insensitive" as const };
    const id = Number(query.q.replace(/^.*[:#]/, ""));
    where.OR = [
      ...(Number.isSafeInteger(id) && id > 0 ? [{ id }] : []),
      ...(states.includes(query.q.toUpperCase() as typeof states[number]) ? [{ estado: query.q.toUpperCase() as typeof states[number] }] : []),
      { vagones: { some: { OR: [{ numeroVagon: text }, { viaOrigenNombre: text }, { viaDestinoNombre: text }, { seccionOrigenNombre: text }, { seccionDestinoNombre: text }] } } },
    ];
  }
  return where;
}
