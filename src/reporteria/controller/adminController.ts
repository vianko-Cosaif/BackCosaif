// reporteria/controladores/admin-controller.ts
//
// Controller ADMIN para:
// - JSON (para debug o frontend)
// - PDF (CEO / auditoría)
//
// Reglas incorporadas:
// - Rangos de ejecución: 0–9, 10–89, 90+ min (inicio→fin).
// - Críticos: <2 min y 90+ min.
// - Supervisor/Coordinador: por token más nuevo al cierre si no viene en movimiento.
//
// NOTA: este controller asume que:
// - Ya existe AdminReporteriaModel (admin-model.ts) con reportePorPeriodo.
// - Ya existe exportarAdminPDF (adminPdf.ts) que recibe el reporte listo para render.
//
// Ajusta los imports si tu estructura real difiere.

import type { Request, Response } from 'express';
import { AdminReporteriaModel, type PeriodoReporte } from '../modelos/admin-model';
import { exportarAdminPDF, type AdminReporteBase } from '../modelos/adminPdf';

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

export class AdminReporteriaController {
  /**
   * GET /reporteria/admin
   * Query:
   * - fecha=YYYY-MM-DD
   * - periodo=DIA|SEMANA|MES|BIMESTRE|SEMESTRE|ANUAL
   * - tz=America/Mexico_City (opcional)
   * - localidadId, empresaId (opcionales)
   */
  static async getJSON(req: Request, res: Response) {
    try {
      const fecha = String(req.query.fecha || '').trim();
      if (!fecha) return res.status(400).json({ ok: false, message: 'Falta query: fecha=YYYY-MM-DD' });

      const periodo = asPeriodo(req.query.periodo);
      const tz = String(req.query.tz || MX_TZ);

      const localidadId = safeInt(req.query.localidadId);
      const empresaId = safeInt(req.query.empresaId);

      const reporte = await AdminReporteriaModel.reportePorPeriodo(
        { fecha, tz, localidadId, empresaId },
        periodo
      );

      return res.json({ ok: true, reporte });
    } catch (e: any) {
      return res.status(500).json({ ok: false, message: e?.message ?? 'Error generando reporte' });
    }
  }

  /**
   * GET /reporteria/admin/pdf
   * Igual que JSON, pero responde PDF
   */
  static async getPDF(req: Request, res: Response) {
    try {
      const fecha = String(req.query.fecha || '').trim();
      if (!fecha) return res.status(400).json({ ok: false, message: 'Falta query: fecha=YYYY-MM-DD' });

      const periodo = asPeriodo(req.query.periodo);
      const tz = String(req.query.tz || MX_TZ);

      const localidadId = safeInt(req.query.localidadId);
      const empresaId = safeInt(req.query.empresaId);

      const reporte = await AdminReporteriaModel.reportePorPeriodo(
        { fecha, tz, localidadId, empresaId },
        periodo
      );

      const pdf = await exportarAdminPDF(reporte as AdminReporteBase);

      res.setHeader('Content-Type', pdf.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${pdf.filename}"`);
      res.setHeader('Cache-Control', 'no-store');

      return res.status(200).send(pdf.buffer);
    } catch (e: any) {
      return res.status(500).json({ ok: false, message: e?.message ?? 'Error generando PDF' });
    }
  }
}
