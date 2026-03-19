import type { Response } from 'express';

export const ok = <T>(res: Response, data: T, meta?: Record<string, unknown>) => {
  if (meta) return res.json({ data, meta });
  return res.json(data);
};

export const fail = (
  res: Response,
  status: number,
  message: string,
  details?: Record<string, unknown>
) => {
  return res.status(status).json({
    error: message,
    message,
    ...(details ? { details } : {}),
  });
};
