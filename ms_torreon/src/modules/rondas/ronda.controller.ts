import type { Request, Response } from "express";
import { ok } from "../../utils/http";
import { RondaModel } from "./ronda.model";
import { reordenarRondaMovimientoSchema } from "./ronda.schemas";

const optionalNumber = (value: unknown) => {
  if (value === undefined || value === "") return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

export class RondaController {
  static async listar(req: Request, res: Response) {
    const data = await RondaModel.listar({
      localidadId: optionalNumber(req.query.localidadId),
      estado: typeof req.query.estado === "string" ? req.query.estado : undefined,
    });
    return ok(res, data);
  }

  static async obtener(req: Request, res: Response) {
    const data = await RondaModel.obtener(Number(req.params.id));
    return ok(res, data);
  }

  static async reordenarMovimiento(req: Request, res: Response) {
    const payload = reordenarRondaMovimientoSchema.parse(req.body);
    const data = await RondaModel.reordenarMovimiento(payload);
    return ok(res, data);
  }
}
