/** Same operation has one identity across socket, FCM, retries and app restarts.
 * Repeated transitions/reminders retain their explicit event ID or revision. */
export function logicalNotificationId(event: Record<string, unknown>): string | null {
  const raw = String(event.tipo || event.type || event.eventType || '');
  const source = event.source === 'torreon' || raw.startsWith('torreon') || raw.startsWith('arrastre') ? 'torreon'
    : String(event.source || 'cosaif').replace(/^natural$/, 'cosaif');
  const yard = Number(event.localidadId);
  if (!Number.isSafeInteger(yard) || yard <= 0) return null;
  const kind = raw.replace(/^torreon[._]/, '').replace(/\./g, '_');
  let action: string | undefined;
  let entity = 'movimiento';
  let id = event.movimientoId;
  const state = String(event.estadoNuevo || event.estado || '').toUpperCase();
  if (['nuevo_movimiento', 'movimiento_creado', 'arrastre_creado'].includes(kind)) action = 'creado';
  if (kind.startsWith('arrastre_')) { entity = 'arrastre'; id = event.arrastreId; }
  if (/^(movimiento|arrastre)_(iniciado|concluido|cancelado)$/.test(kind)) action = kind.split('_')[1];
  if (kind === 'movimiento_estado' || kind === 'arrastre_estado') {
    if (state === 'EN_PROCESO' && event.estadoAnterior !== 'DETENIDO' && !String(event.accion || '').includes('reanud')) action = 'iniciado';
    if (state === 'CONCLUIDO') action = 'concluido';
    if (state === 'CANCELADO') action = 'cancelado';
  }
  if (kind.includes('incidente') && event.incidenteId) {
    entity = 'incidente'; id = event.incidenteId;
    if ((['nuevo_incidente', 'movimiento_incidente', 'incidente_creado', 'arrastre_incidente'].includes(kind) || (kind.endsWith('incidente_estado') && state === 'ABIERTO'))) action = 'creado';
    if (/resuelto|continuado/.test(kind) || (kind.endsWith('incidente_estado') && state === 'RESUELTO')) action = 'resuelto';
    if (/cerrado|timeout/.test(kind) || (kind.endsWith('incidente_estado') && state === 'CERRADO')) action = 'cerrado';
  }
  const numericId = Number(id);
  if (!action || !Number.isSafeInteger(numericId) || numericId <= 0) return null;
  return `operation:v1:${source}:${yard}:${entity}:${numericId}:${action}`;
}
