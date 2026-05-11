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

<<<<<<< Updated upstream
function tornoMsBaseIncludesApi() {
  return /\/api\/?$/.test(String(process.env.TORNO_MS_URL ?? ""));
}

function buildTornoMsPath(rest: string) {
  if (rest.startsWith("/health")) return rest;
  return tornoMsBaseIncludesApi() ? rest : `/api${rest}`;
}

function buildTornoMsUrl(rest: string) {
  const base = String(process.env.TORNO_MS_URL ?? "").replace(/\/+$/, "");
  return `${base}${buildTornoMsPath(rest)}`;
}

async function enrichHistorialWithLocomotora(data: unknown) {
=======
async function enrichHistorialWithLocomotora(data: unknown): Promise<unknown> {
  if (
    data &&
    typeof data === "object" &&
    "data" in data &&
    Array.isArray((data as { data?: unknown }).data)
  ) {
    return {
      ...data,
      data: await enrichHistorialWithLocomotora((data as { data: unknown[] }).data),
    };
  }

>>>>>>> Stashed changes
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

// Ruta especial: el proxy genérico lee las respuestas como texto y corrompe binarios.
// Las imágenes se deben servir con arrayBuffer para preservar el binario original.
router.get("/imagenes", async (req, res) => {
  try {
    const tornoMsUrl = process.env.TORNO_MS_URL;
    const serviceToken = process.env.TORNO_SERVICE_TOKEN;
    if (!tornoMsUrl || !serviceToken) {
      return res.status(500).json({ error: "msTorno no configurado" });
    }

    const ruta = String(req.query.ruta ?? "");
    if (!ruta) return res.status(400).json({ error: "Ruta requerida" });

    const url = buildTornoMsUrl(`/imagenes?ruta=${encodeURIComponent(ruta)}`);
    const imgResp = await fetch(url, {
      headers: { "x-service-token": serviceToken },
    });

    if (!imgResp.ok) {
      return res.status(imgResp.status).json({ error: "Imagen no encontrada" });
    }

    const contentType = imgResp.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await imgResp.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.send(buffer);
  } catch {
    return res.status(502).json({ error: "Error al obtener imagen de msTorno" });
  }
});

// Proxy: /torno/... -> http://TORNO_MS_URL/api/...
router.all("/*", async (req, res) => {
  try {
    const base = req.baseUrl; // "/torno"
    const rest = req.originalUrl.startsWith(base) ? req.originalUrl.slice(base.length) : req.originalUrl;
    const target = buildTornoMsPath(rest);

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
