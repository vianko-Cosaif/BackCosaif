import type { Request, Response } from "express";
import { ok } from "../../utils/http";
import { resolverIncidenteSchema } from "./incidente.schemas";
import { IncidenteModel } from "./incidente.model";

export class IncidenteController {
  static async resolver(req: Request, res: Response) {
    const id = Number(req.params.id);
    const payload = resolverIncidenteSchema.parse(req.body);
    const data = await IncidenteModel.resolver(id, payload);
    return ok(res, data);
  }
}
