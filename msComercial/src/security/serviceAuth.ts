import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";

export type CommercialRequest = Request & {
  rawBody?: Buffer;
  commercialActor?: { id: number; role: "ADMINISTRADOR" | "COMERCIAL"; name?: string };
};

const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000;
const nonceCache = new Map<string, number>();

const sha256Hex = (body?: Buffer) =>
  crypto.createHash("sha256").update(body ?? Buffer.alloc(0)).digest("hex");

const safeEqualHex = (left: string, right: string) => {
  const normalize = (value: string) => (value.startsWith("v1=") ? value.slice(3) : value);
  const a = normalize(left);
  const b = normalize(right);
  if (!/^[a-f0-9]+$/i.test(a) || !/^[a-f0-9]+$/i.test(b)) return false;
  const aBuffer = Buffer.from(a, "hex");
  const bBuffer = Buffer.from(b, "hex");
  return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
};

export function buildCommercialSignaturePayload(input: {
  method: string;
  pathWithQuery: string;
  timestamp: string;
  nonce: string;
  bodyHash: string;
  actorId: string;
  actorRole: string;
}) {
  return [
    input.method.toUpperCase(),
    input.pathWithQuery,
    input.timestamp,
    input.nonce,
    input.bodyHash,
    input.actorId,
    input.actorRole.toUpperCase(),
  ].join("\n");
}

export function signCommercialRequest(input: Parameters<typeof buildCommercialSignaturePayload>[0] & { secret: string }) {
  return `v1=${crypto
    .createHmac("sha256", input.secret)
    .update(buildCommercialSignaturePayload(input))
    .digest("hex")}`;
}

function configuredCredentials() {
  const serviceId = process.env.COMERCIAL_SERVICE_ID || "cosaif-backend";
  const secret = process.env.COMERCIAL_SERVICE_SECRET;
  return serviceId && secret ? { serviceId, secret } : null;
}

export function verifyCommercialServiceRequest(req: CommercialRequest, res: Response, next: NextFunction) {
  const credentials = configuredCredentials();
  if (!credentials) {
    return res.status(500).json({ error: "Autenticacion interna de Comercial no configurada" });
  }

  const serviceId = req.header("x-service-id") ?? "";
  const timestamp = req.header("x-timestamp") ?? "";
  const nonce = req.header("x-nonce") ?? "";
  const bodyHash = req.header("x-content-sha256") ?? "";
  const signature = req.header("x-signature") ?? "";
  const actorId = req.header("x-actor-id") ?? "";
  const actorRole = (req.header("x-actor-role") ?? "").toUpperCase();
  const actorNameHeader = req.header("x-actor-name") ?? "";

  if (!serviceId || !timestamp || !nonce || !bodyHash || !signature || !actorId || !actorRole) {
    return res.status(401).json({ error: "Solicitud interna incompleta" });
  }
  if (serviceId !== credentials.serviceId) {
    return res.status(401).json({ error: "Servicio no autorizado" });
  }

  const now = Date.now();
  const requestTime = Number(timestamp);
  const configuredTolerance = Number(process.env.COMERCIAL_SIGNATURE_TOLERANCE_MS);
  const tolerance = Number.isFinite(configuredTolerance) && configuredTolerance > 0
    ? configuredTolerance
    : DEFAULT_TOLERANCE_MS;
  if (!Number.isFinite(requestTime) || Math.abs(now - requestTime) > tolerance) {
    return res.status(401).json({ error: "Solicitud interna expirada" });
  }

  const computedBodyHash = sha256Hex(req.rawBody);
  if (!safeEqualHex(bodyHash, computedBodyHash)) {
    return res.status(401).json({ error: "El contenido de la solicitud fue alterado" });
  }

  for (const [key, expiresAt] of nonceCache) {
    if (expiresAt <= now) nonceCache.delete(key);
  }
  const nonceKey = `${serviceId}:${nonce}`;
  if (nonceCache.has(nonceKey)) {
    return res.status(401).json({ error: "Solicitud interna repetida" });
  }

  const expected = signCommercialRequest({
    method: req.method,
    pathWithQuery: req.originalUrl,
    timestamp,
    nonce,
    bodyHash,
    actorId,
    actorRole,
    secret: credentials.secret,
  });
  if (!safeEqualHex(signature, expected)) {
    return res.status(401).json({ error: "Firma interna invalida" });
  }

  const actorIdNumber = Number(actorId);
  if (!Number.isInteger(actorIdNumber) || actorIdNumber <= 0) {
    return res.status(401).json({ error: "Actor interno invalido" });
  }
  if (actorRole !== "ADMINISTRADOR" && actorRole !== "COMERCIAL") {
    return res.status(403).json({ error: "Rol sin acceso a Comercial" });
  }

  nonceCache.set(nonceKey, requestTime + tolerance);
  let actorName: string | undefined;
  try {
    actorName = decodeURIComponent(actorNameHeader).trim().slice(0, 180) || undefined;
  } catch {
    actorName = actorNameHeader.trim().slice(0, 180) || undefined;
  }
  req.commercialActor = { id: actorIdNumber, role: actorRole, name: actorName };
  return next();
}

export function commercialActor(req: Request) {
  const actor = (req as CommercialRequest).commercialActor;
  if (!actor) throw new Error("Actor comercial no disponible");
  return actor;
}
