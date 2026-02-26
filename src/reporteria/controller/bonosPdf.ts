// reporteria/controller/bonosPdf.ts
// Controller: genera PDF de bonos por locomotora
// GET sugerido:
// /reporteria/bonos/pdf?periodo=DIA&fecha=2026-02-26&tz=America/Mexico_City

import type { Request, Response } from 'express';
import { BonosReporteriaModel, type PeriodoReporte } from '../modelos/bonos-model';
import { exportarReporteBonosPDF } from '../modelos/bonos-pdf';

function assertYYYYMMDD(fecha: any) {
  const s = String(fecha ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error('Parametro de fecha invalido. Usa formato YYYY-MM-DD.');
  }
  return s;
}

function parsePeriodo(input: any): PeriodoReporte {
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

export class BonosPdfController {
  static async generar(req: Request, res: Response) {
    try {
      const tz = String(req.query.tz ?? 'America/Mexico_City').trim() || 'America/Mexico_City';

      const fechaRaw = req.query.fecha ?? req.query.dia ?? req.query.fechaInicio ?? req.query.desde;
      const periodoRaw = req.query.periodo ?? req.query.periodoReporte ?? req.query.tipo;

      const fecha = assertYYYYMMDD(fechaRaw);
      const periodo = parsePeriodo(periodoRaw ?? 'DIA');

      const reporte = await BonosReporteriaModel.reportePorPeriodo({
        fecha,
        periodo,
        tz,
      });

      const pdf = await exportarReporteBonosPDF(reporte);

      res.setHeader('Content-Type', pdf.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.setHeader('X-Reporteria-TZ', tz);

      return res.status(200).send(pdf.buffer);
    } catch (err: any) {
      const msg = err?.message ? String(err.message) : 'Error generando PDF';

      if (msg.includes('Fecha') || msg.includes('Periodo')) {
        return res.status(400).json({ ok: false, error: msg });
      }

      return res.status(500).json({ ok: false, error: 'No se pudo generar el PDF', detail: msg });
    }
  }
}
