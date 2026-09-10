import { collectDefaultMetrics } from 'prom-client';
import 'dotenv/config';
import { createServer } from 'http';
import { prisma } from '../lib/prisma';
import { startJobWorker, stopJobWorker } from '../jobs/durableJobs';
import { registerReportExportWorker } from '../reporteria/exports/exportWorker';
import { pruneExportFiles } from '../reporteria/exports/exportFiles';
import { closeBrowser } from '../reporteria/modelos/pdf-browser';
import { performanceRegistry } from '../performance/metrics';
import { logger } from '../utils/logger';

async function main() {
  await prisma.$queryRaw`SELECT id FROM report_exports LIMIT 0`;
  await prisma.$queryRaw`SELECT key FROM durable_jobs LIMIT 0`;
  registerReportExportWorker();
  startJobWorker();
  let pruning: Promise<void> | undefined;
  const prune = () => {
    if (pruning) return;
    pruning = pruneExportFiles().catch(error => { logger.error('reports:retention_failed', { message: error.message }); }).finally(() => { pruning = undefined; });
  };
  const timer = setInterval(prune, 3600000); // Keeps the standalone worker alive.
  prune();
  collectDefaultMetrics({ register: performanceRegistry });
  const metrics = createServer(async (req, res) => {
    if (req.url !== '/metrics') { res.writeHead(404).end(); return; }
    try { res.setHeader('Content-Type', performanceRegistry.contentType); res.end(await performanceRegistry.metrics()); }
    catch { res.writeHead(500).end(); }
  });
  const port = Number(process.env.REPORT_WORKER_METRICS_PORT || 9331);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('REPORT_WORKER_METRICS_PORT inválido');
  await new Promise<void>((resolve, reject) => { metrics.once('error', reject); metrics.listen(port, '127.0.0.1', resolve); });
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    clearInterval(timer);
    metrics.close();
    await stopJobWorker();
    await pruning;
    await closeBrowser();
    await prisma.$disconnect();
  };
  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
  logger.info('reports:worker_started', { metricsPort: port });
}
void main().catch(error => { logger.error('reports:startup_failed', { message: error.message }); process.exit(1); });
