// reporteria/controller/coordinadorController.ts
// Controller COORDINADOR (JSON + PDF)

import type { Request, Response } from 'express';
import type { PeriodoReporte } from '../modelos/admin-model';
import { CoordinadorReporteriaModel } from '../modelos/coordinador-model';
import { exportarCoordinadorPDF } from '../modelos/coordinadorPdf';

const MX_TZ = 'America/Mexico_City';

function asPeriodo(p: any): PeriodoReporte {
  const v = String(p ?? '').toUpperCase().trim();
  const ok: PeriodoReporte[] = ['DIA', 'SEMANA', 'MES', 'BIMESTRE', 'SEMESTRE', 'ANUAL'];
  return (ok.includes(v as any) ? (v as PeriodoReporte) : 'DIA');
}

function safeInt(x: any): number | undefined {
  if (x === undefined || x === null || x === '') return undefined;
  const n = Number(x);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

export class CoordinadorReporteriaController {
  static async getJSON(req: Request, res: Response) {
    try {
      const fecha = String(req.query.fecha || '').trim();
      if (!fecha) return res.status(400).json({ ok: false, message: 'Falta query: fecha=YYYY-MM-DD' });

      const periodo = asPeriodo(req.query.periodo);
      const tz = String(req.query.tz || MX_TZ);
      const localidadId = safeInt(req.query.localidadId);
      const empresaId = safeInt(req.query.empresaId);

      const reporte = await CoordinadorReporteriaModel.reportePorPeriodo(
        { fecha, tz, localidadId, empresaId },
        periodo
      );

      return res.json({ ok: true, reporte });
    } catch (e: any) {
      return res.status(500).json({ ok: false, message: e?.message ?? 'Error generando reporte' });
    }
  }

  static async getPDF(req: Request, res: Response) {
    try {
      const fecha = String(req.query.fecha || '').trim();
      if (!fecha) return res.status(400).json({ ok: false, message: 'Falta query: fecha=YYYY-MM-DD' });

      const periodo = asPeriodo(req.query.periodo);
      const tz = String(req.query.tz || MX_TZ);
      const localidadId = safeInt(req.query.localidadId);
      const empresaId = safeInt(req.query.empresaId);

      const reporte = await CoordinadorReporteriaModel.reportePorPeriodo(
        { fecha, tz, localidadId, empresaId },
        periodo
      );

      const pdf = await exportarCoordinadorPDF(reporte);

      res.setHeader('Content-Type', pdf.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${pdf.filename}"`);
      res.setHeader('Cache-Control', 'no-store');

      return res.status(200).send(pdf.buffer);
    } catch (e: any) {
      return res.status(500).json({ ok: false, message: e?.message ?? 'Error generando PDF' });
    }
  }
}
