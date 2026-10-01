import { createHash } from 'crypto';
import type { RequestHandler } from 'express';

import { prisma } from '../lib/prisma';
import type { AuthenticatedUser } from '../types/auth';
import { logger } from '../utils/logger';

type StoredOperation = {
  key: string;
  user_id: number;
  request_hash: string;
  state: 'PROCESSING' | 'COMPLETED' | 'REVIEW';
  response_status: number | null;
  response_body: string | null;
  response_content_type: string | null;
  created_at: Date;
};

// Schema changes are applied by the versioned migration, never by a request.
export const normalizeIdempotencyKey = (value: unknown) => {
  const key = String(value ?? '').trim();
  return /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/.test(key) ? key : null;
};

export const fingerprintIdempotentRequest = (input: {
  userId: number;
  method: string;
  path: string;
  body?: unknown;
  authorization?: unknown;
}) => createHash('sha256').update(JSON.stringify({
  userId: input.userId,
  method: input.method.toUpperCase(),
  path: input.path,
  body: input.body ?? null,
  authorization: input.authorization,
})).digest('hex');

const serializeResponseBody = (body: unknown) => {
  if (body == null) return null;
  if (Buffer.isBuffer(body)) return body.toString('utf8');
  if (typeof body === 'string') return body;
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
};

const findStoredOperation = async (key: string) => {
  const rows = await prisma.$queryRawUnsafe<StoredOperation[]>(
    `SELECT * FROM "offline_idempotency" WHERE "key" = $1 LIMIT 1`,
    key
  );
  return rows[0] ?? null;
};

const tryClaimOperation = async (input: {
  key: string;
  userId: number;
  requestHash: string;
}) => {
  const rows = await prisma.$queryRawUnsafe<Array<{ key: string }>>(
    `INSERT INTO "offline_idempotency" (
       "key", "user_id", "request_hash", "state", "expires_at"
     ) VALUES ($1, $2, $3, 'PROCESSING', NOW() + INTERVAL '7 days')
     ON CONFLICT ("key") DO NOTHING
     RETURNING "key"`,
    input.key,
    input.userId,
    input.requestHash
  );
  return rows.length > 0;
};

export const idempotentMutation: RequestHandler = async (req, res, next) => {
  const rawKey = req.header('x-idempotency-key');
  if (!rawKey) return next();
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method.toUpperCase())) return next();

  const key = normalizeIdempotencyKey(rawKey);
  if (!key) {
    return res.status(400).json({ error: 'X-Idempotency-Key no tiene un formato válido' });
  }

  const userId = Number((req.user as AuthenticatedUser | undefined)?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ error: 'No se pudo identificar al usuario de la operación' });
  }

  const requestHash = fingerprintIdempotentRequest({
    userId,
    method: req.method,
    path: req.originalUrl,
    body: req.body && Object.keys(req.body).length ? req.body : undefined,
    authorization: { profile: req.authorization, version: (req.user as AuthenticatedUser).auth?.v ?? 0 },
  });

  try {
    let claimed = await tryClaimOperation({ key, userId, requestHash });
    if (!claimed) {
      const stored = await findStoredOperation(key);
      if (!stored) {
        claimed = await tryClaimOperation({ key, userId, requestHash });
      } else if (stored.user_id !== userId || stored.request_hash !== requestHash) {
        return res.status(409).json({
          error: 'La clave idempotente ya pertenece a otra operación',
          code: 'IDEMPOTENCY_KEY_REUSED',
        });
      } else if (stored.state === 'COMPLETED' && stored.response_status) {
        if (stored.response_status === 409 && stored.response_body == null) {
          return res.status(409).json({ code: 'IDEMPOTENCY_RESULT_EXPIRED', error: 'Operación registrada; consulta el recurso antes de crear otra operación' });
        }
        res.setHeader('x-idempotent-replay', 'true');
        if (stored.response_content_type) {
          res.setHeader('content-type', stored.response_content_type);
        }
        return res.status(stored.response_status).send(stored.response_body ?? undefined);
      } else {
        // A worker may have committed the business operation before losing its response.
        // Elapsed time is not evidence that repeating a write is safe.
        if (stored.state === 'REVIEW' || Date.now() - new Date(stored.created_at).getTime() >= 5 * 60_000) {
          return res.status(409).json({ error: 'Resultado pendiente de conciliación; no repitas la operación con otra clave', code: 'IDEMPOTENCY_REVIEW_REQUIRED' });
        }
      }
    }

    if (!claimed) {
      res.setHeader('retry-after', '2');
      return res.status(425).json({
        error: 'La misma operación sigue procesándose',
        code: 'IDEMPOTENCY_IN_PROGRESS',
      });
    }

    const originalSend = res.send.bind(res);
    let sending = false;
    (res as any).send = (body: unknown) => {
      if (sending) return res;
      sending = true;
      const status = res.statusCode;
      const contentType = String(res.getHeader('content-type') ?? 'application/json; charset=utf-8');
      const serialized = serializeResponseBody(body);
      const responseBody = serialized && Buffer.byteLength(serialized) > 1024 * 1024
        ? JSON.stringify({ code: 'IDEMPOTENCY_RESULT_TOO_LARGE', error: 'Operación registrada; consulta el recurso' }) : serialized;
      const state = status >= 500 ? 'REVIEW' : 'COMPLETED';
      // Persist the response BEFORE acknowledging it to the client. An ambiguous
      // crash stays PROCESSING/REVIEW and is never retried automatically.
      void prisma.$executeRawUnsafe(
        `UPDATE "offline_idempotency" SET "state" = $2, "response_status" = $3,
         "response_body" = $4, "response_content_type" = $5, "updated_at" = NOW()
         WHERE "key" = $1`, key, state, status, responseBody, contentType,
      ).then(() => {
        // Express send(object) calls json(), which calls send() again.
        res.send = originalSend;
        originalSend(body);
      }).catch(error => {
        logger.error('idempotency:store_response:error', { key, userId, message: error?.message });
        res.send = originalSend;
        res.status(503).type('json');
        originalSend(JSON.stringify({ error: 'No se pudo confirmar el resultado; conserva la misma clave', code: 'IDEMPOTENCY_REVIEW_REQUIRED' }));
      });
      return res;
    };

    return next();
  } catch (error: any) {
    logger.error('idempotency:middleware:error', {
      key,
      userId,
      message: error?.message ?? String(error),
    });
    return next(error);
  }
};
