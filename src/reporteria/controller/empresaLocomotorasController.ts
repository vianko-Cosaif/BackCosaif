// reporteria/controller/empresaLocomotorasController.ts

import type { Request, Response } from 'express';
import { EmpresaLocomotorasModel } from '../modelos/empresa-locomotoras-model';
import { exportarEmpresaLocomotorasPDF, exportarEmpresaLocomotorasUsuarioPDF } from '../modelos/empresa-locomotoras-pdf';

const MX_TZ = 'America/Mexico_City';

function safeInt(x: any): number | undefined {
  if (x === undefined || x === null || x === '') return undefined;
  const n = Number(x);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function boolQuery(x: any) {
  return ['1', 'true', 'si', 'sí', 'yes'].includes(String(x ?? '').trim().toLowerCase());
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
      const usuarioNombre = String(req.query.usuarioNombre ?? req.query.usuario ?? '').trim() || undefined;

      const reporte = await EmpresaLocomotorasModel.reporte({ empresaId, desde, hasta, tz, localidadId, usuarioNombre });
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
      const usuarioNombre = String(req.query.usuarioNombre ?? req.query.usuario ?? '').trim() || undefined;
      const soloUsuario = boolQuery(req.query.soloUsuario ?? req.query.usuarioSolo);

      const reporte = await EmpresaLocomotorasModel.reporte({ empresaId, desde, hasta, tz, localidadId, usuarioNombre });
      const pdf = soloUsuario
        ? await exportarEmpresaLocomotorasUsuarioPDF(reporte)
        : await exportarEmpresaLocomotorasPDF(reporte);

      res.setHeader('Content-Type', pdf.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${pdf.filename}"`);
      res.setHeader('Cache-Control', 'no-store');

      return res.status(200).send(pdf.buffer);
    } catch (e: any) {
      return res.status(500).json({ ok: false, message: e?.message ?? 'Error generando PDF' });
    }
  }
}
