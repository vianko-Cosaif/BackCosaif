import { DateTime } from "luxon";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

const { PrismaClient: TorreonPrismaClient } = require("../../../ms_torreon/generated");
const prismaTorreon = new TorreonPrismaClient();

const DEFAULT_TZ = "America/Mexico_City";

export type CommercialOperation = {
  key: string;
  sourceSystem: "COSAIF" | "TORREON";
  origin: "NATURAL" | "ARRASTRE";
  sourceId: string;
  empresaId: number;
  empresa: string;
  localidadId: number;
  localidad: string;
  locomotiveNumber: number | null;
  wagons: number;
  status: string;
  completed: boolean;
  cancelled: boolean;
  stopped: boolean;
  services: Array<"MOVIMIENTO" | "LAVADO" | "TORNEADO">;
  requestedAt: string;
  completedAt: string | null;
  operationAt: string;
  incidents: number;
  reference: string;
};

export type CommercialAnalyticsFilters = {
  reference?: string;
  referenceDate?: string;
  period?: CommercialPeriod;
  months?: number;
  empresaId?: number;
  localidadId?: number;
  origin?: "NATURAL" | "ARRASTRE";
  page?: number;
  pageSize?: number;
  tz?: string;
  exportAll?: boolean;
};

export type CommercialPeriod = "WEEK" | "MONTH" | "BIMONTH" | "SEMESTER" | "YEAR";

const PERIOD_LABELS: Record<CommercialPeriod, string> = {
  WEEK: "Semana",
  MONTH: "Mes",
  BIMONTH: "Bimestre",
  SEMESTER: "Semestre",
  YEAR: "Año",
};

function parseRange(filters: CommercialAnalyticsFilters) {
  const tz = filters.tz || DEFAULT_TZ;
  const period: CommercialPeriod = ["WEEK", "MONTH", "BIMONTH", "SEMESTER", "YEAR"].includes(String(filters.period))
    ? filters.period as CommercialPeriod
    : "MONTH";
  const reference = filters.referenceDate && /^\d{4}-\d{2}-\d{2}$/.test(filters.referenceDate)
    ? DateTime.fromISO(filters.referenceDate, { zone: tz })
    : filters.reference && /^\d{4}-\d{2}$/.test(filters.reference)
      ? DateTime.fromFormat(filters.reference, "yyyy-MM", { zone: tz })
      : DateTime.now().setZone(tz);
  if (!reference.isValid) throw new Error("Mes de referencia invalido");
  let startLocal: DateTime;
  let endLocal: DateTime;
  if (period === "WEEK") {
    startLocal = reference.startOf("week");
    endLocal = startLocal.plus({ weeks: 1 });
  } else if (period === "MONTH") {
    startLocal = reference.startOf("month");
    endLocal = startLocal.plus({ months: 1 });
  } else if (period === "BIMONTH") {
    const firstMonth = Math.floor((reference.month - 1) / 2) * 2 + 1;
    startLocal = reference.set({ month: firstMonth, day: 1 }).startOf("day");
    endLocal = startLocal.plus({ months: 2 });
  } else if (period === "SEMESTER") {
    const firstMonth = reference.month <= 6 ? 1 : 7;
    startLocal = reference.set({ month: firstMonth, day: 1 }).startOf("day");
    endLocal = startLocal.plus({ months: 6 });
  } else {
    startLocal = reference.startOf("year");
    endLocal = startLocal.plus({ years: 1 });
  }
  const previousStartLocal = startLocal.minus(endLocal.diff(startLocal));
  const months = period === "YEAR" ? 12 : period === "SEMESTER" ? 6 : period === "BIMONTH" ? 2 : 1;
  return {
    tz,
    period,
    months,
    reference,
    startLocal,
    endLocal,
    previousStartLocal,
    queryStartUTC: previousStartLocal.toUTC().toJSDate(),
    startUTC: startLocal.toUTC().toJSDate(),
    endUTC: endLocal.toUTC().toJSDate(),
  };
}

function operationDateWhere(startUTC: Date, endUTC: Date) {
  return {
    OR: [
      { fechaFin: { gte: startUTC, lt: endUTC } },
      { fechaFin: null, fechaSolicitud: { gte: startUTC, lt: endUTC } },
    ],
  };
}

function operationDate(fechaSolicitud: Date, fechaFin?: Date | null) {
  return fechaFin ?? fechaSolicitud;
}

function pct(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function buildTrend(start: DateTime, end: DateTime, period: CommercialPeriod) {
  const unit = period === "WEEK" || period === "MONTH" ? "days" : period === "BIMONTH" ? "weeks" : "months";
  const buckets: Array<{
    key: string;
    label: string;
    from: DateTime;
    to: DateTime;
    natural: number;
    arrastre: number;
    wagons: number;
    wash: number;
    turning: number;
    total: number;
    completed: number;
    cancelled: number;
  }> = [];
  let cursor = start;
  while (cursor < end) {
    const next = DateTime.min(unit === "days" ? cursor.plus({ days: 1 }) : unit === "weeks" ? cursor.plus({ weeks: 1 }) : cursor.plus({ months: 1 }), end);
    const label = unit === "months"
      ? cursor.setLocale("es-MX").toFormat("LLL yy")
      : unit === "weeks"
        ? `${cursor.setLocale("es-MX").toFormat("d LLL")}–${next.minus({ days: 1 }).setLocale("es-MX").toFormat("d LLL")}`
        : cursor.setLocale("es-MX").toFormat("ccc d");
    buckets.push({
      key: cursor.toISODate()!,
      label,
      from: cursor,
      to: next,
      natural: 0,
      arrastre: 0,
      wagons: 0,
      wash: 0,
      turning: 0,
      total: 0,
      completed: 0,
      cancelled: 0,
    });
    cursor = next;
  }
  return buckets;
}

function summarize<T extends { empresaId: number; empresa: string; localidadId: number; localidad: string; origin: string; wagons: number; services: string[]; completed: boolean }>(
  operations: T[],
  key: "empresaId" | "localidadId",
) {
  const values = new Map<number, {
    id: number;
    name: string;
    total: number;
    completed: number;
    natural: number;
    arrastre: number;
    wagons: number;
    wash: number;
    turning: number;
  }>();
  for (const operation of operations) {
    const id = operation[key];
    const item = values.get(id) ?? {
      id,
      name: key === "empresaId" ? operation.empresa : operation.localidad,
      total: 0,
      completed: 0,
      natural: 0,
      arrastre: 0,
      wagons: 0,
      wash: 0,
      turning: 0,
    };
    item.total += 1;
    item.completed += operation.completed ? 1 : 0;
    item.natural += operation.origin === "NATURAL" ? 1 : 0;
    item.arrastre += operation.origin === "ARRASTRE" ? 1 : 0;
    item.wagons += operation.wagons;
    item.wash += operation.completed && operation.services.includes("LAVADO") ? 1 : 0;
    item.turning += operation.completed && operation.services.includes("TORNEADO") ? 1 : 0;
    values.set(id, item);
  }
  return [...values.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "es"));
}

export class CommercialCrmAnalyticsModel {
  static async generate(filters: CommercialAnalyticsFilters) {
    const range = parseRange(filters);
    const [companies, localities] = await Promise.all([
      prisma.empresa.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
      prisma.localidad.findMany({ select: { id: true, nombre: true, estado: true }, orderBy: { nombre: "asc" } }),
    ]);
    const companyNames = new Map(companies.map((item) => [item.id, item.nombre]));
    const localityNames = new Map(localities.map((item) => [item.id, item.nombre]));

    const coreWhere: Prisma.MovimientoWhereInput = {
      ...operationDateWhere(range.queryStartUTC, range.endUTC),
      ...(filters.empresaId ? { empresaId: filters.empresaId } : {}),
      ...(filters.localidadId ? { localidadId: filters.localidadId } : {}),
    };
    const corePromise = filters.origin === "ARRASTRE"
      ? Promise.resolve([])
      : prisma.movimiento.findMany({
          where: coreWhere,
          select: {
            id: true,
            empresaId: true,
            localidadId: true,
            locomotiveNumber: true,
            estado: true,
            torno: true,
            lavado: true,
            fechaSolicitud: true,
            fechaFin: true,
            empresa: { select: { nombre: true } },
            localidad: { select: { nombre: true } },
            incidentes: { select: { id: true } },
            tornos: { select: { incidentes: { select: { id: true } } } },
            lavados: { select: { incidentes: { select: { id: true } } } },
          },
        });

    let torreonAvailable = true;
    let torreonNatural: any[] = [];
    let torreonArrastre: any[] = [];
    try {
      [torreonNatural, torreonArrastre] = await Promise.all([
        filters.origin === "ARRASTRE"
          ? Promise.resolve([])
          : prismaTorreon.movimientoTorreonFerro.findMany({
              where: {
                ...operationDateWhere(range.queryStartUTC, range.endUTC),
                ...(filters.empresaId ? { empresaId: filters.empresaId } : {}),
                ...(filters.localidadId ? { localidadId: filters.localidadId } : {}),
              },
              select: {
                id: true,
                empresaId: true,
                localidadId: true,
                locomotiveNumber: true,
                estado: true,
                fechaSolicitud: true,
                fechaFin: true,
                empresaNombreSnapshot: true,
                localidadNombreSnapshot: true,
                incidentes: { select: { id: true } },
              },
            }),
        filters.origin === "NATURAL"
          ? Promise.resolve([])
          : prismaTorreon.arrastreTorreon.findMany({
              where: {
                ...operationDateWhere(range.queryStartUTC, range.endUTC),
                ...(filters.empresaId ? { empresaId: filters.empresaId } : {}),
                ...(filters.localidadId ? { localidadId: filters.localidadId } : {}),
              },
              select: {
                id: true,
                empresaId: true,
                localidadId: true,
                estado: true,
                fechaSolicitud: true,
                fechaFin: true,
                vagones: { select: { id: true } },
                incidentes: { select: { id: true } },
              },
            }),
      ]);
    } catch (error) {
      torreonAvailable = false;
      console.warn("Analitica comercial: Torreon no disponible", error instanceof Error ? error.message : error);
    }

    const coreRows = await corePromise;
    const operations: CommercialOperation[] = [];
    for (const row of coreRows) {
      const incidents = row.incidentes.length
        + row.tornos.reduce((sum, item) => sum + item.incidentes.length, 0)
        + row.lavados.reduce((sum, item) => sum + item.incidentes.length, 0);
      const date = operationDate(row.fechaSolicitud, row.fechaFin);
      operations.push({
        key: `COSAIF:NATURAL:${row.id}`,
        sourceSystem: "COSAIF",
        origin: "NATURAL",
        sourceId: String(row.id),
        empresaId: row.empresaId,
        empresa: row.empresa.nombre,
        localidadId: row.localidadId,
        localidad: row.localidad.nombre,
        locomotiveNumber: row.locomotiveNumber,
        wagons: 0,
        status: row.estado,
        completed: row.estado === "CONCLUIDO",
        cancelled: row.estado === "CANCELADO",
        stopped: row.estado === "DETENIDO",
        services: ["MOVIMIENTO", ...(row.lavado ? ["LAVADO" as const] : []), ...(row.torno ? ["TORNEADO" as const] : [])],
        requestedAt: row.fechaSolicitud.toISOString(),
        completedAt: row.fechaFin?.toISOString() ?? null,
        operationAt: date.toISOString(),
        incidents,
        reference: `Movimiento #${row.id}`,
      });
    }
    for (const row of torreonNatural) {
      const date = operationDate(row.fechaSolicitud, row.fechaFin);
      operations.push({
        key: `TORREON:NATURAL:${row.id}`,
        sourceSystem: "TORREON",
        origin: "NATURAL",
        sourceId: String(row.id),
        empresaId: row.empresaId,
        empresa: row.empresaNombreSnapshot || companyNames.get(row.empresaId) || `Empresa #${row.empresaId}`,
        localidadId: row.localidadId,
        localidad: row.localidadNombreSnapshot || localityNames.get(row.localidadId) || `Patio #${row.localidadId}`,
        locomotiveNumber: row.locomotiveNumber,
        wagons: 0,
        status: String(row.estado),
        completed: row.estado === "CONCLUIDO",
        cancelled: row.estado === "CANCELADO",
        stopped: row.estado === "DETENIDO",
        services: ["MOVIMIENTO"],
        requestedAt: row.fechaSolicitud.toISOString(),
        completedAt: row.fechaFin?.toISOString() ?? null,
        operationAt: date.toISOString(),
        incidents: row.incidentes.length,
        reference: `Natural Torreon #${row.id}`,
      });
    }
    for (const row of torreonArrastre) {
      const date = operationDate(row.fechaSolicitud, row.fechaFin);
      operations.push({
        key: `TORREON:ARRASTRE:${row.id}`,
        sourceSystem: "TORREON",
        origin: "ARRASTRE",
        sourceId: String(row.id),
        empresaId: row.empresaId,
        empresa: companyNames.get(row.empresaId) || `Empresa #${row.empresaId}`,
        localidadId: row.localidadId,
        localidad: localityNames.get(row.localidadId) || `Patio #${row.localidadId}`,
        locomotiveNumber: null,
        wagons: row.vagones.length,
        status: String(row.estado),
        completed: row.estado === "CONCLUIDO",
        cancelled: row.estado === "CANCELADO",
        stopped: row.estado === "DETENIDO",
        services: ["MOVIMIENTO"],
        requestedAt: row.fechaSolicitud.toISOString(),
        completedAt: row.fechaFin?.toISOString() ?? null,
        operationAt: date.toISOString(),
        incidents: row.incidentes.length,
        reference: `Arrastre #${row.id}`,
      });
    }

    operations.sort((a, b) => b.operationAt.localeCompare(a.operationAt) || b.key.localeCompare(a.key));
    const inRange = (operation: CommercialOperation, from: DateTime, to: DateTime) => {
      const date = DateTime.fromISO(operation.operationAt, { zone: "utc" }).setZone(range.tz);
      return date >= from && date < to;
    };
    const selectedOperations = operations.filter((item) => inRange(item, range.startLocal, range.endLocal));
    const previousOperations = operations.filter((item) => inRange(item, range.previousStartLocal, range.startLocal));
    const trendBuckets = buildTrend(range.startLocal, range.endLocal, range.period);
    for (const operation of selectedOperations) {
      const date = DateTime.fromISO(operation.operationAt, { zone: "utc" }).setZone(range.tz);
      const bucket = trendBuckets.find((item) => date >= item.from && date < item.to);
      if (!bucket) continue;
      bucket.total += 1;
      bucket.completed += operation.completed ? 1 : 0;
      bucket.cancelled += operation.cancelled ? 1 : 0;
      bucket.natural += operation.origin === "NATURAL" ? 1 : 0;
      bucket.arrastre += operation.origin === "ARRASTRE" ? 1 : 0;
      bucket.wagons += operation.wagons;
      bucket.wash += operation.completed && operation.services.includes("LAVADO") ? 1 : 0;
      bucket.turning += operation.completed && operation.services.includes("TORNEADO") ? 1 : 0;
    }
    const trend = trendBuckets.map(({ from: _from, to: _to, ...item }) => item);
    const currentBreakdownMap = new Map<string, {
      empresaId: number;
      localidadId: number;
      empresa: string;
      localidad: string;
      natural: number;
      arrastre: number;
      wagons: number;
      wash: number;
      turning: number;
      completed: number;
    }>();
    for (const operation of selectedOperations) {
      const key = `${operation.empresaId}:${operation.localidadId}`;
      const item = currentBreakdownMap.get(key) ?? {
        empresaId: operation.empresaId,
        localidadId: operation.localidadId,
        empresa: operation.empresa,
        localidad: operation.localidad,
        natural: 0,
        arrastre: 0,
        wagons: 0,
        wash: 0,
        turning: 0,
        completed: 0,
      };
      item.natural += operation.completed && operation.origin === "NATURAL" ? 1 : 0;
      item.arrastre += operation.completed && operation.origin === "ARRASTRE" ? 1 : 0;
      item.wagons += operation.completed ? operation.wagons : 0;
      item.wash += operation.completed && operation.services.includes("LAVADO") ? 1 : 0;
      item.turning += operation.completed && operation.services.includes("TORNEADO") ? 1 : 0;
      item.completed += operation.completed ? 1 : 0;
      currentBreakdownMap.set(key, item);
    }
    const contractBreakdownMap = new Map<string, {
      empresaId: number;
      localidadId: number;
      empresa: string;
      localidad: string;
      origin: "NATURAL" | "ARRASTRE";
      service: "MOVIMIENTO" | "LAVADO" | "TORNEADO";
      status: string;
      count: number;
      wagons: number;
      incidents: number;
    }>();
    for (const operation of selectedOperations) {
      for (const service of operation.services) {
        const key = `${operation.empresaId}:${operation.localidadId}:${operation.origin}:${service}:${operation.status}`;
        const item = contractBreakdownMap.get(key) ?? {
          empresaId: operation.empresaId,
          localidadId: operation.localidadId,
          empresa: operation.empresa,
          localidad: operation.localidad,
          origin: operation.origin,
          service,
          status: operation.status,
          count: 0,
          wagons: 0,
          incidents: 0,
        };
        item.count += 1;
        item.wagons += service === "MOVIMIENTO" ? operation.wagons : 0;
        item.incidents += operation.incidents;
        contractBreakdownMap.set(key, item);
      }
    }
    const page = Math.max(1, Math.trunc(filters.page || 1));
    const pageSize = Math.min(filters.exportAll ? 10_000 : 100, Math.max(10, Math.trunc(filters.pageSize || 25)));
    const start = (page - 1) * pageSize;
    const total = selectedOperations.length;
    const selectedCompleted = selectedOperations.filter((item) => item.completed).length;
    const previousCompleted = previousOperations.filter((item) => item.completed).length;
    const periodLabel = range.period === "WEEK"
      ? `${range.startLocal.setLocale("es-MX").toFormat("d LLL")} – ${range.endLocal.minus({ days: 1 }).setLocale("es-MX").toFormat("d LLL yyyy")}`
      : range.period === "MONTH"
        ? range.startLocal.setLocale("es-MX").toFormat("LLLL yyyy")
        : range.period === "BIMONTH"
          ? `${range.startLocal.setLocale("es-MX").toFormat("LLLL")} – ${range.endLocal.minus({ days: 1 }).setLocale("es-MX").toFormat("LLLL yyyy")}`
          : range.period === "SEMESTER"
            ? `Semestre ${range.startLocal.month === 1 ? 1 : 2} · ${range.startLocal.year}`
            : `Año ${range.startLocal.year}`;

    return {
      meta: {
        tz: range.tz,
        months: range.months,
        range: { from: range.startLocal.toISO()!, toExclusive: range.endLocal.toISO()! },
        previousRange: { from: range.previousStartLocal.toISO()!, toExclusive: range.startLocal.toISO()! },
        reference: range.startLocal.toFormat("yyyy-LL"),
        referenceDate: range.reference.toISODate()!,
        period: range.period,
        periodLabel,
        torreonAvailable,
        readOnly: true,
      },
      catalogs: { companies, localities },
      kpis: {
        operations: total,
        completed: selectedCompleted,
        cancelled: selectedOperations.filter((item) => item.cancelled).length,
        stopped: selectedOperations.filter((item) => item.stopped).length,
        incidents: selectedOperations.reduce((sum, item) => sum + item.incidents, 0),
        natural: selectedOperations.filter((item) => item.origin === "NATURAL").length,
        arrastre: selectedOperations.filter((item) => item.origin === "ARRASTRE").length,
        wagons: selectedOperations.reduce((sum, item) => sum + item.wagons, 0),
        wash: selectedOperations.filter((item) => item.completed && item.services.includes("LAVADO")).length,
        turning: selectedOperations.filter((item) => item.completed && item.services.includes("TORNEADO")).length,
        selectedPeriod: total,
        previousPeriod: previousOperations.length,
        periodGrowthPct: pct(total, previousOperations.length),
        completedGrowthPct: pct(selectedCompleted, previousCompleted),
        currentMonth: total,
        previousMonth: previousOperations.length,
        monthlyGrowthPct: pct(total, previousOperations.length),
      },
      trend,
      currentBreakdown: [...currentBreakdownMap.values()].sort((a, b) => b.completed - a.completed),
      contractBreakdown: [...contractBreakdownMap.values()].sort((a, b) => a.empresa.localeCompare(b.empresa, "es") || a.localidad.localeCompare(b.localidad, "es") || a.status.localeCompare(b.status, "es")),
      clients: summarize(selectedOperations, "empresaId"),
      yards: summarize(selectedOperations, "localidadId"),
      operations: {
        data: selectedOperations.slice(start, start + pageSize),
        meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      },
    };
  }
}
