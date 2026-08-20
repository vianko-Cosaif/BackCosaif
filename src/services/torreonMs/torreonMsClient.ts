import crypto from "crypto";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../ms_torreon/.env.torreon") });

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

function normalizeBaseUrl(value?: string | null) {
  return String(value ?? "").trim().replace(/\/+$/, "");
}

function getTorreonBaseUrl() {
  const explicit = normalizeBaseUrl(process.env.TORREON_MS_URL ?? process.env.TORREON_SERVICE_URL);
  if (explicit) return explicit;

  const host = process.env.TORREON_HOST || "127.0.0.1";
  const port = process.env.TORREON_PORT || "3003";
  return `http://${host}:${port}`;
}

function parseServiceSecret() {
  const secretsRaw = process.env.TORREON_SERVICE_AUTH_SECRETS;
  if (secretsRaw) {
    const parsed = JSON.parse(secretsRaw) as Record<string, string>;
    const serviceId = process.env.TORREON_SERVICE_ID || Object.keys(parsed)[0];
    const secret = serviceId ? parsed[serviceId] : undefined;
    if (serviceId && secret) return { serviceId, secret };
  }

  const serviceId = process.env.TORREON_SERVICE_ID || "cosaif-backend";
  const secret = process.env.TORREON_SERVICE_SECRET;
  if (serviceId && secret) return { serviceId, secret };

  throw new Error("Faltan credenciales de servicio para ms_torreon");
}

function joinTorreonUrl(baseUrl: string, pathWithQuery: string) {
  const base = normalizeBaseUrl(baseUrl);
  const rawPath = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  if (rawPath.startsWith("/health")) return `${base}${rawPath}`;

  const baseIncludesApi = /\/api\/?$/.test(base);
  if (baseIncludesApi && rawPath.startsWith("/api/")) return `${base}${rawPath.slice(4)}`;
  if (baseIncludesApi || rawPath.startsWith("/api/")) return `${base}${rawPath}`;
  return `${base}/api${rawPath}`;
}

function sha256Hex(body: string) {
  return crypto.createHash("sha256").update(body).digest("hex");
}

function signServiceRequest(params: {
  method: string;
  pathWithQuery: string;
  timestamp: string;
  nonce: string;
  bodyHash: string;
  secret: string;
}) {
  const payload = [
    params.method.toUpperCase(),
    params.pathWithQuery,
    params.timestamp,
    params.nonce,
    params.bodyHash,
  ].join("\n");

  return `v1=${crypto.createHmac("sha256", params.secret).update(payload).digest("hex")}`;
}

export async function requestTorreonMs<T extends Json>(
  pathWithQuery: string,
  init: { method: string; body?: unknown; headers?: Record<string, string> } = { method: "GET" }
): Promise<{ status: number; data: T }> {
  const { serviceId, secret } = parseServiceSecret();
  const method = init.method.toUpperCase();
  const body = init.body !== undefined ? JSON.stringify(init.body) : "";
  const bodyHash = sha256Hex(body);
  const timestamp = String(Date.now());
  const nonce = crypto.randomUUID();
  const url = joinTorreonUrl(getTorreonBaseUrl(), pathWithQuery);
  const parsedUrl = new URL(url);
  const signedPath = `${parsedUrl.pathname}${parsedUrl.search}`;
  const signature = signServiceRequest({
    method,
    pathWithQuery: signedPath,
    timestamp,
    nonce,
    bodyHash,
    secret,
  });

  const response = await fetch(url, {
    method,
    headers: {
      "x-service-id": serviceId,
      "x-timestamp": timestamp,
      "x-nonce": nonce,
      "x-content-sha256": bodyHash,
      "x-signature": signature,
      ...(body ? { "content-type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    body: body || undefined,
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const msg =
      data && typeof data === "object" && ("message" in data || "error" in data)
        ? String((data as any).message ?? (data as any).error)
        : `ms_torreon error ${response.status}`;
    const error = new Error(msg);
    (error as any).status = response.status;
    (error as any).details = data;
    throw error;
  }

  return { status: response.status, data: data as T };
}

export async function proxyToTorreonMs(
  pathWithQuery: string,
  init: { method: string; body?: unknown; headers?: Record<string, string> }
) {
  return requestTorreonMs<Json>(pathWithQuery, init);
}
