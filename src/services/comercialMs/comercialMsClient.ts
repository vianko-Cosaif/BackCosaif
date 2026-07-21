import crypto from "crypto";
import path from "path";
import dotenv from "dotenv";

// En desarrollo la API y msComercial viven en el mismo workspace. La API carga
// primero su propio .env y usa .env.comercial solo como respaldo local. En
// producción el secreto debe ser inyectado explícitamente por el supervisor.
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: false });
if (process.env.NODE_ENV !== "production" && !process.env.COMERCIAL_SERVICE_SECRET) {
  dotenv.config({
    path: path.resolve(process.cwd(), "msComercial", ".env.comercial"),
    override: false,
  });
}

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

type CommercialActor = {
  id: number;
  role: string;
};

function config() {
  const baseUrl = String(process.env.COMERCIAL_MS_URL || "http://127.0.0.1:3004").replace(/\/+$/, "");
  const serviceId = process.env.COMERCIAL_SERVICE_ID || "cosaif-backend";
  const secret = process.env.COMERCIAL_SERVICE_SECRET;
  if (!secret) {
    throw new Error("COMERCIAL_SERVICE_SECRET no configurado en la API principal");
  }
  return { baseUrl, serviceId, secret };
}

function targetUrl(baseUrl: string, pathWithQuery: string) {
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  if (/\/api\/?$/.test(baseUrl) || path.startsWith("/api/")) return `${baseUrl}${path}`;
  return `${baseUrl}/api${path}`;
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function signature(input: {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  bodyHash: string;
  actor: CommercialActor;
  secret: string;
}) {
  const payload = [
    input.method,
    input.path,
    input.timestamp,
    input.nonce,
    input.bodyHash,
    String(input.actor.id),
    input.actor.role.toUpperCase(),
  ].join("\n");
  return `v1=${crypto.createHmac("sha256", input.secret).update(payload).digest("hex")}`;
}

export async function proxyToComercialMs(
  pathWithQuery: string,
  init: { method: string; body?: unknown; actor: CommercialActor },
): Promise<{ status: number; data: Json }> {
  const { baseUrl, serviceId, secret } = config();
  const method = init.method.toUpperCase();
  const body = init.body === undefined ? "" : JSON.stringify(init.body);
  const url = targetUrl(baseUrl, pathWithQuery);
  const parsed = new URL(url);
  const signedPath = `${parsed.pathname}${parsed.search}`;
  const timestamp = String(Date.now());
  const nonce = crypto.randomUUID();
  const bodyHash = sha256(body);
  const signed = signature({ method, path: signedPath, timestamp, nonce, bodyHash, actor: init.actor, secret });

  const response = await fetch(url, {
    method,
    headers: {
      "x-service-id": serviceId,
      "x-timestamp": timestamp,
      "x-nonce": nonce,
      "x-content-sha256": bodyHash,
      "x-signature": signed,
      "x-actor-id": String(init.actor.id),
      "x-actor-role": init.actor.role.toUpperCase(),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body || undefined,
  });

  const text = await response.text();
  let data: Json = null;
  if (text) {
    try {
      data = JSON.parse(text) as Json;
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const message = data && typeof data === "object" && !Array.isArray(data)
      ? String((data as Record<string, unknown>).error ?? `msComercial error ${response.status}`)
      : `msComercial error ${response.status}`;
    const error = new Error(message);
    (error as Error & { status?: number; details?: Json }).status = response.status;
    (error as Error & { status?: number; details?: Json }).details = data;
    throw error;
  }
  return { status: response.status, data };
}
