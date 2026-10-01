import type { Request, Response } from 'express';
import {
  ComercialReporteriaModel,
  type ComercialFilters,
  type PeriodoComercial,
} from '../modelos/comercial-model';

const PERIODOS = new Set<PeriodoComercial>(['SEMANA', 'MES', 'ANUAL']);
const MX_TZ = 'America/Mexico_City';

function requiredDate(value: unknown) {
  const date = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Fecha inválida. Usa YYYY-MM-DD');
  return date;
}

function optionalPositiveInt(value: unknown, field: string) {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(`${field} debe ser un entero positivo`);
  return number;
}

export function parseComercialFilters(source: Record<string, unknown>): ComercialFilters {
  const periodoRaw = String(source.periodo || 'MES').trim().toUpperCase() as PeriodoComercial;
  if (!PERIODOS.has(periodoRaw)) throw new Error('Periodo inválido. Usa SEMANA, MES o ANUAL');

  return {
    fecha: requiredDate(source.fecha),
    periodo: periodoRaw,
    tz: String(source.tz || MX_TZ).trim() || MX_TZ,
    empresaId: optionalPositiveInt(source.empresaId, 'empresaId'),
    localidadId: optionalPositiveInt(source.localidadId, 'localidadId'),
    locomotiveNumber: optionalPositiveInt(source.locomotiveNumber, 'locomotiveNumber'),
  };
}

export class ComercialReporteriaController {
  static async getJSON(req: Request, res: Response) {
    try {
      const filters = parseComercialFilters(req.query as Record<string, unknown>);
      const reporte = await ComercialReporteriaModel.generar(filters);
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ ok: true, reporte });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo generar la reportería comercial';
      const status = /inválid|entero positivo|YYYY-MM-DD/i.test(message) ? 400 : 500;
      return res.status(status).json({ ok: false, error: message });
    }
  }
}
