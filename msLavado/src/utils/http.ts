import type { Response } from "express";

export const ok = <T>(res: Response, data: T, meta?: Record<string, unknown>) => {
  if (meta) return res.json({ data, meta });
  return res.json(data);
};
