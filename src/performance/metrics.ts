import { AsyncLocalStorage } from 'async_hooks';
import { performance } from 'perf_hooks';
import { Counter, Histogram, Registry } from 'prom-client';

// No SQL, parameters, user IDs or URLs are retained as metric labels.
export const performanceRegistry = new Registry();
type RequestCost = { operations: number; databaseMs: number; closed: boolean };
const context = new AsyncLocalStorage<RequestCost>();
const operationTime = new Histogram({ name: 'cosaif_prisma_operation_seconds', help: 'Tiempo de operación Prisma, incluyendo espera del pool y materialización', labelNames: ['database', 'model', 'operation', 'outcome'], buckets: [.001, .005, .01, .05, .1, .5, 1, 5], registers: [performanceRegistry] });
const requestOperations = new Histogram({ name: 'cosaif_request_prisma_operations', help: 'Operaciones Prisma terminadas antes de cerrar cada petición', labelNames: ['method', 'route'], buckets: [0, 1, 2, 5, 10, 20, 50, 100], registers: [performanceRegistry] });
const requestDatabaseTime = new Histogram({ name: 'cosaif_request_prisma_seconds', help: 'Suma de tiempos Prisma por petición (operaciones paralelas se suman)', labelNames: ['method', 'route'], buckets: [.001, .01, .05, .1, .5, 1, 5, 15], registers: [performanceRegistry] });
const jobTime = new Histogram({ name: 'cosaif_job_duration_seconds', help: 'Duración de ejecución por tipo de trabajo', labelNames: ['kind', 'outcome'], buckets: [.01, .1, 1, 5, 15, 60, 300], registers: [performanceRegistry] });
const jobWait = new Histogram({ name: 'cosaif_job_queue_wait_seconds', help: 'Espera desde que el trabajo estuvo disponible hasta su reclamación', labelNames: ['kind'], buckets: [1, 5, 15, 60, 300, 3600], registers: [performanceRegistry] });
const jobRetries = new Counter({ name: 'cosaif_job_retries_total', help: 'Reintentos de trabajos durables', labelNames: ['kind'], registers: [performanceRegistry] });

export function beginRequestCost() {
  const cost: RequestCost = { operations: 0, databaseMs: 0, closed: false };
  return {
    run: <T>(next: () => T): T => context.run(cost, next),
    finish(method: string, route: string) {
      if (cost.closed) return;
      cost.closed = true;
      requestOperations.observe({ method, route }, cost.operations);
      requestDatabaseTime.observe({ method, route }, cost.databaseMs / 1000);
    },
    snapshot: () => ({ ...cost }),
  };
}

export async function measureOperation<T>(database: string, model: string, operation: string, query: () => Promise<T>): Promise<T> {
  const started = performance.now();
  const cost = context.getStore();
  let outcome = 'ok';
  try { return await query(); }
  catch (error) { outcome = 'error'; throw error; }
  finally {
    const ms = performance.now() - started;
    operationTime.observe({ database, model, operation, outcome }, ms / 1000);
    if (cost && !cost.closed) { cost.operations++; cost.databaseMs += ms; }
  }
}

// A query extension covers model operations and raw queries, including interactive transactions.
export function instrumentPrisma<T extends { $extends: Function }>(client: T, database: 'main' | 'torno' | 'torreon'): T {
  return client.$extends({ name: 'performance', query: { $allOperations({ model, operation, args, query }: any) {
    return measureOperation(database, model ?? 'raw', operation, () => query(args));
  } } }) as T;
}

export function recordJobCost(kind: string, started: number, outcome: 'ok' | 'retry') {
  jobTime.observe({ kind, outcome }, (performance.now() - started) / 1000);
  if (outcome === 'retry') jobRetries.inc({ kind });
}

export function recordJobWait(kind: string, availableAt: Date) { jobWait.observe({ kind }, Math.max(0, Date.now() - availableAt.getTime()) / 1000); }
