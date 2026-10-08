import type { Request, Response } from "express";
import { ok } from "../../utils/http";
import { crearIncidenteMovimientoSchema } from "../incidentes/incidente.schemas";
import {
  cancelarMovimientoSchema,
  createMovimientoSchema,
  createLoteSchema,
  editMovimientoSchema,
  finalizarMovimientoSchema,
  iniciarMovimientoSchema,
  registrarFotosMovimientoSchema,
  reanudarMovimientoSchema,
} from "./movimiento.schemas";
import { actorNatural, driverNatural } from "../cola/cola.actor";
import { MovimientoModel } from "./movimiento.model";

const parseIdParam = (req: Request) => Number(req.params.id);

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

export class MovimientoController {
  static async listar(req: Request, res: Response) {
    const data = await MovimientoModel.listar({
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
    const data = await MovimientoModel.obtener(parseIdParam(req));
    return ok(res, data);
  }

  static async crear(req: Request, res: Response) {
    const payload = createMovimientoSchema.parse(req.body);
    const data = await MovimientoModel.crear(payload, actorNatural(req));
    return res.status(201).json(data);
  }

  static async crearLote(req: Request, res: Response) {
    res.status(201).json(await MovimientoModel.crearLote(createLoteSchema.parse(req.body), actorNatural(req)));
  }

  static async obtenerEdicion(req: Request, res: Response) {
    return res.json(await MovimientoModel.obtenerEdicion(parseIdParam(req)));
  }

  static async editar(req: Request, res: Response) {
    const payload = editMovimientoSchema.parse(req.body);
    const data = await MovimientoModel.editar(parseIdParam(req), payload, actorNatural(req));
    return ok(res, data);
  }

  static async cancelar(req: Request, res: Response) {
    const { razon } = cancelarMovimientoSchema.parse(req.body);
    return ok(res, await MovimientoModel.cancelar(parseIdParam(req), razon, actorNatural(req)));
  }

  static async iniciar(req: Request, res: Response) {
    const payload = iniciarMovimientoSchema.parse(req.body);
    const data = await MovimientoModel.iniciar(parseIdParam(req), payload, driverNatural(req));
    return ok(res, data);
  }

  static async registrarFotos(req: Request, res: Response) {
    const payload = registrarFotosMovimientoSchema.parse(req.body);
    const data = await MovimientoModel.registrarFotos(parseIdParam(req), payload, driverNatural(req));
    return ok(res, data);
  }

  static async finalizar(req: Request, res: Response) {
    const payload = finalizarMovimientoSchema.parse(req.body);
    const data = await MovimientoModel.finalizar(parseIdParam(req), payload, driverNatural(req));
    return ok(res, data);
  }

  static async detener(req: Request, res: Response) {
    const payload = crearIncidenteMovimientoSchema.parse(req.body);
    const data = await MovimientoModel.detenerConIncidente(parseIdParam(req), payload, driverNatural(req));
    return res.status(201).json(data);
  }

  static async reanudar(req: Request, res: Response) {
    const payload = reanudarMovimientoSchema.parse(req.body);
    const data = await MovimientoModel.reanudar(parseIdParam(req), payload, driverNatural(req));
    return ok(res, data);
  }
}
