import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";

export type RequestWithRawBody = Request & {
  rawBody?: Buffer;
};

const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000;
const EMPTY_BODY_HASH = crypto.createHash("sha256").update(Buffer.alloc(0)).digest("hex");
const nonceCache = new Map<string, number>();

const unauthorized = (res: Response, message = "Unauthorized") => {
  return res.status(401).json({ ok: false, error: message });
};

const parseSecrets = (): Map<string, string> => {
  const raw = process.env.TORREON_SERVICE_AUTH_SECRETS;
  if (raw) {
    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(raw) as Record<string, string>;
    } catch {
      return new Map();
    }

    return new Map(
      Object.entries(parsed).filter((entry): entry is [string, string] => {
        const [serviceId, secret] = entry;
        return Boolean(serviceId && secret);
      })
    );
  }

  const serviceId = process.env.TORREON_SERVICE_ID;
  const secret = process.env.TORREON_SERVICE_SECRET;
  if (serviceId && secret) return new Map([[serviceId, secret]]);

  return new Map();
};

const getToleranceMs = () => {
  const value = Number(process.env.TORREON_SIGNATURE_TOLERANCE_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TOLERANCE_MS;
};

const sha256Hex = (body?: Buffer) => {
  return crypto.createHash("sha256").update(body ?? Buffer.alloc(0)).digest("hex");
};

const normalizeSignature = (value: string) => {
  return value.startsWith("v1=") ? value.slice(3) : value;
};

const timingSafeEqualHex = (left: string, right: string) => {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) return false;
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const cleanupNonceCache = (now: number) => {
  for (const [key, expiresAt] of nonceCache) {
    if (expiresAt <= now) nonceCache.delete(key);
  }
};

export const buildServiceSignaturePayload = (params: {
  method: string;
  pathWithQuery: string;
  timestamp: string;
  nonce: string;
  bodyHash?: string;
}) => {
  return [
    params.method.toUpperCase(),
    params.pathWithQuery,
    params.timestamp,
    params.nonce,
    params.bodyHash ?? EMPTY_BODY_HASH,
  ].join("\n");
};

export const signServiceRequest = (params: {
  method: string;
  pathWithQuery: string;
  timestamp: string;
  nonce: string;
  bodyHash?: string;
  secret: string;
}) => {
  const payload = buildServiceSignaturePayload(params);
  return `v1=${crypto.createHmac("sha256", params.secret).update(payload).digest("hex")}`;
};

export const verifyServiceSignature = (req: RequestWithRawBody, res: Response, next: NextFunction) => {
  const secrets = parseSecrets();
  if (!secrets.size) {
    return res.status(500).json({ ok: false, error: "Service auth is not configured" });
  }

  const serviceId = req.header("x-service-id");
  const timestamp = req.header("x-timestamp");
  const nonce = req.header("x-nonce");
  const bodyHash = req.header("x-content-sha256");
  const signature = req.header("x-signature");

  if (!serviceId || !timestamp || !nonce || !bodyHash || !signature) {
    return unauthorized(res);
  }

  const secret = secrets.get(serviceId);
  if (!secret) return unauthorized(res);

  const toleranceMs = getToleranceMs();
  const now = Date.now();
  const requestTime = Number(timestamp);
  if (!Number.isFinite(requestTime) || Math.abs(now - requestTime) > toleranceMs) {
    return unauthorized(res, "Request timestamp is outside the allowed window");
  }

  const computedBodyHash = sha256Hex(req.rawBody);
  if (!timingSafeEqualHex(bodyHash, computedBodyHash)) {
    return unauthorized(res, "Body hash mismatch");
  }

  cleanupNonceCache(now);

  const nonceKey = `${serviceId}:${nonce}`;
  if (nonceCache.has(nonceKey)) {
    return unauthorized(res, "Replay detected");
  }

  const expectedSignature = signServiceRequest({
    method: req.method,
    pathWithQuery: req.originalUrl,
    timestamp,
    nonce,
    bodyHash,
    secret,
  });

  if (!timingSafeEqualHex(normalizeSignature(signature), normalizeSignature(expectedSignature))) {
    return unauthorized(res);
  }

  nonceCache.set(nonceKey, requestTime + toleranceMs);
  return next();
};
