import { Router } from "express";
import { authenticateAccess } from "../../auth/authenticateAccess";
import type { AuthenticatedUser } from "../../types/auth";
import { proxyToTornoMs } from "../../services/tornoMs/tornoMsClient";
import { prisma } from "../../lib/prisma";
import { MovimientoWriteService } from "../../models/Movimientos/movimientoWriteService";
import { RondaModel } from "../../models/Movimientos/Ronda/RondaModel";
import { NotificadorFCM } from "../../services/NotificadorFCM";
import { publishRealtimeEvent } from "../../realtime/realtimeHub";

const router = Router();
const CANCELAR_TORNEADO_ROLES = new Set(["ADMINISTRADOR", "COORDINADOR", "SUPERVISOR"]);
const CLIENTE_ROLES = new Set(["CLIENTE", "CLIENTE_ADMIN", "CLIENTE_COOR", "ARRASTRE_TORREON"]);
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

function isConcludeTorneadoRequest(method: string, rest: string) {
  return method.toUpperCase() === "POST" && /^\/rondas-servicio\/\d+\/concluir$/.test(rest.split("?")[0]);
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

function getMovimientoIdFromTornoStatusResponse(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const source = data as Record<string, any>;
  const raw =
    source?.ruedaSolicitud?.movimientoId ??
    source?.movimientoId ??
    source?.tornoG?.ruedaSolicitud?.movimientoId ??
    source?.tornoG?.movimientoId ??
    null;
  const numeric = Number(raw);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function getRondaServicioIdFromTornoStatusResponse(data: unknown, rest: string) {
  if (data && typeof data === "object") {
    const source = data as Record<string, any>;
    const raw =
      source?.rondaServicioId ??
      source?.servicioId ??
      source?.id ??
      source?.tornoG?.rondaServicioId ??
      null;
    const numeric = Number(raw);
    if (Number.isInteger(numeric) && numeric > 0) return numeric;
  }

  const match = rest.split("?")[0].match(/^\/rondas-servicio\/(\d+)/);
  const fromPath = Number(match?.[1]);
  return Number.isInteger(fromPath) && fromPath > 0 ? fromPath : null;
}

function isTornoIncidentNotificationRequest(method: string, rest: string) {
  const upperMethod = method.toUpperCase();
  const path = rest.split("?")[0];

  if (upperMethod === "POST" && path === "/incidentes") return true;
  if (["PATCH", "PUT", "POST"].includes(upperMethod) && /^\/incidentes\/\d+(?:\/resolver)?$/.test(path)) {
    return true;
  }

  return false;
}

function readPositiveInt(value: unknown) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function getRuedaSolicitudIdFromTornoIncident(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const source = data as Record<string, any>;
  return (
    readPositiveInt(source.ruedaSolicitud?.id) ??
    readPositiveInt(source.ruedaSolicitudId) ??
    readPositiveInt(source.rondaServicio?.ruedaSolicitudId) ??
    null
  );
}

function getMovimientoIdFromTornoIncident(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const source = data as Record<string, any>;
  return (
    readPositiveInt(source.movimientoId) ??
    readPositiveInt(source.ruedaSolicitud?.movimientoId) ??
    readPositiveInt(source.rondaServicio?.ruedaSolicitud?.movimientoId) ??
    null
  );
}

async function resolveMovimientoIdFromTornoIncident(data: unknown) {
  const direct = getMovimientoIdFromTornoIncident(data);
  if (direct) return direct;

  const ruedaSolicitudId = getRuedaSolicitudIdFromTornoIncident(data);
  if (!ruedaSolicitudId) return null;

  const solicitud = await proxyToTornoMs(`/rueda-solicitudes/${ruedaSolicitudId}`, { method: "GET" });
  return getMovimientoIdFromTornoIncident(solicitud.data);
}

async function notifyTornoIncidentIfNeeded(method: string, rest: string, data: unknown) {
  if (!isTornoIncidentNotificationRequest(method, rest)) return;
  if (!data || typeof data !== "object") return;

  const source = data as Record<string, any>;
  const movimientoId = await resolveMovimientoIdFromTornoIncident(source);
  if (!movimientoId) return;

  await NotificadorFCM.notificarIncidenteTornoPorMovimiento({
    movimientoId,
    incidenteId: source.id,
    status: source.status,
    tipoFalla: source.tipoFalla,
    comentario: source.comentario,
    resuelto: source.resuelto,
    numeroLocomotora: source.numeroLocomotora,
  });
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
  if (movimientoId == null) return null;

  const inicio = getInicioFromTornoStartResponse(data, body);
  const fin = new Date(inicio.getTime() + 10 * 60 * 1000);

  const movimiento = await prisma.movimiento.findUnique({
    where: { id: movimientoId },
    select: { id: true, torno: true, estado: true, finalizado: true },
  });
  if (!movimiento || movimiento.torno !== true) return null;
  if (movimiento.finalizado || ["CONCLUIDO", "CANCELADO"].includes(String(movimiento.estado))) return null;

  return MovimientoWriteService.actualizarEstadoServicio(movimientoId, "CONCLUIDO", {
    fechaInicio: inicio,
    fechaFin: fin,
  });
}

async function publishTornoStatusEventIfNeeded(method: string, rest: string, data: unknown) {
  const isStart = isStartTorneadoRequest(method, rest);
  const isConclude = isConcludeTorneadoRequest(method, rest);
  if (!isStart && !isConclude) return;

  const movimientoId = getMovimientoIdFromTornoStatusResponse(data);
  if (!movimientoId) return;

  const movimiento = await prisma.movimiento.findUnique({
    where: { id: movimientoId },
    select: {
      id: true,
      empresaId: true,
      localidadId: true,
      clienteId: true,
      locomotiveNumber: true,
      torno: true,
    },
  });
  if (!movimiento || movimiento.torno !== true) return;

  const estado = isConclude ? "CONCLUIDO" : "EN_PROCESO";
  publishRealtimeEvent({
    type: "torno.estado",
    movimientoId: movimiento.id,
    empresaId: movimiento.empresaId,
    localidadId: movimiento.localidadId,
    clienteId: movimiento.clienteId,
    rondaId: getRondaServicioIdFromTornoStatusResponse(data, rest),
    estado,
    finalizado: isConclude,
    locomotiveNumber: movimiento.locomotiveNumber,
    reason: isConclude ? "torno.concluido" : "torno.iniciado",
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

const TORNO_FINAL_STATUSES = new Set(["CONCLUIDO", "CANCELADO"]);

function readPositiveNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function hasVisibleLocomotiveValue(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return false;
  const normalized = text.toUpperCase();
  if (["-", "0", "S/N", "SIN DATO", "SIN LOCOMOTORA", "NULL", "UNDEFINED"].includes(normalized)) {
    return false;
  }
  return !/^0+$/.test(text);
}

function readDateTime(value: unknown) {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(String(value));
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
}

function readHistorialMovimientoId(item: Record<string, any>) {
  return readPositiveNumber(
    item.movimientoId ??
      item.ruedaSolicitud?.movimientoId ??
      item.movimiento?.id ??
      item.movimiento?.movimientoId
  );
}

function readHistorialStatus(item: Record<string, any>) {
  return String(
    item.historialStatus ??
      item.status ??
      item.estado ??
      item.statusAlmacenado ??
      item.rondaStatus ??
      ""
  )
    .trim()
    .toUpperCase();
}

function readQueueNumber(item: Record<string, any>, key: "rondaNumero" | "orden") {
  return (
    readPositiveNumber(item[`movimiento${key === "rondaNumero" ? "RondaNumero" : "Orden"}`]) ??
    readPositiveNumber(item[key]) ??
    readPositiveNumber(item.ronda?.[key]) ??
    readPositiveNumber(item.movimiento?.ronda?.[key]) ??
    Number.MAX_SAFE_INTEGER
  );
}

function readTornoActiveStatusRank(item: Record<string, any>) {
  return readHistorialStatus(item) === "EN_PROCESO" ? 0 : 1;
}

function compareHistorialTornoQueue(left: Record<string, any>, right: Record<string, any>) {
  const leftFinal = TORNO_FINAL_STATUSES.has(readHistorialStatus(left));
  const rightFinal = TORNO_FINAL_STATUSES.has(readHistorialStatus(right));

  if (leftFinal !== rightFinal) return leftFinal ? 1 : -1;

  if (!leftFinal) {
    const statusDiff = readTornoActiveStatusRank(left) - readTornoActiveStatusRank(right);
    if (statusDiff !== 0) return statusDiff;

    const rondaDiff = readQueueNumber(left, "rondaNumero") - readQueueNumber(right, "rondaNumero");
    if (rondaDiff !== 0) return rondaDiff;

    const ordenDiff = readQueueNumber(left, "orden") - readQueueNumber(right, "orden");
    if (ordenDiff !== 0) return ordenDiff;

    const leftCreatedAt =
      left.movimientoFechaSolicitud ??
      left.fechaSolicitud ??
      left.movimiento?.fechaSolicitud ??
      left.creadoEn ??
      left.createdAt;
    const rightCreatedAt =
      right.movimientoFechaSolicitud ??
      right.fechaSolicitud ??
      right.movimiento?.fechaSolicitud ??
      right.creadoEn ??
      right.createdAt;
    const fechaDiff = readDateTime(leftCreatedAt) - readDateTime(rightCreatedAt);
    if (fechaDiff !== 0) return fechaDiff;

    return (
      readPositiveNumber(left.servicioId ?? left.rondaServicioId ?? left.id) ??
      Number.MAX_SAFE_INTEGER
    ) - (
      readPositiveNumber(right.servicioId ?? right.rondaServicioId ?? right.id) ??
      Number.MAX_SAFE_INTEGER
    );
  }

  const rightUpdatedAt =
    right.actualizadoEn ?? right.updatedAt ?? right.fechaActualizacion ?? right.fin ?? right.fechaFin;
  const leftUpdatedAt =
    left.actualizadoEn ?? left.updatedAt ?? left.fechaActualizacion ?? left.fin ?? left.fechaFin;
  const updatedDiff = readDateTime(rightUpdatedAt) - readDateTime(leftUpdatedAt);
  if (updatedDiff !== 0) return updatedDiff;

  return (
    readPositiveNumber(right.servicioId ?? right.rondaServicioId ?? right.id) ??
    Number.MAX_SAFE_INTEGER
  ) - (
    readPositiveNumber(left.servicioId ?? left.rondaServicioId ?? left.id) ??
    Number.MAX_SAFE_INTEGER
  );
}

function firstQueryValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function collectLocalidadIdsFromHistorial(data: unknown, into = new Set<number>()) {
  if (Array.isArray(data)) {
    for (const item of data) collectLocalidadIdsFromHistorial(item, into);
    return into;
  }

  if (!data || typeof data !== "object") return into;

  const source = data as Record<string, any>;
  const localidadId = readPositiveNumber(
    source.localidadId ??
      source.movimiento?.localidadId ??
      source.ronda?.localidadId ??
      source.ruedaSolicitud?.movimiento?.localidadId
  );
  if (localidadId) into.add(localidadId);

  for (const key of ["data", "items", "rows", "results", "historial", "rondasServicio"]) {
    if (source[key]) collectLocalidadIdsFromHistorial(source[key], into);
  }

  return into;
}

async function asegurarOrdenRondasTornoSiAplica(
  method: string,
  rest: string,
  query: Record<string, unknown>,
  data?: unknown
) {
  if (!isHistorialRondasRequest(method, rest)) return;

  const localidadIds = collectLocalidadIdsFromHistorial(data);
  const localidadIdFromQuery = readPositiveNumber(firstQueryValue(query.localidadId));
  if (localidadIdFromQuery) localidadIds.add(localidadIdFromQuery);
  if (!localidadIds.size) return;

  for (const localidadId of localidadIds) {
    const result = await RondaModel.asegurarOrdenRondasLocalidad(localidadId);
    if (result.reorganizado) {
      console.info("Rondas recompuestas antes de consultar historial de torno", {
        localidadId,
        motivo: result.motivo,
      });
    }
  }
}

async function enrichHistorialWithMovimientoContext(data: unknown): Promise<unknown> {
  if (
    data &&
    typeof data === "object" &&
    "data" in data &&
    Array.isArray((data as { data?: unknown }).data)
  ) {
    return {
      ...data,
      data: await enrichHistorialWithMovimientoContext((data as { data: unknown[] }).data),
    };
  }

  if (!Array.isArray(data)) return data;

  const movimientoIds = Array.from(
    new Set(
      data
        .filter((item): item is Record<string, any> => !!item && typeof item === "object")
        .map((item) => readHistorialMovimientoId(item))
        .filter((id): id is number => id != null)
    )
  );

  if (!movimientoIds.length) return data;

  const movimientos = await prisma.movimiento.findMany({
    where: { id: { in: movimientoIds } },
    select: {
      id: true,
      empresaId: true,
      localidadId: true,
      locomotiveNumber: true,
      prioridad: true,
      estado: true,
      fechaSolicitud: true,
      createdAt: true,
      empresa: { select: { id: true, nombre: true } },
      localidad: { select: { id: true, nombre: true } },
      viaOrigen: { select: { id: true, numero: true, nombre: true } },
      viaDestino: { select: { id: true, numero: true, nombre: true } },
      ronda: {
        select: {
          id: true,
          movimientoId: true,
          empresaId: true,
          localidadId: true,
          concluido: true,
          orden: true,
          rondaNumero: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
  const movimientoById = new Map(movimientos.map((mov) => [mov.id, mov]));

  return data.map((item) => {
    if (!item || typeof item !== "object") return item;
    const source = item as Record<string, any>;
    const movimientoId = readHistorialMovimientoId(source);
    const movimiento = movimientoId ? movimientoById.get(movimientoId) ?? null : null;
    const ronda = movimiento?.ronda ?? null;
    const locomotiveNumber = movimiento?.locomotiveNumber ?? source.locomotiveNumber ?? source.numeroLocomotora ?? null;
    const empresaNombre = movimiento?.empresa?.nombre ?? source.empresaNombre ?? source.companyName ?? null;
    const movimientoResumen = movimiento
      ? {
          ...(source.movimiento && typeof source.movimiento === "object" ? source.movimiento : {}),
          id: movimiento.id,
          empresaId: movimiento.empresaId,
          localidadId: movimiento.localidadId,
          locomotiveNumber: movimiento.locomotiveNumber,
          prioridad: movimiento.prioridad,
          estado: movimiento.estado,
          fechaSolicitud: movimiento.fechaSolicitud,
          createdAt: movimiento.createdAt,
          empresa: movimiento.empresa,
          localidad: movimiento.localidad,
          viaOrigen: movimiento.viaOrigen,
          viaDestino: movimiento.viaDestino,
          ronda,
        }
      : source.movimiento;

    return {
      ...source,
      locomotiveNumber,
      numeroLocomotora: locomotiveNumber,
      empresaId: source.empresaId ?? movimiento?.empresaId ?? ronda?.empresaId ?? null,
      empresa: source.empresa ?? movimiento?.empresa ?? null,
      empresaNombre,
      companyName: source.companyName ?? empresaNombre,
      prioridad: source.prioridad ?? movimiento?.prioridad ?? null,
      fechaSolicitud: source.fechaSolicitud ?? movimiento?.fechaSolicitud ?? null,
      movimientoFechaSolicitud: source.movimientoFechaSolicitud ?? movimiento?.fechaSolicitud ?? null,
      movimiento: movimientoResumen,
      ronda: source.ronda ?? ronda ?? null,
      rondaId: source.rondaId ?? ronda?.id ?? null,
      rondaNumero: source.rondaNumero ?? ronda?.rondaNumero ?? null,
      orden: source.orden ?? ronda?.orden ?? null,
      movimientoRondaNumero: source.movimientoRondaNumero ?? ronda?.rondaNumero ?? null,
      movimientoOrden: source.movimientoOrden ?? ronda?.orden ?? null,
    };
  }).filter((item) => {
    if (!item || typeof item !== "object") return true;
    const source = item as Record<string, any>;
    if (TORNO_FINAL_STATUSES.has(readHistorialStatus(source))) return true;
    return hasVisibleLocomotiveValue(
      source.locomotiveNumber ??
        source.numeroLocomotora ??
        source.locomotora ??
        source.movimiento?.locomotiveNumber ??
        source.ruedaSolicitud?.movimiento?.locomotiveNumber
    );
  }).sort(compareHistorialTornoQueue);
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

    await asegurarOrdenRondasTornoSiAplica(
      req.method,
      rest,
      req.query as Record<string, unknown>,
      result.data
    );

    if (isHistorialRondasRequest(req.method, rest)) {
      result.data = (await enrichHistorialWithMovimientoContext(result.data)) as typeof result.data;
    }

    if (result.status >= 200 && result.status < 300 && isStartTorneadoRequest(req.method, rest)) {
      await concludeMovimientoForStartedTorneado(result.data, req.body);
    }

    if (result.status >= 200 && result.status < 300) {
      try {
        await publishTornoStatusEventIfNeeded(req.method, rest, result.data);
      } catch (error) {
        console.warn("No se pudo publicar evento realtime de torno", {
          rest,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (result.status >= 200 && result.status < 300) {
      try {
        await notifyTornoIncidentIfNeeded(req.method, rest, result.data);
      } catch (error) {
        console.warn("No se pudo notificar incidente de torno", {
          rest,
          message: error instanceof Error ? error.message : String(error),
        });
      }
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
