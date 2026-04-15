// reporteria/modelos/cronologia-empresas-model.ts
// Reporte: Cronologia por empresa con "siguiente movimiento" global

import type { AdminReporteFilters, PeriodoReporte } from './admin-model';
import { Prisma, PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import { rangoPeriodoUTC } from './ceo-base';

export type IncidenteDetalle = {
  id: number;
  estado: string;
  descripcion: string;
  fechaInicioMX: string;
  fechaFinMX: string | null;
  usuario?: { id: number; nombre: string };
  imagenes: string[];
  imagenUrls: string[];
};

export type MovimientoDetalle = {
  id: number;
  locomotiveNumber: number;
  estado: string;
  empresa: string;
  localidad: string;

  solicitadoPor?: { id: number; nombre: string };
  operador?: { id: number; nombre: string };
  cliente?: { id: number; nombre: string };
  supervisor?: { id: number; nombre: string };
  coordinador?: { id: number; nombre: string };

  fechaSolicitudMX: string;
  fechaInicioMX: string | null;
  fechaFinMX: string | null;
  fechaCreacionMX: string;
  fechaActualizacionMX: string;

  minSolicitudAInicio: number | null;
  minInicioAFin: number | null;
  minSolicitudAFin: number | null;

  viaOrigen: string | null;
  viaDestino: string | null;
  tipoMovimiento: string | null;
  prioridad: string;
  comentarios: string | null;

  incidentes: IncidenteDetalle[];
};

export type MovimientoSiguiente = {
  id: number;
  empresa: string;
  locomotiveNumber: number;
  estado: string;
  fechaSolicitudMX: string;
  fechaFinMX: string | null;
  viaOrigen: string | null;
  viaDestino: string | null;
};

export type MovimientoCrono = MovimientoDetalle & {
  ordenDia: number;
  siguiente?: MovimientoSiguiente;
};

export type CronologiaEmpresaDia = {
  fecha: string; // yyyy-LL-dd
  movimientos: MovimientoCrono[];
};

export type EmpresaCronologia = {
  empresa: string;
  totalMovimientos: number;
  cronologia: CronologiaEmpresaDia[];
};

export type ReporteCronologiaEmpresas = {
  meta: {
    periodo: PeriodoReporte;
    etiqueta: string;
    fechaLocal: string;
    tz: string;
    rangoUTC: { desde: string; hastaExclusivo: string };
    rangoLocal: { desde: string; hastaExclusivo: string };
  };
  pagination: {
    page: number;
    pageSize: number;
    totalMovimientos: number;
    totalPages: number;
    hasNext: boolean;
  };
  empresas: EmpresaCronologia[];
};

const prisma = new PrismaClient();
const MX_TZ = 'America/Mexico_City';

function fmtMX(d: Date | null, tz: string) {
  if (!d) return null;
  return DateTime.fromJSDate(d, { zone: tz }).toFormat('yyyy-LL-dd HH:mm');
}

export class CronologiaEmpresasModel {
  static async reporte(
    filters: AdminReporteFilters & { page?: number; pageSize?: number },
    periodo: PeriodoReporte
  ): Promise<ReporteCronologiaEmpresas> {
    const tz = filters.tz ?? MX_TZ;
    const { anchor, startLocal, endLocal, startUTC, endUTC } = rangoPeriodoUTC(filters.fecha, tz, periodo);

    const page = Math.max(1, Number(filters.page ?? 1));
    const rawSize = Number(filters.pageSize ?? 200);
    const pageSize = Math.min(500, Math.max(1, rawSize));
    const offset = (page - 1) * pageSize;

    const whereParts: Prisma.Sql[] = [
      Prisma.sql`m."fechaSolicitud" >= ${startUTC.toJSDate()}`,
      Prisma.sql`m."fechaSolicitud" < ${endUTC.toJSDate()}`,
    ];
    if (filters.localidadId) whereParts.push(Prisma.sql`m."localidadId" = ${filters.localidadId}`);
    if (filters.empresaId) whereParts.push(Prisma.sql`m."empresaId" = ${filters.empresaId}`);

    const whereSql = Prisma.sql`WHERE ${Prisma.join(whereParts, ' AND ')}`;

    const totalMovimientos = await prisma.movimiento.count({
      where: {
        fechaSolicitud: { gte: startUTC.toJSDate(), lt: endUTC.toJSDate() },
        localidadId: filters.localidadId,
        empresaId: filters.empresaId,
      },
    });

    const rows = await prisma.$queryRaw<
      Array<{
        id: number;
        estado: string;
        locomotiveNumber: number;
        fechaSolicitud: Date;
        fechaInicio: Date | null;
        fechaFin: Date | null;
        createdAt: Date;
        updatedAt: Date;
        instrucciones: string | null;
        tipoMovimiento: string | null;
        prioridad: string;
        empresa: string;
        localidad: string;
        creadoPorId: number;
        creadoPorNombre: string;
        operadorId: number | null;
        operadorNombre: string | null;
        clienteId: number | null;
        clienteNombre: string | null;
        supervisorId: number | null;
        supervisorNombre: string | null;
        coordinadorId: number | null;
        coordinadorNombre: string | null;
        viaOrigen: string | null;
        viaDestino: string | null;
      }>
    >(Prisma.sql`
      SELECT
        m.id,
        m.estado::text as "estado",
        m."locomotiveNumber",
        m."fechaSolicitud",
        m."fechaInicio",
        m."fechaFin",
        m."createdAt",
        m."updatedAt",
        m."instrucciones",
        m."tipoMovimiento"::text as "tipoMovimiento",
        m."prioridad"::text as "prioridad",
        e.nombre as "empresa",
        l.nombre as "localidad",
        ucp.id as "creadoPorId",
        ucp.nombre as "creadoPorNombre",
        uo.id as "operadorId",
        uo.nombre as "operadorNombre",
        uc.id as "clienteId",
        uc.nombre as "clienteNombre",
        COALESCE(usup.id, supTok.id) as "supervisorId",
        COALESCE(usup.nombre, supTok.nombre) as "supervisorNombre",
        COALESCE(uco.id, coorTok.id) as "coordinadorId",
        COALESCE(uco.nombre, coorTok.nombre) as "coordinadorNombre",
        vo.nombre as "viaOrigen",
        vd.nombre as "viaDestino"
      FROM "Movimiento" m
      JOIN "Empresa" e ON e.id = m."empresaId"
      JOIN "Localidad" l ON l.id = m."localidadId"
      JOIN "Usuario" ucp ON ucp.id = m."creadoPorId"
      LEFT JOIN "Usuario" uo ON uo.id = m."operadorId"
      LEFT JOIN "Usuario" uc ON uc.id = m."clienteId"
      LEFT JOIN "Usuario" usup ON usup.id = m."supervisorId"
      LEFT JOIN "Usuario" uco ON uco.id = m."coordinadorId"
      LEFT JOIN "Via" vo ON vo.id = m."viaOrigenId"
      LEFT JOIN "Via" vd ON vd.id = m."viaDestinoId"

      LEFT JOIN LATERAL (
        SELECT u.id, u.nombre, u.rol
        FROM "Token" t
        JOIN "Usuario" u ON u.id = t."usuarioId"
        WHERE u.rol = 'SUPERVISOR'
          AND m."fechaFin" IS NOT NULL
          AND t."issuedAt" <= m."fechaFin"
          AND (t."revokedAt" IS NULL OR t."revokedAt" > m."fechaFin")
          AND t."expiresAt" > m."fechaFin"
        ORDER BY t."issuedAt" DESC
        LIMIT 1
      ) supTok ON TRUE

      LEFT JOIN LATERAL (
        SELECT u.id, u.nombre, u.rol
        FROM "Token" t
        JOIN "Usuario" u ON u.id = t."usuarioId"
        WHERE u.rol = 'COORDINADOR'
          AND m."fechaFin" IS NOT NULL
          AND t."issuedAt" <= m."fechaFin"
          AND (t."revokedAt" IS NULL OR t."revokedAt" > m."fechaFin")
          AND t."expiresAt" > m."fechaFin"
        ORDER BY t."issuedAt" DESC
        LIMIT 1
      ) coorTok ON TRUE

      ${whereSql}
      ORDER BY m."fechaSolicitud" ASC, m.id ASC
      LIMIT ${pageSize + 1} OFFSET ${offset};
    `);

    const pageRows = rows.slice(0, pageSize);
    const nextRow = rows[pageSize] ?? null;

    const ids = pageRows.map((r) => r.id);

    const extras = ids.length
      ? await prisma.movimiento.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            instrucciones: true,
            viaOrigen: { select: { nombre: true } },
            viaDestino: { select: { nombre: true } },
            tipoMovimiento: true,
            prioridad: true,
          },
        })
      : [];

    const extraMap = new Map<number, typeof extras[number]>();
    for (const e of extras) extraMap.set(e.id, e);

    const incidentes = ids.length
      ? await prisma.incidente.findMany({
          where: { movimientoId: { in: ids } },
          select: {
            id: true,
            movimientoId: true,
            estado: true,
            descripcion: true,
            fechaInicio: true,
            fechaFin: true,
            imagen1: true,
            imagen2: true,
            imagen3: true,
            imagen4: true,
            usuario: { select: { id: true, nombre: true } },
          },
          orderBy: { id: 'asc' },
        })
      : [];

    const incByMov = new Map<number, IncidenteDetalle[]>();
    for (const inc of incidentes) {
      const imgs = [inc.imagen1, inc.imagen2, inc.imagen3, inc.imagen4].filter(Boolean) as string[];
      const urls = imgs.map((ruta) => `/incidentes/imagen?ruta=${encodeURIComponent(ruta)}`);
      const row: IncidenteDetalle = {
        id: inc.id,
        estado: String(inc.estado),
        descripcion: inc.descripcion,
        fechaInicioMX: fmtMX(inc.fechaInicio, tz) ?? '',
        fechaFinMX: fmtMX(inc.fechaFin, tz),
        usuario: inc.usuario ? { id: inc.usuario.id, nombre: inc.usuario.nombre } : undefined,
        imagenes: imgs,
        imagenUrls: urls,
      };
      const list = incByMov.get(inc.movimientoId) ?? [];
      list.push(row);
      incByMov.set(inc.movimientoId, list);
    }

    const detallesMap = new Map<number, MovimientoDetalle>();
    const ordered = [...pageRows, ...(nextRow ? [nextRow] : [])];
    const siguienteMap = new Map<number, MovimientoSiguiente | undefined>();

    for (let i = 0; i < ordered.length; i++) {
      const r = ordered[i];
      const extra = extraMap.get(r.id);
      const incs = incByMov.get(r.id) ?? [];

      const fechaSolicitudMX = fmtMX(r.fechaSolicitud, tz) ?? '';
      const fechaInicioMX = fmtMX(r.fechaInicio, tz);
      const fechaFinMX = fmtMX(r.fechaFin, tz);

      const minSolicitudAInicio = r.fechaInicio ? (r.fechaInicio.getTime() - r.fechaSolicitud.getTime()) / 60000 : null;
      const minInicioAFin = r.fechaInicio && r.fechaFin ? (r.fechaFin.getTime() - r.fechaInicio.getTime()) / 60000 : null;
      const minSolicitudAFin = r.fechaFin ? (r.fechaFin.getTime() - r.fechaSolicitud.getTime()) / 60000 : null;

      detallesMap.set(r.id, {
        id: r.id,
        locomotiveNumber: r.locomotiveNumber,
        estado: r.estado,
        empresa: r.empresa,
        localidad: r.localidad,
        solicitadoPor: { id: r.creadoPorId, nombre: r.creadoPorNombre },
        operador: r.operadorId ? { id: r.operadorId, nombre: r.operadorNombre ?? '—' } : undefined,
        cliente: r.clienteId ? { id: r.clienteId, nombre: r.clienteNombre ?? '—' } : undefined,
        supervisor: r.supervisorId ? { id: r.supervisorId, nombre: r.supervisorNombre ?? '—' } : undefined,
        coordinador: r.coordinadorId ? { id: r.coordinadorId, nombre: r.coordinadorNombre ?? '—' } : undefined,
        fechaSolicitudMX,
        fechaInicioMX,
        fechaFinMX,
        fechaCreacionMX: fmtMX(extra?.createdAt ?? r.createdAt, tz) ?? '',
        fechaActualizacionMX: fmtMX(extra?.updatedAt ?? r.updatedAt, tz) ?? '',
        minSolicitudAInicio,
        minInicioAFin,
        minSolicitudAFin,
        viaOrigen: r.viaOrigen ?? null,
        viaDestino: r.viaDestino ?? null,
        tipoMovimiento: r.tipoMovimiento ? String(r.tipoMovimiento) : null,
        prioridad: r.prioridad ?? '—',
        comentarios: r.instrucciones ?? null,
        incidentes: incs,
      });

      const next = ordered[i + 1];
      if (next) {
        siguienteMap.set(r.id, {
          id: next.id,
          empresa: next.empresa,
          locomotiveNumber: next.locomotiveNumber,
          estado: next.estado,
          fechaSolicitudMX: fmtMX(next.fechaSolicitud, tz) ?? '',
          fechaFinMX: fmtMX(next.fechaFin, tz),
          viaOrigen: next.viaOrigen ?? null,
          viaDestino: next.viaDestino ?? null,
        });
      } else {
        siguienteMap.set(r.id, undefined);
      }
    }

    // Cronologia por empresa y por dia (fechaSolicitud)
    const empresaMap = new Map<string, { total: number; mapDia: Map<string, MovimientoCrono[]> }>();
    const counters = new Map<string, Map<string, number>>(); // empresa -> fecha -> contador

    for (const r of pageRows) {
      const det = detallesMap.get(r.id);
      if (!det) continue;

      const empresa = det.empresa ?? '—';
      const dateKey = DateTime.fromJSDate(r.fechaSolicitud, { zone: tz }).toFormat('yyyy-LL-dd');

      if (!empresaMap.has(empresa)) empresaMap.set(empresa, { total: 0, mapDia: new Map() });
      const emp = empresaMap.get(empresa)!;
      emp.total += 1;

      if (!counters.has(empresa)) counters.set(empresa, new Map());
      const cMap = counters.get(empresa)!;
      const idx = (cMap.get(dateKey) ?? 0) + 1;
      cMap.set(dateKey, idx);

      const list = emp.mapDia.get(dateKey) ?? [];
      list.push({ ...det, ordenDia: idx, siguiente: siguienteMap.get(r.id) });
      emp.mapDia.set(dateKey, list);
    }

    const empresas: EmpresaCronologia[] = Array.from(empresaMap.entries())
      .map(([empresa, data]) => ({
        empresa,
        totalMovimientos: data.total,
        cronologia: Array.from(data.mapDia.entries())
          .map(([fecha, movimientos]) => ({ fecha, movimientos }))
          .sort((a, b) => a.fecha.localeCompare(b.fecha)),
      }))
      .sort((a, b) => b.totalMovimientos - a.totalMovimientos);

    const totalPages = Math.max(1, Math.ceil(totalMovimientos / pageSize));

    return {
      meta: {
        periodo,
        etiqueta: `CRONOLOGIA_${anchor.toFormat('yyyy-LL-dd')}`,
        fechaLocal: filters.fecha,
        tz,
        rangoUTC: { desde: startUTC.toISO()!, hastaExclusivo: endUTC.toISO()! },
        rangoLocal: { desde: startLocal.toISO()!, hastaExclusivo: endLocal.toISO()! },
      },
      pagination: {
        page,
        pageSize,
        totalMovimientos,
        totalPages,
        hasNext: page < totalPages,
      },
      empresas,
    };
  }
}
