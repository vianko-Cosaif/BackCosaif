import { Router } from "express";
import { authenticateAccess } from "../../auth/authenticateAccess";
import type { AuthenticatedUser } from "../../types/auth";
import { proxyToTorreonMs } from "../../services/torreonMs/torreonMsClient";
import { NotificadorFCM } from "../../services/NotificadorFCM";
import { publishRealtimeEvent, type RealtimeEventType } from "../../realtime/realtimeHub";

const router = Router();

const ADMIN_ROLES = new Set(["ADMINISTRADOR", "COORDINADOR"]);
const LOCAL_OPERATION_ROLES = new Set(["SUPERVISOR", "MAQUINISTA_ARRASTRE"]);
const CLIENT_COMPANY_ROLES = new Set(["CLIENTE_ADMIN", "CLIENTE_COOR"]);
const CLIENT_LOCAL_ROLES = new Set(["CLIENTE", "ARRASTRE_TORREON"]);
const ALLOWED_ROLES = new Set([
  ...ADMIN_ROLES,
  ...LOCAL_OPERATION_ROLES,
  ...CLIENT_COMPANY_ROLES,
  ...CLIENT_LOCAL_ROLES,
]);

router.use(authenticateAccess);

function userRole(user?: AuthenticatedUser) {
  return String(user?.rol ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function positiveInt(value: unknown) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function readEmpresaId(user?: AuthenticatedUser) {
  return positiveInt(user?.empresa?.id);
}

function readLocalidadId(user?: AuthenticatedUser) {
  return positiveInt(user?.localidad?.id);
}

function isReadonlyClient(user?: AuthenticatedUser) {
  const role = userRole(user);
  return CLIENT_COMPANY_ROLES.has(role) || CLIENT_LOCAL_ROLES.has(role);
}

function canUseTorreon(user?: AuthenticatedUser) {
  return ALLOWED_ROLES.has(userRole(user));
}

function isAllowedClientMutation(method: string, rest: string) {
  const verb = method.toUpperCase();
  const path = rest.split("?")[0];
  if (verb === "GET") return true;
  if (verb === "POST" && path === "/arrastres") return true;
  if (verb === "PATCH" && path === "/arrastres/orden-solicitudes") return true;
  if (verb === "PATCH" && /^\/arrastres\/\d+\/cancelar$/.test(path)) return true;
  if (verb === "PATCH" && /^\/arrastres\/\d+\/vagones\/orden$/.test(path)) return true;
  if (verb === "PATCH" && /^\/arrastres\/\d+\/vagones\/\d+$/.test(path)) return true;
  if (["PATCH", "PUT", "POST"].includes(verb) && /^\/arrastres\/\d+\/incidentes\/\d+\/resolver$/.test(path)) return true;
  if (["PATCH", "PUT", "POST"].includes(verb) && /^\/incidentes\/\d+\/resolver$/.test(path)) return true;
  if (verb === "PATCH" && path === "/rondas/movimientos/orden") return true;
  return false;
}

function isAllowedMaquinistaArrastreMutation(method: string, rest: string) {
  const verb = method.toUpperCase();
  const path = rest.split("?")[0];
  if (verb === "GET") return true;
  if (verb === "POST" && /^\/arrastres\/\d+\/incidentes$/.test(path)) return true;
  if (verb === "PATCH" && /^\/arrastres\/\d+\/vagones\/\d+\/iniciar$/.test(path)) return true;
  if (verb === "PATCH" && /^\/arrastres\/\d+\/vagones\/\d+\/finalizar$/.test(path)) return true;
  return false;
}

function withActorDefaults(method: string, rest: string, body: unknown, user?: AuthenticatedUser) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;

  const userId = positiveInt(user?.id);
  if (!userId) return body;

  const verb = method.toUpperCase();
  const path = rest.split("?")[0];
  const source = body as Record<string, unknown>;
  const empresaId = readEmpresaId(user);
  const localidadId = readLocalidadId(user);

  if (verb === "POST" && path === "/arrastres") {
    return {
      ...source,
      creadoPorId: source.creadoPorId ?? userId,
      ...(empresaId ? { empresaId: source.empresaId ?? empresaId } : {}),
      ...(localidadId ? { localidadId: source.localidadId ?? localidadId } : {}),
    };
  }

  if (verb === "POST" && /^\/arrastres\/\d+\/iniciar$/.test(path)) {
    return {
      ...source,
      iniciadoPorId: source.iniciadoPorId ?? userId,
      operadorId: source.operadorId ?? userId,
    };
  }

  if (["PATCH", "PUT", "POST"].includes(verb) && /^\/arrastres\/\d+\/finalizar$/.test(path)) {
    return { ...source, finalizadoPorId: source.finalizadoPorId ?? userId };
  }

  if (["PATCH", "PUT", "POST"].includes(verb) && /^\/arrastres\/\d+\/cancelar$/.test(path)) {
    return { ...source, canceladoPorId: source.canceladoPorId ?? userId };
  }

  if (verb === "POST" && /^\/arrastres\/\d+\/incidentes$/.test(path)) {
    return { ...source, creadoPorId: source.creadoPorId ?? userId };
  }

  if (["PATCH", "PUT", "POST"].includes(verb) && /^\/arrastres\/\d+\/incidentes\/\d+\/resolver$/.test(path)) {
    return { ...source, resueltoPorId: source.resueltoPorId ?? userId };
  }

  if (["PATCH", "PUT", "POST"].includes(verb) && /^\/arrastres\/\d+\/reanudar$/.test(path)) {
    return { ...source, operadorId: source.operadorId ?? userId };
  }

  return body;
}

function applyListScope(rest: string, user?: AuthenticatedUser) {
  const role = userRole(user);
  const [path, query = ""] = rest.split("?");
  if (!["/arrastres", "/movimientos", "/incidentes", "/rondas"].includes(path)) return rest;

  const params = new URLSearchParams(query);
  const empresaId = readEmpresaId(user);
  const localidadId = readLocalidadId(user);

  if (CLIENT_COMPANY_ROLES.has(role) && empresaId && !params.has("empresaId")) {
    params.set("empresaId", String(empresaId));
  }

  if (CLIENT_LOCAL_ROLES.has(role)) {
    if (empresaId && !params.has("empresaId")) params.set("empresaId", String(empresaId));
    if (localidadId && !params.has("localidadId")) params.set("localidadId", String(localidadId));
  }

  if (LOCAL_OPERATION_ROLES.has(role) && localidadId && !params.has("localidadId")) {
    params.set("localidadId", String(localidadId));
  }

  if (path === "/arrastres") {
    if (!params.has("pageSize")) params.set("pageSize", "60");
    if (!params.has("includeFotos")) params.set("includeFotos", "0");
  }

  if (path === "/movimientos") {
    if (!params.has("pageSize")) params.set("pageSize", "60");
    if (!params.has("includeFotos")) params.set("includeFotos", "0");
  }

  if (path === "/incidentes" && !params.has("includeFotos")) {
    params.set("includeFotos", "0");
  }

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

function isItemVisibleForUser(item: any, user?: AuthenticatedUser) {
  const role = userRole(user);
  if (ADMIN_ROLES.has(role)) return true;

  const itemEmpresaId = positiveInt(item?.empresaId ?? item?.movimiento?.empresaId ?? item?.arrastre?.empresaId);
  const itemLocalidadId = positiveInt(item?.localidadId ?? item?.movimiento?.localidadId ?? item?.arrastre?.localidadId);
  const empresaId = readEmpresaId(user);
  const localidadId = readLocalidadId(user);

  if (CLIENT_COMPANY_ROLES.has(role)) return !empresaId || itemEmpresaId === empresaId;
  if (CLIENT_LOCAL_ROLES.has(role)) {
    const empresaOk = !empresaId || itemEmpresaId === empresaId;
    const localidadOk = !localidadId || itemLocalidadId === localidadId;
    return empresaOk && localidadOk;
  }
  if (LOCAL_OPERATION_ROLES.has(role)) return !localidadId || itemLocalidadId === localidadId;

  return false;
}

function filterDataForUser(data: unknown, user?: AuthenticatedUser) {
  if (Array.isArray(data)) return data.filter((item) => isItemVisibleForUser(item, user));
  if (!data || typeof data !== "object") return data;

  const source = data as Record<string, unknown>;
  if (Array.isArray(source.data)) {
    const rows = source.data.filter((item) => isItemVisibleForUser(item, user));
    return { ...source, data: rows, meta: source.meta ? { ...(source.meta as object), total: rows.length } : source.meta };
  }
  if (Array.isArray(source.items)) {
    const rows = source.items.filter((item) => isItemVisibleForUser(item, user));
    return { ...source, items: rows, meta: source.meta ? { ...(source.meta as object), total: rows.length } : source.meta };
  }

  return isItemVisibleForUser(source, user) ? data : null;
}

function readRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : null;
}

function readArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  const record = readRecord(value);
  if (Array.isArray(record?.data)) return record.data;
  if (Array.isArray(record?.items)) return record.items;
  return [];
}

function firstTorreonEntity(data: unknown) {
  const record = readRecord(data);
  if (record?.arrastre && typeof record.arrastre === "object") return record.arrastre;
  if (record?.movimiento && typeof record.movimiento === "object") return record.movimiento;
  if (record?.ronda && typeof record.ronda === "object") return record.ronda;
  if (record?.id) return record;
  return readArray(data)[0] ?? null;
}

function extractArrastre(data: unknown) {
  const record = readRecord(data);
  const candidate = record?.arrastre ?? firstTorreonEntity(data);
  if (!candidate || typeof candidate !== "object") return null;
  if (Array.isArray((candidate as any).vagones) || (candidate as any).ordenSolicitud != null) return candidate as Record<string, any>;
  return null;
}

function extractMovimiento(data: unknown) {
  const record = readRecord(data);
  const candidate = record?.movimiento ?? firstTorreonEntity(data);
  if (!candidate || typeof candidate !== "object") return null;
  if ((candidate as any).locomotiveNumber != null || Array.isArray((candidate as any).rondas) || Array.isArray((candidate as any).fotos)) {
    return candidate as Record<string, any>;
  }
  return null;
}

function findVagon(arrastre: Record<string, any> | null, vagonId?: number | null) {
  const vagones = Array.isArray(arrastre?.vagones) ? arrastre.vagones : [];
  if (vagonId) return vagones.find((vagon: any) => positiveInt(vagon?.id) === vagonId) ?? null;
  return vagones.find((vagon: any) => String(vagon?.estado ?? "").toUpperCase() === "EN_PROCESO")
    ?? vagones.find((vagon: any) => String(vagon?.estado ?? "").toUpperCase() === "PENDIENTE")
    ?? vagones[0]
    ?? null;
}

function extractIncidenteId(data: unknown, pathIncidentId?: number | null) {
  const record = readRecord(data);
  return positiveInt(record?.incidenteId)
    ?? positiveInt(record?.incidente?.id)
    ?? positiveInt(record?.arrastre?.incidenteId)
    ?? positiveInt(record?.movimiento?.incidenteId)
    ?? pathIncidentId
    ?? null;
}

function formatArrastreTitle(arrastre: Record<string, any> | null) {
  const id = positiveInt(arrastre?.id);
  return id ? `Arrastre #${id}` : "Arrastre Torreon";
}

function vagonLabel(vagon: Record<string, any> | null) {
  const numero = vagon?.numeroVagon ? `vagon ${vagon.numeroVagon}` : vagon?.orden ? `vagon ${vagon.orden}` : "vagon";
  const via = vagon?.viaId ? ` · Via ${vagon.viaId}` : "";
  const seccion = vagon?.seccionId ? ` / Seccion ${vagon.seccionId}` : "";
  return `${numero}${via}${seccion}`;
}

function realtimeEntityForOperation(operation: TorreonOperation) {
  if (operation.incidenteId) return { entity: "incidente", entityId: operation.incidenteId };
  if (operation.vagonId) return { entity: "vagon", entityId: operation.vagonId };
  if (operation.arrastreId) return { entity: "arrastre", entityId: operation.arrastreId };
  return { entity: "movimiento", entityId: operation.movimientoId ?? null };
}

type TorreonOperation = {
  realtimeType: RealtimeEventType;
  fcmTipo: string;
  title: string;
  body: string;
  url: string;
  sendFcm: boolean;
  arrastreId?: number | null;
  movimientoId?: number | null;
  vagonId?: number | null;
  incidenteId?: number | null;
  accion?: string;
};

function inferTorreonOperation(method: string, rest: string, data: unknown): TorreonOperation | null {
  const verb = method.toUpperCase();
  if (verb === "GET") return null;

  const path = rest.split("?")[0];
  const arrastre = extractArrastre(data);
  const movimiento = extractMovimiento(data);
  const arrastrePath = path.match(/^\/arrastres\/(\d+)(?:\/|$)/);
  const movimientoPath = path.match(/^\/movimientos\/(\d+)(?:\/|$)/);
  const vagonPath = path.match(/^\/arrastres\/(\d+)\/vagones\/(\d+)(?:\/|$)/);
  const incidentePath = path.match(/\/incidentes\/(\d+)/);
  const arrastreId = positiveInt(arrastre?.id) ?? positiveInt(arrastrePath?.[1]);
  const movimientoId = positiveInt(movimiento?.id) ?? positiveInt(movimientoPath?.[1]);
  const vagonId = positiveInt(vagonPath?.[2]);
  const incidenteId = extractIncidenteId(data, positiveInt(incidentePath?.[1]));
  const vagon = findVagon(arrastre, vagonId);
  const arrastreTitle = formatArrastreTitle(arrastre);

  if (verb === "POST" && path === "/arrastres") {
    return {
      realtimeType: "torreon.arrastre.creado",
      fcmTipo: "arrastre_creado",
      title: "Arrastre solicitado",
      body: `${arrastreTitle} · ${(arrastre?.vagones ?? []).length || 0} vagones`,
      url: "/cliente/torreon/movimientos",
      sendFcm: true,
      arrastreId,
      accion: "crear",
    };
  }

  if (verb === "PATCH" && path === "/arrastres/orden-solicitudes") {
    return {
      realtimeType: "torreon.arrastre.orden",
      fcmTipo: "arrastre_orden_solicitudes",
      title: "Orden de arrastres actualizado",
      body: "La cola de arrastres fue reorganizada",
      url: "/cliente/torreon/movimientos",
      sendFcm: false,
      accion: "orden_solicitudes",
    };
  }

  if (verb === "PATCH" && path === "/rondas/movimientos/orden") {
    return {
      realtimeType: "torreon.movimiento.estado",
      fcmTipo: "torreon_ronda_orden",
      title: "Orden Torreon actualizado",
      body: "La ronda de movimientos fue reorganizada",
      url: "/movimientos",
      sendFcm: false,
      accion: "orden_ronda",
    };
  }

  if (/^\/arrastres\/\d+\/vagones\/orden$/.test(path)) {
    return {
      realtimeType: "torreon.arrastre.orden",
      fcmTipo: "arrastre_orden_vagones",
      title: "Orden de vagones actualizado",
      body: `${arrastreTitle} reorganizo sus vagones`,
      url: "/cliente/torreon/movimientos",
      sendFcm: false,
      arrastreId,
      accion: "orden_vagones",
    };
  }

  if (/^\/arrastres\/\d+\/vagones\/\d+\/iniciar$/.test(path)) {
    return {
      realtimeType: "torreon.arrastre.vagon",
      fcmTipo: "arrastre_vagon_iniciado",
      title: "Vagon de arrastre iniciado",
      body: `${arrastreTitle} · ${vagonLabel(vagon)}`,
      url: "/cliente/torreon/movimientos",
      sendFcm: true,
      arrastreId,
      vagonId,
      accion: "iniciar_vagon",
    };
  }

  if (/^\/arrastres\/\d+\/vagones\/\d+\/finalizar$/.test(path)) {
    const concluido = String(arrastre?.estado ?? "").toUpperCase() === "CONCLUIDO";
    return {
      realtimeType: concluido ? "torreon.arrastre.estado" : "torreon.arrastre.vagon",
      fcmTipo: concluido ? "arrastre_concluido" : "arrastre_vagon_finalizado",
      title: concluido ? "Arrastre concluido" : "Vagon de arrastre finalizado",
      body: `${arrastreTitle} · ${vagonLabel(vagon)}`,
      url: "/cliente/torreon/movimientos",
      sendFcm: true,
      arrastreId,
      vagonId,
      accion: "finalizar_vagon",
    };
  }

  if (/^\/arrastres\/\d+\/vagones\/\d+$/.test(path)) {
    return {
      realtimeType: "torreon.arrastre.orden",
      fcmTipo: "arrastre_vagon_editado",
      title: "Vagon de arrastre editado",
      body: `${arrastreTitle} · ${vagonLabel(vagon)}`,
      url: "/cliente/torreon/movimientos",
      sendFcm: false,
      arrastreId,
      vagonId,
      accion: "editar_vagon",
    };
  }

  if (/^\/arrastres\/\d+\/incidentes$/.test(path)) {
    return {
      realtimeType: "torreon.arrastre.incidente",
      fcmTipo: "arrastre_incidente",
      title: "Incidente en arrastre",
      body: `${arrastreTitle} detenido por incidente${incidenteId ? ` #${incidenteId}` : ""}`,
      url: "/incidentes?source=torreon",
      sendFcm: true,
      arrastreId,
      incidenteId,
      vagonId,
      accion: "incidente",
    };
  }

  if (/^\/arrastres\/\d+\/incidentes\/\d+\/resolver$/.test(path)) {
    return {
      realtimeType: "torreon.arrastre.incidente",
      fcmTipo: "arrastre_incidente_resuelto",
      title: "Incidente de arrastre resuelto",
      body: `${arrastreTitle} puede continuar`,
      url: "/incidentes?source=torreon",
      sendFcm: true,
      arrastreId,
      incidenteId,
      accion: "resolver_incidente",
    };
  }

  if (/^\/arrastres\/\d+\/cancelar$/.test(path)) {
    return {
      realtimeType: "torreon.arrastre.estado",
      fcmTipo: "arrastre_cancelado",
      title: "Arrastre cancelado",
      body: arrastreTitle,
      url: "/cliente/torreon/movimientos",
      sendFcm: true,
      arrastreId,
      accion: "cancelar",
    };
  }

  if (/^\/arrastres\/\d+\/reanudar$/.test(path) || /^\/arrastres\/\d+\/iniciar$/.test(path)) {
    return {
      realtimeType: "torreon.arrastre.estado",
      fcmTipo: /^\/arrastres\/\d+\/reanudar$/.test(path) ? "arrastre_reanudado" : "arrastre_iniciado",
      title: /^\/arrastres\/\d+\/reanudar$/.test(path) ? "Arrastre reanudado" : "Arrastre iniciado",
      body: arrastreTitle,
      url: "/cliente/torreon/movimientos",
      sendFcm: true,
      arrastreId,
      accion: /^\/arrastres\/\d+\/reanudar$/.test(path) ? "reanudar" : "iniciar",
    };
  }

  if (/^\/arrastres\/\d+\/finalizar$/.test(path)) {
    return {
      realtimeType: "torreon.arrastre.estado",
      fcmTipo: "arrastre_concluido",
      title: "Arrastre concluido",
      body: arrastreTitle,
      url: "/cliente/torreon/movimientos",
      sendFcm: true,
      arrastreId,
      accion: "finalizar",
    };
  }

  if (verb === "POST" && path === "/movimientos") {
    return {
      realtimeType: "torreon.movimiento.creado",
      fcmTipo: "torreon_movimiento_creado",
      title: "Movimiento Torreon creado",
      body: `Movimiento #${movimientoId ?? ""} · Loco ${movimiento?.locomotiveNumber ?? "N/D"}`,
      url: "/movimientos",
      sendFcm: true,
      movimientoId,
      accion: "crear_movimiento",
    };
  }

  if (/^\/movimientos\/\d+\/iniciar$/.test(path)) {
    return {
      realtimeType: "torreon.movimiento.estado",
      fcmTipo: "torreon_movimiento_iniciado",
      title: "Movimiento Torreon iniciado",
      body: `Movimiento #${movimientoId ?? ""} · Loco ${movimiento?.locomotiveNumber ?? "N/D"}`,
      url: "/movimientos",
      sendFcm: true,
      movimientoId,
      accion: "iniciar_movimiento",
    };
  }

  if (/^\/movimientos\/\d+\/finalizar$/.test(path)) {
    return {
      realtimeType: "torreon.movimiento.estado",
      fcmTipo: "torreon_movimiento_concluido",
      title: "Movimiento Torreon concluido",
      body: `Movimiento #${movimientoId ?? ""} · Loco ${movimiento?.locomotiveNumber ?? "N/D"}`,
      url: "/movimientos",
      sendFcm: true,
      movimientoId,
      accion: "finalizar_movimiento",
    };
  }

  if (/^\/movimientos\/\d+\/(?:detener|incidentes)$/.test(path)) {
    return {
      realtimeType: "torreon.movimiento.incidente",
      fcmTipo: "torreon_movimiento_incidente",
      title: "Incidente en movimiento Torreon",
      body: `Movimiento #${movimientoId ?? ""} detenido${incidenteId ? ` · Incidente #${incidenteId}` : ""}`,
      url: "/incidentes?source=torreon",
      sendFcm: true,
      movimientoId,
      incidenteId,
      accion: "incidente_movimiento",
    };
  }

  if (/^\/movimientos\/\d+\/reanudar$/.test(path)) {
    return {
      realtimeType: "torreon.movimiento.estado",
      fcmTipo: "torreon_movimiento_reanudado",
      title: "Movimiento Torreon reanudado",
      body: `Movimiento #${movimientoId ?? ""} · Loco ${movimiento?.locomotiveNumber ?? "N/D"}`,
      url: "/movimientos",
      sendFcm: true,
      movimientoId,
      accion: "reanudar_movimiento",
    };
  }

  if (/^\/incidentes\/\d+\/resolver$/.test(path)) {
    return {
      realtimeType: "torreon.incidente.estado",
      fcmTipo: "torreon_incidente_resuelto",
      title: "Incidente Torreon resuelto",
      body: incidenteId ? `Incidente #${incidenteId}` : "Incidente resuelto",
      url: "/incidentes?source=torreon",
      sendFcm: true,
      incidenteId,
      accion: "resolver_incidente",
    };
  }

  return null;
}

function dispatchTorreonSideEffects(method: string, rest: string, data: unknown, user?: AuthenticatedUser) {
  const operation = inferTorreonOperation(method, rest, data);
  if (!operation) return;

  const arrastre = extractArrastre(data);
  const movimiento = extractMovimiento(data);
  const entity = arrastre ?? movimiento ?? firstTorreonEntity(data);
  const empresaId = positiveInt(entity?.empresaId) ?? readEmpresaId(user);
  const localidadId = positiveInt(entity?.localidadId) ?? readLocalidadId(user);
  const clienteId = positiveInt(entity?.clienteId);
  const estado = String(entity?.estado ?? "").trim() || null;
  const locomotiveNumber = entity?.locomotiveNumber ?? null;
  const arrastreId = operation.arrastreId ?? positiveInt(arrastre?.id);
  const movimientoId = operation.movimientoId ?? positiveInt(movimiento?.id);
  const realtimeEntity = realtimeEntityForOperation({
    ...operation,
    arrastreId,
    movimientoId,
  });

  publishRealtimeEvent({
    type: operation.realtimeType,
    source: "torreon",
    ...realtimeEntity,
    empresaId,
    localidadId,
    clienteId,
    movimientoId,
    arrastreId,
    vagonId: operation.vagonId ?? null,
    incidenteId: operation.incidenteId ?? null,
    estado,
    accion: operation.accion,
    locomotiveNumber,
  });

  if (!operation.sendFcm) return;

  setImmediate(() => {
    void NotificadorFCM.notificarOperacionTorreon({
      tipo: operation.fcmTipo,
      titulo: operation.title,
      mensaje: operation.body,
      empresaId,
      localidadId,
      usuarioIds: [positiveInt(user?.id), positiveInt(entity?.creadoPorId), positiveInt(entity?.operadorId), positiveInt(entity?.clienteId)],
      url: operation.url,
      tag: `torreon:${operation.fcmTipo}:${arrastreId ?? movimientoId ?? operation.incidenteId ?? Date.now()}`,
      data: {
        eventType: operation.realtimeType,
        source: "torreon",
        entity: realtimeEntity.entity,
        entityId: realtimeEntity.entityId,
        accion: operation.accion,
        empresaId,
        localidadId,
        clienteId,
        arrastreId,
        movimientoId,
        vagonId: operation.vagonId,
        incidenteId: operation.incidenteId,
        estado,
        locomotiveNumber,
      },
    });
  });
}

router.all("/*", async (req, res) => {
  const user = req.user as AuthenticatedUser | undefined;
  const role = userRole(user);

  if (!canUseTorreon(user)) {
    return res.status(403).json({ error: "No autorizado para modulo Torreon", role });
  }

  const base = req.baseUrl;
  const originalRest = req.originalUrl.startsWith(base)
    ? req.originalUrl.slice(base.length)
    : req.originalUrl;
  const scopedRest = req.method.toUpperCase() === "GET" ? applyListScope(originalRest || "/", user) : originalRest || "/";

  if (isReadonlyClient(user) && !isAllowedClientMutation(req.method, scopedRest)) {
    return res.status(403).json({
      error: "No autorizado para operar arrastre",
      message: "El cliente puede consultar, crear, cancelar, editar vagones fuera de proceso y resolver incidentes propios; no puede iniciar ni finalizar vagones.",
    });
  }

  if (role === "MAQUINISTA_ARRASTRE" && !isAllowedMaquinistaArrastreMutation(req.method, scopedRest)) {
    return res.status(403).json({
      error: "No autorizado para operar arrastre",
      message: "El maquinista de arrastre solo puede consultar, iniciar/finalizar el vagon asignado y crear incidentes con evidencia.",
    });
  }

  try {
    const result = await proxyToTorreonMs(scopedRest, {
      method: req.method,
      body:
        req.method === "GET" || req.method === "DELETE"
          ? undefined
          : withActorDefaults(req.method, scopedRest, req.body, user),
      headers: {
        ...(user?.id ? { "x-user-id": String(user.id) } : {}),
        ...(user?.rol ? { "x-user-rol": String(user.rol) } : {}),
      },
    });

    if (req.method.toUpperCase() === "GET") {
      const filtered = filterDataForUser(result.data, user);
      if (filtered == null) return res.status(403).json({ error: "No autorizado para este recurso" });
      return res.status(result.status).send(filtered);
    }

    dispatchTorreonSideEffects(req.method, scopedRest, result.data, user);
    return res.status(result.status).send(result.data);
  } catch (error: any) {
    const status = Number(error?.status) || 502;
    return res.status(status).json({
      error: error?.message ?? "Error proxy ms_torreon",
      details: error?.details ?? null,
    });
  }
});

export default router;
