import type { Request, Response } from "express";
import { ok } from "../../utils/http";
import { CatalogoArrastreModel } from "./catalogoArrastre.model";
import { listCatalogoArrastreSchema, saveCatalogoArrastreSchema } from "./catalogoArrastre.schemas";

export class CatalogoArrastreController {
  static async listar(req: Request, res: Response) {
    const { localidadId } = listCatalogoArrastreSchema.parse(req.query);
    return ok(res, await CatalogoArrastreModel.listar(localidadId));
  }

  static async guardar(req: Request, res: Response) {
    const payload = saveCatalogoArrastreSchema.parse(req.body);
    return ok(res, await CatalogoArrastreModel.guardar(payload));
  }
}
