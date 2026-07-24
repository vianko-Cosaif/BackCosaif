import type { ActorCommand } from "../types/lavado.types";

export interface FinalizarFaseDto {
  observaciones?: string;
}

export interface FinalizarFaseCommand extends FinalizarFaseDto, ActorCommand {}
