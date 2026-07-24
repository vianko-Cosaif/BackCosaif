import type { Request, Response } from "express";
import { ok } from "../../../utils/http";
import { LavadoService } from "../services/lavado.service";
import {
  createLavadoSchema,
  finalizarFaseSchema,
  iniciarFaseSchema,
  lavadoFaseParamsSchema,
  lavadoIdParamsSchema,
  listarLavadosSchema,
  updateLavadoSchema,
} from "../validators/lavado.schema";

export class LavadoController {
  static async catalogos(_req: Request, res: Response) {
    return ok(res, LavadoService.catalogos());
  }

  static async listar(req: Request, res: Response) {
    const query = listarLavadosSchema.parse(req.query);
    const result = await LavadoService.listar(query);
    return ok(res, result.data, result.meta);
  }

  static async obtener(req: Request, res: Response) {
    const { id } = lavadoIdParamsSchema.parse(req.params);
    return ok(res, await LavadoService.obtener(id));
  }

  static async crear(req: Request, res: Response) {
    const input = createLavadoSchema.parse(req.body);
    const data = await LavadoService.crear(input);
    return res.status(201).json(data);
  }

  static async actualizar(req: Request, res: Response) {
    const { id } = lavadoIdParamsSchema.parse(req.params);
    const input = updateLavadoSchema.parse(req.body);
    return ok(res, await LavadoService.actualizar(id, input));
  }

  static async iniciarFase(req: Request, res: Response) {
    const { id, faseId } = lavadoFaseParamsSchema.parse(req.params);
    const { actorId } = iniciarFaseSchema.parse(req.body);
    return ok(res, await LavadoService.iniciarFase(id, faseId, actorId));
  }

  static async finalizarFase(req: Request, res: Response) {
    const { id, faseId } = lavadoFaseParamsSchema.parse(req.params);
    const input = finalizarFaseSchema.parse(req.body);
    return ok(res, await LavadoService.finalizarFase(id, faseId, input));
  }
}
