import { randomUUID } from 'crypto';
import { RequestHandler } from 'express';
import { loginProbeLogger } from './loginProbe.logger';

type ProbeConfig = {
  messagePrefix: string;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
};

const PROBES: ProbeConfig[] = [
  { messagePrefix: 'login:probe', method: 'POST', path: '/usuarios/login' },
  { messagePrefix: 'mov:create:probe', method: 'POST', path: '/movimientos' },
];

const getIpChain = (value: string | string[] | undefined): string[] => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.join(',') : value;
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
};

export const traceLoginTraffic: RequestHandler = (req, res, next) => {
  const probe = PROBES.find((candidate) => candidate.method === req.method && candidate.path === req.path);
  if (!probe) return next();

  const reqId =
    (req.headers['x-req-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    randomUUID();

  res.setHeader('x-request-id', reqId);

  const startedAt = Date.now();
  const ipChain = getIpChain(req.headers['x-forwarded-for']);
  const remoteAddress = req.socket.remoteAddress ?? null;

  loginProbeLogger.info(`${probe.messagePrefix}:start`, {
    reqId,
    method: req.method,
    path: req.originalUrl || req.path,
    ip: req.ip || null,
    forwardedFor: ipChain,
    remoteAddress,
    userAgent: req.headers['user-agent'] ?? null,
    contentType: req.headers['content-type'] ?? null,
    contentLength: req.headers['content-length'] ?? null,
    xDeviceId: req.headers['x-device-id'] ?? null,
    xPlatform: req.headers['x-platform'] ?? null,
    host: req.headers.host ?? null,
  });

  let finished = false;

  res.on('finish', () => {
    finished = true;
    loginProbeLogger.info(`${probe.messagePrefix}:finish`, {
      reqId,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      responseLength: res.getHeader('content-length') ?? null,
    });
  });

  res.on('close', () => {
    if (finished) return;
    loginProbeLogger.warn(`${probe.messagePrefix}:close`, {
      reqId,
      method: req.method,
      path: req.originalUrl || req.path,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
};
