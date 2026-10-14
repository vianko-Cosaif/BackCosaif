import type { BitacoraNaturalTorreon, Prisma } from '../../../generated';

/** Preserve shared transitions without exposing another company's request or incident. */
export function proyectarHistorialNatural(
  rows: BitacoraNaturalTorreon[], unidadId: number, movimientoIds: number[],
) {
  const own = new Set(movimientoIds);
  const ownOrigins = new Set(rows.filter(row => row.movimientoId != null && own.has(row.movimientoId))
    .map(row => row.unidadId).filter((id): id is number => id != null));
  const ownActors = new Set(rows.filter(row => row.movimientoId != null && own.has(row.movimientoId)).map(row => row.usuarioId));
  const result: BitacoraNaturalTorreon[] = [];
  for (const row of rows) {
    if (row.movimientoId != null) {
      if (own.has(row.movimientoId)) result.push(row.accion === 'REPORTAR_INCIDENTE'
        ? { ...row, datos: { ...(row.datos as object), movimientoIds } } : row);
      else if (row.unidadId === unidadId && row.accion === 'REPORTAR_INCIDENTE') {
        result.push({ ...row, movimientoId: null, incidenteId: null, usuarioId: 0, rol: 'SISTEMA',
          datos: { movimientoIds, efectoConjunto: true } });
      }
      continue;
    }
    if (row.unidadId !== unidadId && !ownOrigins.has(row.unidadId ?? 0)) continue;
    const data = row.datos && typeof row.datos === 'object' && !Array.isArray(row.datos) ? row.datos : {};
    const safe: Prisma.JsonObject = {};
    for (const key of ['ordenManual', 'modalidad', 'operadorId', 'operadorAnteriorId', 'fechaHabilitacion', 'origen']) {
      if (key in data) safe[key] = data[key];
    }
    if (Array.isArray(data.movimientoIds)) safe.movimientoIds = data.movimientoIds.filter(id => typeof id === 'number' && own.has(id));
    if (Array.isArray(data.unidadesOrigen)) safe.unidadesOrigen = data.unidadesOrigen.filter(id => typeof id === 'number' && ownOrigins.has(id));
    const foreignClient = row.rol?.startsWith('CLIENTE') && !ownActors.has(row.usuarioId);
    result.push({ ...row, ...(foreignClient ? { usuarioId: 0, rol: 'SISTEMA' } : {}), datos: safe });
  }
  return result;
}
