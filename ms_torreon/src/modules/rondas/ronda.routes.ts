import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { RondaController } from './ronda.controller';
export const rondaRouter = Router();
rondaRouter.get('/', asyncHandler(RondaController.listar));
rondaRouter.get('/:id', asyncHandler(RondaController.obtener));
rondaRouter.use((_req, res) => { res.status(409).json({ error: 'Los movimientos naturales de Torreón operan mediante cola; las rondas solo conservan su historial' }); });
