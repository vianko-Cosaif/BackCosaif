import { prisma } from '../../lib/prisma';
import { requestTorreonMs } from '../../services/torreonMs/torreonMsClient';
import { esLocalidadTorreon } from '../../utils/operacionLocalidad';

type TorreonSearchRow = Record<string, any>;

const TORREON_MOVIMIENTO_ESTADOS = new Set(['SOLICITADO', 'ASIGNADO', 'EN_PROCESO', 'DETENIDO', 'CONCLUIDO', 'CANCELADO']);
const TORREON_MOVIMIENTO_CERRADOS = new Set(['CONCLUIDO', 'CANCELADO']);

function toTorreonRecord(input: unknown): TorreonSearchRow {
  return input && typeof input === 'object' ? (input as TorreonSearchRow) : {};
}

function extractTorreonRows(input: unknown): TorreonSearchRow[] {
  if (Array.isArray(input)) return input.map(toTorreonRecord);
  const record = toTorreonRecord(input);
  if (Array.isArray(record.data)) return record.data.map(toTorreonRecord);
  if (Array.isArray(record.items)) return record.items.map(toTorreonRecord);
  if (Array.isArray(record.rows)) return record.rows.map(toTorreonRecord);
  return [];
}

function toPositiveInt(input: unknown): number | null {
  const value = Number(input);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function textOrNull(input: unknown): string | null {
  return typeof input === 'string' && input.trim() ? input.trim() : null;
}

function torreonRef(snapshot: unknown, prefix: string, id: unknown) {
  return textOrNull(snapshot) ?? (toPositiveInt(id) ? `${prefix} ${toPositiveInt(id)}` : null);
}

function torreonUser(id: unknown, nombre?: unknown, rol?: unknown) {
  const numericId = toPositiveInt(id);
  if (!numericId) return null;
  return {
    id: numericId,
    nombre: textOrNull(nombre) ?? `Usuario ${numericId}`,
    rol: textOrNull(rol) ?? undefined,
  };
}

function torreonDateValue(row: TorreonSearchRow, field: 'solicitud' | 'inicio' | 'fin' | 'creacion') {
  const raw =
    field === 'inicio'
      ? row.fechaInicio
      : field === 'fin'
      ? row.fechaFin
      : field === 'creacion'
      ? row.createdAt
      : row.fechaSolicitud ?? row.createdAt;
  const date = raw ? new Date(String(raw)) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function torreonEstadoVisible(row: TorreonSearchRow) {
  const estado = String(row.estado ?? '').toUpperCase();
  const ronda = Array.isArray(row.rondas) ? toTorreonRecord(row.rondas[0]) : {};
  const estadoRonda = String(ronda.estado ?? '').toUpperCase();
  if (estadoRonda === 'BLOQUEADO') return 'ESPERA';
  return estado || 'SOLICITADO';
}

function torreonMatchesEstados(row: TorreonSearchRow, estados: string[]) {
  if (!estados.length) return true;
  const estado = String(row.estado ?? '').toUpperCase();
  const estadoVisible = torreonEstadoVisible(row);
  return estados.some((requested) => {
    const normalized = String(requested).toUpperCase();
    if (normalized === 'ESPERA') return estadoVisible === 'ESPERA';
    return normalized === estado || normalized === estadoVisible;
  });
}

function torreonMatchesText(row: TorreonSearchRow, term?: string) {
  const q = String(term ?? '').trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    row.id,
    row.locomotiveNumber,
    row.estado,
    row.prioridad,
    row.tipoMovimiento,
    row.instrucciones,
    row.empresaNombreSnapshot,
    row.localidadNombreSnapshot,
    row.viaOrigenNombreSnapshot,
    row.viaDestinoNombreSnapshot,
    row.seccionOrigenNombreSnapshot,
    row.seccionDestinoNombreSnapshot,
  ]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).toLowerCase());
  return haystack.some((value) => value.includes(q));
}

function mapTorreonMovimientoParaCosaif(row: TorreonSearchRow) {
  const id = toPositiveInt(row.id);
  const empresaId = toPositiveInt(row.empresaId);
  const localidadId = toPositiveInt(row.localidadId);
  const viaOrigenId = toPositiveInt(row.viaOrigenId);
  const viaDestinoId = toPositiveInt(row.viaDestinoId);
  const seccionOrigenId = toPositiveInt(row.seccionOrigenId);
  const seccionDestinoId = toPositiveInt(row.seccionDestinoId);
  const rondaItem = Array.isArray(row.rondas) ? toTorreonRecord(row.rondas[0]) : {};
  const ronda = toTorreonRecord(rondaItem.ronda);
  const estado = torreonEstadoVisible(row);

  return {
    ...row,
    id,
    idTecnico: id,
    folioLocalidad: id,
    folioLocalidadLabel: id ? `#${id}` : null,
    source: 'torreon',
    empresaId,
    empresa: empresaId
      ? { id: empresaId, nombre: textOrNull(row.empresaNombreSnapshot) ?? `Empresa ${empresaId}` }
      : null,
    localidadId,
    localidad: localidadId
      ? { id: localidadId, nombre: textOrNull(row.localidadNombreSnapshot) ?? 'Torreon' }
      : null,
    viaOrigen: viaOrigenId
      ? {
          id: viaOrigenId,
          nombre: torreonRef(row.viaOrigenNombreSnapshot, 'Via', viaOrigenId),
          seccion: seccionOrigenId
            ? { id: seccionOrigenId, nombre: torreonRef(row.seccionOrigenNombreSnapshot, 'Seccion', seccionOrigenId) }
            : null,
        }
      : null,
    viaDestino: viaDestinoId
      ? {
          id: viaDestinoId,
          nombre: torreonRef(row.viaDestinoNombreSnapshot, 'Via', viaDestinoId),
          seccion: seccionDestinoId
            ? { id: seccionDestinoId, nombre: torreonRef(row.seccionDestinoNombreSnapshot, 'Seccion', seccionDestinoId) }
            : null,
        }
      : null,
    creadoPor: torreonUser(row.creadoPorId),
    cliente: torreonUser(row.clienteId),
    supervisor: torreonUser(row.supervisorId),
    coordinador: torreonUser(row.coordinadorId),
    operador: torreonUser(row.operadorId),
    lavado: false,
    torno: false,
    finalizado: TORREON_MOVIMIENTO_CERRADOS.has(String(row.estado ?? '').toUpperCase()),
    estado,
    estadoOriginalTorreon: row.estado,
    ronda:
      toPositiveInt(rondaItem.id) || toPositiveInt(ronda.id)
        ? {
            id: toPositiveInt(rondaItem.id) ?? toPositiveInt(ronda.id),
            rondaId: toPositiveInt(rondaItem.rondaId) ?? toPositiveInt(ronda.id),
            rondaNumero: toPositiveInt(ronda.numeroRonda),
            orden: toPositiveInt(rondaItem.orden),
            estado: rondaItem.estado,
            concluido: String(rondaItem.estado ?? '').toUpperCase() === 'CONCLUIDO',
          }
        : null,
  };
}

export async function localidadEsTorreonNatural(localidadId: number) {
  const localidad = await prisma.localidad.findUnique({
    where: { id: localidadId },
    select: { nombre: true },
  });
  return esLocalidadTorreon(localidad?.nombre);
}

export async function obtenerLocalidadesTorreonNaturalIds() {
  const localidades = await prisma.localidad.findMany({
    select: { id: true, nombre: true },
  });
  return localidades
    .filter((localidad) => esLocalidadTorreon(localidad.nombre))
    .map((localidad) => localidad.id);
}

export async function buscarMovimientosTorreonNatural(params: {
  q?: string;
  locomotivePrefix?: string;
  locomotiveNumber?: number;
  empresaId?: number;
  localidadId: number;
  estados: string[];
  prioridad?: string;
  ambito?: 'actuales' | 'pasados';
  fechaCampo: 'solicitud' | 'inicio' | 'fin' | 'creacion';
  fechaDesde?: Date;
  fechaHasta?: Date;
  sortBy?: string;
  sortDir?: string;
  pagination: { page: number; pageSize: number };
}) {
  const query = new URLSearchParams({
    localidadId: String(params.localidadId),
    page: String(params.pagination.page),
    pageSize: String(Math.min(100, Math.max(params.pagination.pageSize, 25))),
    includeFotos: 'false',
  });

  if (params.empresaId !== undefined) query.set('empresaId', String(params.empresaId));
  if (params.ambito) query.set('vista', params.ambito === 'pasados' ? 'PASADOS' : 'ACTIVOS');
  if (params.estados.length === 1 && TORREON_MOVIMIENTO_ESTADOS.has(params.estados[0])) {
    query.set('estado', params.estados[0]);
  }

  const response = await requestTorreonMs<any>(`/movimientos?${query.toString()}`, { method: 'GET' });
  const fromMs = extractTorreonRows(response.data);
  let rows = fromMs.filter((row) => {
    const locomotive = Number(row.locomotiveNumber);
    if (params.locomotiveNumber !== undefined && locomotive !== params.locomotiveNumber) return false;
    if (params.locomotivePrefix && !String(row.locomotiveNumber ?? '').startsWith(params.locomotivePrefix)) return false;
    if (params.prioridad && String(row.prioridad ?? '').toUpperCase() !== params.prioridad) return false;
    if (!torreonMatchesEstados(row, params.estados)) return false;
    if (!torreonMatchesText(row, params.q)) return false;
    if (params.fechaDesde && torreonDateValue(row, params.fechaCampo) < params.fechaDesde.getTime()) return false;
    if (params.fechaHasta && torreonDateValue(row, params.fechaCampo) > params.fechaHasta.getTime()) return false;
    return true;
  });

  if (params.sortBy) {
    const direction = params.sortDir === 'asc' ? 1 : -1;
    rows = rows.sort((a, b) => {
      const field = params.sortBy === 'locomotora' ? 'locomotiveNumber' : params.sortBy;
      if (field === 'solicitud' || field === 'inicio' || field === 'fin') {
        return (torreonDateValue(a, field as any) - torreonDateValue(b, field as any)) * direction;
      }
      const av = field === 'id' ? Number(a.id ?? 0) : String(a[field as keyof TorreonSearchRow] ?? '');
      const bv = field === 'id' ? Number(b.id ?? 0) : String(b[field as keyof TorreonSearchRow] ?? '');
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * direction;
      return String(av).localeCompare(String(bv)) * direction;
    });
  }

  const data = rows.map(mapTorreonMovimientoParaCosaif);
  return {
    data,
    meta: {
      total: data.length,
      page: params.pagination.page,
      pageSize: params.pagination.pageSize,
      totalPages: data.length === 0 ? 1 : Math.ceil(data.length / params.pagination.pageSize),
      hasNextPage: fromMs.length >= Math.max(params.pagination.pageSize, 25),
      hasPreviousPage: params.pagination.page > 1,
      source: 'torreon',
    },
  };
}

