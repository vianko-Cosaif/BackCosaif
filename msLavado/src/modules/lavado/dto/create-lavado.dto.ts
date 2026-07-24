import type { TipoLavadoValue } from "../types/lavado.types";

export interface CreateLavadoDto {
  movimientoId: number;
  tipoLavado: TipoLavadoValue;
  duracionEstimadaMinutos?: number;
}

export interface CreateLavadoCommand extends CreateLavadoDto {
  locomotiveNumber: number;
  empresaId: number;
  empresaNombreSnapshot: string;
  localidadId: number;
  localidadNombreSnapshot: string;
  creadoPorId: number;
}
