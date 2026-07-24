export const TIPOS_LAVADO = ["MANUAL", "AUTOMATICO", "PROFUNDO"] as const;
export type TipoLavadoValue = (typeof TIPOS_LAVADO)[number];

export const ESTADOS_LAVADO_PROCESO = ["PENDIENTE", "EN_PROCESO", "FINALIZADO"] as const;
export type EstadoLavadoProcesoValue = (typeof ESTADOS_LAVADO_PROCESO)[number];

export const ESTADOS_LAVADO_FASE = ["PENDIENTE", "EN_PROCESO", "FINALIZADA"] as const;
export type EstadoLavadoFaseValue = (typeof ESTADOS_LAVADO_FASE)[number];

export type ListarLavadosQuery = {
  page: number;
  pageSize: number;
  estado?: EstadoLavadoProcesoValue;
  tipoLavado?: TipoLavadoValue;
  localidadId?: number;
  empresaId?: number;
  movimientoId?: number;
  locomotiveNumber?: number;
};

export type ActorCommand = {
  actorId: number;
};
