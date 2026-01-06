// reporteria/controller/movimientoExcel.ts
// Controller: genera EXCEL (.xlsx) desde plantilla para reportes de movimientos
//
// GET sugerido:
// /reporteria/movimientos/excel?periodo=dia&fecha=2025-12-19&localidadId=1&empresaId=2&tz=America/Mexico_City
//
// periodos soportados:
// - dia | semana | mes | bimestre | semestre | anual
//
// Nota:
// - El model ya expone: reportePorPeriodo
// - Aquí solo valida params, enruta y devuelve el archivo .xlsx

import type { Request, Response } from 'express';
import { exportarReporteMovimientoExcel } from '../modelos/reporteriaMovimiento-excel';

type Periodo = 'dia' | 'semana' | 'mes' | 'bimestre' | 'semestre' | 'anual';

function parseIntOpt(v: any): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function pickPeriodo(q: any): Periodo {
  const raw = String(q ?? 'dia').toLowerCase().trim();

  if (raw === 'diario' || raw === 'día' || raw === 'day') return 'dia';
  if (raw === 'semana' || raw === 'weekly' || raw === 'week' || raw === 'semanal') return 'semana';
  if (raw === 'mensual' || raw === 'month') return 'mes';
  if (raw === 'bi' || raw === 'bim' || raw === 'bimestral' || raw === 'bimestre‘') return 'bimestre';
  if (raw === 'semi' || raw === 'semestral') return 'semestre';
  if (raw === 'year' || raw === 'anual' || raw === 'año') return 'anual';

  if (
    raw === 'dia' ||
    raw === 'semana' ||
    raw === 'mes' ||
    raw === 'bimestre' ||
    raw === 'semestre' ||
    raw === 'anual'
  ) {
    return raw as Periodo;
  }

  return 'dia';
}

function assertYYYYMMDD(fecha: any) {
  const s = String(fecha ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error('Parámetro "fecha" inválido. Usa formato YYYY-MM-DD (día en México).');
  }
  return s;
}

export class MovimientoExcelController {
  /**
   * Genera Excel del periodo pedido.
   */
  static async generar(req: Request, res: Response) {
    try {
      const periodo = pickPeriodo(req.query.periodo);
      const tz = String(req.query.tz ?? 'America/Mexico_City').trim() || 'America/Mexico_City';

      const fecha = assertYYYYMMDD(req.query.fecha);
      const localidadId = parseIntOpt(req.query.localidadId);
      const empresaId = parseIntOpt(req.query.empresaId);

      // 1) Exportar Excel (model + plantilla)
      const excel = await exportarReporteMovimientoExcel({
        periodo,
        fecha,
        tz,
        localidadId,
        empresaId,
      });

      // 2) Respuesta
      res.setHeader('Content-Type', excel.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${excel.filename}"`);
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.setHeader('X-Reporteria-Periodo', periodo);
      res.setHeader('X-Reporteria-TZ', tz);

      return res.status(200).send(excel.buffer);
    } catch (err: any) {
      const msg = err?.message ? String(err.message) : 'Error generando Excel';

      // Validaciones -> 400
      if (
        msg.includes('Parámetro "fecha" inválido') ||
        msg.includes('Fecha inválida') ||
        msg.includes('YYYY-MM-DD')
      ) {
        return res.status(400).json({ ok: false, error: msg });
      }

      // Todo lo demás -> 500
      return res.status(500).json({
        ok: false,
        error: 'No se pudo generar el Excel',
        detail: msg,
      });
    }
  }
}
