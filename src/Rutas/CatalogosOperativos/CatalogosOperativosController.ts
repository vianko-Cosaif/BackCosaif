import type { Request, RequestHandler, Response } from "express";
import type { AuthenticatedUser } from "../../types/auth";
import { fail, ok } from "../../utils/http";
import {
  CatalogConflictError,
  CatalogosOperativosService,
  localidadOperativaPayloadSchema,
} from "./CatalogosOperativosService";

const ADMIN_ROLES = new Set(["ADMINISTRADOR"]);

function isAdmin(user: AuthenticatedUser | undefined) {
  return ADMIN_ROLES.has(String(user?.rol ?? "").toUpperCase());
}

function requireAdmin(req: Request, res: Response) {
  const user = req.user as AuthenticatedUser | undefined;
  if (isAdmin(user)) return true;
  fail(res, 403, "Solo administrador puede modificar catalogos operativos");
  return false;
}

export class CatalogosOperativosController {
  static resumen: RequestHandler = async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
      const data = await CatalogosOperativosService.resumen();
      ok(res, data);
    } catch (error: any) {
      fail(res, 500, "No se pudo cargar la configuracion operativa", {
        details: error?.message ?? String(error),
      });
    }
  };

  static guardarLocalidadOperativa: RequestHandler = async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const parsed = localidadOperativaPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, "Configuracion invalida", { details: parsed.error.flatten() });
      return;
    }

    try {
      const data = await CatalogosOperativosService.guardar(parsed.data);
      res.status(201);
      ok(res, data);
    } catch (error: any) {
      const isConflict = error instanceof CatalogConflictError || error?.code === "P2002" || error?.code === "P2003";
      fail(res, isConflict ? 409 : 500, isConflict ? error.message : "No se pudo guardar la localidad operativa", {
        details: error?.message ?? String(error),
      });
    }
  };
}
