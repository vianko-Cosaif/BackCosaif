// reporteria/controller/locomotorasPdf.ts
// Controller: genera PDF por locomotoras
// GET sugerido:
// /reporteria/locomotoras/pdf?fechaInicio=2025-12-01&fechaFin=2025-12-31&locomotoras=1201,1202&tz=America/Mexico_City

import type { Request, Response } from 'express';
import { LocomotorasReporteriaModel } from '../modelos/locomotoras-model';
import { exportarReporteLocomotorasPDF } from '../modelos/locomotoras-pdf';

function parseIntOpt(v: any): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function assertYYYYMMDD(fecha: any) {
  const s = String(fecha ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error('Parámetro de fecha inválido. Usa formato YYYY-MM-DD.');
  }
  return s;
}

function parseLocomotoras(q: any): number[] {
  let raw =
    q.locomotoras ??
    q.locomotora ??
    q.locomotiveNumber ??
    q.locomotiveNumbers ??
    q.numlocomotive ??
    q.numLocomotive;

  if (!raw) return [];
  if (Array.isArray(raw)) raw = raw.join(',');

  return String(raw)
    .split(',')
    .map((s) => Number(String(s).trim()))
    .filter((n) => Number.isFinite(n));
}

export class LocomotorasPdfController {
  static async generar(req: Request, res: Response) {
    try {
      const tz = String(req.query.tz ?? 'America/Mexico_City').trim() || 'America/Mexico_City';

      const fechaInicioRaw = req.query.fechaInicio ?? req.query.desde ?? req.query.inicio;
      const fechaFinRaw = req.query.fechaFin ?? req.query.hasta ?? req.query.fin;

      const fechaInicio = assertYYYYMMDD(fechaInicioRaw);
      const fechaFin = assertYYYYMMDD(fechaFinRaw);

      const locomotoras = parseLocomotoras(req.query);
      if (!locomotoras.length) {
        return res.status(400).json({
          ok: false,
          error: 'Debes enviar al menos una locomotora en la consulta (locomotoras=1,2,3).',
        });
      }

      const localidadId = parseIntOpt(req.query.localidadId);
      const empresaId = parseIntOpt(req.query.empresaId);

      const reporte = await LocomotorasReporteriaModel.reportePorFechas({
        fechaInicio,
        fechaFin,
        tz,
        locomotoras,
        localidadId,
        empresaId,
      });

      const pdf = await exportarReporteLocomotorasPDF(reporte);

      res.setHeader('Content-Type', pdf.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.setHeader('X-Reporteria-TZ', tz);

      return res.status(200).send(pdf.buffer);
    } catch (err: any) {
      const msg = err?.message ? String(err.message) : 'Error generando PDF';

      if (msg.includes('Fecha inválida') || msg.includes('formato YYYY-MM-DD')) {
        return res.status(400).json({ ok: false, error: msg });
      }

      return res.status(500).json({ ok: false, error: 'No se pudo generar el PDF', detail: msg });
    }
  }
}
