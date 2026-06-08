// reporteria/controller/clienteCargaOperativaController.ts

import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../../types/auth';
import {
  ClienteCargaOperativaModel,
  normalizarPeriodoCarga,
} from '../modelos/cliente-carga-operativa-model';
import { exportarClienteCargaOperativaPDF } from '../modelos/cliente-carga-operativa-pdf';

const MX_TZ = 'America/Mexico_City';

function safeInt(x: any): number | undefined {
  if (x === undefined || x === null || x === '') return undefined;
  const n = Number(x);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function getAuthUser(req: Request): AuthenticatedUser | undefined {
  return req.user as AuthenticatedUser | undefined;
}

function resolveEmpresaId(req: Request) {
  const user = getAuthUser(req);
  const role = String(user?.rol ?? '').toUpperCase();
  const requestedEmpresaId = safeInt(req.query.empresaId);

  if (role === 'ADMINISTRADOR') {
    if (!requestedEmpresaId) throw new Error('Falta query: empresaId');
    return requestedEmpresaId;
  }

  const ownEmpresaId = user?.empresa?.id;
  if (!ownEmpresaId) throw new Error('Usuario sin empresa asignada');
  if (requestedEmpresaId && requestedEmpresaId !== ownEmpresaId) {
    const err = new Error('No autorizado para consultar otra empresa');
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return ownEmpresaId;
}

function parseFilters(req: Request) {
  const fecha = String(req.query.fecha || '').trim();
  if (!fecha) throw new Error('Falta query: fecha=YYYY-MM-DD');

  const periodo = normalizarPeriodoCarga(req.query.periodo);
  const tz = String(req.query.tz || MX_TZ);
  const localidadId = safeInt(req.query.localidadId);
  const detalleLimit = safeInt(req.query.detalleLimit);
  const empresaId = resolveEmpresaId(req);

  return { fecha, periodo, tz, localidadId, empresaId, detalleLimit };
}

export class ClienteCargaOperativaController {
  static async getJSON(req: Request, res: Response) {
    try {
      const filters = parseFilters(req);
      const reporte = await ClienteCargaOperativaModel.reporte(filters);
      return res.json({ ok: true, reporte });
    } catch (e: any) {
      return res.status(e?.status ?? 400).json({ ok: false, message: e?.message ?? 'Error generando reporte' });
    }
  }

  static async getPDF(req: Request, res: Response) {
    try {
      const filters = parseFilters(req);
      const reporte = await ClienteCargaOperativaModel.reporte(filters);
      const pdf = await exportarClienteCargaOperativaPDF(reporte);

      res.setHeader('Content-Type', pdf.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${pdf.filename}"`);
      res.setHeader('Cache-Control', 'no-store');

      return res.status(200).send(pdf.buffer);
    } catch (e: any) {
      return res.status(e?.status ?? 400).json({ ok: false, message: e?.message ?? 'Error generando PDF' });
    }
  }
}
