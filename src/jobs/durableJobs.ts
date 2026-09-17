import { performance } from 'perf_hooks';
import { recordJobCost, recordJobWait } from '../performance/metrics';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import type { Prisma } from '@prisma/client';

type Job = { key: string; kind: string; payload: any; attempts: number; available_at: Date };
type Handler = (payload: any, key: string) => Promise<unknown>;
const executionContext = new AsyncLocalStorage<string>();
export const getDurableJobKey = () => executionContext.getStore();
export const isDurableJobExecution = () => getDurableJobKey() !== undefined;
const handlers = new Map<string, Handler>();
export const registerJob = (kind: string, handler: Handler) => handlers.set(kind, handler);
export async function enqueueJob(key: string, kind: string, payload: unknown, db: Prisma.TransactionClient = prisma) {
  await db.$executeRaw`INSERT INTO durable_jobs (key, kind, payload) VALUES (${key}, ${kind}, ${JSON.stringify(payload)}::jsonb) ON CONFLICT (key) DO NOTHING`;
}
let running = false;
let stopping = false;
export async function runJobsOnce() {
  if (running) return;
  running = true;
  try {
    for (let count = 0; count < 20 && !stopping; count++) {
      const token = randomUUID();
      const rows = await prisma.$queryRaw<Job[]>`
        UPDATE durable_jobs SET locked_until = NOW() + INTERVAL '2 minutes', lock_token = ${token}::uuid, attempts = attempts + 1
        WHERE key = (SELECT key FROM durable_jobs WHERE completed_at IS NULL AND available_at <= NOW()
          AND (locked_until IS NULL OR locked_until < NOW()) AND kind = ANY(${[...handlers.keys()]}::text[])
          ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 1)
        RETURNING key, kind, payload, attempts, available_at`;
      const job = rows[0];
      if (!job) break;
      recordJobWait(job.kind, job.available_at);
      const heartbeat = setInterval(() => {
        void prisma.$executeRaw`UPDATE durable_jobs SET locked_until = NOW() + INTERVAL '2 minutes' WHERE key = ${job.key} AND lock_token = ${token}::uuid`.catch(error => logger.error('jobs:lease_error', { key: job.key, message: error.message }));
      }, 30_000);
      heartbeat.unref();
      const started = performance.now();
      let outcome: 'ok' | 'retry' = 'ok';
      try {
        await executionContext.run(job.key, () => handlers.get(job.kind)!(job.payload, job.key));
        await prisma.$executeRaw`UPDATE durable_jobs SET completed_at = NOW(), locked_until = NULL, last_error = NULL WHERE key = ${job.key} AND lock_token = ${token}::uuid`;
      } catch (error: any) {
        outcome = 'retry';
        const delay = Math.min(3600, 2 ** Math.min(job.attempts, 12));
        await prisma.$executeRaw`UPDATE durable_jobs SET available_at = NOW() + ${delay} * INTERVAL '1 second', locked_until = NULL, last_error = ${String(error?.message ?? error).slice(0, 1000)} WHERE key = ${job.key} AND lock_token = ${token}::uuid`;
        logger.error('jobs:retry', { key: job.key, attempts: job.attempts, delay, message: error?.message });
      } finally { clearInterval(heartbeat); recordJobCost(job.kind, started, outcome); }
    }
  } finally { running = false; }
}
let timer: NodeJS.Timeout | undefined;
export function startJobWorker() {
  if (timer) return;
  stopping = false;
  const run = () => void runJobsOnce().catch(error => logger.error('jobs:worker_error', { message: error.message }));
  timer = setInterval(run, 5000); timer.unref(); run();
}

export async function stopJobWorker() {
  stopping = true;
  if (timer) clearInterval(timer);
  timer = undefined;
  while (running) await new Promise(resolve => setTimeout(resolve, 50));
}
