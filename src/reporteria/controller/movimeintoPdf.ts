// reporteria/controller/movimeintoPdf.ts
// Controller: genera PDF (Puppeteer + SVG embebido) para reportes de movimientos
//
// GET sugerido:
// /reporteria/movimientos/pdf?periodo=dia&fecha=2025-12-19&localidadId=1&empresaId=2&tz=America/Mexico_City
//
// periodos soportados:
// - dia | semana | mes | bimestre | semestre | anual
//
// Nota:
// - El model ya expone: reporteDia, reporteSemana, reporteMes, reporteBimestre, reporteSemestre, reporteAnual
// - Aquí solo enruta al método correcto y convierte a ReporteBase para el generador PDF.

import type { Request, Response } from 'express';
import { ReporteriaMovimientoModel } from '../modelos/reporteriaMovimiento-model';
import {
  exportarReporteMovimientoPDF,
  type ReporteBase,
} from '../modelos/reporteriaMovimiento-pdf';

type Periodo = 'dia' | 'semana' | 'mes' | 'bimestre' | 'semestre' | 'anual';

function parseIntOpt(v: any): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function pickPeriodo(q: any): Periodo {
  const raw = String(q ?? 'dia').toLowerCase().trim();

  // aliases por si alguien escribe raro:
  if (raw === 'diario' || raw === 'día' || raw === 'day') return 'dia';

  if (raw === 'semana' || raw === 'weekly' || raw === 'week' || raw === 'semanal') return 'semana';

  if (raw === 'mensual' || raw === 'month') return 'mes';

  if (raw === 'bi' || raw === 'bim' || raw === 'bimestral') return 'bimestre';

  if (raw === 'semi' || raw === 'semestral') return 'semestre';

  if (raw === 'year' || raw === 'anual' || raw === 'año') return 'anual';

  // typo common: comilla rara
  if (raw === 'bimestre‘') return 'bimestre';

  if (
    raw === 'dia' ||
    raw === 'semana' ||
    raw === 'mes' ||
    raw === 'bimestre' ||
    raw === 'semestre' ||
    raw === 'anual'
  ) return raw as Periodo;

  return 'dia';
}

function assertYYYYMMDD(fecha: any) {
  const s = String(fecha ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error('Parámetro "fecha" inválido. Usa formato YYYY-MM-DD (día en México).');
  }
  return s;
}

function periodoLabel(periodo: Periodo) {
  switch (periodo) {
    case 'dia':
      return 'Día';
    case 'semana':
      return 'Semana';
    case 'mes':
      return 'Mes';
    case 'bimestre':
      return 'Bimestre';
    case 'semestre':
      return 'Semestre';
    case 'anual':
      return 'Año';
    default:
      return 'Periodo';
  }
}

function toReporteBase(r: any, periodo: Periodo): ReporteBase {
  return {
    meta: {
      fechaLocal: r.meta.fechaLocal,
      etiqueta: `Movimientos ${r.meta.etiqueta ?? r.meta.fechaLocal ?? ''}`.trim(),
      periodo: periodoLabel(periodo),
      tz: r.meta.tz,
      // ojo: el PDF tú lo vas a mostrar en MX, pero el model trae ambos rangos.
      // El generador PDF puede usar rangoLocal si lo soportas; aquí mantenemos contrato con ReporteBase.
      rangoUTC: r.meta.rangoUTC,
    },
    resumen: {
      totalMovimientos: r.resumen.totalMovimientos,
      movimientosPorEstado: r.resumen.movimientosPorEstado,
      totalIncidentes: r.resumen.totalIncidentes,
      incidentesPorEstado: r.resumen.incidentesPorEstado,
      porEmpresa: (r.resumen.porEmpresa ?? []).map((e: any) => ({
        empresaId: e.empresaId,
        empresa: e.empresa,
        totalMovimientos: e.totalMovimientos,
        movimientosPorEstado: e.movimientosPorEstado,
        totalIncidentes: e.totalIncidentes,
        incidentesPorEstado: e.incidentesPorEstado,
      })),
    },
  };
}

export class MovimientoPdfController {
  /**
   * Genera PDF del periodo pedido.
   */
  static async generar(req: Request, res: Response) {
    try {
      const periodo = pickPeriodo(req.query.periodo);
      const tz = String(req.query.tz ?? 'America/Mexico_City').trim() || 'America/Mexico_City';

      const localidadId = parseIntOpt(req.query.localidadId);
      const empresaId = parseIntOpt(req.query.empresaId);
      const fecha = assertYYYYMMDD(req.query.fecha);

      // 1) Obtener reporte (data) desde el model
      let reporte: any;

      switch (periodo) {
        case 'dia':
          reporte = await ReporteriaMovimientoModel.reporteDia({ fecha, tz, localidadId, empresaId });
          break;

        case 'semana':
          reporte = await ReporteriaMovimientoModel.reporteSemana({ fecha, tz, localidadId, empresaId });
          break;

        case 'mes':
          reporte = await ReporteriaMovimientoModel.reporteMes({ fecha, tz, localidadId, empresaId });
          break;

        case 'bimestre':
          reporte = await ReporteriaMovimientoModel.reporteBimestre({ fecha, tz, localidadId, empresaId });
          break;

        case 'semestre':
          reporte = await ReporteriaMovimientoModel.reporteSemestre({ fecha, tz, localidadId, empresaId });
          break;

        case 'anual':
          reporte = await ReporteriaMovimientoModel.reporteAnual({ fecha, tz, localidadId, empresaId });
          break;

        default:
          // pickPeriodo ya lo limita, pero por si el universo se pone creativo:
          reporte = await ReporteriaMovimientoModel.reporteDia({ fecha, tz, localidadId, empresaId });
          break;
      }

      const base: ReporteBase = toReporteBase(reporte, periodo);

      // 2) Exportar a PDF
      const pdf = await exportarReporteMovimientoPDF(base);

      // 3) Responder al cliente
      res.setHeader('Content-Type', pdf.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.setHeader('X-Reporteria-Periodo', periodo);
      res.setHeader('X-Reporteria-TZ', tz);

      return res.status(200).send(pdf.buffer);
    } catch (err: any) {
      const msg = err?.message ? String(err.message) : 'Error generando PDF';

      // Validaciones -> 400
      if (
        msg.includes('Parámetro "fecha" inválido') ||
        msg.includes('Fecha inválida') ||
        msg.includes('usa YYYY-MM-DD')
      ) {
        return res.status(400).json({ ok: false, error: msg });
      }

      // Todo lo demás -> 500
      return res.status(500).json({
        ok: false,
        error: 'No se pudo generar el PDF',
        detail: msg,
      });
    }
  }
}
