import { Rol } from '@prisma/client';

export type NaturalFcmAudience = 'MAQUINISTA_NATURAL' | 'CLIENTE_NATURAL' | 'AMBOS_NATURAL';

export type NaturalFcmRouting = {
  audience: NaturalFcmAudience;
  roles: Rol[];
  url: string;
};

const MAQUINISTA_ROLES: Rol[] = [Rol.MAQUINISTA];
const CLIENTE_ROLES: Rol[] = [Rol.CLIENTE, Rol.CLIENTE_ADMIN, Rol.CLIENTE_COOR];

const PARA_MAQUINISTA = new Set([
  'nuevo_movimiento',
  'movimiento_editado',
  'cambio_prioridad',
  'movimiento_cancelado',
  'incidente_resuelto_cliente',
  'incidente_continuado',
  'incidente_cerrado_manual',
  'incidente_timeout',
  'incidente_omitido',
  'incidente_actualizado',
]);

const PARA_CLIENTE = new Set([
  'movimiento_iniciado',
  'movimiento_reanudado',
  'movimiento_detenido',
  'movimiento_concluido',
  'nuevo_incidente',
  'fin_servicio',
]);

const PARA_AMBOS = new Set([
  'movimiento_cancelado_incidentes',
]);

export function resolverAudienciaFcmNatural(tipo: string): NaturalFcmRouting | null {
  if (PARA_MAQUINISTA.has(tipo)) {
    return {
      audience: 'MAQUINISTA_NATURAL',
      roles: MAQUINISTA_ROLES,
      url: tipo.startsWith('incidente_') ? '/incidentes' : '/movimientos',
    };
  }

  if (PARA_CLIENTE.has(tipo)) {
    return {
      audience: 'CLIENTE_NATURAL',
      roles: CLIENTE_ROLES,
      url: tipo === 'nuevo_incidente' ? '/incidentes' : '/movimientos',
    };
  }

  if (PARA_AMBOS.has(tipo)) {
    return {
      audience: 'AMBOS_NATURAL',
      roles: [...MAQUINISTA_ROLES, ...CLIENTE_ROLES],
      url: '/movimientos',
    };
  }

  return null;
}
