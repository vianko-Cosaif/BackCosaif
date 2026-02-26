// reporteria/controller/locomotorasExcel.ts
// Controller: genera EXCEL para reporte de locomotoras
// GET sugerido:
// /reporteria/locomotoras/excel?fechaInicio=2025-12-10&fechaFin=2025-12-13&locomotoras=1201,1202&tz=America/Mexico_City

import type { Request, Response } from 'express';
import { exportarReporteLocomotorasExcel } from '../modelos/locomotoras-excel';

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

export class LocomotorasExcelController {
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

      const excel = await exportarReporteLocomotorasExcel({
        fechaInicio,
        fechaFin,
        tz,
        locomotoras,
        localidadId,
        empresaId,
      });

      res.setHeader('Content-Type', excel.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${excel.filename}"`);
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.setHeader('X-Reporteria-TZ', tz);

      return res.status(200).send(excel.buffer);
    } catch (err: any) {
      const msg = err?.message ? String(err.message) : 'Error generando Excel';

      if (msg.includes('Fecha inválida') || msg.includes('formato YYYY-MM-DD')) {
        return res.status(400).json({ ok: false, error: msg });
      }

      return res.status(500).json({ ok: false, error: 'No se pudo generar el Excel', detail: msg });
    }
  }
}
