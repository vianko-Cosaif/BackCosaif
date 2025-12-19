// reporteria/controller/movimeintoPdf.ts
// Controller: genera PDF (Puppeteer + Chart.js) para reportes de movimientos
//
// GET sugerido:
// /reporteria/movimientos/pdf?periodo=dia&fecha=2025-12-19&localidadId=1&empresaId=2&tz=America/Mexico_City
//
// Nota: hoy SOLO queda completo "dia" porque en el model ahorita existe reporteDia().
// Mes/bimestre/semestre/anual los dejamos listos para conectar cuando metas esos métodos al model.

import type { Request, Response } from 'express';
import { ReporteriaMovimientoModel } from '../modelos/reporteriaMovimiento-model';
import {
  exportarReporteMovimientoPDF,
  type ReporteBase,
} from '../modelos/reporteriaMovimiento-pdf';

type Periodo = 'dia' | 'mes' | 'bimestre' | 'semestre' | 'anual';

function parseIntOpt(v: any): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function pickPeriodo(q: any): Periodo {
  const raw = String(q ?? 'dia').toLowerCase().trim();

  // aliases por si alguien escribe raro:
  if (raw === 'diario' || raw === 'día' || raw === 'day') return 'dia';
  if (raw === 'mensual' || raw === 'month') return 'mes';
  if (raw === 'bi' || raw === 'bim' || raw === 'bimestral') return 'bimestre';
  if (raw === 'semi' || raw === 'semestral') return 'semestre';
  if (raw === 'year' || raw === 'anual' || raw === 'año') return 'anual';

  if (raw === 'dia' || raw === 'mes' || raw === 'bimestre‘' || raw === 'semestre' || raw === 'anual') {
    // ojo: el bimestre‘ con comilla rara no debería existir, pero ya sabes cómo es la vida.
  }

  if (raw === 'dia' || raw === 'mes' || raw === 'bimestre' || raw === 'semestre' || raw === 'anual') return raw as Periodo;

  return 'dia';
}

function assertYYYYMMDD(fecha: any) {
  const s = String(fecha ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error('Parámetro "fecha" inválido. Usa formato YYYY-MM-DD (día en México).');
  }
  return s;
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

      // 1) Obtener reporte (data) desde el model
      let base: ReporteBase;

      if (periodo === 'dia') {
        const fecha = assertYYYYMMDD(req.query.fecha);

        const reporteDia = await ReporteriaMovimientoModel.reporteDia({
          fecha,
          tz,
          localidadId,
          empresaId,
        });

        // Convertimos a ReporteBase (sin campos extra para que TS no se ponga mamón)
        base = {
          meta: {
            fechaLocal: reporteDia.meta.fechaLocal,
            etiqueta: `Movimientos ${reporteDia.meta.fechaLocal}`,
            periodo: 'Día',
            tz: reporteDia.meta.tz,
            rangoUTC: reporteDia.meta.rangoUTC,
          },
          resumen: {
            totalMovimientos: reporteDia.resumen.totalMovimientos,
            movimientosPorEstado: reporteDia.resumen.movimientosPorEstado,
            totalIncidentes: reporteDia.resumen.totalIncidentes,
            incidentesPorEstado: reporteDia.resumen.incidentesPorEstado,
            porEmpresa: (reporteDia.resumen.porEmpresa ?? []).map((e) => ({
              empresaId: e.empresaId,
              empresa: e.empresa,
              totalMovimientos: e.totalMovimientos,
              movimientosPorEstado: e.movimientosPorEstado,
              totalIncidentes: e.totalIncidentes,
              incidentesPorEstado: e.incidentesPorEstado,
            })),
          },
        };
      } else {
        // Aquí conectas cuando existan:
        // - ReporteriaMovimientoModel.reporteMes(...)
        // - ReporteriaMovimientoModel.reporteBimestre(...)
        // - ReporteriaMovimientoModel.reporteSemestre(...)
        // - ReporteriaMovimientoModel.reporteAnual(...)
        return res.status(501).json({
          ok: false,
          error: `Periodo "${periodo}" aún no está implementado en el model. Hoy solo existe "dia".`,
          hint: 'Implementa los métodos del model y aquí se conectan en 2 líneas.',
        });
      }

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
        msg.includes('Fecha inválida')
      ) {
        return res.status(400).json({ ok: false, error: msg });
      }

      // Todo lo demás -> 500
      // (sí, aquí es donde se esconden los gremlins)
      return res.status(500).json({
        ok: false,
        error: 'No se pudo generar el PDF',
        detail: msg,
      });
    }
  }
}
