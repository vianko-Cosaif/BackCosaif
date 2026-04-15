import { Router } from "express";
import { authenticateAccess } from "../../auth/authenticateAccess";
import type { AuthenticatedUser } from "../../types/auth";
import { proxyToTornoMs } from "../../services/tornoMs/tornoMsClient";

const router = Router();

// Todas las rutas de torno pasan por auth del API principal.
router.use(authenticateAccess);

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

