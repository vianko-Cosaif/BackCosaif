import { Router } from "express";
import { authenticateAccess } from "../../auth/authenticateAccess";
import { prisma } from "../../lib/prisma";
import { proxyToLavadoMs } from "../../services/lavadoMs/lavadoMsClient";
import type { AuthenticatedUser } from "../../types/auth";

const router = Router();
const WRITE_ROLES = new Set(["LAVADO", "SUPERVISOR", "COORDINADOR", "ADMINISTRADOR"]);

router.use(authenticateAccess);

const isMutation = (method: string) => {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
};

const requestPath = (originalUrl: string, baseUrl: string) => {
  const rest = originalUrl.startsWith(baseUrl)
    ? originalUrl.slice(baseUrl.length)
    : originalUrl;
  return rest || "/";
};

const pathWithoutQuery = (pathWithQuery: string) => {
  return pathWithQuery.split("?")[0].replace(/\/+$/, "") || "/";
};

const positiveInt = (value: unknown) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const createLavadoBody = async (
  body: Record<string, unknown>,
  user: AuthenticatedUser
) => {
  const movimientoId = positiveInt(body.movimientoId);
  if (!movimientoId) {
    const error = new Error("movimientoId debe ser un entero positivo");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  const movimiento = await prisma.movimiento.findUnique({
    where: { id: movimientoId },
    select: {
      id: true,
      locomotiveNumber: true,
      lavado: true,
      estado: true,
      empresaId: true,
      localidadId: true,
      empresa: { select: { nombre: true } },
      localidad: { select: { nombre: true } },
    },
  });

  if (!movimiento) {
    const error = new Error("Movimiento no encontrado");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }
  if (movimiento.lavado !== true) {
    const error = new Error("El movimiento no esta marcado para lavado");
    (error as Error & { status?: number }).status = 409;
    throw error;
  }
  if (movimiento.estado === "CANCELADO") {
    const error = new Error("No se puede crear un lavado para un movimiento cancelado");
    (error as Error & { status?: number }).status = 409;
    throw error;
  }

  return {
    movimientoId: movimiento.id,
    tipoLavado: body.tipoLavado,
    ...(body.duracionEstimadaMinutos !== undefined
      ? { duracionEstimadaMinutos: body.duracionEstimadaMinutos }
      : {}),
    locomotiveNumber: movimiento.locomotiveNumber,
    empresaId: movimiento.empresaId,
    empresaNombreSnapshot: movimiento.empresa.nombre,
    localidadId: movimiento.localidadId,
    localidadNombreSnapshot: movimiento.localidad.nombre,
    creadoPorId: user.id,
  };
};

const mutationBody = async (
  method: string,
  path: string,
  body: unknown,
  user: AuthenticatedUser
) => {
  const source =
    body && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown>
      : {};

  if (method === "POST" && path === "/") {
    return createLavadoBody(source, user);
  }

  if (method === "PATCH" && /^\/[0-9a-f-]+$/i.test(path)) {
    return {
      ...(source.tipoLavado !== undefined ? { tipoLavado: source.tipoLavado } : {}),
      ...(source.duracionEstimadaMinutos !== undefined
        ? { duracionEstimadaMinutos: source.duracionEstimadaMinutos }
        : {}),
      actorId: user.id,
    };
  }

  if (method === "POST" && /^\/[0-9a-f-]+\/fases\/[0-9a-f-]+\/iniciar$/i.test(path)) {
    return { actorId: user.id };
  }

  if (method === "POST" && /^\/[0-9a-f-]+\/fases\/[0-9a-f-]+\/finalizar$/i.test(path)) {
    return {
      ...(source.observaciones !== undefined
        ? { observaciones: source.observaciones }
        : {}),
      actorId: user.id,
    };
  }

  const error = new Error("Operacion de lavado no soportada");
  (error as Error & { status?: number }).status = 404;
  throw error;
};

router.all("*", async (req, res) => {
  try {
    const user = req.user as AuthenticatedUser;
    const method = req.method.toUpperCase();
    const target = requestPath(req.originalUrl, req.baseUrl);
    const routePath = pathWithoutQuery(target);

    if (isMutation(method) && !WRITE_ROLES.has(String(user.rol).toUpperCase())) {
      return res.status(403).json({
        error: "No autorizado para operar procesos de lavado",
        message: "El rol actual solo tiene acceso de lectura",
      });
    }

    const body = isMutation(method)
      ? await mutationBody(method, routePath, req.body, user)
      : undefined;
    const result = await proxyToLavadoMs(target, { method, body });
    return res.status(result.status).send(result.data);
  } catch (error: any) {
    const status = Number(error?.status) || 502;
    return res.status(status).json({
      error: error?.message ?? "Error proxy msLavado",
      message: error?.message ?? "Error proxy msLavado",
      details: error?.details ?? null,
    });
  }
});

export default router;
