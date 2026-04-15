import { z } from "zod";

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

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

async function requestTornoMs<T extends Json>(
  pathWithQuery: string,
  init: { method: string; body?: unknown; headers?: Record<string, string> } = { method: "GET" }
): Promise<{ status: number; data: T }> {
  const { TORNO_MS_URL, TORNO_SERVICE_TOKEN } = getEnv();
  const url = `${TORNO_MS_URL}${pathWithQuery.startsWith("/") ? "" : "/"}${pathWithQuery}`;

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

export async function ensureSolicitudYRondaForMovimiento(movimientoId: number, medidas: MedidasRuedaInput) {
  // 1) RuedaSolicitud por movimiento (idempotente)
  const existing = await requestTornoMs<any[]>(`/api/rueda-solicitudes?movimientoId=${movimientoId}`, {
    method: "GET",
  });
  let ruedaSolicitud = existing.data?.[0] ?? null;

  if (!ruedaSolicitud) {
    const created = await requestTornoMs<any>(`/api/rueda-solicitudes`, {
      method: "POST",
      body: { movimientoId, ...medidas },
    });
    ruedaSolicitud = created.data;
  }

  // 2) RondaServicio por ruedaSolicitudId (idempotente)
  const rondaExisting = await requestTornoMs<any[]>(
    `/api/rondas-servicio?ruedaSolicitudId=${ruedaSolicitud.id}`,
    { method: "GET" }
  );
  let ronda = rondaExisting.data?.[0] ?? null;

  if (!ronda) {
    const rondaCreated = await requestTornoMs<any>(`/api/rondas-servicio`, {
      method: "POST",
      body: { ruedaSolicitudId: ruedaSolicitud.id },
    });
    ronda = rondaCreated.data;
  }

  return { ruedaSolicitud, ronda };
}

export async function proxyToTornoMs(
  pathWithQuery: string,
  init: { method: string; body?: unknown; headers?: Record<string, string> }
) {
  return requestTornoMs<Json>(pathWithQuery, init);
}

