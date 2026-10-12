import { prisma } from '../../lib/prisma';
import { requestTorreonMs } from '../../services/torreonMs/torreonMsClient';
import { enrichNaturalSections } from '../../services/torreonMs/naturalSections';
import { esLocalidadTorreon } from '../../utils/operacionLocalidad';

type TorreonSearchRow = Record<string, any>;

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

function torreonEstadoVisible(row: TorreonSearchRow) {
  const estado = String(row.estado ?? '').toUpperCase();
  const ronda = Array.isArray(row.rondas) ? toTorreonRecord(row.rondas[0]) : {};
  const estadoRonda = String(ronda.estado ?? '').toUpperCase();
  if (!row.unidad && estadoRonda === 'BLOQUEADO') return 'ESPERA';
  return estado || 'SOLICITADO';
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
            ? { id: seccionOrigenId, numero: row.seccionOrigenNumero ?? null, nombre: textOrNull(row.seccionOrigenNombreSnapshot) ?? 'Posición registrada' }
            : null,
        }
      : null,
    viaDestino: viaDestinoId
      ? {
          id: viaDestinoId,
          nombre: torreonRef(row.viaDestinoNombreSnapshot, 'Via', viaDestinoId),
          seccion: seccionDestinoId
            ? { id: seccionDestinoId, numero: row.seccionDestinoNumero ?? null, nombre: textOrNull(row.seccionDestinoNombreSnapshot) ?? 'Posición registrada' }
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
    unidad: row.unidad ?? null,
    ronda:
      !row.unidad && (toPositiveInt(rondaItem.id) || toPositiveInt(ronda.id))
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
    pageSize: String(params.pagination.pageSize),
    fechaCampo: params.fechaCampo,
  });
  if (params.empresaId !== undefined) query.set('empresaId', String(params.empresaId));
  if (params.ambito) query.set('vista', params.ambito === 'pasados' ? 'PASADOS' : 'ACTIVOS');
  if (params.estados.length) query.set('estados', params.estados.join(','));
  for (const key of ['q', 'locomotivePrefix', 'locomotiveNumber', 'prioridad', 'sortBy', 'sortDir'] as const) {
    if (params[key] !== undefined && params[key] !== '') query.set(key, String(params[key]));
  }
  if (params.fechaDesde) query.set('fechaDesde', params.fechaDesde.toISOString());
  if (params.fechaHasta) query.set('fechaHasta', params.fechaHasta.toISOString());

  const response = await requestTorreonMs<{ data: TorreonSearchRow[]; meta: Record<string, unknown> }>(
    `/movimientos/buscar?${query.toString()}`, { method: 'GET' },
  );
  return {
    data: (await enrichNaturalSections(extractTorreonRows(response.data))).map(mapTorreonMovimientoParaCosaif),
    meta: response.data.meta,
  };
}
