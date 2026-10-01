import type { RequestHandler } from 'express';
import { ZodError } from 'zod';
import { listCompactMovements, readMovementListQuery } from '../../application/movements/movementQuery';

export const listCompact: RequestHandler = async (req, res, next) => {
  try { res.json(await listCompactMovements(readMovementListQuery(req.query))); }
  catch (error) {
    if (error instanceof ZodError) { res.status(400).json({ error: 'Consulta inválida', details: error.issues }); return; }
    next(error);
  }
};
