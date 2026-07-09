import type { Request, Response } from "express";
import { ok } from "../../utils/http";
import { ArrastreModel } from "./arrastre.model";
import {
  cancelarArrastreSchema,
  createArrastreSchema,
  crearIncidenteArrastreSchema,
  editarVagonArrastreSchema,
  finalizarArrastreSchema,
  finalizarVagonArrastreSchema,
  iniciarArrastreSchema,
  iniciarVagonArrastreSchema,
  reanudarArrastreSchema,
  reordenarSolicitudesArrastreSchema,
  reordenarVagonesArrastreSchema,
  resolverIncidenteArrastreSchema,
} from "./arrastre.schemas";

const parseIdParam = (req: Request) => Number(req.params.id);
const parseVagonIdParam = (req: Request) => Number(req.params.vagonId);
const parseIncidenteIdParam = (req: Request) => Number(req.params.incidenteId);

const optionalNumber = (value: unknown) => {
  if (value === undefined || value === "") return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const optionalBoolean = (value: unknown) => {
  if (value === undefined || value === "") return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "si", "sí", "yes"].includes(normalized)) return true;
  if (["0", "false", "no"].includes(normalized)) return false;
  return undefined;
};

export class ArrastreController {
  static async listar(req: Request, res: Response) {
    const data = await ArrastreModel.listar({
      localidadId: optionalNumber(req.query.localidadId),
      empresaId: optionalNumber(req.query.empresaId),
      estado: typeof req.query.estado === "string" ? req.query.estado : undefined,
      vista: typeof req.query.vista === "string" ? req.query.vista : undefined,
      page: optionalNumber(req.query.page),
      pageSize: optionalNumber(req.query.pageSize),
      includeFotos: optionalBoolean(req.query.includeFotos),
    });
    return ok(res, data);
  }

  static async obtener(req: Request, res: Response) {
    const data = await ArrastreModel.obtener(
      parseIdParam(req),
      optionalBoolean(req.query.includeFotos) !== false
    );
    return ok(res, data);
  }

  static async crear(req: Request, res: Response) {
    const payload = createArrastreSchema.parse(req.body);
    const data = await ArrastreModel.crear(payload);
    return res.status(201).json(data);
  }

  static async iniciar(req: Request, res: Response) {
    const payload = iniciarArrastreSchema.parse(req.body);
    const data = await ArrastreModel.iniciar(parseIdParam(req), payload);
    return ok(res, data);
  }

  static async finalizar(req: Request, res: Response) {
    const payload = finalizarArrastreSchema.parse(req.body);
    const data = await ArrastreModel.finalizar(parseIdParam(req), payload);
    return ok(res, data);
  }

  static async cancelar(req: Request, res: Response) {
    const payload = cancelarArrastreSchema.parse(req.body);
    const data = await ArrastreModel.cancelar(parseIdParam(req), payload);
    return ok(res, data);
  }

  static async iniciarVagon(req: Request, res: Response) {
    const payload = iniciarVagonArrastreSchema.parse(req.body);
    const data = await ArrastreModel.iniciarVagon(parseIdParam(req), parseVagonIdParam(req), payload);
    return ok(res, data);
  }

  static async finalizarVagon(req: Request, res: Response) {
    const payload = finalizarVagonArrastreSchema.parse(req.body);
    const data = await ArrastreModel.finalizarVagon(parseIdParam(req), parseVagonIdParam(req), payload);
    return ok(res, data);
  }

  static async editarVagon(req: Request, res: Response) {
    const payload = editarVagonArrastreSchema.parse(req.body);
    const data = await ArrastreModel.editarVagon(parseIdParam(req), parseVagonIdParam(req), payload);
    return ok(res, data);
  }

  static async reordenarVagones(req: Request, res: Response) {
    const payload = reordenarVagonesArrastreSchema.parse(req.body);
    const data = await ArrastreModel.reordenarVagones(parseIdParam(req), payload);
    return ok(res, data);
  }

  static async reordenarSolicitudes(req: Request, res: Response) {
    const payload = reordenarSolicitudesArrastreSchema.parse(req.body);
    const data = await ArrastreModel.reordenarSolicitudes(payload);
    return ok(res, data);
  }

  static async crearIncidente(req: Request, res: Response) {
    const payload = crearIncidenteArrastreSchema.parse(req.body);
    const data = await ArrastreModel.crearIncidente(parseIdParam(req), payload);
    return res.status(201).json(data);
  }

  static async resolverIncidente(req: Request, res: Response) {
    const payload = resolverIncidenteArrastreSchema.parse(req.body);
    const data = await ArrastreModel.resolverIncidente(parseIdParam(req), parseIncidenteIdParam(req), payload);
    return ok(res, data);
  }

  static async reanudar(req: Request, res: Response) {
    const payload = reanudarArrastreSchema.parse(req.body);
    const data = await ArrastreModel.reanudar(parseIdParam(req), payload);
    return ok(res, data);
  }
}
