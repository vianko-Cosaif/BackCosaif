// reporteria/controller/empresaLocomotorasController.ts

import type { Request, Response } from 'express';
import { EmpresaLocomotorasModel } from '../modelos/empresa-locomotoras-model';
import { exportarEmpresaLocomotorasPDF } from '../modelos/empresa-locomotoras-pdf';

const MX_TZ = 'America/Mexico_City';

function safeInt(x: any): number | undefined {
  if (x === undefined || x === null || x === '') return undefined;
  const n = Number(x);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

export class EmpresaLocomotorasController {
  static async getJSON(req: Request, res: Response) {
    try {
      const empresaId = safeInt(req.query.empresaId);
      const desde = String(req.query.desde || '').trim();
      const hasta = String(req.query.hasta || '').trim();
      if (!empresaId) return res.status(400).json({ ok: false, message: 'Falta query: empresaId' });
      if (!desde || !hasta) return res.status(400).json({ ok: false, message: 'Falta query: desde y hasta (YYYY-MM-DD)' });

      const tz = String(req.query.tz || MX_TZ);
      const localidadId = safeInt(req.query.localidadId);

      const reporte = await EmpresaLocomotorasModel.reporte({ empresaId, desde, hasta, tz, localidadId });
      return res.json({ ok: true, reporte });
    } catch (e: any) {
      return res.status(500).json({ ok: false, message: e?.message ?? 'Error generando reporte' });
    }
  }

  static async getPDF(req: Request, res: Response) {
    try {
      const empresaId = safeInt(req.query.empresaId);
      const desde = String(req.query.desde || '').trim();
      const hasta = String(req.query.hasta || '').trim();
      if (!empresaId) return res.status(400).json({ ok: false, message: 'Falta query: empresaId' });
      if (!desde || !hasta) return res.status(400).json({ ok: false, message: 'Falta query: desde y hasta (YYYY-MM-DD)' });

      const tz = String(req.query.tz || MX_TZ);
      const localidadId = safeInt(req.query.localidadId);

      const reporte = await EmpresaLocomotorasModel.reporte({ empresaId, desde, hasta, tz, localidadId });
      const pdf = await exportarEmpresaLocomotorasPDF(reporte);

      res.setHeader('Content-Type', pdf.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${pdf.filename}"`);
      res.setHeader('Cache-Control', 'no-store');

      return res.status(200).send(pdf.buffer);
    } catch (e: any) {
      return res.status(500).json({ ok: false, message: e?.message ?? 'Error generando PDF' });
    }
  }
}
