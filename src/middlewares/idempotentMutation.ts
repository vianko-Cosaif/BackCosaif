import { createHash } from 'crypto';
import type { RequestHandler } from 'express';

import { prisma } from '../lib/prisma';
import type { AuthenticatedUser } from '../types/auth';
import { logger } from '../utils/logger';

type StoredOperation = {
  key: string;
  user_id: number;
  request_hash: string;
  state: 'PROCESSING' | 'COMPLETED';
  response_status: number | null;
  response_body: string | null;
  response_content_type: string | null;
  created_at: Date;
};

let tableReady: Promise<void> | null = null;

const ensureIdempotencyTable = () => {
  if (!tableReady) {
    tableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "offline_idempotency" (
          "key" VARCHAR(128) PRIMARY KEY,
          "user_id" INTEGER NOT NULL,
          "request_hash" CHAR(64) NOT NULL,
          "state" VARCHAR(16) NOT NULL,
          "response_status" INTEGER,
          "response_body" TEXT,
          "response_content_type" TEXT,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "expires_at" TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "offline_idempotency_expires_idx"
          ON "offline_idempotency" ("expires_at")
      `);
    })().catch(error => {
      tableReady = null;
      throw error;
    });
  }
  return tableReady;
};

export const normalizeIdempotencyKey = (value: unknown) => {
  const key = String(value ?? '').trim();
  return /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/.test(key) ? key : null;
};

export const fingerprintIdempotentRequest = (input: {
  userId: number;
  method: string;
  path: string;
  body?: unknown;
}) => createHash('sha256').update(JSON.stringify({
  userId: input.userId,
  method: input.method.toUpperCase(),
  path: input.path,
  body: input.body ?? null,
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

const tryRecoverStaleClaim = async (key: string, requestHash: string) => {
  const rows = await prisma.$queryRawUnsafe<Array<{ key: string }>>(
    `UPDATE "offline_idempotency"
       SET "created_at" = NOW(), "updated_at" = NOW()
     WHERE "key" = $1
       AND "request_hash" = $2
       AND "state" = 'PROCESSING'
       AND "created_at" < NOW() - INTERVAL '5 minutes'
     RETURNING "key"`,
    key,
    requestHash
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
  });

  try {
    await ensureIdempotencyTable();
    void prisma.$executeRawUnsafe(
      `DELETE FROM "offline_idempotency" WHERE "expires_at" < NOW()`
    ).catch(() => undefined);

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
        res.setHeader('x-idempotent-replay', 'true');
        if (stored.response_content_type) {
          res.setHeader('content-type', stored.response_content_type);
        }
        return res.status(stored.response_status).send(stored.response_body ?? undefined);
      } else {
        claimed = await tryRecoverStaleClaim(key, requestHash);
      }
    }

    if (!claimed) {
      res.setHeader('retry-after', '2');
      return res.status(425).json({
        error: 'La misma operación sigue procesándose',
        code: 'IDEMPOTENCY_IN_PROGRESS',
      });
    }

    let responseBody: string | null = null;
    const originalSend = res.send.bind(res);
    (res as any).send = (body: unknown) => {
      responseBody = serializeResponseBody(body);
      return originalSend(body);
    };

    res.once('finish', () => {
      const status = res.statusCode;
      if (status >= 500) {
        void prisma.$executeRawUnsafe(
          `DELETE FROM "offline_idempotency" WHERE "key" = $1 AND "state" = 'PROCESSING'`,
          key
        ).catch(() => undefined);
        return;
      }

      const contentType = String(res.getHeader('content-type') ?? 'application/json; charset=utf-8');
      void prisma.$executeRawUnsafe(
        `UPDATE "offline_idempotency"
           SET "state" = 'COMPLETED',
               "response_status" = $2,
               "response_body" = $3,
               "response_content_type" = $4,
               "updated_at" = NOW()
         WHERE "key" = $1`,
        key,
        status,
        responseBody,
        contentType
      ).catch(error => {
        logger.error('idempotency:store_response:error', {
          key,
          userId,
          message: error?.message ?? String(error),
        });
      });
    });

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
