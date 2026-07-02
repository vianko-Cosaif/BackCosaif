import type { Request, Response } from "express";
import { ok } from "../../utils/http";
import { resolverIncidenteSchema } from "./incidente.schemas";
import { IncidenteModel } from "./incidente.model";

const optionalNumber = (value: unknown) => {
  if (value === undefined || value === "") return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const parsePageNumber = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : fallback;
};

export class IncidenteController {
  static async listar(req: Request, res: Response) {
    const result = await IncidenteModel.listar({
      localidadId: optionalNumber(req.query.localidadId),
      empresaId: optionalNumber(req.query.empresaId),
      estado: typeof req.query.estado === "string" ? req.query.estado : undefined,
      page: parsePageNumber(req.query.page, 1),
      pageSize: parsePageNumber(req.query.pageSize, 20),
    });
    return ok(res, result.data, result.meta);
  }

  static async obtener(req: Request, res: Response) {
    const id = Number(req.params.id);
    const data = await IncidenteModel.obtener(id);
    return ok(res, data);
  }

  static async resolver(req: Request, res: Response) {
    const id = Number(req.params.id);
    const payload = resolverIncidenteSchema.parse(req.body);
    const data = await IncidenteModel.resolver(id, payload);
    return ok(res, data);
  }
}
