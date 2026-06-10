import path from "path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const envSchema = z.object({
  TORNO_MS_URL: z.string().min(1),
  TORNO_SERVICE_TOKEN: z.string().min(1),
});

function getEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Faltan variables de entorno para msTorno: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`
    );
  }
  return parsed.data;
}

function joinTornoUrl(baseUrl: string, pathWithQuery: string) {
  const base = baseUrl.replace(/\/+$/, "");
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  if (path.startsWith("/health")) return `${base}${path}`;
  if (/\/api\/?$/.test(base) || path.startsWith("/api/")) return `${base}${path}`;
  return `${base}/api${path}`;
}

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

async function requestTornoMs<T extends Json>(
  pathWithQuery: string,
  init: { method: string; body?: unknown; headers?: Record<string, string> } = { method: "GET" }
): Promise<{ status: number; data: T }> {
  const { TORNO_MS_URL, TORNO_SERVICE_TOKEN } = getEnv();
  const url = joinTornoUrl(TORNO_MS_URL, pathWithQuery);

  const headers: Record<string, string> = {
    "x-service-token": TORNO_SERVICE_TOKEN,
    ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
    ...(init.headers ?? {}),
  };

  const resp = await fetch(url, {
    method: init.method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const text = await resp.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!resp.ok) {
    const msg =
      typeof data === "object" && data && ("message" in (data as any) || "error" in (data as any))
        ? String((data as any).message ?? (data as any).error)
        : `msTorno error ${resp.status}`;
    const err = new Error(msg);
    (err as any).status = resp.status;
    (err as any).details = data;
    throw err;
  }

  return { status: resp.status, data: data as T };
}

export type MedidasRuedaInput = {
  l1: string;
  l2: string;
  l3: string;
  l4: string;
  l5: string;
  l6: string;
  r1: string;
  r2: string;
  r3: string;
  r4: string;
  r5: string;
  r6: string;
};

export type TornoWheelCount = 4 | 6 | 8 | 12;

export type MedidasRuedaDraftInput = Partial<MedidasRuedaInput> & {
  wheelCount?: TornoWheelCount;
};

export type TornoAgendadoInput = {
  locomotive: number;
  tipo?: string;
  localidad?: number | null;
  idMovimiento: number;
  fechaProgramada: string | Date;
  fechaLimiteActivacion: string | Date;
  activo?: boolean;
};

export const TORNO_RECUPERACION_TIPO = "TORNO_RECUPERACION";
export const TORNO_RECUPERACION_WINDOW_MINUTES = 5 * 60;

const MEDIDA_KEYS = [
  "l1",
  "r1",
  "l2",
  "r2",
  "l3",
  "r3",
  "l4",
  "r4",
  "l5",
  "r5",
  "l6",
  "r6",
] as const;

const NO_APLICA_MEASURE = "NO_APLICA";

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function hasMeasureValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeMedidasRuedaInput(input: MedidasRuedaDraftInput): MedidasRuedaInput {
  const hasAtLeastOneMeasure = MEDIDA_KEYS.some((key) => hasMeasureValue(input[key]));

  if (!hasAtLeastOneMeasure) {
    throw new Error("Debe capturar al menos una medida de torno");
  }

  const normalized = {} as MedidasRuedaInput;

  for (const key of MEDIDA_KEYS) {
    const value = input[key];
    normalized[key] = hasMeasureValue(value) ? value.trim() : NO_APLICA_MEASURE;
  }

  return normalized;
}

export async function ensureSolicitudYRondaForMovimiento(
  movimientoId: number,
  medidas: MedidasRuedaInput,
  options: { localidadId?: number | null } = {}
) {
  // 1) RuedaSolicitud por movimiento (idempotente)
  const existing = await requestTornoMs<any[]>(`/rueda-solicitudes?movimientoId=${movimientoId}`, {
    method: "GET",
  });
  let ruedaSolicitud = existing.data?.[0] ?? null;

  if (!ruedaSolicitud) {
    const created = await requestTornoMs<any>(`/rueda-solicitudes`, {
      method: "POST",
      body: { movimientoId, ...medidas },
    });
    ruedaSolicitud = created.data;
  } else if (ruedaSolicitud.id) {
    const updated = await requestTornoMs<any>(`/rueda-solicitudes/${ruedaSolicitud.id}`, {
      method: "PATCH",
      body: medidas,
    });
    ruedaSolicitud = updated.data;
  }

  // 2) RondaServicio por ruedaSolicitudId (idempotente)
  const rondaExisting = await requestTornoMs<any[]>(
    `/rondas-servicio?ruedaSolicitudId=${ruedaSolicitud.id}`,
    { method: "GET" }
  );
  let ronda = rondaExisting.data?.[0] ?? null;

  if (!ronda) {
    const rondaCreated = await requestTornoMs<any>(`/rondas-servicio`, {
      method: "POST",
      body: {
        ruedaSolicitudId: ruedaSolicitud.id,
        localidadId: options.localidadId ?? undefined,
      },
    });
    ronda = rondaCreated.data;
  } else if (ronda.id && options.localidadId && !ronda.localidadId) {
    const updated = await requestTornoMs<any>(`/rondas-servicio/${ronda.id}`, {
      method: "PATCH",
      body: { localidadId: options.localidadId },
    });
    ronda = updated.data;
  }

  return { ruedaSolicitud, ronda };
}

export async function getRuedaSolicitudPorMovimiento(movimientoId: number) {
  const existing = await requestTornoMs<any[]>(`/rueda-solicitudes?movimientoId=${movimientoId}`, {
    method: "GET",
  });
  return existing.data?.[0] ?? null;
}

export async function upsertRuedaSolicitudPorMovimiento(
  movimientoId: number,
  medidas: MedidasRuedaInput
) {
  const existing = await requestTornoMs<any[]>(`/rueda-solicitudes?movimientoId=${movimientoId}`, {
    method: "GET",
  });
  const current = existing.data?.[0] ?? null;

  if (!current?.id) {
    const created = await requestTornoMs<any>(`/rueda-solicitudes`, {
      method: "POST",
      body: { movimientoId, ...medidas },
    });
    return created.data;
  }

  const updated = await requestTornoMs<any>(`/rueda-solicitudes/${current.id}`, {
    method: "PATCH",
    body: medidas,
  });
  return updated.data;
}

export async function crearTornoAgendado(input: TornoAgendadoInput) {
  const created = await requestTornoMs<any>(`/torno/agendados`, {
    method: "POST",
    body: {
      ...input,
      tipo: input.tipo ?? "TORNO",
      fechaProgramada:
        input.fechaProgramada instanceof Date ? input.fechaProgramada.toISOString() : input.fechaProgramada,
      fechaLimiteActivacion:
        input.fechaLimiteActivacion instanceof Date
          ? input.fechaLimiteActivacion.toISOString()
          : input.fechaLimiteActivacion,
    },
  });
  return created.data;
}

export async function buscarTornoAgendadoActivable(params: {
  locomotive: number;
  tipo?: string;
  localidad?: number | null;
}) {
  const query = new URLSearchParams({
    locomotive: String(params.locomotive),
    tipo: params.tipo ?? "TORNO",
  });
  if (params.localidad) query.set("localidad", String(params.localidad));

  const result = await requestTornoMs<any>(`/torno/agendados/activable?${query.toString()}`, {
    method: "GET",
  });
  return result.data;
}

export async function listarTornoAgendados(params: {
  locomotive?: number;
  tipo?: string;
  localidad?: number | null;
  activo?: boolean;
} = {}) {
  const query = new URLSearchParams();
  if (params.locomotive) query.set("locomotive", String(params.locomotive));
  if (params.tipo) query.set("tipo", params.tipo);
  if (params.localidad) query.set("localidad", String(params.localidad));
  if (params.activo !== undefined) query.set("activo", String(params.activo));

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const result = await requestTornoMs<any>(`/torno/agendados${suffix}`, {
    method: "GET",
  });
  return result.data;
}

export async function eliminarTornoAgendadoPorMovimiento(idMovimiento: number) {
  const result = await requestTornoMs<any>(`/torno/agendados/${idMovimiento}`, {
    method: "DELETE",
  });
  return result.data;
}

export async function limpiarTornoAgendadosVencidosMs() {
  const result = await requestTornoMs<any>(`/torno/agendados/vencidos`, {
    method: "DELETE",
  });
  return result.data;
}

export async function cancelarRondaTornoPorMovimiento(
  movimientoId: number,
  options: { fin?: string | Date; razon?: string } = {}
) {
  const solicitud = await getRuedaSolicitudPorMovimiento(movimientoId);
  if (!solicitud?.id) return null;

  const rondas = await requestTornoMs<any[]>(`/rondas-servicio?ruedaSolicitudId=${solicitud.id}`, {
    method: "GET",
  });
  const ronda =
    rondas.data?.find((item) => {
      const status = String(item?.status ?? "").toUpperCase();
      return status !== "CANCELADO" && status !== "CONCLUIDO";
    }) ??
    rondas.data?.[0] ??
    null;
  if (!ronda?.id) return { ruedaSolicitud: solicitud, ronda: null };

  const status = String(ronda.status ?? "").toUpperCase();
  if (status === "CANCELADO" || status === "CONCLUIDO") {
    return { ruedaSolicitud: solicitud, ronda };
  }

  const canceled = await requestTornoMs<any>(`/rondas-servicio/${ronda.id}/cancelar-externo`, {
    method: "POST",
    body: {
      fin: options.fin instanceof Date ? options.fin.toISOString() : options.fin,
      razon: options.razon,
    },
  });

  if (String(canceled.data?.status ?? "").toUpperCase() !== "CANCELADO") {
    throw new Error(`msTorno no confirmó la cancelación de la ronda ${ronda.id}`);
  }

  return { ruedaSolicitud: solicitud, ronda: canceled.data };
}

export async function crearRecuperacionTemporalTornoCancelado(movimiento: {
  id: number;
  torno?: boolean | null;
  locomotiveNumber?: number | null;
  localidadId?: number | null;
}) {
  if (movimiento.torno !== true) return null;
  const locomotive = Number(movimiento.locomotiveNumber);
  if (!Number.isFinite(locomotive)) return null;

  const ruedaSolicitud = await getRuedaSolicitudPorMovimiento(movimiento.id).catch(() => null);
  if (!ruedaSolicitud?.id) return null;

  const now = new Date();
  return crearTornoAgendado({
    locomotive,
    tipo: TORNO_RECUPERACION_TIPO,
    localidad: movimiento.localidadId ?? null,
    idMovimiento: movimiento.id,
    fechaProgramada: now,
    fechaLimiteActivacion: addMinutes(now, TORNO_RECUPERACION_WINDOW_MINUTES),
    activo: true,
  });
}

export async function proxyToTornoMs(
  pathWithQuery: string,
  init: { method: string; body?: unknown; headers?: Record<string, string> }
) {
  return requestTornoMs<Json>(pathWithQuery, init);
}
