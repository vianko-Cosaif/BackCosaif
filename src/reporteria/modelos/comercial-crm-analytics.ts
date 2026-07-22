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
  requestedQuantity?: number;
  viaOrigen?: string | null;
  viaDestino?: string | null;
  requestedBy?: string;
  status: string;
  completed: boolean;
  cancelled: boolean;
  stopped: boolean;
  services: Array<"MOVIMIENTO" | "LAVADO" | "TORNEADO">;
  requestedAt: string;
  startedAt?: string | null;
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
  empresaIds?: number[];
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
  return { fechaSolicitud: { gte: startUTC, lt: endUTC } };
}

function operationDate(fechaSolicitud: Date, _fechaFin?: Date | null) {
  // El mes comercial corresponde a la solicitud. Inicio y fin describen el
  // avance, pero no deben mover mayo al mes en que terminó el movimiento.
  return fechaSolicitud;
}

function normalizeServicePlace(value?: string | null) {
  const text = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const compact = text.replace(/[^a-z0-9]+/g, "");
  if (compact.includes("lavado") || compact.includes("lavada") || compact === "lav") return "LAVADO";
  if (compact.includes("torno") || compact.includes("torneado")) return "TORNEADO";
  return null;
}

function operationServices(row: {
  lavado?: boolean | null;
  torno?: boolean | null;
  viaDestinoId?: number | null;
  viaOrigen?: { nombre?: string | null } | null;
  viaDestino?: { nombre?: string | null } | null;
}) {
  const destinationService = normalizeServicePlace(row.viaDestino?.nombre);
  const originService = normalizeServicePlace(row.viaOrigen?.nombre);
  const services: Array<"MOVIMIENTO" | "LAVADO" | "TORNEADO"> = ["MOVIMIENTO"];
  if (destinationService && destinationService !== originService) services.push(destinationService);
  else if (row.viaDestinoId == null) {
    if (row.lavado && originService !== "LAVADO") services.push("LAVADO");
    if (row.torno && originService !== "TORNEADO") services.push("TORNEADO");
  }
  return services;
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
    const companyFilter = filters.empresaIds?.length
      ? { empresaId: { in: [...new Set(filters.empresaIds)] } }
      : filters.empresaId
        ? { empresaId: filters.empresaId }
        : {};

    const coreWhere: Prisma.MovimientoWhereInput = {
      ...operationDateWhere(range.queryStartUTC, range.endUTC),
      ...companyFilter,
      ...(filters.localidadId ? { localidadId: filters.localidadId } : {}),
    };
    const corePromise = filters.origin === "ARRASTRE"
      ? Promise.resolve([])
      : prisma.movimiento.findMany({
          where: coreWhere,
          select: {
            id: true,
            empresaId: true,
            creadoPorId: true,
            clienteId: true,
            localidadId: true,
            locomotiveNumber: true,
            viaOrigenId: true,
            viaDestinoId: true,
            viaOrigen: { select: { nombre: true } },
            viaDestino: { select: { nombre: true } },
            estado: true,
            torno: true,
            lavado: true,
            fechaSolicitud: true,
            fechaInicio: true,
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
                ...companyFilter,
                ...(filters.localidadId ? { localidadId: filters.localidadId } : {}),
              },
              select: {
                id: true,
                empresaId: true,
                creadoPorId: true,
                clienteId: true,
                localidadId: true,
                locomotiveNumber: true,
                estado: true,
                fechaSolicitud: true,
                fechaInicio: true,
                fechaFin: true,
                empresaNombreSnapshot: true,
                localidadNombreSnapshot: true,
                viaOrigenNombreSnapshot: true,
                viaDestinoNombreSnapshot: true,
                incidentes: { select: { id: true } },
              },
            }),
        filters.origin === "NATURAL"
          ? Promise.resolve([])
          : prismaTorreon.arrastreTorreon.findMany({
              where: {
                ...operationDateWhere(range.queryStartUTC, range.endUTC),
                ...companyFilter,
                ...(filters.localidadId ? { localidadId: filters.localidadId } : {}),
              },
              select: {
                id: true,
                empresaId: true,
                creadoPorId: true,
                localidadId: true,
                viaOrigenId: true,
                viaDestinoId: true,
                estado: true,
                fechaSolicitud: true,
                fechaInicio: true,
                fechaFin: true,
                vagones: { select: { id: true, viaOrigenNombre: true, viaDestinoNombre: true } },
                incidentes: { select: { id: true } },
              },
            }),
      ]);
    } catch (error) {
      torreonAvailable = false;
      console.warn("Analitica comercial: Torreon no disponible", error instanceof Error ? error.message : error);
    }

    const coreRows = await corePromise;
    const requesterIds = [...new Set([
      ...coreRows.map((row) => row.clienteId ?? row.creadoPorId),
      ...torreonNatural.map((row) => row.clienteId ?? row.creadoPorId),
      ...torreonArrastre.map((row) => row.creadoPorId),
    ].filter((value): value is number => Number.isInteger(value) && value > 0))];
    const requesterNames = new Map((requesterIds.length
      ? await prisma.usuario.findMany({ where: { id: { in: requesterIds } }, select: { id: true, nombre: true } })
      : []).map((item) => [item.id, item.nombre]));
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
        requestedQuantity: 1,
        viaOrigen: row.viaOrigen?.nombre ?? null,
        viaDestino: row.viaDestino?.nombre ?? null,
        requestedBy: requesterNames.get(row.clienteId ?? row.creadoPorId) || row.empresa.nombre,
        status: row.estado,
        completed: row.estado === "CONCLUIDO",
        cancelled: row.estado === "CANCELADO",
        stopped: row.estado === "DETENIDO",
        services: operationServices(row),
        requestedAt: row.fechaSolicitud.toISOString(),
        startedAt: row.fechaInicio?.toISOString() ?? null,
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
        requestedQuantity: 1,
        viaOrigen: row.viaOrigenNombreSnapshot ?? null,
        viaDestino: row.viaDestinoNombreSnapshot ?? null,
        requestedBy: requesterNames.get(row.clienteId ?? row.creadoPorId) || row.empresaNombreSnapshot || companyNames.get(row.empresaId) || `Empresa #${row.empresaId}`,
        status: String(row.estado),
        completed: row.estado === "CONCLUIDO",
        cancelled: row.estado === "CANCELADO",
        stopped: row.estado === "DETENIDO",
        services: ["MOVIMIENTO"],
        requestedAt: row.fechaSolicitud.toISOString(),
        startedAt: row.fechaInicio?.toISOString() ?? null,
        completedAt: row.fechaFin?.toISOString() ?? null,
        operationAt: date.toISOString(),
        incidents: row.incidentes.length,
        reference: `Natural Torreon #${row.id}`,
      });
    }
    for (const row of torreonArrastre) {
      const date = operationDate(row.fechaSolicitud, row.fechaFin);
      const wagonOrigins = [...new Set(row.vagones.map((item: any) => item.viaOrigenNombre).filter(Boolean))];
      const wagonDestinations = [...new Set(row.vagones.map((item: any) => item.viaDestinoNombre).filter(Boolean))];
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
        requestedQuantity: row.vagones.length,
        viaOrigen: wagonOrigins.join(", ") || (row.viaOrigenId ? `Vía #${row.viaOrigenId}` : null),
        viaDestino: wagonDestinations.join(", ") || (row.viaDestinoId ? `Vía #${row.viaDestinoId}` : null),
        requestedBy: requesterNames.get(row.creadoPorId) || companyNames.get(row.empresaId) || `Empresa #${row.empresaId}`,
        status: String(row.estado),
        completed: row.estado === "CONCLUIDO",
        cancelled: row.estado === "CANCELADO",
        stopped: row.estado === "DETENIDO",
        services: ["MOVIMIENTO"],
        requestedAt: row.fechaSolicitud.toISOString(),
        startedAt: row.fechaInicio?.toISOString() ?? null,
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
    const contractTrendMap = new Map<string, {
      bucketKey: string;
      bucketLabel: string;
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
      const date = DateTime.fromISO(operation.operationAt, { zone: "utc" }).setZone(range.tz);
      const bucket = trendBuckets.find((item) => date >= item.from && date < item.to);
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
        if (bucket) {
          const trendKey = `${bucket.key}:${key}`;
          const trendItem = contractTrendMap.get(trendKey) ?? {
            bucketKey: bucket.key,
            bucketLabel: bucket.label,
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
          trendItem.count += 1;
          trendItem.wagons += service === "MOVIMIENTO" ? operation.wagons : 0;
          trendItem.incidents += operation.incidents;
          contractTrendMap.set(trendKey, trendItem);
        }
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
        dateBasis: "FECHA_SOLICITUD" as const,
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
      contractTrend: [...contractTrendMap.values()].sort((a, b) => a.bucketKey.localeCompare(b.bucketKey) || a.empresa.localeCompare(b.empresa, "es") || a.localidad.localeCompare(b.localidad, "es") || a.status.localeCompare(b.status, "es")),
      clients: summarize(selectedOperations, "empresaId"),
      yards: summarize(selectedOperations, "localidadId"),
      operations: {
        data: selectedOperations.slice(start, start + pageSize),
        meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      },
    };
  }
}

function mergeNumericRows<T extends Record<string, any>>(rows: T[], keyFields: string[], numericFields: string[]): T[] {
  const grouped = new Map<string, T>();
  for (const row of rows) {
    const key = keyFields.map((field) => String(row[field] ?? "")).join(":");
    const target = grouped.get(key) ?? { ...row } as T;
    if (grouped.has(key)) {
      for (const field of numericFields) (target as Record<string, any>)[field] = Number(target[field] || 0) + Number(row[field] || 0);
    }
    grouped.set(key, target);
  }
  return [...grouped.values()];
}

function selectedMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export async function generateCommercialAnalyticsForMonths(filters: CommercialAnalyticsFilters, monthKeys: string[]) {
  const selected = [...new Set(monthKeys.filter((value) => /^\d{4}-\d{2}$/.test(value)))].sort().slice(0, 24);
  if (!selected.length) return CommercialCrmAnalyticsModel.generate(filters);
  const parts = await Promise.all(selected.map((month) => CommercialCrmAnalyticsModel.generate({
    ...filters,
    period: "MONTH",
    reference: month,
    referenceDate: `${month}-01`,
    page: 1,
    pageSize: 10_000,
    exportAll: true,
  })));
  if (parts.length === 1) return { ...parts[0], meta: { ...parts[0].meta, selectedMonthKeys: selected } };

  const operations = parts.flatMap((part) => part.operations.data);
  const previousPeriod = parts.reduce((sum, part) => sum + Number(part.kpis.previousPeriod || 0), 0);
  const selectedPeriod = operations.length;
  const completed = operations.filter((item) => item.completed).length;
  const previousCompleted = parts.reduce((sum, part) => {
    const current = Number(part.kpis.completed || 0);
    const growth = Number(part.kpis.completedGrowthPct || 0);
    return sum + (growth === -100 ? 0 : growth ? current / (1 + growth / 100) : current);
  }, 0);
  const kpis = {
    operations: selectedPeriod,
    completed,
    cancelled: operations.filter((item) => item.cancelled).length,
    stopped: operations.filter((item) => item.stopped).length,
    incidents: operations.reduce((sum, item) => sum + item.incidents, 0),
    natural: operations.filter((item) => item.origin === "NATURAL").length,
    arrastre: operations.filter((item) => item.origin === "ARRASTRE").length,
    wagons: operations.reduce((sum, item) => sum + item.wagons, 0),
    wash: operations.filter((item) => item.completed && item.services.includes("LAVADO")).length,
    turning: operations.filter((item) => item.completed && item.services.includes("TORNEADO")).length,
    selectedPeriod,
    previousPeriod,
    periodGrowthPct: pct(selectedPeriod, previousPeriod),
    completedGrowthPct: pct(completed, Math.round(previousCompleted)),
    currentMonth: selectedPeriod,
    previousMonth: previousPeriod,
    monthlyGrowthPct: pct(selectedPeriod, previousPeriod),
  };
  const clients = mergeNumericRows(parts.flatMap((part) => part.clients), ["id"], ["total", "completed", "natural", "arrastre", "wagons", "wash", "turning"])
    .sort((a, b) => Number(b.total) - Number(a.total) || String(a.name).localeCompare(String(b.name), "es"));
  const yards = mergeNumericRows(parts.flatMap((part) => part.yards), ["id"], ["total", "completed", "natural", "arrastre", "wagons", "wash", "turning"])
    .sort((a, b) => Number(b.total) - Number(a.total) || String(a.name).localeCompare(String(b.name), "es"));
  const currentBreakdown = mergeNumericRows(parts.flatMap((part) => part.currentBreakdown), ["empresaId", "localidadId"], ["natural", "arrastre", "wagons", "wash", "turning", "completed"])
    .sort((a, b) => Number(b.completed) - Number(a.completed));
  const contractBreakdown = mergeNumericRows(parts.flatMap((part) => part.contractBreakdown), ["empresaId", "localidadId", "origin", "service", "status"], ["count", "wagons", "incidents"])
    .sort((a, b) => String(a.empresa).localeCompare(String(b.empresa), "es") || String(a.localidad).localeCompare(String(b.localidad), "es") || String(a.status).localeCompare(String(b.status), "es"));
  const contractTrend = parts.flatMap((part, index) => part.contractBreakdown.map((row) => ({
    ...row,
    bucketKey: selected[index],
    bucketLabel: selectedMonthLabel(selected[index]),
  })));
  const trend = parts.map((part, index) => ({
    key: selected[index],
    label: selectedMonthLabel(selected[index]),
    natural: Number(part.kpis.natural || 0),
    arrastre: Number(part.kpis.arrastre || 0),
    wagons: Number(part.kpis.wagons || 0),
    wash: Number(part.kpis.wash || 0),
    turning: Number(part.kpis.turning || 0),
    total: Number(part.kpis.operations || 0),
    completed: Number(part.kpis.completed || 0),
    cancelled: Number(part.kpis.cancelled || 0),
  }));
  return {
    ...parts[0],
    meta: {
      ...parts[0].meta,
      months: selected.length,
      range: { from: parts[0].meta.range.from, toExclusive: parts[parts.length - 1].meta.range.toExclusive },
      reference: selected.join("_"),
      referenceDate: `${selected[0]}-01`,
      period: "MONTH" as const,
      periodLabel: selected.map(selectedMonthLabel).join(" · "),
      torreonAvailable: parts.some((part) => part.meta.torreonAvailable),
      selectedMonthKeys: selected,
    },
    kpis,
    trend,
    currentBreakdown,
    contractBreakdown,
    contractTrend,
    clients,
    yards,
    operations: { data: operations, meta: { page: 1, pageSize: operations.length || 1, total: operations.length, totalPages: 1 } },
  };
}
