import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { ZodError } from "zod";
import { apiRouter } from "./routes/api";

const PORT = process.env.TORNO_PORT || "3001";
const HOST = process.env.TORNO_HOST || "127.0.0.1";
const SERVICE_TOKEN = process.env.TORNO_SERVICE_TOKEN;

export function iniciarServidorTorno(): void {
  try {
    if (!SERVICE_TOKEN) {
      throw new Error("TORNO_SERVICE_TOKEN no está configurado");
    }

    const app: Express = express();

    app.use(express.json());
    app.use(cors());

    // Autenticación simple entre servicios (3000 -> 3001)
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path === "/health") {
        return next();
      }

      const token = req.header("x-service-token");
      if (!token || token !== SERVICE_TOKEN) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
      }

      return next();
    });

    app.get("/", (_req: Request, res: Response) => {
      res.json({ ok: true, servicio: "msTorno" });
    });

    app.get("/health", (_req: Request, res: Response) => {
      res.json({ ok: true, status: "healthy" });
    });

    app.use("/api", apiRouter);

    // Error handler (Zod + fallback)
    app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof ZodError) {
        return res.status(400).json({ ok: false, error: "Bad Request", details: err.flatten() });
      }

      console.error(err);
      return res.status(500).json({ ok: false, error: "Internal Server Error" });
    });

    app.listen(Number(PORT), HOST, () => {
      console.log(`msTorno corriendo en http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error("Error al iniciar msTorno:", error);
    process.exit(1);
  }
}
