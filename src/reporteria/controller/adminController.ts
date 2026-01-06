// reporteria/controladores/admin-controller.ts
//
// Controller ADMIN para:
// - JSON (para debug o frontend)
// - PDF (CEO / auditoría)
//
// Reglas incorporadas:
// - Sin coordinador/supervisor (solo cliente/operador/creadoPor).
// - Anomalía = movimiento CONCLUIDO < 10 min (baseline esperado 10–15).
// - Bono = 1 por locomotora por “día operativo” 09:00–09:00 (MX).
//
// NOTA: este controller asume que:
// - Ya existe AdminReporteriaModel (admin-model.ts) con reportePorPeriodo.
// - Ya existe exportarAdminPDF (adminPdf.ts) que recibe el reporte ya “enriquecido”.
//
// Ajusta los imports si tu estructura real difiere.

import type { Request, Response } from 'express';
import { DateTime } from 'luxon';

import { AdminReporteriaModel, type PeriodoReporte } from '../modelos/admin-model';
import { exportarAdminPDF, type AdminReporteBase } from '../modelos/adminPdf';

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

function safeNum(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function minutesBetweenISO(aISO?: string | null, bISO?: string | null): number | null {
  if (!aISO || !bISO) return null;
  const a = new Date(aISO);
  const b = new Date(bISO);
  const ms = b.getTime() - a.getTime();
  if (!Number.isFinite(ms)) return null;
  return ms / 60000;
}

function fmtMXFromISO(iso?: string | null, tz = MX_TZ) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const s = d.toLocaleString('sv-SE', { timeZone: tz, hour12: false }).replace(',', '');
  return s.length >= 16 ? s.slice(0, 16) : s;
}

function diaMXFromISO(iso?: string | null, tz = MX_TZ) {
  if (!iso) return null;
  const dt = DateTime.fromISO(iso, { zone: tz });
  if (!dt.isValid) return null;
  return dt.toFormat('yyyy-LL-dd');
}

function diaOperativo09(isoSolicitudUTC: string, tz = MX_TZ) {
  // Día operativo = [09:00, 09:00) local. Si solicitud ocurre antes de 09:00, pertenece al día anterior.
  const dt = DateTime.fromISO(isoSolicitudUTC, { zone: 'utc' }).setZone(tz);
  if (!dt.isValid) return null;

  const cut = dt.set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
  const opDay = dt < cut ? dt.minus({ days: 1 }) : dt;
  return opDay.toFormat('yyyy-LL-dd');
}

type Det = AdminReporteBase['topLentos'][number];

function stripRoles(u: Det['usuarios']) {
  // Deja solo creadoPor/cliente/operador. Quita supervisor/coordinador aunque vengan por compatibilidad.
  return {
    creadoPor: u?.creadoPor ?? null,
    cliente: u?.cliente ?? null,
    operador: u?.operador ?? null,
  };
}

function enrichReporteForPdf(raw: any, tz = MX_TZ): AdminReporteBase {
  // raw viene del AdminReporteriaModel; lo transformamos a AdminReporteBase compatible con tu adminPdf.ts actual
  // + añadimos: anomalías agregadas, top anomalías, y “diaOperativoMX” para auditoría de bonos.
  const detalles: Det[] = (raw?.topLentos ?? []).map((m: any) => ({
    ...m,
    usuarios: stripRoles(m.usuarios),
  }));

  // Importante: no solo topLentos necesita limpieza; también tops opcionales
  const topLentos: Det[] = (raw?.topLentos ?? []).map((m: any) => ({
    ...m,
    usuarios: stripRoles(m.usuarios),
  }));
  const topConIncidentes: Det[] = (raw?.topConIncidentes ?? []).map((m: any) => ({
    ...m,
    usuarios: stripRoles(m.usuarios),
  }));
  const topBonosElegibles: Det[] = (raw?.topBonosElegibles ?? []).map((m: any) => ({
    ...m,
    usuarios: stripRoles(m.usuarios),
  }));

  // Para anomalías necesitamos analizar TODOS los movimientos, no solo top lists.
  const allDetalles: Det[] = (raw?.topLentos && raw?.topConIncidentes && raw?.topBonosElegibles)
    ? (raw?.topLentos as any[]) // fallback si no viene "detalles"; (ideal: el model debería exponer "detalles" completos)
    : [];

  // Si tu AdminReporteriaModel NO devuelve lista completa, conviene extenderlo luego.
  // Por ahora: intentamos usar raw.detalles si existe (recomendado).
  const full: Det[] = (raw?.detalles ?? allDetalles ?? []).map((m: any) => ({
    ...m,
    usuarios: stripRoles(m.usuarios),
  }));

  const conFin = full.filter((d) => d.minSolicitudAFin !== null);
  const anomalias = conFin.filter((d) => safeNum(d.minSolicitudAFin) < 10);

  const anomaliasCount = anomalias.length;
  const anomaliasPct = conFin.length ? Math.round((anomaliasCount / conFin.length) * 100) : 0;

  function groupCount<T>(xs: T[], keyFn: (x: T) => string) {
    const map = new Map<string, number>();
    for (const x of xs) {
      const k = keyFn(x);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([k, n]) => ({ k, n }));
  }

  const byOper = groupCount(anomalias, (d) => {
    const op = d.usuarios?.operador;
    return op ? `${op.id}::${op.nombre}` : '0::(Sin operador)';
  })
    .sort((a, b) => b.n - a.n)
    .map((x) => {
      const [idStr, nombre] = x.k.split('::');
      return {
        operadorId: Number(idStr) || 0,
        operadorNombre: nombre || '(Sin operador)',
        total: x.n,
        pctSobreAnomalias: anomaliasCount ? Math.round((x.n / anomaliasCount) * 100) : 0,
      };
    });

  const byCli = groupCount(anomalias, (d) => {
    const cli = d.usuarios?.cliente;
    return cli ? `${cli.id}::${cli.nombre}` : '0::(Sin cliente)';
  })
    .sort((a, b) => b.n - a.n)
    .map((x) => {
      const [idStr, nombre] = x.k.split('::');
      return {
        clienteId: Number(idStr) || 0,
        clienteNombre: nombre || '(Sin cliente)',
        total: x.n,
        pctSobreAnomalias: anomaliasCount ? Math.round((x.n / anomaliasCount) * 100) : 0,
      };
    });

  const byEmp = groupCount(anomalias, (d) => String((d as any).empresa ?? '—'))
    .sort((a, b) => b.n - a.n)
    .map((x) => ({
      empresa: x.k,
      total: x.n,
      pctSobreAnomalias: anomaliasCount ? Math.round((x.n / anomaliasCount) * 100) : 0,
    }));

  const byLoco = groupCount(anomalias, (d) => String(safeNum((d as any).locomotiveNumber)))
    .sort((a, b) => b.n - a.n)
    .map((x) => ({
      locomotiveNumber: Number(x.k) || 0,
      total: x.n,
      pctSobreAnomalias: anomaliasCount ? Math.round((x.n / anomaliasCount) * 100) : 0,
    }));

  const byDia = groupCount(anomalias, (d) => diaMXFromISO((d as any).fechaSolicitudUTC, tz) || '—')
    .sort((a, b) => (a.k > b.k ? 1 : -1))
    .map((x) => ({ diaMX: x.k, total: x.n }));

  const topAnomalias: Det[] = [...anomalias]
    .map((d) => {
      const solicitudMX = fmtMXFromISO(d.fechaSolicitudUTC, tz);
      const finMX = fmtMXFromISO(d.fechaFinUTC, tz);
      const tramoMX = d.fechaFinUTC && solicitudMX && finMX ? `${solicitudMX} → ${finMX}` : '—';

      return {
        ...d,
        esAnomalia: true,
        fechaSolicitudMX: solicitudMX ?? undefined,
        fechaFinMX: finMX ?? undefined,
        tramoMX,
        diaMX: diaMXFromISO(d.fechaSolicitudUTC, tz) ?? undefined,
        diaOperativoMX: diaOperativo09(d.fechaSolicitudUTC, tz) ?? undefined,
      } as any;
    })
    .sort((a, b) => safeNum(a.minSolicitudAFin) - safeNum(b.minSolicitudAFin)) // más “sospechoso” primero
    .slice(0, 60);

  // Enriquecimiento también a topLentos/topConIncidentes/topBonosElegibles
  function enrichList(list: Det[]): Det[] {
    return list.map((d: any) => {
      const solicitudMX = fmtMXFromISO(d.fechaSolicitudUTC, tz);
      const finMX = fmtMXFromISO(d.fechaFinUTC, tz);
      const tramoMX = d.fechaFinUTC && solicitudMX && finMX ? `${solicitudMX} → ${finMX}` : '—';
      const esAnomalia = d.minSolicitudAFin !== null && safeNum(d.minSolicitudAFin) < 10;

      return {
        ...d,
        esAnomalia,
        fechaSolicitudMX: solicitudMX ?? undefined,
        fechaFinMX: finMX ?? undefined,
        tramoMX,
        diaMX: diaMXFromISO(d.fechaSolicitudUTC, tz) ?? undefined,
        diaOperativoMX: diaOperativo09(d.fechaSolicitudUTC, tz) ?? undefined,
        usuarios: stripRoles(d.usuarios),
      } as any;
    });
  }

  const topLentos2 = enrichList(topLentos);
  const topInc2 = enrichList(topConIncidentes);
  const topBonos2 = enrichList(topBonosElegibles);

  // Ranking por operador: agregar anomalías si viene porOperador en raw.bonos
  const bonos = raw?.bonos ?? undefined;
  const porOper = (bonos?.porOperador ?? []).map((x: any) => {
    const anomCountOp = anomalias.filter((d) => (d.usuarios?.operador?.id ?? 0) === (x.operadorId ?? 0)).length;
    return { ...x, anomalias: anomCountOp };
  });

  const out: AdminReporteBase = {
    meta: {
      etiqueta: raw?.meta?.etiqueta ?? undefined,
      periodo: raw?.meta?.periodo ?? raw?.meta?.periodo ?? undefined,
      tz: raw?.meta?.tz ?? tz,
      fechaLocal: raw?.meta?.fechaLocal ?? undefined,
      rangoUTC: raw?.meta?.rangoUTC ?? raw?.meta?.rangoUTC,
    },
    kpis: {
      ...raw.kpis,
      anomalias: anomaliasCount,
      anomaliasPct,
      bonosElegibles: raw?.kpis?.bonosElegibles,
      bonosElegiblesPct: raw?.kpis?.bonosElegiblesPct,
    },
    duracionBuckets: raw.duracionBuckets,
    incidentes: {
      porEstado: raw?.incidentes?.porEstado ?? {},
      movConIncidentePctPorBucket: raw?.incidentes?.movConIncidentePctPorBucket ?? [],
    },
    topLentos: topLentos2,
    topConIncidentes: topInc2,
    topBonosElegibles: topBonos2,
    topAnomalias,
    anomalias: {
      porOperador: byOper,
      porCliente: byCli,
      porEmpresa: byEmp,
      porLocomotora: byLoco,
      porDiaMX: byDia,
    },
    bonos: {
      porOperador: porOper,
    },
  };

  return out;
}

export class AdminReporteriaController {
  /**
   * GET /reporteria/admin
   * Query:
   * - fecha=YYYY-MM-DD
   * - periodo=DIA|SEMANA|MES|BIMESTRE|SEMESTRE|ANUAL
   * - tz=America/Mexico_City (opcional)
   * - localidadId, empresaId (opcionales)
   */
  static async getJSON(req: Request, res: Response) {
    try {
      const fecha = String(req.query.fecha || '').trim();
      if (!fecha) return res.status(400).json({ ok: false, message: 'Falta query: fecha=YYYY-MM-DD' });

      const periodo = asPeriodo(req.query.periodo);
      const tz = String(req.query.tz || MX_TZ);

      const localidadId = safeInt(req.query.localidadId);
      const empresaId = safeInt(req.query.empresaId);

      const raw = await AdminReporteriaModel.reportePorPeriodo(
        { fecha, tz, localidadId, empresaId },
        periodo
      );

      // Limpieza de roles y agregado de anomalías/bonos-day09 para auditoría
      const reporte = enrichReporteForPdf(raw as any, tz);

      return res.json({ ok: true, reporte });
    } catch (e: any) {
      return res.status(500).json({ ok: false, message: e?.message ?? 'Error generando reporte' });
    }
  }

  /**
   * GET /reporteria/admin/pdf
   * Igual que JSON, pero responde PDF
   */
  static async getPDF(req: Request, res: Response) {
    try {
      const fecha = String(req.query.fecha || '').trim();
      if (!fecha) return res.status(400).json({ ok: false, message: 'Falta query: fecha=YYYY-MM-DD' });

      const periodo = asPeriodo(req.query.periodo);
      const tz = String(req.query.tz || MX_TZ);

      const localidadId = safeInt(req.query.localidadId);
      const empresaId = safeInt(req.query.empresaId);

      const raw = await AdminReporteriaModel.reportePorPeriodo(
        { fecha, tz, localidadId, empresaId },
        periodo
      );

      const reporte: AdminReporteBase = enrichReporteForPdf(raw as any, tz);

      const pdf = await exportarAdminPDF(reporte);

      res.setHeader('Content-Type', pdf.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${pdf.filename}"`);
      res.setHeader('Cache-Control', 'no-store');

      return res.status(200).send(pdf.buffer);
    } catch (e: any) {
      return res.status(500).json({ ok: false, message: e?.message ?? 'Error generando PDF' });
    }
  }
}
