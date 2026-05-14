import { Router } from "express";
import { authenticateAccess } from "../../auth/authenticateAccess";
import type { AuthenticatedUser } from "../../types/auth";
import { proxyToTornoMs } from "../../services/tornoMs/tornoMsClient";
import { prisma } from "../../lib/prisma";
import { MovimientoWriteService } from "../../models/Movimientos/movimientoWriteService";

const router = Router();
const CANCELAR_TORNEADO_ROLES = new Set(["ADMINISTRADOR", "COORDINADOR", "SUPERVISOR"]);
const CLIENTE_ROLES = new Set(["CLIENTE"]);
const TORNERO_ROLES = new Set(["TORNO", "TORNERO"]);

// Todas las rutas de torno pasan por auth del API principal.
router.use(authenticateAccess);

function isHistorialRondasRequest(method: string, rest: string) {
  return method === "GET" && rest.split("?")[0] === "/rondas-servicio/historial";
}

function tornoMsBaseIncludesApi() {
  return /\/api\/?$/.test(String(process.env.TORNO_MS_URL ?? ""));
}

function buildTornoMsPath(rest: string) {
  if (rest.startsWith("/health")) return rest;
  return tornoMsBaseIncludesApi() ? rest : `/api${rest}`;
}

function buildTornoMsUrl(rest: string) {
  const base = String(process.env.TORNO_MS_URL ?? "").replace(/\/+$/, "");
  return `${base}${buildTornoMsPath(rest)}`;
}

function canCancelTorneado(user?: AuthenticatedUser) {
  return CANCELAR_TORNEADO_ROLES.has(String(user?.rol ?? "").toUpperCase());
}

function userRole(user?: AuthenticatedUser) {
  return String(user?.rol ?? "").toUpperCase();
}

function isCliente(user?: AuthenticatedUser) {
  return CLIENTE_ROLES.has(userRole(user));
}

function cancelTorneadoDeniedMessage(user?: AuthenticatedUser) {
  return TORNERO_ROLES.has(userRole(user))
    ? "No puedes cancelar el movimiento. Habla con tu supervisor."
    : "Solo ADMINISTRADOR, COORDINADOR o SUPERVISOR pueden cancelar torneados";
}

function isCancelTorneadoRequest(method: string, rest: string, body: unknown) {
  if (!["PATCH", "PUT", "POST"].includes(method.toUpperCase())) return false;
  if (!body || typeof body !== "object") return false;

  const status = String(
    (body as { status?: unknown; estado?: unknown }).status ??
      (body as { status?: unknown; estado?: unknown }).estado ??
      ""
  ).toUpperCase();
  if (status !== "CANCELADO") return false;

  const path = rest.split("?")[0];
  return path.startsWith("/rondas-servicio/") || /^\/incidentes\/\d+\/ronda-status$/.test(path);
}

function hasEstadoPayload(body: unknown) {
  if (!body || typeof body !== "object") return false;
  return ["status", "estado", "inicio", "fin", "fechaInicio", "fechaFin"].some((key) =>
    Object.prototype.hasOwnProperty.call(body, key)
  );
}

function isTornoStateMutationRequest(method: string, rest: string, body: unknown) {
  if (!["PATCH", "PUT", "POST"].includes(method.toUpperCase())) return false;
  const path = rest.split("?")[0];
  if (/^\/rondas-servicio\/\d+\/(iniciar|concluir)$/.test(path)) return true;
  if (/^\/rondas-servicio\/\d+\/ejes\/\d+\/finalizar$/.test(path)) return true;
  if (/^\/incidentes\/\d+\/ronda-status$/.test(path)) return true;
  return path.startsWith("/rondas-servicio/") && hasEstadoPayload(body);
}

function isStartTorneadoRequest(method: string, rest: string) {
  return method.toUpperCase() === "POST" && /^\/rondas-servicio\/\d+\/iniciar$/.test(rest.split("?")[0]);
}

function getMovimientoIdFromTornoStartResponse(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const source = data as Record<string, any>;
  const raw =
    source?.ruedaSolicitud?.movimientoId ??
    source?.movimientoId ??
    source?.tornoG?.ruedaSolicitud?.movimientoId ??
    null;
  const numeric = Number(raw);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function getInicioFromTornoStartResponse(data: unknown, body: unknown) {
  const source = data && typeof data === "object" ? (data as Record<string, any>) : {};
  const bodySource = body && typeof body === "object" ? (body as Record<string, any>) : {};
  const raw =
    source.inicio ??
    source.tornoG?.fechaInicio ??
    bodySource.inicio ??
    bodySource.fechaInicio ??
    null;
  const parsed = raw ? new Date(raw) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

async function concludeMovimientoForStartedTorneado(data: unknown, body: unknown) {
  const movimientoId = getMovimientoIdFromTornoStartResponse(data);
  if (movimientoId == null) return;

  const inicio = getInicioFromTornoStartResponse(data, body);
  const fin = new Date(inicio.getTime() + 10 * 60 * 1000);

  const movimiento = await prisma.movimiento.findUnique({
    where: { id: movimientoId },
    select: { id: true, torno: true, estado: true, finalizado: true },
  });
  if (!movimiento || movimiento.torno !== true) return;
  if (movimiento.finalizado || ["CONCLUIDO", "CANCELADO"].includes(String(movimiento.estado))) return;

  await MovimientoWriteService.actualizarEstadoServicio(movimientoId, "CONCLUIDO", {
    fechaInicio: inicio,
    fechaFin: fin,
  });
}

function withTornoIncidentActorDefaults(
  method: string,
  rest: string,
  body: unknown,
  user?: AuthenticatedUser
) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const userId = user?.id;
  if (!userId) return body;

  const upperMethod = method.toUpperCase();
  const path = rest.split("?")[0];
  const nextBody = body as Record<string, unknown>;

  if (upperMethod === "POST" && path === "/incidentes") {
    return {
      ...nextBody,
      creadoPorId: nextBody.creadoPorId ?? userId,
    };
  }

  const isResolveIncidentRequest =
    path.endsWith("/resolver") ||
    String(nextBody.status ?? nextBody.estado ?? "").toUpperCase() === "RESUELTO" ||
    nextBody.resuelto === true ||
    nextBody.fechaTerminacion != null;

  if (
    ["PATCH", "PUT", "POST"].includes(upperMethod) &&
    /^\/incidentes\/\d+(?:\/resolver)?$/.test(path) &&
    isResolveIncidentRequest
  ) {
    return {
      ...nextBody,
      atendidoPorId: nextBody.atendidoPorId ?? userId,
    };
  }

  return body;
}

async function enrichHistorialWithLocomotora(data: unknown): Promise<unknown> {
  if (
    data &&
    typeof data === "object" &&
    "data" in data &&
    Array.isArray((data as { data?: unknown }).data)
  ) {
    return {
      ...data,
      data: await enrichHistorialWithLocomotora((data as { data: unknown[] }).data),
    };
  }

  if (!Array.isArray(data)) return data;

  const movimientoIds = Array.from(
    new Set(
      data
        .map((item) => Number((item as { movimientoId?: unknown }).movimientoId))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );

  if (!movimientoIds.length) return data;

  const movimientos = await prisma.movimiento.findMany({
    where: { id: { in: movimientoIds } },
    select: { id: true, locomotiveNumber: true },
  });
  const locomotoraByMovimiento = new Map(movimientos.map((mov) => [mov.id, mov.locomotiveNumber]));

  return data.map((item) => {
    if (!item || typeof item !== "object") return item;
    const movimientoId = Number((item as { movimientoId?: unknown }).movimientoId);
    const locomotiveNumber = locomotoraByMovimiento.get(movimientoId) ?? null;
    return {
      ...item,
      locomotiveNumber,
      numeroLocomotora: locomotiveNumber,
    };
  });
}

// Ruta especial: el proxy genérico lee las respuestas como texto y corrompe binarios.
// Las imágenes se deben servir con arrayBuffer para preservar el binario original.
router.get("/imagenes", async (req, res) => {
  try {
    const tornoMsUrl = process.env.TORNO_MS_URL;
    const serviceToken = process.env.TORNO_SERVICE_TOKEN;
    if (!tornoMsUrl || !serviceToken) {
      return res.status(500).json({ error: "msTorno no configurado" });
    }

    const ruta = String(req.query.ruta ?? "");
    if (!ruta) return res.status(400).json({ error: "Ruta requerida" });

    const url = buildTornoMsUrl(`/imagenes?ruta=${encodeURIComponent(ruta)}`);
    const imgResp = await fetch(url, {
      headers: { "x-service-token": serviceToken },
    });

    if (!imgResp.ok) {
      return res.status(imgResp.status).json({ error: "Imagen no encontrada" });
    }

    const contentType = imgResp.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await imgResp.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.send(buffer);
  } catch {
    return res.status(502).json({ error: "Error al obtener imagen de msTorno" });
  }
});

// Proxy: /torno/... -> http://TORNO_MS_URL/api/...
router.all("/*", async (req, res) => {
  try {
    const base = req.baseUrl; // "/torno"
    const rest = req.originalUrl.startsWith(base) ? req.originalUrl.slice(base.length) : req.originalUrl;
    const target = buildTornoMsPath(rest);

    const user = (req as any).user as AuthenticatedUser | undefined;
    if (isCliente(user) && isTornoStateMutationRequest(req.method, rest, req.body)) {
      return res.status(403).json({
        error: "No autorizado para modificar estados",
        message: "CLIENTE no puede modificar estados del movimiento",
      });
    }

    if (isCancelTorneadoRequest(req.method, rest, req.body) && !canCancelTorneado(user)) {
      return res.status(403).json({
        error: "No autorizado para cancelar torneados",
        message: cancelTorneadoDeniedMessage(user),
      });
    }

    const result = await proxyToTornoMs(target, {
      method: req.method,
      body:
        req.method === "GET" || req.method === "DELETE"
          ? undefined
          : withTornoIncidentActorDefaults(req.method, rest, req.body, user),
      headers: {
        ...(user?.id ? { "x-user-id": String(user.id) } : {}),
        ...(user?.rol ? { "x-user-rol": String(user.rol) } : {}),
      },
    });

    if (isHistorialRondasRequest(req.method, rest)) {
      result.data = (await enrichHistorialWithLocomotora(result.data)) as typeof result.data;
    }

    if (result.status >= 200 && result.status < 300 && isStartTorneadoRequest(req.method, rest)) {
      await concludeMovimientoForStartedTorneado(result.data, req.body);
    }

    return res.status(result.status).send(result.data);
  } catch (e: any) {
    const status = Number(e?.status) || 502;
    return res.status(status).json({
      error: e?.message ?? "Error proxy msTorno",
      details: e?.details ?? null,
    });
  }
});

export default router;
