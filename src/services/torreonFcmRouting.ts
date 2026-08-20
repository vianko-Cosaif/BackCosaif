import { Rol } from '@prisma/client';

export type TorreonFcmAudience =
  | 'MAQUINISTA_ARRASTRE'
  | 'CLIENTE_ARRASTRE'
  | 'MAQUINISTA_NATURAL'
  | 'CLIENTE_NATURAL';

export type TorreonFcmRouting = {
  audience: TorreonFcmAudience;
  roles: Rol[];
  url: string;
};

const PARA_MAQUINISTA = new Set([
  'arrastre_creado',
  'arrastre_editado',
  'arrastre_vagon_editado',
  'arrastre_cancelado',
  'arrastre_incidente_resuelto',
]);

const PARA_CLIENTE = new Set([
  'arrastre_iniciado',
  'arrastre_reanudado',
  'arrastre_vagon_iniciado',
  'arrastre_vagon_finalizado',
  'arrastre_concluido',
  'arrastre_incidente',
]);

const NATURAL_PARA_MAQUINISTA = new Set([
  'torreon_movimiento_creado',
  'incidente_resuelto_cliente',
  'incidente_cerrado_manual',
]);

const NATURAL_PARA_CLIENTE = new Set([
  'torreon_movimiento_iniciado',
  'torreon_movimiento_reanudado',
  'torreon_movimiento_concluido',
  'nuevo_incidente',
]);

export function resolverAudienciaFcmTorreon(tipo: string): TorreonFcmRouting | null {
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
      roles: [Rol.ARRASTRE_TORREON, Rol.CLIENTE_ADMIN, Rol.CLIENTE_COOR],
      url: tipo === 'arrastre_incidente'
        ? '/cliente/torreon/incidentes'
        : '/cliente/torreon/movimientos',
    };
  }

  if (NATURAL_PARA_MAQUINISTA.has(tipo)) {
    return {
      audience: 'MAQUINISTA_NATURAL',
      roles: [Rol.MAQUINISTA],
      url: tipo.startsWith('incidente_')
        ? '/incidentes?source=torreon'
        : '/movimientos',
    };
  }

  if (NATURAL_PARA_CLIENTE.has(tipo)) {
    return {
      audience: 'CLIENTE_NATURAL',
      roles: [Rol.CLIENTE, Rol.CLIENTE_ADMIN, Rol.CLIENTE_COOR],
      url: tipo === 'nuevo_incidente'
        ? '/incidentes?source=torreon'
        : '/movimientos',
    };
  }

  return null;
}
