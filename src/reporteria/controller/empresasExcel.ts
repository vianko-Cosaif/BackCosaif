// reporteria/controller/empresasExcel.ts
// Controller: genera EXCEL por empresa
// GET sugerido:
// /reporteria/empresas/excel?fechaInicio=2025-12-10&fechaFin=2025-12-13&empresaIds=1,2&tz=America/Mexico_City

import type { Request, Response } from 'express';
import { exportarReporteEmpresasExcel } from '../modelos/empresas-excel';

function assertYYYYMMDD(fecha: any) {
  const s = String(fecha ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error('Parámetro de fecha inválido. Usa formato YYYY-MM-DD.');
  }
  return s;
}

function parseEmpresaIds(q: any): number[] {
  let raw = q.empresaIds ?? q.empresas ?? q.empresaId;
  if (!raw) return [];
  if (Array.isArray(raw)) raw = raw.join(',');
  return String(raw)
    .split(/[,\s]+/)
    .map((s) => Number(String(s).trim()))
    .filter((n) => Number.isFinite(n));
}

function parseIntOpt(v: any): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

export class EmpresasExcelController {
  static async generar(req: Request, res: Response) {
    try {
      const tz = String(req.query.tz ?? 'America/Mexico_City').trim() || 'America/Mexico_City';

      const fechaInicioRaw = req.query.fechaInicio ?? req.query.desde ?? req.query.inicio;
      const fechaFinRaw = req.query.fechaFin ?? req.query.hasta ?? req.query.fin;

      const fechaInicio = assertYYYYMMDD(fechaInicioRaw);
      const fechaFin = assertYYYYMMDD(fechaFinRaw);

      const empresaIds = parseEmpresaIds(req.query);
      const localidadId = parseIntOpt(req.query.localidadId);

      const excel = await exportarReporteEmpresasExcel({
        fechaInicio,
        fechaFin,
        tz,
        empresaIds,
        localidadId,
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
