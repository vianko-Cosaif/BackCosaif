import { Router } from "express";
import { authenticateAccess } from "../../auth/authenticateAccess";
import type { AuthenticatedUser } from "../../types/auth";
import { proxyToTornoMs } from "../../services/tornoMs/tornoMsClient";
import { prisma } from "../../lib/prisma";

const router = Router();

// Todas las rutas de torno pasan por auth del API principal.
router.use(authenticateAccess);

function isHistorialRondasRequest(method: string, rest: string) {
  return method === "GET" && rest.split("?")[0] === "/rondas-servicio/historial";
}

async function enrichHistorialWithLocomotora(data: unknown) {
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

// Proxy: /torno/... -> http://TORNO_MS_URL/api/...
router.all("/*", async (req, res) => {
  try {
    const base = req.baseUrl; // "/torno"
    const rest = req.originalUrl.startsWith(base) ? req.originalUrl.slice(base.length) : req.originalUrl;
    const target = rest.startsWith("/health") ? rest : `/api${rest}`;

    const user = (req as any).user as AuthenticatedUser | undefined;

    const result = await proxyToTornoMs(target, {
      method: req.method,
      body: req.method === "GET" || req.method === "DELETE" ? undefined : req.body,
      headers: {
        ...(user?.id ? { "x-user-id": String(user.id) } : {}),
      },
    });

    if (isHistorialRondasRequest(req.method, rest)) {
      result.data = (await enrichHistorialWithLocomotora(result.data)) as typeof result.data;
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
