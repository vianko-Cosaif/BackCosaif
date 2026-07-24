import type { ActorCommand, TipoLavadoValue } from "../types/lavado.types";

export interface UpdateLavadoDto {
  tipoLavado?: TipoLavadoValue;
  duracionEstimadaMinutos?: number | null;
}

export interface UpdateLavadoCommand extends UpdateLavadoDto, ActorCommand {}
