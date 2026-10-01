import { Router } from "express";
import { authenticateAccess } from "../../auth/authenticateAccess";
import { idempotentMutation } from "../../middlewares/idempotentMutation";
import type { AuthenticatedUser } from "../../types/auth";
import { proxyToTorreonMs } from "../../services/torreonMs/torreonMsClient";
import { NotificadorFCM } from "../../services/NotificadorFCM";
import { publishRealtimeEvent, type RealtimeEventType } from "../../realtime/realtimeHub";
import { prisma } from "../../lib/prisma";
import { resolverAudienciaFcmTorreon } from "../../services/torreonFcmRouting";

const { PrismaClient: TorreonPrismaClient } = require("../../../ms_torreon/generated");
const prismaTorreon = new TorreonPrismaClient();

const router = Router();

const ADMIN_ROLES = new Set(["ADMINISTRADOR", "COORDINADOR"]);
const LOCAL_OPERATION_ROLES = new Set(["SUPERVISOR", "MAQUINISTA", "MAQUINISTA_ARRASTRE"]);
const CLIENT_COMPANY_ROLES = new Set(["CLIENTE_ADMIN", "CLIENTE_COOR"]);
const CLIENT_LOCAL_ROLES = new Set(["CLIENTE", "ARRASTRE_TORREON"]);
const ALLOWED_ROLES = new Set([
  ...ADMIN_ROLES,
  ...LOCAL_OPERATION_ROLES,
  ...CLIENT_COMPANY_ROLES,
  ...CLIENT_LOCAL_ROLES,
]);

router.use(authenticateAccess);
router.use(idempotentMutation);

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

type TorreonResponsableScope = "NATURAL" | "ARRASTRE";

async function obtenerResponsableActivoMasReciente(
  rol: "SUPERVISOR" | "COORDINADOR",
  localidadId: number,
  empresaId?: number | null
) {
  const orderBy = [{ issuedAt: "desc" as const }, { createdAt: "desc" as const }];
  const vigencia = { revokedAt: null, expiresAt: { gt: new Date() } };

  if (empresaId) {
    const exacto = await prisma.token.findFirst({
      where: {
        ...vigencia,
        usuario: { activo: true, rol, localidadId, empresaId },
      },
      orderBy,
      select: { usuarioId: true },
    });
    if (exacto) return exacto.usuarioId;
  }

  const localidad = await prisma.token.findFirst({
    where: {
      ...vigencia,
      usuario: { activo: true, rol, localidadId },
    },
    orderBy,
    select: { usuarioId: true },
  });

  return localidad?.usuarioId ?? null;
}

async function obtenerResponsableConfigurado(
  rol: "SUPERVISOR" | "COORDINADOR",
  localidadId: number,
  empresaId?: number | null
) {
  if (empresaId) {
    const exacto = await prisma.usuario.findFirst({
      where: { activo: true, rol, localidadId, empresaId },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: { id: true },
    });
    if (exacto) return exacto.id;
  }

  const localidad = await prisma.usuario.findFirst({
    where: { activo: true, rol, localidadId },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: { id: true },
  });
  return localidad?.id ?? null;
}

async function validarResponsableGuardado(
  value: unknown,
  rol: "SUPERVISOR" | "COORDINADOR",
  localidadId: number
) {
  const id = positiveInt(value);
  if (!id) return null;

  const usuario = await prisma.usuario.findFirst({
    where: { id, activo: true, rol, localidadId },
    select: { id: true },
  });
  return usuario?.id ?? null;
}

async function resolverResponsablesTorreon(
  source: Record<string, unknown>,
  user: AuthenticatedUser | undefined,
  _scope: TorreonResponsableScope
) {
  const localidadId = positiveInt(source.localidadId) ?? readLocalidadId(user);
  if (!localidadId) return {};

  const empresaId = positiveInt(source.empresaId) ?? readEmpresaId(user);
  const actorRole = userRole(user);
  const actorLocalidadId = readLocalidadId(user);
  const actorId = positiveInt(user?.id);
  const supervisorActor = actorRole === "SUPERVISOR" && actorLocalidadId === localidadId ? actorId : null;
  const coordinadorActor = actorRole === "COORDINADOR" && actorLocalidadId === localidadId ? actorId : null;

  const [supervisorConectado, coordinadorConectado] = await Promise.all([
    supervisorActor ? null : obtenerResponsableActivoMasReciente("SUPERVISOR", localidadId, empresaId),
    coordinadorActor ? null : obtenerResponsableActivoMasReciente("COORDINADOR", localidadId, empresaId),
  ]);

  const [supervisorGuardado, coordinadorGuardado] = await Promise.all([
    supervisorActor || supervisorConectado ? null : validarResponsableGuardado(source.supervisorId, "SUPERVISOR", localidadId),
    coordinadorActor || coordinadorConectado ? null : validarResponsableGuardado(source.coordinadorId, "COORDINADOR", localidadId),
  ]);

  const [supervisorConfigurado, coordinadorConfigurado] = await Promise.all([
    supervisorActor || supervisorConectado || supervisorGuardado
      ? null
      : obtenerResponsableConfigurado("SUPERVISOR", localidadId, empresaId),
    coordinadorActor || coordinadorConectado || coordinadorGuardado
      ? null
      : obtenerResponsableConfigurado("COORDINADOR", localidadId, empresaId),
  ]);

  return {
    supervisorId: supervisorActor
      ?? supervisorConectado
      ?? supervisorGuardado
      ?? supervisorConfigurado
      ?? undefined,
    coordinadorId: coordinadorActor
      ?? coordinadorConectado
      ?? coordinadorGuardado
      ?? coordinadorConfigurado
      ?? undefined,
  };
}

function exigirResponsables(
  responsables: { supervisorId?: number; coordinadorId?: number },
  localidadId: number
) {
  if (responsables.supervisorId || responsables.coordinadorId) return responsables;

  const error = new Error(
    `No se puede continuar: falta un coordinador o supervisor activo para la localidad ${localidadId}.`
  );
  (error as any).status = 409;
  (error as any).details = {
    localidadId,
    faltantes: ["coordinador_o_supervisor"],
    accion: "Configura un usuario activo con la localidad correcta o inicia sesión con ese responsable.",
  };
  throw error;
}

async function resolverResponsablesArrastreAlIniciar(path: string, user?: AuthenticatedUser) {
  const match = path.match(/^\/arrastres\/(\d+)\/vagones\/\d+\/iniciar$/);
  const arrastreId = positiveInt(match?.[1]);
  if (!arrastreId) return null;

  const arrastre = await prismaTorreon.arrastreTorreon.findUnique({
    where: { id: arrastreId },
    select: {
      localidadId: true,
      empresaId: true,
      supervisorId: true,
      coordinadorId: true,
    },
  });
  if (!arrastre) return null;

  const responsables = await resolverResponsablesTorreon(
    arrastre as unknown as Record<string, unknown>,
    user,
    "ARRASTRE"
  );
  return exigirResponsables(responsables, arrastre.localidadId);
}

async function resolverResponsablesMovimientoAlIniciar(path: string, user?: AuthenticatedUser) {
  const match = path.match(/^\/movimientos\/(\d+)\/iniciar$/);
  const movimientoId = positiveInt(match?.[1]);
  if (!movimientoId) return null;

  const movimiento = await prismaTorreon.movimientoTorreonFerro.findUnique({
    where: { id: movimientoId },
    select: {
      localidadId: true,
      empresaId: true,
      supervisorId: true,
      coordinadorId: true,
    },
  });
  if (!movimiento) return null;

  const responsables = await resolverResponsablesTorreon(
    movimiento as unknown as Record<string, unknown>,
    user,
    "NATURAL"
  );
  return exigirResponsables(responsables, movimiento.localidadId);
}

function isReadonlyClient(user?: AuthenticatedUser) {
  const role = userRole(user);
  return CLIENT_COMPANY_ROLES.has(role) || CLIENT_LOCAL_ROLES.has(role);
}

function canUseTorreon(user?: AuthenticatedUser) {
  return ALLOWED_ROLES.has(userRole(user));
}

function normalizeProxyPath(rest: string) {
  const path = rest.split("?")[0].trim();
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, "") : withLeadingSlash;
}

function isAllowedClientMutation(method: string, rest: string) {
  const verb = method.toUpperCase();
  const path = normalizeProxyPath(rest);
  if (verb === "GET") return true;
  if (verb === "POST" && path === "/arrastres") return true;
  if (verb === "PATCH" && /^\/arrastres\/\d+$/.test(path)) return true;
  if (verb === "PATCH" && path === "/arrastres/orden-solicitudes") return true;
  if (verb === "PATCH" && /^\/arrastres\/\d+\/cancelar$/.test(path)) return true;
  if (verb === "PATCH" && /^\/arrastres\/\d+\/vagones\/orden$/.test(path)) return true;
  if (verb === "PATCH" && /^\/arrastres\/\d+\/vagones\/\d+$/.test(path)) return true;
  if (["PATCH", "PUT", "POST"].includes(verb) && /^\/arrastres\/\d+\/incidentes\/\d+\/resolver$/.test(path)) return true;
  if (["PATCH", "PUT", "POST"].includes(verb) && /^\/incidentes\/\d+\/resolver$/.test(path)) return true;
  if (["PATCH", "PUT", "POST"].includes(verb) && /^\/incidentes\/\d+\/cerrar$/.test(path)) return true;
  if (verb === "PATCH" && path === "/rondas/movimientos/orden") return true;
  return false;
}

function isAllowedMaquinistaArrastreMutation(method: string, rest: string) {
  const verb = method.toUpperCase();
  const path = normalizeProxyPath(rest);
  if (verb === "GET") return true;
  if (verb === "POST" && /^\/arrastres\/\d+\/incidentes$/.test(path)) return true;
  if (verb === "PATCH" && /^\/arrastres\/\d+\/vagones\/\d+\/iniciar$/.test(path)) return true;
  if (verb === "PATCH" && /^\/arrastres\/\d+\/vagones\/\d+\/finalizar$/.test(path)) return true;
  return false;
}

function isAllowedMaquinistaNaturalMutation(method: string, rest: string) {
  const verb = method.toUpperCase();
  const path = rest.split("?")[0];
  if (verb === "GET") return true;
  if (verb === "POST" && /^\/movimientos\/\d+\/iniciar$/.test(path)) return true;
  if (verb === "PATCH" && /^\/movimientos\/\d+\/finalizar$/.test(path)) return true;
  if (verb === "POST" && /^\/movimientos\/\d+\/fotos$/.test(path)) return true;
  if (verb === "POST" && /^\/movimientos\/\d+\/(?:detener|incidentes)$/.test(path)) return true;
  return false;
}

function incidentMutationDetailPath(method: string, rest: string) {
  if (method.toUpperCase() === "GET") return null;
  const [path, query = ""] = rest.split("?");
  const match = path.match(/^\/incidentes\/(\d+)\/(?:resolver|cerrar)$/);
  if (!match) return null;
  return `/incidentes/${match[1]}${query ? `?${query}` : ""}`;
}

function arrastreMutationDetailPath(method: string, rest: string) {
  if (method.toUpperCase() === "GET") return null;
  const path = rest.split("?")[0];
  const match = path.match(/^\/arrastres\/(\d+)(?:\/|$)/);
  return match ? `/arrastres/${match[1]}` : null;
}

async function withActorDefaults(method: string, rest: string, body: unknown, user?: AuthenticatedUser) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;

  const userId = positiveInt(user?.id);
  if (!userId) return body;

  const verb = method.toUpperCase();
  const path = rest.split("?")[0];
  const source = body as Record<string, unknown>;
  const empresaId = readEmpresaId(user);
  const localidadId = readLocalidadId(user);

  if (verb === "POST" && path === "/arrastres") {
    const payload = {
      ...source,
      creadoPorId: userId,
      ...(empresaId ? { empresaId: source.empresaId ?? empresaId } : {}),
      ...(localidadId ? { localidadId: source.localidadId ?? localidadId } : {}),
    };
    const responsables = await resolverResponsablesTorreon(payload, user, "ARRASTRE");
    return {
      ...payload,
      ...exigirResponsables(responsables, positiveInt(payload.localidadId)!),
    };
  }

  if (verb === "PATCH" && /^\/arrastres\/\d+$/.test(path)) {
    return {
      ...source,
      editadoPorId: userId,
      editadoPorRol: userRole(user),
      editadoPorNombre: user?.nombre?.trim() || undefined,
    };
  }

  if (verb === "POST" && path === "/movimientos") {
    const payload = {
      ...source,
      creadoPorId: userId,
      clienteId: source.clienteId ?? (CLIENT_COMPANY_ROLES.has(userRole(user)) || CLIENT_LOCAL_ROLES.has(userRole(user)) ? userId : undefined),
      ...(empresaId ? { empresaId: source.empresaId ?? empresaId } : {}),
      ...(localidadId ? { localidadId: source.localidadId ?? localidadId } : {}),
    };
    const responsables = await resolverResponsablesTorreon(payload, user, "NATURAL");
    return {
      ...payload,
      ...exigirResponsables(responsables, positiveInt(payload.localidadId)!),
    };
  }

  if (verb === "POST" && /^\/movimientos\/\d+\/iniciar$/.test(path)) {
    const responsables = await resolverResponsablesMovimientoAlIniciar(path, user);
    const isMaquinistaNatural = userRole(user) === "MAQUINISTA";
    return {
      ...source,
      iniciadoPorId: isMaquinistaNatural ? userId : source.iniciadoPorId ?? userId,
      operadorId: isMaquinistaNatural ? userId : source.operadorId ?? userId,
      ...(responsables ?? {}),
    };
  }

  if (["PATCH", "PUT", "POST"].includes(verb) && /^\/movimientos\/\d+\/finalizar$/.test(path)) {
    return { ...source, finalizadoPorId: source.finalizadoPorId ?? userId };
  }

  if (verb === "POST" && /^\/movimientos\/\d+\/fotos$/.test(path)) {
    return { ...source, tomadaPorId: source.tomadaPorId ?? userId };
  }

  if (verb === "POST" && /^\/movimientos\/\d+\/(?:detener|incidentes)$/.test(path)) {
    return { ...source, creadoPorId: userId };
  }

  if (["PATCH", "PUT", "POST"].includes(verb) && /^\/movimientos\/\d+\/reanudar$/.test(path)) {
    return {
      ...source,
      operadorId: source.operadorId ?? userId,
      resueltoPorId: source.resueltoPorId ?? userId,
    };
  }

  if (["PATCH", "PUT", "POST"].includes(verb) && /^\/incidentes\/\d+\/(?:resolver|cerrar)$/.test(path)) {
    return { ...source, resueltoPorId: source.resueltoPorId ?? userId };
  }

  if (verb === "POST" && /^\/arrastres\/\d+\/iniciar$/.test(path)) {
    return {
      ...source,
      iniciadoPorId: source.iniciadoPorId ?? userId,
      operadorId: source.operadorId ?? userId,
    };
  }

  if (["PATCH", "PUT", "POST"].includes(verb) && /^\/arrastres\/\d+\/vagones\/\d+\/iniciar$/.test(path)) {
    const responsables = await resolverResponsablesArrastreAlIniciar(path, user);
    const isMaquinistaArrastre = userRole(user) === "MAQUINISTA_ARRASTRE";
    return {
      ...source,
      iniciadoPorId: isMaquinistaArrastre ? userId : source.iniciadoPorId ?? userId,
      operadorId: isMaquinistaArrastre ? userId : source.operadorId ?? userId,
      ...(responsables ?? {}),
    };
  }

  if (["PATCH", "PUT", "POST"].includes(verb) && /^\/arrastres\/\d+\/finalizar$/.test(path)) {
    return { ...source, finalizadoPorId: source.finalizadoPorId ?? userId };
  }

  if (["PATCH", "PUT", "POST"].includes(verb) && /^\/arrastres\/\d+\/cancelar$/.test(path)) {
    return { ...source, canceladoPorId: source.canceladoPorId ?? userId };
  }

  if (verb === "POST" && /^\/arrastres\/\d+\/incidentes$/.test(path)) {
    return { ...source, creadoPorId: userId };
  }

  if (["PATCH", "PUT", "POST"].includes(verb) && /^\/arrastres\/\d+\/incidentes\/\d+\/resolver$/.test(path)) {
    return { ...source, resueltoPorId: source.resueltoPorId ?? userId };
  }

  if (["PATCH", "PUT", "POST"].includes(verb) && /^\/arrastres\/\d+\/reanudar$/.test(path)) {
    return { ...source, operadorId: source.operadorId ?? userId };
  }

  return body;
}

function isGeneralLocalityQueueList(rest: string, user?: AuthenticatedUser) {
  const [path, query = ""] = rest.split("?");
  if (!["/arrastres", "/rondas"].includes(path) || !isReadonlyClient(user) || !readLocalidadId(user)) return false;
  return new URLSearchParams(query).get("alcance") === "localidad";
}

function applyListScope(rest: string, user?: AuthenticatedUser, generalLocalityQueue = false) {
  const role = userRole(user);
  const [path, query = ""] = rest.split("?");
  if (!["/arrastres", "/movimientos", "/incidentes", "/rondas", "/catalogos/arrastre"].includes(path)) return rest;

  const params = new URLSearchParams(query);
  const empresaId = readEmpresaId(user);
  const localidadId = readLocalidadId(user);

  // `alcance` es una señal interna del gateway; no se reenvía al microservicio.
  params.delete("alcance");

  if (generalLocalityQueue && ["/arrastres", "/rondas"].includes(path) && localidadId) {
    params.delete("empresaId");
    params.set("localidadId", String(localidadId));
  }

  if (!generalLocalityQueue && CLIENT_COMPANY_ROLES.has(role) && empresaId && !params.has("empresaId")) {
    params.set("empresaId", String(empresaId));
  }

  if (!generalLocalityQueue && CLIENT_LOCAL_ROLES.has(role)) {
    if (empresaId && !params.has("empresaId")) params.set("empresaId", String(empresaId));
    if (localidadId && !params.has("localidadId")) params.set("localidadId", String(localidadId));
  }

  if (LOCAL_OPERATION_ROLES.has(role) && localidadId && !params.has("localidadId")) {
    params.set("localidadId", String(localidadId));
  }

  if (path === "/catalogos/arrastre" && role !== "ADMINISTRADOR" && localidadId) {
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

function isItemVisibleForUser(item: any, user?: AuthenticatedUser, generalLocalityQueue = false) {
  const role = userRole(user);
  if (ADMIN_ROLES.has(role)) return true;

  const itemEmpresaId = positiveInt(item?.empresaId ?? item?.movimiento?.empresaId ?? item?.arrastre?.empresaId);
  const itemLocalidadId = positiveInt(item?.localidadId ?? item?.movimiento?.localidadId ?? item?.arrastre?.localidadId);
  const empresaId = readEmpresaId(user);
  const localidadId = readLocalidadId(user);

  if (generalLocalityQueue && isReadonlyClient(user)) {
    return Boolean(localidadId) && itemLocalidadId === localidadId;
  }

  if (CLIENT_COMPANY_ROLES.has(role)) return !empresaId || itemEmpresaId === empresaId;
  if (CLIENT_LOCAL_ROLES.has(role)) {
    const empresaOk = !empresaId || itemEmpresaId === empresaId;
    const localidadOk = !localidadId || itemLocalidadId === localidadId;
    return empresaOk && localidadOk;
  }
  if (LOCAL_OPERATION_ROLES.has(role)) return !localidadId || itemLocalidadId === localidadId;

  return false;
}

function filterDataForUser(data: unknown, user?: AuthenticatedUser, generalLocalityQueue = false) {
  if (Array.isArray(data)) return data.filter((item) => isItemVisibleForUser(item, user, generalLocalityQueue));
  if (!data || typeof data !== "object") return data;

  const source = data as Record<string, unknown>;
  if (Array.isArray(source.data)) {
    const rows = source.data.filter((item) => isItemVisibleForUser(item, user, generalLocalityQueue));
    return { ...source, data: rows, meta: source.meta ? { ...(source.meta as object), total: rows.length } : source.meta };
  }
  if (Array.isArray(source.items)) {
    const rows = source.items.filter((item) => isItemVisibleForUser(item, user, generalLocalityQueue));
    return { ...source, items: rows, meta: source.meta ? { ...(source.meta as object), total: rows.length } : source.meta };
  }

  return isItemVisibleForUser(source, user, generalLocalityQueue) ? data : null;
}

const RESPONSABLE_FIELDS = [
  { id: "supervisorId", detail: "supervisor" },
  { id: "coordinadorId", detail: "coordinador" },
  { id: "operadorId", detail: "operador" },
] as const;

function collectResponsableIds(value: unknown, ids: Set<number>, depth = 0) {
  if (depth > 8 || value == null) return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectResponsableIds(item, ids, depth + 1));
    return;
  }
  if (typeof value !== "object") return;

  const source = value as Record<string, unknown>;
  RESPONSABLE_FIELDS.forEach((field) => {
    const id = positiveInt(source[field.id]);
    if (id) ids.add(id);
  });
  Object.values(source).forEach((child) => collectResponsableIds(child, ids, depth + 1));
}

function decorateResponsables(
  value: unknown,
  users: Map<number, { id: number; nombre: string; rol: string }>,
  depth = 0
): unknown {
  if (depth > 8 || value == null) return value;
  if (Array.isArray(value)) return value.map((item) => decorateResponsables(item, users, depth + 1));
  if (typeof value !== "object") return value;

  const source = value as Record<string, unknown>;
  const decorated = Object.fromEntries(
    Object.entries(source).map(([key, child]) => [key, decorateResponsables(child, users, depth + 1)])
  ) as Record<string, unknown>;

  RESPONSABLE_FIELDS.forEach((field) => {
    const id = positiveInt(source[field.id]);
    if (id) decorated[field.detail] = users.get(id) ?? { id, nombre: `Usuario #${id}`, rol: "" };
  });
  return decorated;
}

async function enrichTorreonResponsables(data: unknown) {
  const ids = new Set<number>();
  collectResponsableIds(data, ids);
  if (!ids.size) return data;

  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: Array.from(ids) } },
    select: { id: true, nombre: true, rol: true },
  });
  const usersById = new Map(usuarios.map((usuario) => [
    usuario.id,
    { ...usuario, rol: String(usuario.rol) },
  ]));
  return decorateResponsables(data, usersById);
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

function collectTorreonOperations(value: unknown, rows: Array<{ entity: Record<string, any>; scope: TorreonResponsableScope }> = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectTorreonOperations(item, rows));
    return rows;
  }

  const entity = readRecord(value);
  if (!entity) return rows;

  const id = positiveInt(entity.id);
  const localidadId = positiveInt(entity.localidadId);
  const isArrastre = Array.isArray(entity.vagones);
  const isNatural = entity.locomotiveNumber != null;
  if (id && localidadId && (isArrastre || isNatural)) {
    rows.push({ entity, scope: isArrastre ? "ARRASTRE" : "NATURAL" });
    return rows;
  }

  for (const key of ["data", "items", "rows", "results", "arrastres", "movimientos", "arrastre", "movimiento"]) {
    if (entity[key] != null) collectTorreonOperations(entity[key], rows);
  }
  return rows;
}

async function completarResponsablesFaltantes(data: unknown, user?: AuthenticatedUser) {
  const operations = collectTorreonOperations(data).filter(({ entity }) => (
    !positiveInt(entity.supervisorId) || !positiveInt(entity.coordinadorId)
  ));
  if (!operations.length) return data;

  const cache = new Map<string, Promise<{ supervisorId?: number; coordinadorId?: number }>>();
  await Promise.all(operations.map(async ({ entity, scope }) => {
    const localidadId = positiveInt(entity.localidadId);
    const empresaId = positiveInt(entity.empresaId);
    const id = positiveInt(entity.id);
    if (!localidadId || !id) return;

    const cacheKey = `${scope}:${localidadId}:${empresaId ?? "all"}`;
    let resolution = cache.get(cacheKey);
    if (!resolution) {
      resolution = resolverResponsablesTorreon(entity, user, scope);
      cache.set(cacheKey, resolution);
    }
    const responsables = await resolution;
    const patch = {
      ...(!positiveInt(entity.supervisorId) && responsables.supervisorId
        ? { supervisorId: responsables.supervisorId }
        : {}),
      ...(!positiveInt(entity.coordinadorId) && responsables.coordinadorId
        ? { coordinadorId: responsables.coordinadorId }
        : {}),
    };
    if (!Object.keys(patch).length) return;

    if (scope === "ARRASTRE") {
      await prismaTorreon.arrastreTorreon.update({ where: { id }, data: patch });
    } else {
      await prismaTorreon.movimientoTorreonFerro.update({ where: { id }, data: patch });
    }
    Object.assign(entity, patch);
  }));

  return data;
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

function compactRealtimeSnapshot(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value.length > 1_000 ? `${value.slice(0, 1_000)}...` : value;
  if (depth >= 4) return undefined;
  if (Array.isArray(value)) {
    return value.slice(0, 120).map((item) => compactRealtimeSnapshot(item, depth + 1));
  }
  if (typeof value !== "object") return undefined;

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (["fotos", "storageKey", "token", "password"].includes(key)) continue;
    const compacted = compactRealtimeSnapshot(item, depth + 1);
    if (typeof compacted !== "undefined") result[key] = compacted;
  }
  return result;
}

function formatArrastreTitle(arrastre: Record<string, any> | null) {
  const id = positiveInt(arrastre?.id);
  return id ? `Arrastre #${id}` : "Arrastre Torreon";
}

function vagonLabel(vagon: Record<string, any> | null) {
  const numero = vagon?.numeroVagon ? `vagon ${vagon.numeroVagon}` : vagon?.orden ? `vagon ${vagon.orden}` : "vagon";
  const viaNombre = String(vagon?.viaDestinoNombre ?? "").trim();
  const seccionNombre = String(vagon?.seccionDestinoNombre ?? "").trim();
  const via = viaNombre
    ? " · " + viaNombre
    : vagon?.viaId ? " · Vía " + vagon.viaId : "";
  const seccion = seccionNombre
    ? " / " + seccionNombre
    : vagon?.seccionId ? " / Sección " + vagon.seccionId : "";
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

  if (verb === "PATCH" && /^\/arrastres\/\d+$/.test(path)) {
    return {
      realtimeType: "torreon.arrastre.orden",
      fcmTipo: "arrastre_editado",
      title: "Solicitud de arrastre editada",
      body: `${arrastreTitle} · ${(arrastre?.vagones ?? []).length || 0} vagones`,
      url: "/cliente/torreon/movimientos",
      sendFcm: true,
      arrastreId,
      accion: "editar_arrastre",
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
      sendFcm: true,
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
      fcmTipo: "nuevo_incidente",
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
      fcmTipo: "incidente_resuelto_cliente",
      title: "Incidente Torreon resuelto",
      body: incidenteId ? `Incidente #${incidenteId}` : "Incidente resuelto",
      url: "/incidentes?source=torreon",
      sendFcm: true,
      incidenteId,
      accion: "resolver_incidente",
    };
  }

  if (/^\/incidentes\/\d+\/cerrar$/.test(path)) {
    const entityLabel = arrastreId ? `Arrastre #${arrastreId}` : movimientoId ? `Movimiento #${movimientoId}` : "Movimiento Torreon";
    return {
      realtimeType: "torreon.incidente.estado",
      fcmTipo: "incidente_cerrado_manual",
      title: arrastreId ? "Arrastre Torreon cancelado" : "Movimiento Torreon cancelado",
      body: incidenteId
        ? `${entityLabel} · incidente #${incidenteId} cerrado`
        : `${entityLabel} cancelado por cierre de incidente`,
      url: "/incidentes?source=torreon",
      sendFcm: true,
      arrastreId,
      movimientoId,
      incidenteId,
      accion: "cerrar_incidente_cancelar_movimiento",
    };
  }

  return null;
}

function dispatchTorreonSideEffects(method: string, rest: string, data: unknown, user?: AuthenticatedUser, requestBody?: any) {
  const operation = inferTorreonOperation(method, rest, data);
  if (!operation) return;

  const arrastre = extractArrastre(data);
  const movimiento = extractMovimiento(data);
  const entity = arrastre ?? movimiento ?? firstTorreonEntity(data);
  const empresaId = positiveInt(entity?.empresaId) ?? positiveInt(requestBody?.empresaId) ?? readEmpresaId(user);
  const localidadId = positiveInt(entity?.localidadId) ?? positiveInt(requestBody?.localidadId) ?? readLocalidadId(user);
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
    version: entity?.updatedAt ?? null,
    snapshot: compactRealtimeSnapshot(entity) as Record<string, unknown> | null,
  });

  if (!operation.sendFcm) return;

  const fcmRouting = resolverAudienciaFcmTorreon(operation.fcmTipo);

  setImmediate(() => {
    void NotificadorFCM.notificarOperacionTorreon({
      tipo: operation.fcmTipo,
      titulo: operation.title,
      mensaje: operation.body,
      empresaId,
      localidadId,
      usuarioIds: [positiveInt(user?.id), positiveInt(entity?.creadoPorId), positiveInt(entity?.operadorId), positiveInt(entity?.clienteId)],
      roles: fcmRouting?.roles,
      url: fcmRouting?.url ?? operation.url,
      tag: `torreon:${operation.fcmTipo}:${arrastreId ?? movimientoId ?? operation.incidenteId ?? Date.now()}`,
      data: {
        eventType: operation.realtimeType,
        audience: fcmRouting?.audience,
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
  const generalLocalityQueue = req.method.toUpperCase() === "GET"
    && isGeneralLocalityQueueList(originalRest || "/", user);
  const scopedRest = req.method.toUpperCase() === "GET"
    ? applyListScope(originalRest || "/", user, generalLocalityQueue)
    : originalRest || "/";

  if (
    req.method.toUpperCase() === "GET" &&
    /^\/arrastres\/\d+\/ediciones(?:\?|$)/.test(scopedRest) &&
    role !== "ADMINISTRADOR"
  ) {
    return res.status(403).json({ error: "Solo administración puede consultar la bitácora de ediciones" });
  }

  if (
    scopedRest.split("?")[0] === "/catalogos/arrastre" &&
    req.method.toUpperCase() !== "GET" &&
    role !== "ADMINISTRADOR"
  ) {
    return res.status(403).json({
      error: "No autorizado para configurar el patio de arrastre",
      message: "Solo un administrador puede crear o modificar vías de arrastre.",
    });
  }

  if (isReadonlyClient(user) && !isAllowedClientMutation(req.method, scopedRest)) {
    return res.status(403).json({
      error: "No autorizado para operar arrastre",
      message: "El cliente puede consultar, crear, cancelar y editar solicitudes o vagones antes de que inicien, además de resolver incidentes propios; no puede iniciar ni finalizar vagones.",
    });
  }

  if (role === "MAQUINISTA_ARRASTRE" && !isAllowedMaquinistaArrastreMutation(req.method, scopedRest)) {
    return res.status(403).json({
      error: "No autorizado para operar arrastre",
      message: "El maquinista de arrastre solo puede consultar, iniciar/finalizar el vagon asignado y crear incidentes con evidencia.",
    });
  }

  if (role === "MAQUINISTA" && !isAllowedMaquinistaNaturalMutation(req.method, scopedRest)) {
    return res.status(403).json({
      error: "No autorizado para operar movimiento Torreon",
      message: "El maquinista solo puede consultar, iniciar/finalizar movimientos naturales y reportar incidentes con evidencia.",
    });
  }

  try {
    const incidentDetailPath = incidentMutationDetailPath(req.method, scopedRest);
    if (incidentDetailPath && !ADMIN_ROLES.has(role)) {
      const detailResult = await proxyToTorreonMs(incidentDetailPath, {
        method: "GET",
        headers: {
          ...(user?.id ? { "x-user-id": String(user.id) } : {}),
          ...(user?.rol ? { "x-user-rol": String(user.rol) } : {}),
        },
      });
      if (filterDataForUser(detailResult.data, user) == null) {
        return res.status(403).json({ error: "No autorizado para este incidente" });
      }
    }

    const arrastreDetailPath = arrastreMutationDetailPath(req.method, scopedRest);
    if (arrastreDetailPath && !ADMIN_ROLES.has(role)) {
      const detailResult = await proxyToTorreonMs(arrastreDetailPath, {
        method: "GET",
        headers: {
          ...(user?.id ? { "x-user-id": String(user.id) } : {}),
          ...(user?.rol ? { "x-user-rol": String(user.rol) } : {}),
        },
      });
      if (filterDataForUser(detailResult.data, user) == null) {
        return res.status(403).json({ error: "No autorizado para este arrastre" });
      }
    }

    const proxiedBody =
      req.method === "GET" || req.method === "DELETE"
        ? undefined
        : await withActorDefaults(req.method, scopedRest, req.body, user);

    const result = await proxyToTorreonMs(scopedRest, {
      method: req.method,
      body: proxiedBody,
      headers: {
        ...(user?.id ? { "x-user-id": String(user.id) } : {}),
        ...(user?.rol ? { "x-user-rol": String(user.rol) } : {}),
      },
    });

    if (req.method.toUpperCase() === "GET") {
      const filtered = filterDataForUser(result.data, user, generalLocalityQueue);
      if (filtered == null) return res.status(403).json({ error: "No autorizado para este recurso" });
      const completed = await completarResponsablesFaltantes(filtered, user);
      return res.status(result.status).send(await enrichTorreonResponsables(completed));
    }

    dispatchTorreonSideEffects(req.method, scopedRest, result.data, user, proxiedBody);
    return res.status(result.status).send(await enrichTorreonResponsables(result.data));
  } catch (error: any) {
    const status = Number(error?.status) || 502;
    return res.status(status).json({
      error: error?.message ?? "Error proxy ms_torreon",
      details: error?.details ?? null,
    });
  }
});

export default router;
