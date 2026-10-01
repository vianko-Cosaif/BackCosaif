import { Rol } from '@prisma/client';
import { resolverAudienciaFcmNatural, type NaturalFcmRouting } from './naturalFcmRouting';

export type TipoServicioFcm = 'TORNO' | 'LAVADO' | 'TORNO_LAVADO';
export type ServiceFcmAudience =
  | 'OPERACION_CONTROL_SERVICIO'
  | 'CLIENTE_SERVICIO'
  | 'CLIENTE_CONTROL_SERVICIO'
  | 'TODOS_SERVICIO';

export type ServiceFcmRouting = {
  audience: ServiceFcmAudience;
  roles: Rol[];
  url: string;
};

const CLIENTE_ROLES: Rol[] = [Rol.CLIENTE, Rol.CLIENTE_ADMIN, Rol.CLIENTE_COOR];
const CONTROL_ROLES: Rol[] = [Rol.SUPERVISOR, Rol.COORDINADOR, Rol.ADMINISTRADOR];

const PARA_CLIENTE = new Set([
  'fin_servicio',
  'servicio_torno_iniciado',
  'servicio_torno_detenido',
  'servicio_torno_reanudado',
  'servicio_torno_concluido',
  'servicio_torno_cancelado',
]);

const PARA_CLIENTE_Y_CONTROL = new Set([
  'incidente_torno_reportado',
]);

const PARA_OPERACION_Y_CONTROL = new Set([
  'cambio_navaja_pendiente',
  'cambio_navaja_concluido',
  'cambio_navaja_actualizado',
]);

const PARA_TODOS = new Set([
  'incidente_torno_resuelto',
]);

export function tipoServicioFcm(movimiento: { torno?: boolean | null; lavado?: boolean | null }): TipoServicioFcm | null {
  if (movimiento.torno && movimiento.lavado) return 'TORNO_LAVADO';
  if (movimiento.torno) return 'TORNO';
  if (movimiento.lavado) return 'LAVADO';
  return null;
}

export function rolesOperadorServicio(tipo: TipoServicioFcm): Rol[] {
  if (tipo === 'TORNO') return [Rol.TORNO];
  if (tipo === 'LAVADO') return [Rol.LAVADO];
  return [Rol.TORNO, Rol.LAVADO];
}

export function resolverAudienciaFcmServicio(tipoEvento: string, servicio: TipoServicioFcm): ServiceFcmRouting | null {
  const operadores = rolesOperadorServicio(servicio);
  if (PARA_CLIENTE.has(tipoEvento)) {
    return { audience: 'CLIENTE_SERVICIO', roles: CLIENTE_ROLES, url: '/movimientos' };
  }
  if (PARA_CLIENTE_Y_CONTROL.has(tipoEvento)) {
    return {
      audience: 'CLIENTE_CONTROL_SERVICIO',
      roles: [...CLIENTE_ROLES, ...CONTROL_ROLES],
      url: '/incidentes',
    };
  }
  if (PARA_OPERACION_Y_CONTROL.has(tipoEvento)) {
    return {
      audience: 'OPERACION_CONTROL_SERVICIO',
      roles: [...operadores, ...CONTROL_ROLES],
      url: '/torno/navajas',
    };
  }
  if (PARA_TODOS.has(tipoEvento)) {
    return {
      audience: 'TODOS_SERVICIO',
      roles: [...operadores, ...CLIENTE_ROLES, ...CONTROL_ROLES],
      url: tipoEvento.includes('incidente') ? '/incidentes' : '/movimientos',
    };
  }
  return null;
}

export function resolverAudienciaFcmMovimiento(
  tipoEvento: string,
  movimiento: { torno?: boolean | null; lavado?: boolean | null }
): ServiceFcmRouting | NaturalFcmRouting | null {
  const servicio = tipoServicioFcm(movimiento);
  const eventoInternoServicio = servicio
    ? resolverAudienciaFcmServicio(tipoEvento, servicio)
    : null;

  // Que el destino sea torno/lavado no cambia quién realiza el traslado:
  // los eventos del Movimiento siguen la audiencia natural (MAQUINISTA/CLIENTE).
  return eventoInternoServicio ?? resolverAudienciaFcmNatural(tipoEvento);
}
