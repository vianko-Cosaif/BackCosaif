// reporteria/controller/bonosExcel.ts
// Controller: genera Excel de bonos por locomotora
// GET sugerido:
// /reporterias/bonos/excel?periodo=DIA&fecha=2026-02-26&tz=America/Mexico_City

import type { Request, Response } from 'express';
import { exportarReporteBonosExcel } from '../modelos/bonos-excel';

function assertYYYYMMDD(fecha: any) {
  const s = String(fecha ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error('Parametro de fecha invalido. Usa formato YYYY-MM-DD.');
  }
  return s;
}

function parsePeriodo(input: any) {
  const s = String(input ?? '').trim().toUpperCase();
  switch (s) {
    case 'DIA':
    case 'DAY':
      return 'DIA';
    case 'SEMANA':
    case 'WEEK':
      return 'SEMANA';
    case 'QUINCENA':
      return 'QUINCENA';
    case 'MES':
    case 'MONTH':
      return 'MES';
    case 'BIMESTRE':
      return 'BIMESTRE';
    case 'SEMESTRE':
      return 'SEMESTRE';
    case 'ANUAL':
    case 'ANIO':
    case 'AÑO':
      return 'ANUAL';
    default:
      throw new Error('Periodo invalido. Usa DIA, SEMANA, QUINCENA, MES, BIMESTRE, SEMESTRE o ANUAL.');
  }
}

export class BonosExcelController {
  static async generar(req: Request, res: Response) {
    try {
      const tz = String(req.query.tz ?? 'America/Mexico_City').trim() || 'America/Mexico_City';

      const fechaRaw = req.query.fecha ?? req.query.dia ?? req.query.fechaInicio ?? req.query.desde;
      const periodoRaw = req.query.periodo ?? req.query.periodoReporte ?? req.query.tipo;

      const fecha = assertYYYYMMDD(fechaRaw);
      const periodo = parsePeriodo(periodoRaw ?? 'DIA');

      const excel = await exportarReporteBonosExcel({
        fecha,
        periodo,
        tz,
      });

      res.setHeader('Content-Type', excel.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${excel.filename}"`);
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.setHeader('X-Reporteria-TZ', tz);

      return res.status(200).send(excel.buffer);
    } catch (err: any) {
      const msg = err?.message ? String(err.message) : 'Error generando Excel';

      if (msg.includes('Fecha') || msg.includes('Periodo')) {
        return res.status(400).json({ ok: false, error: msg });
      }

      return res.status(500).json({ ok: false, error: 'No se pudo generar el Excel', detail: msg });
    }
  }
}
