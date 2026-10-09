import { Router } from 'express';
import { z } from 'zod';
import { prismaTorreon } from '../../db/prisma';
import { asyncHandler } from '../../utils/asyncHandler';
import { DomainError } from '../../utils/domainError';
import { actorNatural } from './cola.actor';
import { ColaNaturalModel, type NaturalActor } from './cola.model';
import { NATURAL_DISPATCH_ROLES } from './cola.policy';
import { MovimientoModel } from '../movimientos/movimiento.model';
import { iniciarMovimientoSchema, finalizarMovimientoSchema } from '../movimientos/movimiento.schemas';

export const colaRouter = Router();
const idSchema = z.coerce.number().int().positive();
const querySchema = z.object({ localidadId: idSchema, empresaId: idSchema.optional(), historial: z.enum(['true', 'false']).optional() });

const dispatcher = (actor: NaturalActor) => { if (!NATURAL_DISPATCH_ROLES.has(actor.rol ?? '')) throw new DomainError(403, 'Solo coordinación o supervisión puede ordenar, agrupar y asignar'); };
colaRouter.get('/', asyncHandler(async (req, res) => {
  const q = querySchema.parse(req.query);
  const actor = req.headers['x-user-rol'] === 'MAQUINISTA' ? actorNatural(req) : undefined;
  res.json(await ColaNaturalModel.listar(q.localidadId, q.empresaId, q.historial === 'true', actor));
}));
colaRouter.get('/siguiente', asyncHandler(async (req, res) => {
  const q = querySchema.parse(req.query);
  const actor = actorNatural(req);
  const unit = await prismaTorreon.$transaction(tx => ColaNaturalModel.siguienteTx(tx, q.localidadId, actor.id));
  res.json(unit ? { source: 'torreon', unidad: unit, movimiento: unit.movimientos.find(m => !['CONCLUIDO', 'CANCELADO'].includes(m.estado)), vacio: false } : { source: 'torreon', vacio: true });
}));
colaRouter.patch('/priorizar', asyncHandler(async (req, res) => {
  const actor = actorNatural(req); dispatcher(actor);
  const input = z.object({ unidadIds: z.array(idSchema).min(1).max(100), enConjunto: z.boolean().default(false) }).parse(req.body);
  if (new Set(input.unidadIds).size !== input.unidadIds.length) throw new DomainError(400, 'Selecciona unidades distintas');
  res.json(await ColaNaturalModel.priorizar(input.unidadIds, input.enConjunto, actor));
}));
colaRouter.patch('/:id/asignar', asyncHandler(async (req, res) => {
  const actor = actorNatural(req); dispatcher(actor);
  const { operadorId } = z.object({ operadorId: idSchema }).parse(req.body);
  res.json(await ColaNaturalModel.asignar(idSchema.parse(req.params.id), operadorId, actor));
}));
colaRouter.get('/:id/historial', asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  res.json(await ColaNaturalModel.historial(id));
}));
colaRouter.post('/:id/reanudar', asyncHandler(async () => {
  throw new DomainError(403, 'La reanudación requiere solución externa del incidente. Cuando esté habilitada, toma la unidad con Iniciar.');
}));
for (const action of ['iniciar', 'finalizar'] as const) {
  colaRouter.post(`/:id/${action}`, asyncHandler(async (req, res) => {
    const actor = actorNatural(req);
    if (actor.rol !== 'MAQUINISTA') throw new DomainError(403, 'La ejecución corresponde al maquinista');
    const unit = await prismaTorreon.unidadAtencionTorreon.findUnique({ where: { id: idSchema.parse(req.params.id) }, include: { movimientos: { orderBy: { id: 'asc' } } } });
    const movement = unit?.movimientos.find(m => !['CONCLUIDO', 'CANCELADO'].includes(m.estado)) ?? unit?.movimientos[0];
    if (!movement) throw new DomainError(404, 'Unidad no encontrada');
    const body = { ...req.body, operadorId: actor.id, iniciadoPorId: actor.id, finalizadoPorId: actor.id };
    const result = action === 'iniciar' ? await MovimientoModel.iniciar(movement.id, iniciarMovimientoSchema.parse(body), actor)
      : await MovimientoModel.finalizar(movement.id, finalizarMovimientoSchema.parse(body), actor);
    res.json(result);
  }));
}
