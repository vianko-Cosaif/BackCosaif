// reporteria/controller/clienteReportesOperativosController.ts

import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../../types/auth';
import { normalizarPeriodoCarga } from '../modelos/cliente-carga-operativa-model';
import { ClienteReportesOperativosModel } from '../modelos/cliente-reportes-operativos-model';
import {
  exportarClienteCronologiaPDF,
  exportarClienteCumplimientoPDF,
  exportarClienteIncidentesPDF,
  exportarClienteTurnosPDF,
  exportarClienteUsuariosPDF,
  exportarClienteViasPDF,
} from '../modelos/cliente-reportes-operativos-pdf';

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

  return {
    fecha,
    periodo: normalizarPeriodoCarga(req.query.periodo),
    tz: String(req.query.tz || MX_TZ),
    localidadId: safeInt(req.query.localidadId),
    empresaId: resolveEmpresaId(req),
    detalleLimit: safeInt(req.query.detalleLimit),
    umbralMin: safeInt(req.query.umbralMin),
    page: safeInt(req.query.page),
    pageSize: safeInt(req.query.pageSize),
  };
}

function sendPdf(res: Response, pdf: { contentType: string; filename: string; buffer: Buffer }) {
  res.setHeader('Content-Type', pdf.contentType);
  res.setHeader('Content-Disposition', `inline; filename="${pdf.filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(pdf.buffer);
}

function handleError(res: Response, e: any, fallback: string) {
  return res.status(e?.status ?? 400).json({ ok: false, message: e?.message ?? fallback });
}

export class ClienteReportesOperativosController {
  static async viasJSON(req: Request, res: Response) {
    try {
      const reporte = await ClienteReportesOperativosModel.vias(parseFilters(req));
      return res.json({ ok: true, reporte });
    } catch (e: any) {
      return handleError(res, e, 'Error generando reporte de vias');
    }
  }

  static async viasPDF(req: Request, res: Response) {
    try {
      const reporte = await ClienteReportesOperativosModel.vias(parseFilters(req));
      return sendPdf(res, await exportarClienteViasPDF(reporte));
    } catch (e: any) {
      return handleError(res, e, 'Error generando PDF de vias');
    }
  }

  static async turnosJSON(req: Request, res: Response) {
    try {
      const reporte = await ClienteReportesOperativosModel.turnos(parseFilters(req));
      return res.json({ ok: true, reporte });
    } catch (e: any) {
      return handleError(res, e, 'Error generando reporte de turnos');
    }
  }

  static async turnosPDF(req: Request, res: Response) {
    try {
      const reporte = await ClienteReportesOperativosModel.turnos(parseFilters(req));
      return sendPdf(res, await exportarClienteTurnosPDF(reporte));
    } catch (e: any) {
      return handleError(res, e, 'Error generando PDF de turnos');
    }
  }

  static async usuariosJSON(req: Request, res: Response) {
    try {
      const reporte = await ClienteReportesOperativosModel.usuarios(parseFilters(req));
      return res.json({ ok: true, reporte });
    } catch (e: any) {
      return handleError(res, e, 'Error generando reporte de usuarios');
    }
  }

  static async usuariosPDF(req: Request, res: Response) {
    try {
      const reporte = await ClienteReportesOperativosModel.usuarios(parseFilters(req));
      return sendPdf(res, await exportarClienteUsuariosPDF(reporte));
    } catch (e: any) {
      return handleError(res, e, 'Error generando PDF de usuarios');
    }
  }

  static async cumplimientoJSON(req: Request, res: Response) {
    try {
      const reporte = await ClienteReportesOperativosModel.cumplimiento(parseFilters(req));
      return res.json({ ok: true, reporte });
    } catch (e: any) {
      return handleError(res, e, 'Error generando reporte de cumplimiento');
    }
  }

  static async cumplimientoPDF(req: Request, res: Response) {
    try {
      const reporte = await ClienteReportesOperativosModel.cumplimiento(parseFilters(req));
      return sendPdf(res, await exportarClienteCumplimientoPDF(reporte));
    } catch (e: any) {
      return handleError(res, e, 'Error generando PDF de cumplimiento');
    }
  }

  static async incidentesJSON(req: Request, res: Response) {
    try {
      const reporte = await ClienteReportesOperativosModel.incidentes(parseFilters(req));
      return res.json({ ok: true, reporte });
    } catch (e: any) {
      return handleError(res, e, 'Error generando reporte de incidentes');
    }
  }

  static async incidentesPDF(req: Request, res: Response) {
    try {
      const reporte = await ClienteReportesOperativosModel.incidentes(parseFilters(req));
      return sendPdf(res, await exportarClienteIncidentesPDF(reporte));
    } catch (e: any) {
      return handleError(res, e, 'Error generando PDF de incidentes');
    }
  }

  static async cronologiaJSON(req: Request, res: Response) {
    try {
      const reporte = await ClienteReportesOperativosModel.cronologia(parseFilters(req));
      return res.json({ ok: true, reporte });
    } catch (e: any) {
      return handleError(res, e, 'Error generando cronologia');
    }
  }

  static async cronologiaPDF(req: Request, res: Response) {
    try {
      const reporte = await ClienteReportesOperativosModel.cronologia(parseFilters(req));
      return sendPdf(res, await exportarClienteCronologiaPDF(reporte));
    } catch (e: any) {
      return handleError(res, e, 'Error generando PDF de cronologia');
    }
  }
}
