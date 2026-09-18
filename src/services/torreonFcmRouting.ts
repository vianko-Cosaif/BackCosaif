import { Rol } from '@prisma/client';

export type TorreonFcmAudience =
  | 'OPERACION_ARRASTRE'
  | 'CLIENTE_CONTROL_ARRASTRE'
  | 'OPERACION_NATURAL'
  | 'CLIENTE_CONTROL_NATURAL'
  | 'MAQUINISTA_ARRASTRE'
  | 'CLIENTE_ARRASTRE'
  | 'CLIENTE_NATURAL';

export type TorreonFcmRouting = {
  audience: TorreonFcmAudience;
  roles: Rol[];
  url: string;
};

const PARA_MAQUINISTA = new Set([
  'arrastre_editado',
  'arrastre_vagon_editado',
  'arrastre_cancelado',
]);

const PARA_CLIENTE = new Set([
  'arrastre_iniciado',
  'arrastre_reanudado',
  'arrastre_vagon_iniciado',
  'arrastre_vagon_finalizado',
  'arrastre_concluido',
]);

const NATURAL_PARA_CLIENTE = new Set([
  'torreon_movimiento_iniciado',
  'torreon_movimiento_reanudado',
  'torreon_movimiento_concluido',
]);

export function resolverAudienciaFcmTorreon(tipo: string): TorreonFcmRouting | null {
  if (['arrastre_creado', 'arrastre_incidente_resuelto', 'arrastre_pendiente_recordatorio', 'arrastre_incidente_cerrado'].includes(tipo)) {
    return { audience: 'OPERACION_ARRASTRE', roles: [Rol.MAQUINISTA_ARRASTRE, Rol.COORDINADOR, Rol.SUPERVISOR],
      url: tipo.includes('incidente') ? '/cliente/torreon/incidentes' : '/cliente/torreon/movimientos' };
  }
  if (tipo === 'arrastre_incidente') {
    return { audience: 'CLIENTE_CONTROL_ARRASTRE', roles: [Rol.ARRASTRE_TORREON, Rol.COORDINADOR, Rol.SUPERVISOR, Rol.MAQUINISTA_ARRASTRE], url: '/cliente/torreon/incidentes' };
  }
  if (['torreon_movimiento_creado', 'incidente_resuelto_cliente', 'incidente_cerrado_manual', 'movimiento_pendiente_recordatorio'].includes(tipo)) {
    return { audience: 'OPERACION_NATURAL', roles: [Rol.MAQUINISTA, Rol.COORDINADOR, Rol.SUPERVISOR],
      url: tipo.startsWith('incidente_') ? '/incidentes?source=torreon' : '/movimientos' };
  }
  if (tipo === 'nuevo_incidente') {
    return { audience: 'CLIENTE_CONTROL_NATURAL', roles: [Rol.CLIENTE, Rol.CLIENTE_ADMIN, Rol.CLIENTE_COOR, Rol.COORDINADOR, Rol.SUPERVISOR, Rol.MAQUINISTA], url: '/incidentes?source=torreon' };
  }
  if (PARA_MAQUINISTA.has(tipo)) {
    return {
      audience: 'MAQUINISTA_ARRASTRE',
      roles: [Rol.MAQUINISTA_ARRASTRE],
      url: '/cliente/torreon/movimientos',
    };
  }

  if (PARA_CLIENTE.has(tipo)) {
    return {
      audience: 'CLIENTE_ARRASTRE',
      roles: [Rol.ARRASTRE_TORREON, Rol.MAQUINISTA_ARRASTRE],
      url: '/cliente/torreon/movimientos',
    };
  }

  if (NATURAL_PARA_CLIENTE.has(tipo)) {
    return {
      audience: 'CLIENTE_NATURAL',
      roles: [Rol.CLIENTE, Rol.CLIENTE_ADMIN, Rol.CLIENTE_COOR, Rol.MAQUINISTA],
      url: '/movimientos',
    };
  }

  return null;
}
