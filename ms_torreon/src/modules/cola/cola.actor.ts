import { z } from 'zod';
import { DomainError } from '../../utils/domainError';
import type { NaturalActor } from './cola.model';
export const actorNatural = (req: { headers: Record<string, unknown> }): NaturalActor => ({ id: z.coerce.number().int().positive().parse(req.headers['x-user-id']), rol: String(req.headers['x-user-rol'] ?? '') });
export const driverNatural = (req: { headers: Record<string, unknown> }) => {
  const actor = actorNatural(req);
  if (actor.rol !== 'MAQUINISTA') throw new DomainError(403, 'La ejecución corresponde al maquinista asignado');
  return actor;
};
