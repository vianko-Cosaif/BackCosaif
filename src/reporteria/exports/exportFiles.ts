import { relationCounts } from '../../lib/relationCounts';
import { randomUUID } from 'crypto';
import { createWriteStream } from 'fs';
import { mkdir, rename, rm, stat, readdir } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { prisma } from '../../lib/prisma';
import { movementWhere } from '../../application/movements/movementQuery';
import { reportError } from './exportAccess';
import type { ExportFormat, ExportRecord } from './exportStore';

const directory = () => path.resolve(process.env.REPORT_EXPORT_DIR || '.private/report-exports');
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function artifactPath(id: string, token: string, format: ExportFormat) {
  if (!uuidPattern.test(id) || !uuidPattern.test(token) || !['csv', 'xlsx', 'pdf'].includes(format)) throw new Error('Invalid artifact identifier');
  return path.join(directory(), `${id}-${token}.${format}`);
}
export async function removeArtifact(record: ExportRecord) {
  if (record.artifact_token) await rm(artifactPath(record.id, record.artifact_token, record.format), { force: true });
}
export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
const columns = ['ID', 'Locomotora', 'Empresa', 'Localidad', 'Estado', 'Prioridad', 'Solicitud UTC', 'Inicio UTC', 'Fin UTC', 'Incidentes'];
export async function* exportMovementRows(record: ExportRecord) {
  const where = { AND: [movementWhere(record.filters), { createdAt: { lte: record.created_at } }] };
  const limit = record.format === 'pdf' ? 1000 : 100000;
  if (await prisma.movimiento.count({ where }) > limit) throw reportError(422, `El reporte supera ${limit} filas; reduce el período o los filtros`);
  let last = 0, count = 0;
  for (;;) {
    const rows = await prisma.movimiento.findMany({
      where: { AND: [where, { id: { gt: last } }] }, orderBy: { id: 'asc' }, take: 500,
      select: { id: true, locomotiveNumber: true, estado: true, prioridad: true, fechaSolicitud: true, fechaInicio: true, fechaFin: true,
        empresa: { select: { nombre: true } }, localidad: { select: { nombre: true } } },
    });
    if (!rows.length) return;
    const counts = await relationCounts(prisma.incidente, 'movimientoId', rows.map(row => row.id));
    for (const row of rows) {
      if (++count > limit) throw reportError(422, `El reporte supera ${limit} filas; reduce el período o los filtros`);
      yield [row.id, row.locomotiveNumber, row.empresa.nombre, row.localidad.nombre, row.estado, row.prioridad,
        row.fechaSolicitud.toISOString(), row.fechaInicio?.toISOString() ?? '', row.fechaFin?.toISOString() ?? '', counts.get(row.id) ?? 0];
    }
    last = rows[rows.length - 1].id;
  }
}
const htmlEscape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export async function writeExport(record: ExportRecord) {
  await mkdir(directory(), { recursive: true, mode: 0o700 });
  const token = randomUUID();
  const finalPath = artifactPath(record.id, token, record.format);
  const temporary = finalPath + '.tmp';
  let rows = 0;
  try {
    if (record.format === 'csv') {
      async function* lines() {
        yield '\uFEFF' + columns.map(csvCell).join(',') + '\r\n';
        for await (const row of exportMovementRows(record)) { rows++; yield row.map(csvCell).join(',') + '\r\n'; }
      }
      await pipeline(Readable.from(lines()), createWriteStream(temporary, { flags: 'wx', mode: 0o600 }));
    } else if (record.format === 'xlsx') {
      const { default: ExcelJS } = await import('exceljs');
      const output = createWriteStream(temporary, { flags: 'wx', mode: 0o600 });
      // The workbook streams rows to disk; styles and shared-string tables stay disabled.
      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: output, useStyles: false, useSharedStrings: false });
      const sheet = workbook.addWorksheet('Movimientos');
      sheet.addRow(columns).commit();
      try {
        for await (const row of exportMovementRows(record)) { rows++; sheet.addRow(row).commit(); }
        sheet.commit();
        await workbook.commit();
      } catch (error) { output.destroy(); throw error; }
    } else {
      const body: string[] = [];
      for await (const row of exportMovementRows(record)) { rows++; body.push(`<tr>${row.map(cell => `<td>${htmlEscape(cell)}</td>`).join('')}</tr>`); }
      const { newPdfPage } = await import('../modelos/pdf-browser');
      const page = await newPdfPage();
      try {
        await page.setJavaScriptEnabled(false);
        await page.setRequestInterception(true);
        page.on('request', request => { void request.abort(); });
        await page.setContent(`<html lang="es"><meta charset="utf-8"><style>body{font:9px sans-serif}table{width:100%;border-collapse:collapse}td,th{padding:4px;border:1px solid #ddd}thead{display:table-header-group}tr{break-inside:avoid}</style><h1>Movimientos</h1><p>Fechas UTC · Generado ${htmlEscape(new Date().toISOString())}</p><table><thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body.join('')}</tbody></table></html>`, { waitUntil: 'domcontentloaded' });
        const pdf = await page.pdf({ format: 'A4', landscape: true, margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' } });
        await pipeline(Readable.from([pdf]), createWriteStream(temporary, { flags: 'wx', mode: 0o600 }));
      } finally { await page.close().catch(() => undefined); }
    }
    await rename(temporary, finalPath);
    return { token, rows, bytes: (await stat(finalPath)).size, path: finalPath };
  } catch (error) { await rm(temporary, { force: true }); throw error; }
}

export async function pruneExportFiles() {
  const expired = await prisma.$queryRaw<ExportRecord[]>`SELECT * FROM report_exports WHERE expires_at < NOW() AND artifact_token IS NOT NULL LIMIT 100`;
  for (const record of expired) {
    await removeArtifact(record);
    await prisma.$executeRaw`UPDATE report_exports SET artifact_token = NULL WHERE id = ${record.id}::uuid AND artifact_token = ${record.artifact_token}::uuid`;
  }
  await prisma.$executeRaw`DELETE FROM report_exports WHERE id IN (SELECT id FROM report_exports WHERE expires_at < NOW() - INTERVAL '7 days' AND artifact_token IS NULL LIMIT 100)`;
  // Recover abandoned temporary/finished files after a process crash, with a 48 h grace period.
  for (const file of await readdir(directory()).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return []; throw error; })) {
    if (!/^[0-9a-f-]{36}-[0-9a-f-]{36}\.(csv|xlsx|pdf)(\.tmp)?$/i.test(file)) continue;
    const filePath = path.join(directory(), file);
    const info = await stat(filePath).catch(() => null);
    if (info && info.mtimeMs < Date.now() - 48 * 3600000) await rm(filePath, { force: true });
  }
}
