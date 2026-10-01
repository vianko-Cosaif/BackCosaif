import type { Request, Response } from 'express';
import { parseComercialFilters } from './comercialController';
import {
  exportarComercialExcel,
  type ComercialExcelCharts,
  type ComercialExcelColumns,
  type ComercialExcelSections,
} from '../modelos/comercial-excel';

const DEFAULT_SECTIONS: ComercialExcelSections = {
  resumen: true,
  movimientos: true,
  empresas: true,
  locomotoras: true,
  incidentes: true,
  torno: true,
  lavado: true,
};

const DEFAULT_CHARTS: ComercialExcelCharts = {
  estados: true,
  tendencia: true,
  servicios: true,
  empresas: true,
};

function booleanOptions<T extends Record<string, boolean>>(source: unknown, defaults: T): T {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return defaults;
  const record = source as Record<string, unknown>;
  return Object.keys(defaults).reduce((result, key) => {
    result[key as keyof T] = typeof record[key] === 'boolean' ? record[key] as T[keyof T] : defaults[key as keyof T];
    return result;
  }, { ...defaults });
}

function columnOptions(source: unknown): ComercialExcelColumns | undefined {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return undefined;
  const result: ComercialExcelColumns = {};
  for (const [section, fields] of Object.entries(source as Record<string, unknown>)) {
    if (!Array.isArray(fields)) continue;
    result[section as keyof ComercialExcelSections] = fields
      .filter((field): field is string => typeof field === 'string')
      .map((field) => field.trim())
      .filter(Boolean)
      .slice(0, 40);
  }
  return result;
}

export class ComercialExcelController {
  static async generar(req: Request, res: Response) {
    try {
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? req.body as Record<string, unknown>
        : {};
      const filtersSource = body.filters && typeof body.filters === 'object' && !Array.isArray(body.filters)
        ? body.filters as Record<string, unknown>
        : body;
      const filters = parseComercialFilters(filtersSource);
      const sections = booleanOptions(body.sections, DEFAULT_SECTIONS);
      const charts = booleanOptions(body.charts, DEFAULT_CHARTS);
      const columns = columnOptions(body.columns);
      if (!Object.values(sections).some(Boolean) && !Object.values(charts).some(Boolean)) {
        return res.status(400).json({ ok: false, error: 'Selecciona al menos una hoja o gráfica' });
      }

      const excel = await exportarComercialExcel(filters, {
        titulo: typeof body.titulo === 'string' ? body.titulo.slice(0, 120) : undefined,
        sections,
        charts,
        columns,
      });
      res.setHeader('Content-Type', excel.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${excel.filename}"`);
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      return res.status(200).send(excel.buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo generar el Excel comercial';
      const status = /inválid|entero positivo|YYYY-MM-DD|Selecciona/i.test(message) ? 400 : 500;
      return res.status(status).json({ ok: false, error: message });
    }
  }
}
