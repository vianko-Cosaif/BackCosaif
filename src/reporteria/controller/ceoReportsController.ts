// reporteria/controller/ceoReportsController.ts
// Controller para reportes CEO (JSON + PDF)

import type { Request, Response } from 'express';
import type { PeriodoReporte } from '../modelos/admin-model';
import { CeoCumplimientoModel } from '../modelos/ceo-cumplimiento-model';
import { CeoTraficoClienteModel } from '../modelos/ceo-trafico-cliente-model';
import { CeoTurnosModel } from '../modelos/ceo-turnos-model';
import { CeoMaquinistasModel } from '../modelos/ceo-maquinistas-model';
import { CeoComparativoModel } from '../modelos/ceo-comparativo-model';

import { exportarCumplimientoPDF } from '../modelos/ceo-cumplimiento-pdf';
import { exportarTraficoClientePDF } from '../modelos/ceo-trafico-cliente-pdf';
import { exportarTurnosPDF } from '../modelos/ceo-turnos-pdf';
import { exportarMaquinistasPDF } from '../modelos/ceo-maquinistas-pdf';
import { exportarComparativoPDF } from '../modelos/ceo-comparativo-pdf';

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

function parseFilters(req: Request) {
  const fecha = String(req.query.fecha || '').trim();
  if (!fecha) throw new Error('Falta query: fecha=YYYY-MM-DD');

  const periodo = asPeriodo(req.query.periodo);
  const tz = String(req.query.tz || MX_TZ);
  const localidadId = safeInt(req.query.localidadId);
  const empresaId = safeInt(req.query.empresaId);

  return { fecha, periodo, tz, localidadId, empresaId };
}

export class CeoReportsController {
  static async cumplimientoJSON(req: Request, res: Response) {
    try {
      const { fecha, periodo, tz, localidadId, empresaId } = parseFilters(req);
      const reporte = await CeoCumplimientoModel.reportePorPeriodo({ fecha, tz, localidadId, empresaId }, periodo);
      return res.json({ ok: true, reporte });
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e?.message ?? 'Error generando reporte' });
    }
  }

  static async cumplimientoPDF(req: Request, res: Response) {
    try {
      const { fecha, periodo, tz, localidadId, empresaId } = parseFilters(req);
      const reporte = await CeoCumplimientoModel.reportePorPeriodo({ fecha, tz, localidadId, empresaId }, periodo);
      const pdf = await exportarCumplimientoPDF(reporte);
      res.setHeader('Content-Type', pdf.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${pdf.filename}"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(pdf.buffer);
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e?.message ?? 'Error generando reporte' });
    }
  }

  static async traficoClienteJSON(req: Request, res: Response) {
    try {
      const { fecha, periodo, tz, localidadId, empresaId } = parseFilters(req);
      const reporte = await CeoTraficoClienteModel.reportePorPeriodo({ fecha, tz, localidadId, empresaId }, periodo);
      return res.json({ ok: true, reporte });
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e?.message ?? 'Error generando reporte' });
    }
  }

  static async traficoClientePDF(req: Request, res: Response) {
    try {
      const { fecha, periodo, tz, localidadId, empresaId } = parseFilters(req);
      const reporte = await CeoTraficoClienteModel.reportePorPeriodo({ fecha, tz, localidadId, empresaId }, periodo);
      const pdf = await exportarTraficoClientePDF(reporte);
      res.setHeader('Content-Type', pdf.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${pdf.filename}"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(pdf.buffer);
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e?.message ?? 'Error generando reporte' });
    }
  }

  static async turnosJSON(req: Request, res: Response) {
    try {
      const { fecha, periodo, tz, localidadId, empresaId } = parseFilters(req);
      const reporte = await CeoTurnosModel.reportePorPeriodo({ fecha, tz, localidadId, empresaId }, periodo);
      return res.json({ ok: true, reporte });
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e?.message ?? 'Error generando reporte' });
    }
  }

  static async turnosPDF(req: Request, res: Response) {
    try {
      const { fecha, periodo, tz, localidadId, empresaId } = parseFilters(req);
      const reporte = await CeoTurnosModel.reportePorPeriodo({ fecha, tz, localidadId, empresaId }, periodo);
      const pdf = await exportarTurnosPDF(reporte);
      res.setHeader('Content-Type', pdf.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${pdf.filename}"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(pdf.buffer);
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e?.message ?? 'Error generando reporte' });
    }
  }

  static async maquinistasJSON(req: Request, res: Response) {
    try {
      const { fecha, periodo, tz, localidadId, empresaId } = parseFilters(req);
      const reporte = await CeoMaquinistasModel.reportePorPeriodo({ fecha, tz, localidadId, empresaId }, periodo);
      return res.json({ ok: true, reporte });
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e?.message ?? 'Error generando reporte' });
    }
  }

  static async maquinistasPDF(req: Request, res: Response) {
    try {
      const { fecha, periodo, tz, localidadId, empresaId } = parseFilters(req);
      const reporte = await CeoMaquinistasModel.reportePorPeriodo({ fecha, tz, localidadId, empresaId }, periodo);
      const pdf = await exportarMaquinistasPDF(reporte);
      res.setHeader('Content-Type', pdf.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${pdf.filename}"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(pdf.buffer);
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e?.message ?? 'Error generando reporte' });
    }
  }

  static async comparativoJSON(req: Request, res: Response) {
    try {
      const { fecha, periodo, tz, localidadId, empresaId } = parseFilters(req);
      const reporte = await CeoComparativoModel.reportePorPeriodo({ fecha, tz, localidadId, empresaId }, periodo);
      return res.json({ ok: true, reporte });
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e?.message ?? 'Error generando reporte' });
    }
  }

  static async comparativoPDF(req: Request, res: Response) {
    try {
      const { fecha, periodo, tz, localidadId, empresaId } = parseFilters(req);
      const reporte = await CeoComparativoModel.reportePorPeriodo({ fecha, tz, localidadId, empresaId }, periodo);
      const pdf = await exportarComparativoPDF(reporte);
      res.setHeader('Content-Type', pdf.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${pdf.filename}"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(pdf.buffer);
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e?.message ?? 'Error generando reporte' });
    }
  }
}
