// reporteria/controller/empresaLocomotorasExcel.ts

import type { Request, Response } from 'express';
import { exportarEmpresaLocomotorasExcel, exportarEmpresaLocomotorasUsuarioExcel } from '../modelos/empresa-locomotoras-excel';

const MX_TZ = 'America/Mexico_City';

function safeInt(x: any): number | undefined {
  if (x === undefined || x === null || x === '') return undefined;
  const n = Number(x);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function assertFechaInput(fecha: any) {
  const s = String(fecha ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?$/.test(s)) {
    throw new Error('Parámetro de fecha inválido. Usa formato YYYY-MM-DD o YYYY-MM-DDTHH:mm.');
  }
  return s;
}

function boolQuery(x: any) {
  return ['1', 'true', 'si', 'sí', 'yes'].includes(String(x ?? '').trim().toLowerCase());
}

export class EmpresaLocomotorasExcelController {
  static async generar(req: Request, res: Response) {
    try {
      const empresaId = safeInt(req.query.empresaId);
      if (!empresaId) return res.status(400).json({ ok: false, error: 'Falta query: empresaId' });

      const desde = assertFechaInput(req.query.desde ?? req.query.fechaInicio ?? req.query.inicio);
      const hasta = assertFechaInput(req.query.hasta ?? req.query.fechaFin ?? req.query.fin);
      const tz = String(req.query.tz || MX_TZ);
      const localidadId = safeInt(req.query.localidadId);
      const usuarioNombre = String(req.query.usuarioNombre ?? req.query.usuario ?? '').trim() || undefined;
      const soloUsuario = boolQuery(req.query.soloUsuario ?? req.query.usuarioSolo);

      const filters = {
        empresaId,
        desde,
        hasta,
        tz,
        localidadId,
        usuarioNombre,
      };

      const excel = soloUsuario
        ? await exportarEmpresaLocomotorasUsuarioExcel(filters)
        : await exportarEmpresaLocomotorasExcel(filters);

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
