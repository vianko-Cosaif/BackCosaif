import { cpus } from "os";
import { createHash, createHmac, randomBytes, randomUUID } from "crypto";
import type { RequestHandler } from "express";
import { io, type Socket } from "socket.io-client";

type AgentOptions = { databaseCheck?: () => Promise<boolean> };
type AgentEvent = {
  eventId: string; instanceId: string; occurredAt: string;
  level: "INFO" | "WARN" | "ERROR"; category: "HTTP" | "DEPENDENCY";
  kind: string; message: string; fingerprint: string; correlationId?: string;
  clientFingerprint?: string; route?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";
  statusCode?: number; durationMs?: number; metadata?: Record<string, string>;
};

export function createComercialGuardianAgent(options: AgentOptions) {
  const service = "comercial";
  const instanceId = `${service}-${randomBytes(10).toString("hex")}`;
  const durations: number[] = [];
  let socket: Socket | undefined;
  let agentSecret = "";
  let lastDatabaseOk: boolean | undefined;
  const eventQueue: AgentEvent[] = [];
  let activeRequests = 0;
  let intervalMaxConcurrency = 0;
  let requestsTotal = 0;
  let http5xxTotal = 0;
  let lastCpu = process.cpuUsage();
  let lastCpuAt = process.hrtime.bigint();

  const middleware: RequestHandler = (request, response, next) => {
    if (request.path === "/" || request.path === "/health") return next();
    const started = performance.now();
    const correlationId = validRequestId(request.get("x-request-id")) || randomUUID();
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
      const event = buildHttpEvent(service, instanceId, agentSecret, request, response.statusCode, durationMs, correlationId);
      if (event) emitEvent(event);
    });
    next();
  };

  async function sample() {
    const memory = process.memoryUsage();
    const databaseOk = options.databaseCheck
      ? await options.databaseCheck().catch(() => false)
      : undefined;
    if (databaseOk === false && lastDatabaseOk !== false) emitEvent(dependencyEvent(service, instanceId, false));
    if (databaseOk === true && lastDatabaseOk === false) emitEvent(dependencyEvent(service, instanceId, true));
    lastDatabaseOk = databaseOk;
    socket?.emit("agent:telemetry", {
      instanceId,
      sentAt: new Date().toISOString(),
      processUptimeSeconds: Number(process.uptime().toFixed(1)),
      cpuPercent: cpuPercent(),
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      activeRequests,
      maxConcurrency: intervalMaxConcurrency,
      requestsTotal,
      http5xxTotal,
      p95Ms: percentile(durations, 0.95),
      p99Ms: percentile(durations, 0.99),
      databaseOk,
    });
    intervalMaxConcurrency = activeRequests;
  }

  function cpuPercent() {
    const now = process.hrtime.bigint();
    const usage = process.cpuUsage(lastCpu);
    const elapsedMicros = Number(now - lastCpuAt) / 1_000;
    lastCpu = process.cpuUsage();
    lastCpuAt = now;
    return elapsedMicros <= 0
      ? 0
      : Number(
          Math.min(
            100,
            ((usage.user + usage.system) /
              elapsedMicros /
              Math.max(1, cpus().length)) *
              100,
          ).toFixed(2),
        );
  }

  function auth(secret: string) {
    const timestamp = Date.now().toString();
    const nonce = randomBytes(18).toString("base64url");
    const signature = createHmac("sha256", secret)
      .update(`${service}\n${timestamp}\n${nonce}`)
      .digest("base64url");
    return { service, timestamp, nonce, signature };
  }

  function emitEvent(event: AgentEvent) {
    if (!agentSecret) return;
    if (socket?.connected) return void socket.emit("agent:event", event);
    eventQueue.push(event);
    if (eventQueue.length > 500) eventQueue.shift();
  }

  function start() {
    const url = process.env.GUARDIAN_SOCKET_URL;
    const secret = process.env.GUARDIAN_AGENT_SECRET;
    if (!url || !secret || secret.length < 32) return;
    agentSecret = secret;
    socket = io(url, {
      transports: ["websocket"],
      auth: auth(secret),
      reconnection: true,
      reconnectionDelayMax: 15_000,
      timeout: 7_000,
    });
    socket.io.on("reconnect_attempt", () => {
      if (socket) socket.auth = auth(secret);
    });
    socket.on("connect", () => {
      console.log("[GuardianAgent:comercial] canal autenticado conectado");
      void sample();
      for (const event of eventQueue.splice(0)) socket?.emit("agent:event", event);
    });
    socket.on("guardian:ping", () =>
      socket?.emit("agent:pong", { instanceId, at: new Date().toISOString() }),
    );
    const interval = setInterval(
      () => void sample(),
      Math.max(5, Number(process.env.GUARDIAN_TELEMETRY_INTERVAL_SECONDS || 10)) *
        1_000,
    );
    interval.unref();
  }

  return { middleware, start };
}

function percentile(values: number[], point: number) {
  if (!values.length) return undefined;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * point) - 1)];
}


function validRequestId(value: string | undefined) {
  return value && /^[a-zA-Z0-9:_-]{8,120}$/.test(value) ? value : "";
}

function normalizedRoute(path: string) {
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":uuid")
    .replace(/\/\d+(?=\/|$)/g, "/:id")
    .slice(0, 200);
}

function buildHttpEvent(
  service: string,
  instanceId: string,
  secret: string,
  request: Parameters<RequestHandler>[0],
  statusCode: number,
  durationMs: number,
  correlationId: string,
): AgentEvent | null {
  if (!secret) return null;
  const route = normalizedRoute(request.path);
  const method = request.method.toUpperCase() as AgentEvent["method"];
  const pathProbe = /(?:^|\/)(?:\.env|\.git|wp-admin|wp-login|phpmyadmin|server-status|actuator)(?:\/|$)/i.test(request.path);
  const configured = Number(process.env.GUARDIAN_SLOW_REQUEST_MS || 2_000);
  const slowThreshold = Number.isFinite(configured) ? Math.max(500, configured) : 2_000;
  let definition: Pick<AgentEvent, "level" | "category" | "kind" | "message"> | null = null;
  if (pathProbe) definition = { level: "WARN", category: "HTTP", kind: "HTTP_PATH_PROBE", message: "Se solicitó una ruta asociada con exploración automatizada." };
  else if (statusCode >= 500) definition = { level: "ERROR", category: "HTTP", kind: "HTTP_SERVER_ERROR", message: "La solicitud terminó con un error interno del servicio." };
  else if (statusCode === 429) definition = { level: "WARN", category: "HTTP", kind: "HTTP_RATE_LIMIT", message: "La solicitud fue limitada por exceso de frecuencia." };
  else if (statusCode === 401 || statusCode === 403) definition = { level: "WARN", category: "HTTP", kind: "HTTP_ACCESS_DENIED", message: "La solicitud fue rechazada por autenticación o autorización." };
  else if (durationMs >= slowThreshold) definition = { level: "WARN", category: "HTTP", kind: "HTTP_SLOW_REQUEST", message: "La solicitud superó el umbral de latencia configurado." };
  if (!definition) return null;
  return {
    eventId: randomUUID(),
    instanceId,
    occurredAt: new Date().toISOString(),
    ...definition,
    fingerprint: createHash("sha256").update(`${service}:${definition.kind}:${method}:${route}`).digest("hex"),
    correlationId,
    clientFingerprint: createHmac("sha256", secret)
      .update(request.ip || request.socket.remoteAddress || "unknown")
      .digest("base64url"),
    route,
    method,
    statusCode,
    durationMs,
    metadata: { source: "express" },
  };
}

function dependencyEvent(service: string, instanceId: string, recovered: boolean): AgentEvent {
  return {
    eventId: randomUUID(),
    instanceId,
    occurredAt: new Date().toISOString(),
    level: recovered ? "INFO" : "ERROR",
    category: "DEPENDENCY",
    kind: recovered ? "DEPENDENCY_RECOVERED" : "DEPENDENCY_FAILURE",
    message: recovered
      ? "La conexión interna con PostgreSQL volvió a responder."
      : "La comprobación interna de PostgreSQL no respondió correctamente.",
    fingerprint: `${service}:dependency:postgresql`,
    metadata: { dependency: "postgresql" },
  };
}
