import type { Request, Response } from 'express';
import type { IncomingMessage, Server as HttpServer } from 'http';
import type { Socket } from 'net';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { AuthenticatedUser, JwtPayload } from '../types/auth';
import { prisma } from '../lib/prisma';
import * as tokenService from '../middlewares/token.service';

type RealtimeScope = {
  empresaId?: number | null;
  localidadId?: number | null;
  clienteId?: number | null;
  movimientoId?: number | null;
};

export type RealtimeRequestedScope = {
  localidadId?: number | null;
};

type RealtimeAudience =
  | { mode: 'all' }
  | { mode: 'empresa'; id: number }
  | { mode: 'empresaLocalidad'; empresaId: number; localidadId: number }
  | { mode: 'localidad'; id: number }
  | { mode: 'cliente'; id: number }
  | { mode: 'none' };

export type RealtimeEventType =
  | 'movimiento.creado'
  | 'movimiento.estado'
  | 'movimiento.incidente'
  | 'torno.estado'
  | 'incidente.estado'
  | 'ronda.reordenada';

export type RealtimeMovementPayload = RealtimeScope & {
  type: RealtimeEventType;
  eventId?: string;
  estado?: string | null;
  estadoAnterior?: string | null;
  incidenteGlobal?: boolean | null;
  finalizado?: boolean | null;
  incidenteId?: number | null;
  rondaId?: number | null;
  rondaIds?: number[];
  movimientoIds?: number[];
  reason?: string | null;
  descripcion?: string | null;
  locomotiveNumber?: number | string | null;
  occurredAt?: string;
};

type RealtimeClient = {
  id: string;
  transport: 'sse' | 'websocket';
  res?: Response;
  socket?: Socket;
  buffer?: Buffer;
  userId: number;
  role: string;
  audience: RealtimeAudience;
  rooms: string[];
  connectedAt: number;
};

const HEARTBEAT_MS = Math.max(10_000, Number(process.env.REALTIME_HEARTBEAT_MS || 25_000));
const MAX_CLIENTS = Math.max(1, Number(process.env.REALTIME_MAX_CLIENTS || 2_000));
const WS_TICKET_TTL_MS = Math.max(10_000, Number(process.env.REALTIME_WS_TICKET_TTL_MS || 30_000));
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const clients = new Map<string, RealtimeClient>();
const wsTickets = new Map<string, { user: AuthenticatedUser; audience: RealtimeAudience; expiresAt: number }>();

let heartbeatTimer: NodeJS.Timeout | null = null;
let ticketCleanupTimer: NodeJS.Timeout | null = null;

function room(kind: string, id?: number | string | null): string | null {
  if (id === null || typeof id === 'undefined') return null;
  const value = Number(id);
  return Number.isFinite(value) && value > 0 ? `${kind}:${value}` : null;
}

function toPositiveInt(value: unknown): number | null {
  if (Array.isArray(value)) return toPositiveInt(value[0]);
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function requestedScopeFromQuery(query: Request['query']): RealtimeRequestedScope {
  return {
    localidadId: toPositiveInt(query.localidadId ?? query.localidad),
  };
}

function realtimeAudienceForUser(user: AuthenticatedUser, requestedScope: RealtimeRequestedScope = {}): RealtimeAudience {
  const role = String(user.rol || '').toUpperCase();

  if (role === 'ADMINISTRADOR') return { mode: 'all' };

  if (role === 'CLIENTE_COOR' || role === 'CLIENTE_ADMIN') {
    const empresaId = toPositiveInt(user.empresa?.id);
    const localidadId = requestedScope.localidadId ?? undefined;
    if (empresaId && localidadId) return { mode: 'empresaLocalidad', empresaId, localidadId };
    return empresaId ? { mode: 'empresa', id: empresaId } : { mode: 'none' };
  }

  if (['CLIENTE', 'ARRASTRE_TORREON'].includes(role)) {
    const empresaId = toPositiveInt(user.empresa?.id);
    const localidadId = requestedScope.localidadId ?? toPositiveInt(user.localidad?.id);
    if (empresaId && localidadId) {
      return { mode: 'empresaLocalidad', empresaId, localidadId };
    }
    return { mode: 'none' };
  }

  if (role === 'COORDINADOR') {
    const localidadId = requestedScope.localidadId ?? toPositiveInt(user.localidad?.id);
    return localidadId ? { mode: 'localidad', id: localidadId } : { mode: 'none' };
  }

  const localidadId = toPositiveInt(user.localidad?.id);
  return localidadId ? { mode: 'localidad', id: localidadId } : { mode: 'none' };
}

function roomsForAudience(audience: RealtimeAudience): string[] {
  if (audience.mode === 'all') return ['scope:all'];
  if (audience.mode === 'none') return [];
  if (audience.mode === 'empresaLocalidad') {
    return [room('empresa', audience.empresaId), room('localidad', audience.localidadId)].filter(Boolean) as string[];
  }
  return [room(audience.mode, audience.id)].filter(Boolean) as string[];
}

function removeClient(clientId: string) {
  clients.delete(clientId);
  if (!clients.size) stopHeartbeat();
}

function safeWrite(client: RealtimeClient, payload: string | Buffer): boolean {
  try {
    if (client.transport === 'sse') {
      if (!client.res || client.res.writableEnded) throw new Error('SSE cerrado');
      client.res.write(payload);
      return true;
    }

    if (!client.socket || client.socket.destroyed || !client.socket.writable) {
      throw new Error('WebSocket cerrado');
    }

    client.socket.write(payload);
    return true;
  } catch {
    removeClient(client.id);
    return false;
  }
}

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function wsFrame(opcode: number, payload: string | Buffer = Buffer.alloc(0)): Buffer {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  const length = data.length;

  if (length < 126) {
    return Buffer.concat([Buffer.from([0x80 | opcode, length]), data]);
  }

  if (length <= 0xffff) {
    const header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
    return Buffer.concat([header, data]);
  }

  const header = Buffer.alloc(10);
  header[0] = 0x80 | opcode;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(length), 2);
  return Buffer.concat([header, data]);
}

function closePayload(code: number, reason: string) {
  const reasonBuffer = Buffer.from(reason);
  const payload = Buffer.alloc(2 + reasonBuffer.length);
  payload.writeUInt16BE(code, 0);
  reasonBuffer.copy(payload, 2);
  return payload;
}

function startHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    if (!clients.size) {
      stopHeartbeat();
      return;
    }

    const ssePing = `: ping ${Date.now()}\n\n`;
    const wsPing = wsFrame(0x9, String(Date.now()));

    for (const client of clients.values()) {
      safeWrite(client, client.transport === 'websocket' ? wsPing : ssePing);
    }
  }, HEARTBEAT_MS);
  heartbeatTimer.unref?.();
}

function stopHeartbeat() {
  if (!heartbeatTimer) return;
  clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

function startTicketCleanup() {
  if (ticketCleanupTimer) return;
  ticketCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ticket, meta] of wsTickets) {
      if (meta.expiresAt <= now) wsTickets.delete(ticket);
    }

    if (!wsTickets.size && ticketCleanupTimer) {
      clearInterval(ticketCleanupTimer);
      ticketCleanupTimer = null;
    }
  }, Math.max(5_000, Math.floor(WS_TICKET_TTL_MS / 2)));
  ticketCleanupTimer.unref?.();
}

export function createRealtimeTicket(user: AuthenticatedUser, requestedScope: RealtimeRequestedScope = {}) {
  const ticket = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + WS_TICKET_TTL_MS;
  const audience = realtimeAudienceForUser(user, requestedScope);
  wsTickets.set(ticket, { user, audience, expiresAt });
  startTicketCleanup();

  return {
    ticket,
    expiresAt: new Date(expiresAt).toISOString(),
    path: '/realtime/ws',
    scope: audience.mode === 'none' ? null : audience,
  };
}

function consumeRealtimeTicket(ticket: string | null): { user: AuthenticatedUser; audience: RealtimeAudience } | null {
  if (!ticket) return null;
  const meta = wsTickets.get(ticket);
  if (!meta) return null;

  wsTickets.delete(ticket);
  if (meta.expiresAt <= Date.now()) return null;
  return { user: meta.user, audience: meta.audience };
}

function isAuthorizedForEvent(client: RealtimeClient, event: RealtimeScope): boolean {
  if (client.audience.mode === 'all') return true;
  if (client.audience.mode === 'none') return false;

  if (client.audience.mode === 'empresa') {
    return Number(event.empresaId) === client.audience.id;
  }

  if (client.audience.mode === 'empresaLocalidad') {
    return (
      Number(event.empresaId) === client.audience.empresaId &&
      Number(event.localidadId) === client.audience.localidadId
    );
  }

  if (client.audience.mode === 'localidad') {
    return Number(event.localidadId) === client.audience.id;
  }

  return Number(event.clienteId) === client.audience.id;
}

export function attachRealtimeClient(req: Request, res: Response, user: AuthenticatedUser) {
  if (clients.size >= MAX_CLIENTS) {
    res.status(503).json({ error: 'Realtime ocupado, intenta de nuevo.' });
    return;
  }

  const clientId = `sse-${user.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const audience = realtimeAudienceForUser(user, requestedScopeFromQuery(req.query));
  const client: RealtimeClient = {
    id: clientId,
    transport: 'sse',
    res,
    userId: user.id,
    role: String(user.rol || '').toUpperCase(),
    audience,
    rooms: roomsForAudience(audience),
    connectedAt: Date.now(),
  };

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  clients.set(clientId, client);
  startHeartbeat();

  safeWrite(
    client,
    sseFrame('realtime.ready', {
      type: 'realtime.ready',
      transport: 'sse',
      clientId,
      rooms: client.rooms,
      connectedAt: new Date(client.connectedAt).toISOString(),
    })
  );

  req.on('close', () => removeClient(clientId));
}

export function publishRealtimeEvent(event: RealtimeMovementPayload) {
  if (!clients.size) return;

  const eventPayload: RealtimeMovementPayload = {
    ...event,
    eventId:
      event.eventId ??
      `${event.type}:${event.movimientoId ?? 'x'}:${event.incidenteId ?? 'x'}:${event.estado ?? 'x'}:${Date.now()}`,
    occurredAt: event.occurredAt ?? new Date().toISOString(),
  };
  const sse = sseFrame(eventPayload.type, eventPayload);
  const ws = wsFrame(0x1, JSON.stringify(eventPayload));

  for (const client of clients.values()) {
    if (isAuthorizedForEvent(client, eventPayload)) {
      safeWrite(client, client.transport === 'websocket' ? ws : sse);
    }
  }
}

export function publishMovimientoEstadoEvent(
  movimiento: RealtimeScope & {
    id?: number | null;
    estado?: string | null;
    estadoAnterior?: string | null;
    incidenteGlobal?: boolean | null;
    finalizado?: boolean | null;
    locomotiveNumber?: number | string | null;
  }
) {
  const movimientoId = movimiento.movimientoId ?? movimiento.id ?? null;
  publishRealtimeEvent({
    type: 'movimiento.estado',
    movimientoId,
    empresaId: movimiento.empresaId,
    localidadId: movimiento.localidadId,
    clienteId: movimiento.clienteId,
    estado: movimiento.estado,
    estadoAnterior: movimiento.estadoAnterior,
    incidenteGlobal: movimiento.incidenteGlobal,
    finalizado: movimiento.finalizado,
    locomotiveNumber: movimiento.locomotiveNumber,
  });
}

export function publishMovimientoCreadoEvent(
  movimiento: RealtimeScope & {
    id?: number | null;
    estado?: string | null;
    locomotiveNumber?: number | string | null;
  }
) {
  const movimientoId = movimiento.movimientoId ?? movimiento.id ?? null;
  publishRealtimeEvent({
    type: 'movimiento.creado',
    movimientoId,
    empresaId: movimiento.empresaId,
    localidadId: movimiento.localidadId,
    clienteId: movimiento.clienteId,
    estado: movimiento.estado,
    locomotiveNumber: movimiento.locomotiveNumber,
  });
}

export function publishRondaReordenadaEvent(
  ronda: RealtimeScope & {
    id?: number | null;
    rondaId?: number | null;
    rondaIds?: Array<number | null | undefined>;
    movimientoIds?: Array<number | null | undefined>;
    reason?: string | null;
  }
) {
  const rondaId = ronda.rondaId ?? ronda.id ?? null;
  publishRealtimeEvent({
    type: 'ronda.reordenada',
    movimientoId: ronda.movimientoId,
    empresaId: ronda.empresaId,
    localidadId: ronda.localidadId,
    clienteId: ronda.clienteId,
    rondaId,
    rondaIds: (ronda.rondaIds ?? []).filter((id): id is number => Number.isFinite(Number(id))).map(Number),
    movimientoIds: (ronda.movimientoIds ?? []).filter((id): id is number => Number.isFinite(Number(id))).map(Number),
    reason: ronda.reason ?? null,
  });
}

export function getRealtimeStats() {
  let sseClients = 0;
  let websocketClients = 0;

  for (const client of clients.values()) {
    if (client.transport === 'websocket') websocketClients += 1;
    else sseClients += 1;
  }

  return {
    clients: clients.size,
    sseClients,
    websocketClients,
    pendingWsTickets: wsTickets.size,
    heartbeatMs: HEARTBEAT_MS,
    maxClients: MAX_CLIENTS,
  };
}

function parseCookies(cookieHeader?: string | string[]): Record<string, string> {
  const header = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader ?? '';
  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...valueParts] = part.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(valueParts.join('=') || '');
    return acc;
  }, {});
}

function bearerFromHeader(value?: string | string[]) {
  const header = Array.isArray(value) ? value[0] : value;
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function userIdFromPayload(payload: JwtPayload): number | null {
  if (typeof payload.id === 'number' && Number.isFinite(payload.id)) return payload.id;
  if (typeof payload.userId === 'number' && Number.isFinite(payload.userId)) return payload.userId;
  if (typeof payload.sub === 'string') {
    const value = Number(payload.sub);
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

async function authenticateRealtimeToken(token: string): Promise<AuthenticatedUser | null> {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, secret, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
      algorithms: ['HS256'],
      ignoreExpiration: true,
    }) as JwtPayload;
  } catch {
    return null;
  }

  const userId = userIdFromPayload(payload);
  if (!userId || !payload.jti) return null;

  const tokenOk = await tokenService.esTokenVigente(payload.jti, { usuarioId: userId, note: 'realtime_ws' });
  if (!tokenOk) return null;

  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nombre: true,
      rol: true,
      tokenVersion: true,
      empresa: { select: { id: true, nombre: true } },
      localidad: { select: { id: true, nombre: true, estado: true } },
    },
  });
  if (!user) return null;

  const tokenVersion = typeof payload.v === 'number' ? payload.v : 0;
  if (tokenVersion !== user.tokenVersion) return null;

  return {
    id: user.id,
    nombre: user.nombre,
    rol: user.rol,
    empresa: user.empresa,
    localidad: user.localidad,
    auth: {
      jti: payload.jti,
      iat: payload.iat,
      exp: payload.exp,
      v: tokenVersion,
    },
  };
}

async function authenticateRealtimeUpgrade(
  req: IncomingMessage,
  url: URL
): Promise<{ user: AuthenticatedUser; audience: RealtimeAudience } | null> {
  const ticketAuth = consumeRealtimeTicket(url.searchParams.get('ticket'));
  if (ticketAuth) return ticketAuth;

  const token =
    url.searchParams.get('token') ||
    bearerFromHeader(req.headers.authorization) ||
    parseCookies(req.headers.cookie).token ||
    null;

  const user = token ? await authenticateRealtimeToken(token) : null;
  if (!user) return null;

  const audience = realtimeAudienceForUser(user, {
    localidadId: toPositiveInt(url.searchParams.get('localidadId') ?? url.searchParams.get('localidad')),
  });
  return { user, audience };
}

function rejectUpgrade(socket: Socket, statusCode: number, message: string) {
  const body = JSON.stringify({ error: message });
  socket.write(
    [
      `HTTP/1.1 ${statusCode} ${message}`,
      'Connection: close',
      'Content-Type: application/json',
      `Content-Length: ${Buffer.byteLength(body)}`,
      '',
      body,
    ].join('\r\n')
  );
  socket.destroy();
}

function attachWebSocketClient(socket: Socket, user: AuthenticatedUser, audience: RealtimeAudience) {
  if (clients.size >= MAX_CLIENTS) {
    socket.write(wsFrame(0x8, closePayload(1013, 'Realtime ocupado')));
    socket.destroy();
    return;
  }

  const clientId = `ws-${user.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const client: RealtimeClient = {
    id: clientId,
    transport: 'websocket',
    socket,
    userId: user.id,
    role: String(user.rol || '').toUpperCase(),
    audience,
    rooms: roomsForAudience(audience),
    connectedAt: Date.now(),
    buffer: Buffer.alloc(0),
  };

  socket.setNoDelay(true);
  socket.setKeepAlive(true, HEARTBEAT_MS);
  clients.set(clientId, client);
  startHeartbeat();

  safeWrite(
    client,
    wsFrame(
      0x1,
      JSON.stringify({
        type: 'realtime.ready',
        transport: 'websocket',
        clientId,
        rooms: client.rooms,
        connectedAt: new Date(client.connectedAt).toISOString(),
      })
    )
  );

  socket.on('data', (chunk) => handleWebSocketData(client, chunk));
  socket.on('close', () => removeClient(clientId));
  socket.on('end', () => removeClient(clientId));
  socket.on('error', () => removeClient(clientId));
}

function unmaskPayload(payload: Buffer, mask: Buffer) {
  const out = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i += 1) {
    out[i] = payload[i] ^ mask[i % 4];
  }
  return out;
}

function handleWebSocketData(client: RealtimeClient, chunk: Buffer) {
  client.buffer = Buffer.concat([client.buffer ?? Buffer.alloc(0), chunk]);
  let offset = 0;

  while (client.buffer.length - offset >= 2) {
    const first = client.buffer[offset];
    const second = client.buffer[offset + 1];
    const opcode = first & 0x0f;
    const masked = (second & 0x80) !== 0;
    let length = second & 0x7f;
    let headerLength = 2;

    if (length === 126) {
      if (client.buffer.length - offset < 4) break;
      length = client.buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (length === 127) {
      if (client.buffer.length - offset < 10) break;
      const bigLength = client.buffer.readBigUInt64BE(offset + 2);
      if (bigLength > BigInt(Number.MAX_SAFE_INTEGER)) {
        safeWrite(client, wsFrame(0x8, closePayload(1009, 'Mensaje demasiado grande')));
        client.socket?.destroy();
        removeClient(client.id);
        return;
      }
      length = Number(bigLength);
      headerLength = 10;
    }

    const maskLength = masked ? 4 : 0;
    const payloadStart = offset + headerLength + maskLength;
    const payloadEnd = payloadStart + length;
    if (client.buffer.length < payloadEnd) break;

    const mask = masked ? client.buffer.subarray(offset + headerLength, payloadStart) : Buffer.alloc(0);
    const rawPayload = client.buffer.subarray(payloadStart, payloadEnd);
    const payload = masked ? unmaskPayload(rawPayload, mask) : rawPayload;

    if (opcode === 0x8) {
      safeWrite(client, wsFrame(0x8, payload.length ? payload : closePayload(1000, 'OK')));
      client.socket?.end();
      removeClient(client.id);
      return;
    }

    if (opcode === 0x9) safeWrite(client, wsFrame(0xA, payload));
    if (opcode === 0x1 && payload.toString('utf8') === 'ping') {
      safeWrite(client, wsFrame(0x1, JSON.stringify({ type: 'realtime.pong', occurredAt: new Date().toISOString() })));
    }

    offset = payloadEnd;
  }

  client.buffer = client.buffer.subarray(offset);
}

async function handleRealtimeUpgrade(req: IncomingMessage, socket: Socket) {
  const url = new URL(req.url || '/', 'http://localhost');
  const key = req.headers['sec-websocket-key'];
  const upgrade = String(req.headers.upgrade || '').toLowerCase();

  if (upgrade !== 'websocket' || typeof key !== 'string') {
    rejectUpgrade(socket, 400, 'Bad Request');
    return;
  }

  const auth = await authenticateRealtimeUpgrade(req, url);
  if (!auth) {
    rejectUpgrade(socket, 401, 'Unauthorized');
    return;
  }

  const accept = crypto.createHash('sha1').update(`${key}${WS_GUID}`).digest('base64');
  socket.write(
    [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '',
      '',
    ].join('\r\n')
  );

  attachWebSocketClient(socket, auth.user, auth.audience);
}

export function bindRealtimeWebSocketServer(server: HttpServer) {
  server.on('upgrade', (req, socket) => {
    const netSocket = socket as Socket;
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    if (pathname !== '/realtime/ws') return;

    void handleRealtimeUpgrade(req, netSocket).catch(() => {
      if (!netSocket.destroyed) rejectUpgrade(netSocket, 500, 'Realtime Error');
    });
  });
}
