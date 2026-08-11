import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import { ZodError } from "zod";
import { apiRouter } from "./routes/api";
import { RequestWithRawBody, verifyServiceSignature } from "./security/serviceAuth";
import { DomainError } from "./utils/domainError";
import { prismaTorreon } from "./db/prisma";
import { createTorreonGuardianAgent } from "./guardianAgent";

export function iniciarServidorTorreon(): void {
  try {
    const PORT = process.env.TORREON_PORT || "3003";
    const HOST = process.env.TORREON_HOST || "127.0.0.1";
    const SERVICE_AUTH_SECRETS = process.env.TORREON_SERVICE_AUTH_SECRETS;

    if (!SERVICE_AUTH_SECRETS && (!process.env.TORREON_SERVICE_ID || !process.env.TORREON_SERVICE_SECRET)) {
      throw new Error("TORREON_SERVICE_AUTH_SECRETS no esta configurado");
    }

    const app: Express = express();

    app.use(express.json({
      limit: "50mb",
      verify: (req: RequestWithRawBody, _res, buf) => {
        req.rawBody = Buffer.from(buf);
      },
    }));
    app.use(cors());
    const guardianAgent = createTorreonGuardianAgent({
      databaseCheck: async () => {
        await prismaTorreon.$queryRaw`SELECT 1`;
        return true;
      },
    });
    app.use(guardianAgent.middleware);

    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path === "/" || req.path === "/health") {
        return next();
      }

      return verifyServiceSignature(req, res, next);
    });

    app.get("/", (_req: Request, res: Response) => {
      res.json({ ok: true, servicio: "ms_torreon" });
    });

    app.get("/health", (_req: Request, res: Response) => {
      res.json({ ok: true, status: "healthy" });
    });

    app.use("/api", apiRouter);

    app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof ZodError) {
        return res.status(400).json({ ok: false, error: "Bad Request", details: err.flatten() });
      }
      if (err instanceof DomainError) {
        return res.status(err.status).json({
          ok: false,
          error: err.message,
          ...(err.details ? { details: err.details } : {}),
        });
      }

      console.error(err);
      return res.status(500).json({ ok: false, error: "Internal Server Error" });
    });

    app.listen(Number(PORT), HOST, () => {
      console.log(`ms_torreon corriendo en http://${HOST}:${PORT}`);
      guardianAgent.start();
    });
  } catch (error) {
    console.error("Error al iniciar ms_torreon:", error);
    process.exit(1);
  }
}
