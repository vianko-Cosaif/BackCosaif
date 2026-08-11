import { cpus } from "os";
import { createHash, createHmac, randomBytes, randomUUID } from "crypto";
import type { RequestHandler } from "express";
import { io, type Socket } from "socket.io-client";

type GuardianAgentOptions = {
  service: "cosaif-api" | "torno" | "torreon" | "comercial";
  databaseCheck?: () => Promise<boolean>;
  movementsToday?: () => Promise<number>;
};

type AgentState = {
  socket?: Socket;
  interval?: NodeJS.Timeout;
};

type AgentEvent = {
  eventId: string;
  instanceId: string;
  occurredAt: string;
  level: "INFO" | "WARN" | "ERROR" | "CRITICAL";
  category: "HTTP" | "APPLICATION" | "DEPENDENCY";
  kind: string;
  message: string;
  fingerprint: string;
  correlationId?: string;
  clientFingerprint?: string;
  route?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";
  statusCode?: number;
  durationMs?: number;
  metadata?: Record<string, string | number | boolean | null>;
};

export function createGuardianAgent(options: GuardianAgentOptions) {
  const instanceId = `${options.service}-${randomBytes(10).toString("hex")}`;
  const startedAt = Date.now();
  const durations: number[] = [];
  const state: AgentState = {};
  const eventQueue: AgentEvent[] = [];
  let agentSecret = "";
  let lastDatabaseOk: boolean | undefined;
  let activeRequests = 0;
  let intervalMaxConcurrency = 0;
  let requestsTotal = 0;
  let http5xxTotal = 0;
  let lastCpu = process.cpuUsage();
  let lastCpuAt = process.hrtime.bigint();
  let movementsValue: number | undefined;
  let movementsCheckedAt = 0;

  const middleware: RequestHandler = (request, response, next) => {
    if (request.path === "/" || request.path === "/health") {
      next();
      return;
    }
    const started = performance.now();
    const suppliedRequestId = request.get("x-request-id");
    const correlationId = suppliedRequestId && /^[a-zA-Z0-9:_-]{8,120}$/.test(suppliedRequestId)
      ? suppliedRequestId
      : randomUUID();
    response.setHeader("x-request-id", correlationId);
    activeRequests += 1;
    intervalMaxConcurrency = Math.max(intervalMaxConcurrency, activeRequests);
    requestsTotal += 1;
    response.once("finish", () => {
      activeRequests = Math.max(0, activeRequests - 1);
      if (response.statusCode >= 500) http5xxTotal += 1;
      const durationMs = Number((performance.now() - started).toFixed(2));
      durations.push(durationMs);
      if (durations.length > 2_000) durations.splice(0, durations.length - 2_000);
      const event = httpEvent(request, response.statusCode, durationMs, correlationId);
      if (event) emitEvent(event);
    });
    next();
  };

  async function sample() {
    const databaseOk = options.databaseCheck
      ? await options.databaseCheck().catch(() => false)
      : undefined;
    if (databaseOk === false && lastDatabaseOk !== false) {
      emitEvent(baseEvent({
        level: "ERROR",
        category: "DEPENDENCY",
        kind: "DEPENDENCY_FAILURE",
        message: "La comprobación interna de PostgreSQL no respondió correctamente.",
        fingerprint: `${options.service}:dependency:postgresql`,
        metadata: { dependency: "postgresql" },
      }));
    } else if (databaseOk === true && lastDatabaseOk === false) {
      emitEvent(baseEvent({
        level: "INFO",
        category: "DEPENDENCY",
        kind: "DEPENDENCY_RECOVERED",
        message: "La conexión interna con PostgreSQL volvió a responder.",
        fingerprint: `${options.service}:dependency:postgresql`,
        metadata: { dependency: "postgresql" },
      }));
    }
    lastDatabaseOk = databaseOk;
    if (
      options.movementsToday &&
      Date.now() - movementsCheckedAt >= 60_000
    ) {
      movementsCheckedAt = Date.now();
      movementsValue = await options.movementsToday().catch(() => undefined);
    }
    const memory = process.memoryUsage();
    const payload = {
      instanceId,
      sentAt: new Date().toISOString(),
      processUptimeSeconds: Number((process.uptime()).toFixed(1)),
      cpuPercent: processCpuPercent(),
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      activeRequests,
      maxConcurrency: intervalMaxConcurrency,
      requestsTotal,
      http5xxTotal,
      p95Ms: percentile(durations, 0.95),
      p99Ms: percentile(durations, 0.99),
      movementsToday: movementsValue,
      databaseOk,
    };
    intervalMaxConcurrency = activeRequests;
    state.socket?.emit("agent:telemetry", payload);
  }

  function processCpuPercent() {
    const now = process.hrtime.bigint();
    const usage = process.cpuUsage(lastCpu);
    const elapsedMicros = Number(now - lastCpuAt) / 1_000;
    lastCpu = process.cpuUsage();
    lastCpuAt = now;
    if (elapsedMicros <= 0) return 0;
    return Number(
      Math.min(
        100,
        ((usage.user + usage.system) / elapsedMicros / Math.max(1, cpus().length)) *
          100,
      ).toFixed(2),
    );
  }

  function credentials(secret: string) {
    const timestamp = Date.now().toString();
    const nonce = randomBytes(18).toString("base64url");
    const signature = createHmac("sha256", secret)
      .update(`${options.service}\n${timestamp}\n${nonce}`)
      .digest("base64url");
    return { service: options.service, timestamp, nonce, signature };
  }

  function baseEvent(value: Omit<AgentEvent, "eventId" | "instanceId" | "occurredAt">): AgentEvent {
    return {
      eventId: randomUUID(),
      instanceId,
      occurredAt: new Date().toISOString(),
      ...value,
    };
  }

  function emitEvent(event: AgentEvent) {
    if (!agentSecret) return;
    if (state.socket?.connected) {
      state.socket.emit("agent:event", event);
      return;
    }
    eventQueue.push(event);
    if (eventQueue.length > 500) eventQueue.shift();
  }

  function flushEvents() {
    if (!state.socket?.connected) return;
    for (const event of eventQueue.splice(0)) state.socket.emit("agent:event", event);
  }

  function httpEvent(
    request: Parameters<RequestHandler>[0],
    statusCode: number,
    durationMs: number,
    correlationId: string,
  ): AgentEvent | null {
    const method = request.method.toUpperCase() as AgentEvent["method"];
    const route = normalizedRoute(request.path);
    const pathProbe = /(?:^|\/)(?:\.env|\.git|wp-admin|wp-login|phpmyadmin|server-status|actuator)(?:\/|$)/i.test(request.path);
    const slowThresholdValue = Number(process.env.GUARDIAN_SLOW_REQUEST_MS || 2_000);
    const slowThreshold = Number.isFinite(slowThresholdValue) ? Math.max(500, slowThresholdValue) : 2_000;
    let definition: Pick<AgentEvent, "level" | "category" | "kind" | "message"> | null = null;
    if (pathProbe) definition = { level: "WARN", category: "HTTP", kind: "HTTP_PATH_PROBE", message: "Se solicitó una ruta asociada con exploración automatizada." };
    else if (statusCode >= 500) definition = { level: "ERROR", category: "HTTP", kind: "HTTP_SERVER_ERROR", message: "La solicitud terminó con un error interno del servicio." };
    else if (statusCode === 429) definition = { level: "WARN", category: "HTTP", kind: "HTTP_RATE_LIMIT", message: "La solicitud fue limitada por exceso de frecuencia." };
    else if (statusCode === 401 || statusCode === 403) definition = { level: "WARN", category: "HTTP", kind: "HTTP_ACCESS_DENIED", message: "La solicitud fue rechazada por autenticación o autorización." };
    else if (durationMs >= slowThreshold) definition = { level: "WARN", category: "HTTP", kind: "HTTP_SLOW_REQUEST", message: "La solicitud superó el umbral de latencia configurado." };
    if (!definition) return null;
    const clientAddress = request.ip || request.socket.remoteAddress || "unknown";
    return baseEvent({
      ...definition,
      fingerprint: createHash("sha256").update(`${options.service}:${definition.kind}:${method}:${route}`).digest("hex"),
      correlationId,
      clientFingerprint: createHmac("sha256", agentSecret).update(clientAddress).digest("base64url"),
      route,
      method,
      statusCode,
      durationMs,
      metadata: { source: "express" },
    });
  }

  function reportProcessEvent(kind: "PROCESS_FATAL" | "PROCESS_WARNING" | "UNHANDLED_REJECTION", value: unknown) {
    const error = value instanceof Error ? value : undefined;
    emitEvent(baseEvent({
      level: kind === "PROCESS_FATAL" ? "CRITICAL" : "ERROR",
      category: "APPLICATION",
      kind,
      message: kind === "PROCESS_FATAL"
        ? "El proceso notificó una excepción fatal antes de terminar."
        : kind === "PROCESS_WARNING"
          ? "Node.js emitió una advertencia de ejecución."
          : "El proceso detectó una promesa rechazada sin manejo.",
      fingerprint: createHash("sha256")
        .update(`${options.service}:${kind}:${error?.name || typeof value}:${error?.stack || "sin-stack"}`)
        .digest("hex"),
      metadata: {
        errorName: error?.name || typeof value,
        stackFingerprint: createHash("sha256").update(error?.stack || "sin-stack").digest("hex"),
      },
    }));
  }

  function start() {
    const url = process.env.GUARDIAN_SOCKET_URL;
    const secret = process.env.GUARDIAN_AGENT_SECRET;
    if (!url || !secret || secret.length < 32) {
      console.warn(
        `[GuardianAgent:${options.service}] deshabilitado: falta URL o secreto seguro`,
      );
      return;
    }
    agentSecret = secret;
    state.socket = io(url, {
      transports: ["websocket"],
      auth: credentials(secret),
      reconnection: true,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 15_000,
      timeout: 7_000,
    });
    state.socket.io.on("reconnect_attempt", () => {
      if (state.socket) state.socket.auth = credentials(secret);
    });
    state.socket.on("connect", () => {
      console.log(`[GuardianAgent:${options.service}] canal autenticado conectado`);
      void sample();
      flushEvents();
    });
    state.socket.on("guardian:ping", () => {
      state.socket?.emit("agent:pong", {
        instanceId,
        at: new Date().toISOString(),
      });
    });
    state.socket.on("connect_error", (error) => {
      console.warn(
        `[GuardianAgent:${options.service}] conexion pendiente: ${error.message}`,
      );
    });
    const seconds = Math.max(
      5,
      Number(process.env.GUARDIAN_TELEMETRY_INTERVAL_SECONDS || 10),
    );
    state.interval = setInterval(() => void sample(), seconds * 1_000);
    state.interval.unref();
    process.on("warning", (warning) => reportProcessEvent("PROCESS_WARNING", warning));
    process.on("unhandledRejection", (reason) => reportProcessEvent("UNHANDLED_REJECTION", reason));
    process.on("uncaughtExceptionMonitor", (error) => reportProcessEvent("PROCESS_FATAL", error));
  }

  return { middleware, start };
}

function normalizedRoute(path: string) {
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":uuid")
    .replace(/\/\d+(?=\/|$)/g, "/:id")
    .slice(0, 200);
}

function percentile(values: number[], point: number) {
  if (!values.length) return undefined;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * point) - 1)];
}
