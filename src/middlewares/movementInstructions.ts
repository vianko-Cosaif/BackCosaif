import type { RequestHandler } from 'express';
import { parseMetaFromInstrucciones } from '../models/Movimientos/movimiento.meta';
import { instruccionesVisibles } from '../models/Movimientos/movimiento.instructions';

// Format at the HTTP boundary: internal consumers still read the stored operational metadata.
export function presentarInstrucciones(value: any): any {
  if (Array.isArray(value)) return value.map(presentarInstrucciones);
  if (!value || typeof value !== 'object' || typeof value.toJSON === 'function' || Buffer.isBuffer(value)) return value;
  if (String(value.source ?? '').toLowerCase() === 'torreon') return value;

  const result: Record<string, any> = {};
  for (const [key, child] of Object.entries(value)) result[key] = presentarInstrucciones(child);
  if (typeof value.instrucciones === 'string') {
    result.instrucciones = instruccionesVisibles(value.instrucciones);
    if (/\[META\s+[^\]]*\]/i.test(value.instrucciones)) {
      result.meta = { ...parseMetaFromInstrucciones(value.instrucciones), ...result.meta };
    }
  }
  return result;
}

export const presentarInstruccionesMovimiento: RequestHandler = (req, res, next) => {
  // Legacy edit clients still read section tags; keep their existing editing contract.
  if (/\/\d+\/edicion\/?$/.test(req.path ?? '')) { next(); return; }
  const json = res.json.bind(res);
  res.json = body => json(presentarInstrucciones(body));
  next();
};
