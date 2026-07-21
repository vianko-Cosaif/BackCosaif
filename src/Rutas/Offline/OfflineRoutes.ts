import { Router } from "express";

import { authenticateAccess } from "../../auth/authenticateAccess";
import type { AuthenticatedUser } from "../../types/auth";
import {
  createMaquinistaOfflinePackage,
  getMaquinistaOfflinePackageFile,
} from "../../offline/maquinistaOfflinePackage";

const router = Router();
router.use(authenticateAccess);

router.get("/maquinista/availability", (req, res) => {
  const user = req.user as AuthenticatedUser;
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.status(200).json({
    ok: true,
    authenticated: true,
    userId: user.id,
    serverTime: new Date().toISOString(),
  });
});

router.post("/maquinista/manifest", async (req, res) => {
  try {
    const result = await createMaquinistaOfflinePackage(
      req.user as AuthenticatedUser,
      req.get("if-none-match")
    );
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("ETag", result.etag);
    if (result.notModified) {
      res.status(304).end();
      return;
    }
    res.status(201).json(result.manifest);
  } catch (error: any) {
    res.status(Number(error?.status) || 500).json({
      error: error?.message ?? "No se pudo construir el paquete offline",
    });
  }
});

router.get("/maquinista/packages/:packageId/:kind", async (req, res) => {
  try {
    const kind = String(req.params.kind);
    if (kind !== "snapshot" && kind !== "journal") {
      res.status(404).json({ error: "Archivo offline no encontrado" });
      return;
    }
    const file = getMaquinistaOfflinePackageFile(
      String(req.params.packageId),
      kind,
      req.user as AuthenticatedUser
    );
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/vnd.sqlite3");
    res.setHeader("X-Checksum-Sha256", file.sha256);
    res.download(file.path, file.name);
  } catch (error: any) {
    res.status(Number(error?.status) || 500).json({
      error: error?.message ?? "No se pudo descargar el paquete offline",
    });
  }
});

export default router;
