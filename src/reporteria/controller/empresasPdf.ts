// reporteria/controller/empresasPdf.ts
// Controller: genera PDF por empresa
// GET sugerido:
// /reporteria/empresas/pdf?fechaInicio=2025-12-10&fechaFin=2025-12-13&empresaIds=1,2&tz=America/Mexico_City

import type { Request, Response } from 'express';
import { EmpresasReporteriaModel } from '../modelos/empresas-model';
import { exportarReporteEmpresasPDF } from '../modelos/empresas-pdf';

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

export class EmpresasPdfController {
  static async generar(req: Request, res: Response) {
    try {
      const tz = String(req.query.tz ?? 'America/Mexico_City').trim() || 'America/Mexico_City';

      const fechaInicioRaw = req.query.fechaInicio ?? req.query.desde ?? req.query.inicio;
      const fechaFinRaw = req.query.fechaFin ?? req.query.hasta ?? req.query.fin;

      const fechaInicio = assertYYYYMMDD(fechaInicioRaw);
      const fechaFin = assertYYYYMMDD(fechaFinRaw);

      const empresaIds = parseEmpresaIds(req.query);
      const localidadId = parseIntOpt(req.query.localidadId);

      const reporte = await EmpresasReporteriaModel.reportePorFechas({
        fechaInicio,
        fechaFin,
        tz,
        empresaIds,
        localidadId,
      });

      const pdf = await exportarReporteEmpresasPDF(reporte);

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
