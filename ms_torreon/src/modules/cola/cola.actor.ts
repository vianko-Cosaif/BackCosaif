import { z } from 'zod';
import { DomainError } from '../../utils/domainError';
import type { NaturalActor } from './cola.model';
export const actorNatural = (req: { headers: Record<string, unknown>; body?: { _clientScope?: unknown } }): NaturalActor => {
  const scope = req.body?._clientScope === undefined ? {} : z.object({ empresaId: z.number().int().positive(), localidadId: z.number().int().positive() }).parse(req.body._clientScope);
  return { id: z.coerce.number().int().positive().parse(req.headers['x-user-id']), rol: String(req.headers['x-user-rol'] ?? ''), ...scope };
};
export const driverNatural = (req: { headers: Record<string, unknown> }) => {
  const actor = actorNatural(req);
  if (actor.rol !== 'MAQUINISTA') throw new DomainError(403, 'La ejecución corresponde al maquinista asignado');
  return actor;
};
