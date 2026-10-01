import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { getTornoImagenPath } from "../utils/tornoImagenes";

export const imagenesRouter = Router();

imagenesRouter.get("/", async (req, res) => {
  try {
    const ruta = String(req.query.ruta ?? "");
    if (!ruta) return res.status(400).json({ ok: false, error: "Ruta requerida" });

    const normalizada = path.posix.normalize(ruta).replace(/^(\.\.\/)+/, "");
    if (normalizada.includes("..") || path.isAbsolute(normalizada)) {
      return res.status(400).json({ ok: false, error: "Ruta invalida" });
    }

    const fullPath = getTornoImagenPath(normalizada);
    await fs.access(fullPath);
    return res.sendFile(fullPath);
  } catch {
    return res.status(404).json({ ok: false, error: "Imagen no encontrada" });
  }
});
