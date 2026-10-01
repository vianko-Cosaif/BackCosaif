import { resolverAudienciaFcmNatural } from './naturalFcmRouting';

/** Realtime state updates are broader than alerts. Unknown maintenance events remain silent. */
export function realtimeNotificationRoles(event: {
  type: string; estado?: string | null; estadoAnterior?: string | null;
  recipientRoles?: string[];
}) {
  if (event.recipientRoles) return event.recipientRoles;
  let tipo = '';
  if (event.type === 'movimiento.creado') tipo = 'nuevo_movimiento';
  if (event.type === 'movimiento.incidente') tipo = 'nuevo_incidente';
  if (event.type === 'incidente.estado') {
    tipo = event.estado === 'ABIERTO' ? 'nuevo_incidente'
      : event.estado === 'RESUELTO' ? 'incidente_resuelto_cliente'
      : event.estado === 'CERRADO' ? 'incidente_cerrado_manual' : 'incidente_actualizado';
  }
  if (event.type === 'torno.estado') tipo = 'fin_servicio';
  if (event.type === 'movimiento.estado') {
    tipo = ({ EN_PROCESO: event.estadoAnterior === 'DETENIDO' ? 'movimiento_reanudado' : 'movimiento_iniciado',
      DETENIDO: 'movimiento_detenido', CONCLUIDO: 'movimiento_concluido', CANCELADO: 'movimiento_cancelado' } as Record<string, string>)[event.estado ?? ''] ?? '';
  }
  return resolverAudienciaFcmNatural(tipo)?.roles ?? [];
}
