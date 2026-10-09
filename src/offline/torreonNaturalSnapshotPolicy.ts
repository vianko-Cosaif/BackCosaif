type Incident = { estado: string; unidadId?: number | null; movimientoId?: number | null; viaBloqueadaId?: number | null; seccionBloqueadaId?: number | null };
type Movement = { id: number; estado: string; viaOrigenId?: number | null; viaDestinoId?: number | null; seccionOrigenId?: number | null; seccionDestinoId?: number | null; incidentes?: readonly Incident[] };
type Unit = { id: number; estado: string; movimientos: readonly Movement[]; incidentes?: readonly Incident[] };

/** Only executable Torreón groups belong in the driver's downloaded work list. */
export function isTorreonNaturalSnapshotUnitAvailable(unit: Unit, incidents: readonly Incident[]) {
  if (!['PENDIENTE', 'EN_PROCESO', 'LISTA_REANUDAR'].includes(unit.estado)) return false;
  const members = unit.movimientos.filter(m => !['CONCLUIDO', 'CANCELADO'].includes(m.estado));
  if (!members.length || (unit.estado !== 'LISTA_REANUDAR' && members.some(m => m.estado === 'DETENIDO'))) return false;
  if (unit.incidentes?.some(i => i.estado === 'ABIERTO') || members.some(m => m.incidentes?.some(i => i.estado === 'ABIERTO'))) return false;
  const movementIds = new Set(members.map(m => m.id));
  const tracks = new Set(members.flatMap(m => [m.viaOrigenId, m.viaDestinoId]).filter((id): id is number => id != null));
  const sections = new Set(members.flatMap(m => [m.seccionOrigenId, m.seccionDestinoId]).filter((id): id is number => id != null));
  return !incidents.some(i => i.estado === 'ABIERTO' && (i.unidadId === unit.id
    || (i.movimientoId != null && movementIds.has(i.movimientoId))
    || (i.viaBloqueadaId != null && tracks.has(i.viaBloqueadaId))
    || (i.seccionBloqueadaId != null && sections.has(i.seccionBloqueadaId))));
}
