import crypto from "crypto";
import path from "path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const envSchema = z.object({
  LAVADO_MS_URL: z.string().url(),
  LAVADO_SERVICE_ID: z.string().min(1),
  LAVADO_SERVICE_SECRET: z.string().min(1),
});

const getEnv = () => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Faltan variables de entorno para msLavado: ${parsed.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`
    );
  }
  return parsed.data;
};

const joinLavadoUrl = (baseUrl: string, pathWithQuery: string) => {
  const base = baseUrl.replace(/\/+$/, "");
  const pathPart = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;

  if (/\/api\/lavados$/i.test(base)) return `${base}${pathPart}`;
  if (/\/api$/i.test(base)) return `${base}/lavados${pathPart}`;
  return `${base}/api/lavados${pathPart}`;
};

const sha256Hex = (body: string) => {
  return crypto.createHash("sha256").update(body).digest("hex");
};

const buildSignaturePayload = (params: {
  method: string;
  pathWithQuery: string;
  timestamp: string;
  nonce: string;
  bodyHash: string;
}) => {
  return [
    params.method.toUpperCase(),
    params.pathWithQuery,
    params.timestamp,
    params.nonce,
    params.bodyHash,
  ].join("\n");
};

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

export async function proxyToLavadoMs<T extends Json>(
  pathWithQuery: string,
  init: { method: string; body?: unknown } = { method: "GET" }
): Promise<{ status: number; data: T }> {
  const {
    LAVADO_MS_URL,
    LAVADO_SERVICE_ID,
    LAVADO_SERVICE_SECRET,
  } = getEnv();

  const method = init.method.toUpperCase();
  const url = joinLavadoUrl(LAVADO_MS_URL, pathWithQuery);
  const target = new URL(url);
  const signedPath = `${target.pathname}${target.search}`;
  const body = init.body === undefined ? "" : JSON.stringify(init.body);
  const bodyHash = sha256Hex(body);
  const timestamp = String(Date.now());
  const nonce = crypto.randomUUID();
  const signaturePayload = buildSignaturePayload({
    method,
    pathWithQuery: signedPath,
    timestamp,
    nonce,
    bodyHash,
  });
  const signature = `v1=${crypto
    .createHmac("sha256", LAVADO_SERVICE_SECRET)
    .update(signaturePayload)
    .digest("hex")}`;

  const response = await fetch(url, {
    method,
    headers: {
      "x-service-id": LAVADO_SERVICE_ID,
      "x-timestamp": timestamp,
      "x-nonce": nonce,
      "x-content-sha256": bodyHash,
      "x-signature": signature,
      ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: init.body !== undefined ? body : undefined,
  });

  const responseText = await response.text();
  let data: unknown = null;
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }

  if (!response.ok) {
    const payload = data as Record<string, unknown> | null;
    const message =
      payload && typeof payload === "object"
        ? String(payload.message ?? payload.error ?? `msLavado error ${response.status}`)
        : `msLavado error ${response.status}`;
    const error = new Error(message);
    (error as Error & { status?: number }).status = response.status;
    (error as Error & { details?: unknown }).details = data;
    throw error;
  }

  return { status: response.status, data: data as T };
}
