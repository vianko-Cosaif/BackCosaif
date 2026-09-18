/** Only the start of a natural movement is public to clients of the same patio. */
export const PATIO_CLIENT_ROLES = ['CLIENTE', 'CLIENTE_ADMIN', 'CLIENTE_COOR'];

export function isPatioStart(event: { tipo?: unknown; type?: unknown; estado?: unknown; estadoAnterior?: unknown; accion?: unknown }) {
  if (['movimiento_iniciado', 'torreon_movimiento_iniciado'].includes(String(event.tipo))) return true;
  return ['movimiento.estado', 'torreon.movimiento.estado'].includes(String(event.type))
    && !String(event.accion ?? '').includes('reanud') && event.estado === 'EN_PROCESO' && event.estadoAnterior !== 'DETENIDO';
}

export function patioStartNotice(event: Record<string, any>) {
  const locomotive = event.locomotiveNumber ?? event.locomotora;
  return {
    type: event.type, tipo: event.tipo, eventId: event.eventId,
    source: event.source, movimientoId: event.movimientoId, empresaId: event.empresaId,
    localidadId: event.localidadId, occurredAt: event.occurredAt,
    estado: 'EN_PROCESO', notificationOnly: true, notificationScope: 'patio',
    recipientRoles: event.recipientRoles,
    notificationTitle: 'Movimiento iniciado en tu patio',
    notificationBody: `${locomotive ? `Locomotora ${locomotive} · ` : ''}Movimiento #${event.movimientoId}. La operación del patio está en marcha.`,
  };
}

export function canReceivePatioStart(role: string, yard: number | null | undefined, event: Record<string, any>) {
  return PATIO_CLIENT_ROLES.includes(role) && Number(yard) > 0
    && Number(yard) === Number(event.localidadId) && isPatioStart(event);
}
