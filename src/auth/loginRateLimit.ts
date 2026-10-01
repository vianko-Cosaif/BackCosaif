import 'dotenv/config';
import { createHash } from 'crypto';
import type { RequestHandler } from 'express';
import { createClient, type RedisClientType } from 'redis';
import { logger } from '../utils/logger';

type AttemptBucket = {
  failures: number;
  windowStartedAt: number;
  blockedUntil: number;
  lastSeenAt: number;
};

export class LoginAttemptStore {
  private readonly buckets = new Map<string, AttemptBucket>();

  constructor(
    private readonly maxFailures: number,
    private readonly windowMs: number,
    private readonly blockMs: number,
    private readonly maxBuckets = 10_000,
  ) {}

  retryAfterMs(key: string, now = Date.now()): number {
    const bucket = this.buckets.get(key);
    if (!bucket) return 0;
    bucket.lastSeenAt = now;
    if (bucket.blockedUntil > now) return bucket.blockedUntil - now;
    if (now - bucket.windowStartedAt >= this.windowMs) this.buckets.delete(key);
    return 0;
  }

  recordFailure(key: string, now = Date.now()): void {
    const current = this.buckets.get(key);
    const bucket = !current || now - current.windowStartedAt >= this.windowMs
      ? { failures: 0, windowStartedAt: now, blockedUntil: 0, lastSeenAt: now }
      : current;

    bucket.failures += 1;
    bucket.lastSeenAt = now;
    if (bucket.failures >= this.maxFailures) bucket.blockedUntil = now + this.blockMs;
    this.buckets.set(key, bucket);
    this.compact(now);
  }

  clear(key: string): void {
    this.buckets.delete(key);
  }

  private compact(now: number): void {
    if (this.buckets.size <= this.maxBuckets) return;

    for (const [key, bucket] of this.buckets) {
      const expiredWindow = now - bucket.windowStartedAt >= this.windowMs;
      const expiredBlock = bucket.blockedUntil <= now;
      if (expiredWindow && expiredBlock) this.buckets.delete(key);
      if (this.buckets.size <= this.maxBuckets) return;
    }

    const oldest = [...this.buckets.entries()]
      .sort((left, right) => left[1].lastSeenAt - right[1].lastSeenAt)
      .slice(0, Math.max(1, this.buckets.size - this.maxBuckets));
    for (const [key] of oldest) this.buckets.delete(key);
  }
}

const positiveConfig = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const maxFailures = positiveConfig(process.env.AUTH_LOGIN_MAX_FAILURES, 12);
const windowMs = positiveConfig(process.env.AUTH_LOGIN_WINDOW_MS, 15 * 60_000);
const blockMs = positiveConfig(process.env.AUTH_LOGIN_BLOCK_MS, 15 * 60_000);
const enabled = String(process.env.AUTH_LOGIN_RATE_LIMIT_ENABLED ?? 'true').toLowerCase() !== 'false';
const redisUrl = String(process.env.REDIS_URL ?? '').trim();
const redisPrefix = String(process.env.AUTH_LOGIN_REDIS_PREFIX ?? 'cosaif:auth:login:v1').trim();
const connectTimeoutMs = positiveConfig(process.env.AUTH_LOGIN_REDIS_CONNECT_TIMEOUT_MS, 800);
const localAttempts = new LoginAttemptStore(maxFailures, windowMs, blockMs);

const normalizedLogin = (value: unknown) =>
  String(value ?? '').trim().toLocaleLowerCase('es-MX').slice(0, 160) || '__empty__';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const loginFingerprint = (value: unknown) => digest(normalizedLogin(value)).slice(0, 12);
const attemptKey = (ip: string, login: unknown) => digest(`${ip}|${normalizedLogin(login)}`);

class DistributedLoginAttempts {
  private client: RedisClientType | null = null;
  private connecting: Promise<RedisClientType | null> | null = null;
  private lastWarningAt = 0;

  private warnFallback(error: unknown) {
    const now = Date.now();
    if (now - this.lastWarningAt < 60_000) return;
    this.lastWarningAt = now;
    logger.warn('auth:login:redis_fallback', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  private async getClient(): Promise<RedisClientType | null> {
    if (!redisUrl) return null;
    if (this.client?.isReady) return this.client;
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      const client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: connectTimeoutMs,
          reconnectStrategy: false,
        },
      }) as RedisClientType;
      client.on('error', (error) => this.warnFallback(error));
      try {
        await client.connect();
        this.client = client;
        return client;
      } catch (error) {
        this.warnFallback(error);
        try { await client.close(); } catch { /* no-op */ }
        return null;
      } finally {
        this.connecting = null;
      }
    })();
    return this.connecting;
  }

  private keys(key: string) {
    return {
      attempts: `${redisPrefix}:attempts:${key}`,
      block: `${redisPrefix}:block:${key}`,
    };
  }

  async retryAfterMs(key: string): Promise<number> {
    const localRetry = localAttempts.retryAfterMs(key);
    const client = await this.getClient();
    if (!client) return localRetry;
    try {
      const ttl = await client.pTTL(this.keys(key).block);
      return Math.max(localRetry, ttl > 0 ? ttl : 0);
    } catch (error) {
      this.warnFallback(error);
      return localRetry;
    }
  }

  async recordFailure(key: string): Promise<void> {
    const client = await this.getClient();
    if (!client) return localAttempts.recordFailure(key);
    const keys = this.keys(key);
    try {
      await client.eval(
        `local failures = redis.call('INCR', KEYS[1])
         if failures == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
         if failures >= tonumber(ARGV[2]) then
           redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
           redis.call('DEL', KEYS[1])
         end
         return failures`,
        {
          keys: [keys.attempts, keys.block],
          arguments: [String(windowMs), String(maxFailures), String(blockMs)],
        },
      );
    } catch (error) {
      this.warnFallback(error);
      localAttempts.recordFailure(key);
    }
  }

  async clear(key: string): Promise<void> {
    localAttempts.clear(key);
    const client = await this.getClient();
    if (!client) return;
    try {
      const keys = this.keys(key);
      await client.del([keys.attempts, keys.block]);
    } catch (error) {
      this.warnFallback(error);
    }
  }
}

const attempts = new DistributedLoginAttempts();

export const loginRateLimit: RequestHandler = (req, res, next) => {
  if (!enabled) return next();

  const ip = String(req.ip || req.socket.remoteAddress || 'unknown');
  const key = attemptKey(ip, req.body?.nombre);

  void attempts.retryAfterMs(key).then((retryMs) => {
    if (retryMs > 0) {
      const retryAfterSeconds = Math.max(1, Math.ceil(retryMs / 1000));
      logger.warn('auth:login:rate_limited', {
        ip,
        loginFingerprint: loginFingerprint(req.body?.nombre),
        retryAfterSeconds,
        distributed: Boolean(redisUrl),
      });
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
        code: 'LOGIN_RATE_LIMITED',
        retryAfterSeconds,
      });
    }

    res.once('finish', () => {
      if (res.statusCode === 401 || res.statusCode === 403) {
        void attempts.recordFailure(key);
      } else if (res.statusCode >= 200 && res.statusCode < 300) {
        void attempts.clear(key);
      }
    });
    return next();
  }).catch((error) => {
    logger.error('auth:login:rate_limit_error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return next();
  });
};
