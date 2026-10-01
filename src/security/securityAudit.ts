import { createHash, createHmac, randomUUID } from 'crypto';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import type { RequestHandler } from 'express';
import type { AuthenticatedUser } from '../types/auth';
import { logger } from '../utils/logger';

const AUDIT_VERSION = 1;
const GENESIS_HASH = 'GENESIS';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type SecurityAuditEvent = {
  eventId: string;
  occurredAt: string;
  actor: {
    userId: number;
    role: string;
    tokenFingerprint?: string;
  };
  request: {
    method: string;
    path: string;
    requestId?: string;
    ipFingerprint: string;
    userAgentFingerprint?: string;
    target?: Record<string, string>;
  };
  authorization?: {
    policyVersion: number;
    scopeMode: string;
    empresaId: number | null;
    localidadId: number | null;
  };
  outcome: {
    statusCode: number;
    allowed: boolean;
  };
};

export type SecurityAuditRecord = SecurityAuditEvent & {
  auditVersion: number;
  sequence: number;
  previousHash: string;
  hash: string;
};

type UnsignedSecurityAuditRecord = Omit<SecurityAuditRecord, 'hash'>;

export const computeAuditHash = (record: UnsignedSecurityAuditRecord, key: string) =>
  createHmac('sha256', key).update(JSON.stringify(record)).digest('hex');

export function verifyAuditRecords(records: SecurityAuditRecord[], key: string) {
  let previousHash = GENESIS_HASH;
  let expectedSequence = 1;

  for (const record of records) {
    if (record.sequence !== expectedSequence) {
      return { valid: false, sequence: record.sequence, reason: 'sequence_gap' } as const;
    }
    if (record.previousHash !== previousHash) {
      return { valid: false, sequence: record.sequence, reason: 'previous_hash_mismatch' } as const;
    }
    const { hash, ...unsigned } = record;
    if (computeAuditHash(unsigned, key) !== hash) {
      return { valid: false, sequence: record.sequence, reason: 'hash_mismatch' } as const;
    }
    previousHash = hash;
    expectedSequence += 1;
  }
  return {
    valid: true,
    records: records.length,
    lastHash: previousHash,
    nextSequence: expectedSequence,
  } as const;
}

export async function verifySecurityAuditFile(filePath: string, key: string) {
  try {
    let previousHash = GENESIS_HASH;
    let expectedSequence = 1;
    let pending = '';
    const check = (line: string) => {
      if (!line) return;
      const record = JSON.parse(line) as SecurityAuditRecord;
      if (record.sequence !== expectedSequence) return { valid: false, sequence: record.sequence, reason: 'sequence_gap' } as const;
      if (record.previousHash !== previousHash) return { valid: false, sequence: record.sequence, reason: 'previous_hash_mismatch' } as const;
      const { hash, ...unsigned } = record;
      if (computeAuditHash(unsigned, key) !== hash) return { valid: false, sequence: record.sequence, reason: 'hash_mismatch' } as const;
      previousHash = hash;
      expectedSequence++;
    };
    for await (const chunk of createReadStream(filePath, { encoding: 'utf8' })) {
      pending += chunk;
      let newline: number;
      while ((newline = pending.indexOf('\n')) >= 0) {
        if (newline > 262144) throw new Error('Audit record too large');
        const error = check(pending.slice(0, newline));
        if (error) return error;
        pending = pending.slice(newline + 1);
      }
      if (pending.length > 262144) throw new Error('Audit record too large');
    }
    // append() always writes a complete newline-terminated record. A partial tail
    // must block startup; appending to it would corrupt the next record.
    if (pending) return { valid: false, sequence: expectedSequence, reason: 'incomplete_record' } as const;
    return { valid: true, records: expectedSequence - 1, lastHash: previousHash, nextSequence: expectedSequence } as const;
  } catch (error: any) {
    if (error?.code === 'ENOENT') return verifyAuditRecords([], key);
    return { valid: false, sequence: 0, reason: 'unreadable_or_invalid_json' } as const;
  }
}

export class SecurityAuditLog {
  private initialized = false;
  private sequence = 0;
  private previousHash = GENESIS_HASH;
  private queue: Promise<void> = Promise.resolve();
  private pending = 0;
  private failed = false;
  get available() { return !this.failed && this.pending < 1000; }

  constructor(
    private readonly filePath: string,
    private readonly key: string,
  ) {
    if (key.length < 32) throw new Error('AUDIT_HMAC_KEY debe tener al menos 32 caracteres');
  }

  async initialize() {
    if (this.initialized) return;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const verification = await verifySecurityAuditFile(this.filePath, this.key);
    if (!verification.valid) {
      throw new Error(`La cadena de auditoría no es válida: ${verification.reason}`);
    }
    this.sequence = verification.nextSequence - 1;
    this.previousHash = verification.lastHash;
    this.initialized = true;
  }

  append(event: SecurityAuditEvent): Promise<void> {
    if (!this.available) return Promise.reject(new Error('Cola de auditoría saturada'));
    this.pending++;
    const operation = this.queue.then(async () => {
      if (this.failed) throw new Error('Escritor de auditoría detenido tras un fallo');
      await this.initialize();
      const unsigned: UnsignedSecurityAuditRecord = {
        auditVersion: AUDIT_VERSION,
        sequence: this.sequence + 1,
        previousHash: this.previousHash,
        ...event,
      };
      const record: SecurityAuditRecord = {
        ...unsigned,
        hash: computeAuditHash(unsigned, this.key),
      };
      const handle = await fs.open(this.filePath, 'a', 0o600);
      try {
        await handle.appendFile(`${JSON.stringify(record)}\n`, 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      await fs.chmod(this.filePath, 0o600);
      this.sequence = record.sequence;
      this.previousHash = record.hash;
    });
    this.queue = operation.catch(() => { this.failed = true; }).finally(() => { this.pending--; });
    return operation;
  }
}

const configuredAuditKey = String(process.env.AUDIT_HMAC_KEY ?? '');
const configuredAuditEnabled = String(process.env.AUDIT_ENABLED ?? 'true').toLowerCase() !== 'false';

export function resolveSecurityAuditPath(
  configuredPath = process.env.AUDIT_LOG_PATH,
  instance = process.env.NODE_APP_INSTANCE,
  cwd = process.cwd(),
) {
  const basePath = path.resolve(configuredPath ?? path.join(cwd, 'logs', 'security-audit.jsonl'));
  if (!instance) return basePath;
  const extension = path.extname(basePath);
  return path.join(
    path.dirname(basePath),
    `${path.basename(basePath, extension)}-${instance}${extension}`,
  );
}

const configuredAuditPath = resolveSecurityAuditPath();
if (process.env.NODE_ENV === 'production' && (!configuredAuditEnabled || configuredAuditKey.length < 32)) {
  throw new Error('Producción requiere auditoría habilitada y AUDIT_HMAC_KEY independiente de al menos 32 caracteres');
}


if (configuredAuditEnabled && !configuredAuditKey) {
  logger.error('security:audit_disabled_missing_key', {
    message: 'AUDIT_HMAC_KEY independiente es obligatoria; auditoría de mutaciones deshabilitada.',
  });
}

let configuredAuditLog: SecurityAuditLog | undefined;
if (configuredAuditEnabled && configuredAuditKey) {
  try {
    configuredAuditLog = new SecurityAuditLog(configuredAuditPath, configuredAuditKey);
  } catch (error) {
    logger.error('security:audit_configuration_error', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

let auditFailure = false;
export async function initializeSecurityAudit() { await configuredAuditLog?.initialize(); }

const fingerprint = (value: unknown) => createHash('sha256')
  .update(String(value ?? 'unknown'))
  .digest('hex')
  .slice(0, 16);

const safeTargets = (params: Record<string, string>) => {
  const allowed = ['id', 'movimientoId', 'rondaId', 'empresaId', 'localidadId'];
  const target = Object.fromEntries(
    allowed
      .filter((key) => params[key] !== undefined)
      .map((key) => [key, String(params[key]).slice(0, 64)]),
  );
  return Object.keys(target).length ? target : undefined;
};

export const securityAuditMiddleware: RequestHandler = (req, res, next) => {
  if (!configuredAuditLog || !MUTATING_METHODS.has(req.method.toUpperCase())) return next();
  if (auditFailure || !configuredAuditLog.available) return res.status(503).json({ error: 'Auditoría no disponible; operación bloqueada' });

  res.once('finish', () => {
    const user = req.user as AuthenticatedUser | undefined;
    if (!user) return;
    const authorization = req.authorization;
    const event: SecurityAuditEvent = {
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
      actor: {
        userId: user.id,
        role: authorization?.role ?? user.rol,
        tokenFingerprint: user.auth?.jti ? fingerprint(user.auth.jti) : undefined,
      },
      request: {
        method: req.method.toUpperCase(),
        path: req.originalUrl.split('?')[0],
        requestId: String(req.headers['x-request-id'] ?? req.headers['x-req-id'] ?? '').trim().slice(0, 128) || undefined,
        ipFingerprint: fingerprint(req.ip || req.socket.remoteAddress),
        userAgentFingerprint: req.headers['user-agent'] ? fingerprint(req.headers['user-agent']) : undefined,
        target: safeTargets(req.params),
      },
      authorization: authorization ? {
        policyVersion: authorization.policyVersion,
        scopeMode: authorization.scope.mode,
        empresaId: authorization.scope.empresaId,
        localidadId: authorization.scope.localidadId,
      } : undefined,
      outcome: {
        statusCode: res.statusCode,
        allowed: res.statusCode < 400,
      },
    };

    void configuredAuditLog?.append(event).catch((error) => {
      auditFailure = true;
      logger.error('security:audit_append_failed', {
        error: error instanceof Error ? error.message : String(error),
        eventId: event.eventId,
      });
    });
  });
  return next();
};
