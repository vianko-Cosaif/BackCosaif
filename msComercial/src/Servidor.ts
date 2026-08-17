import cors from "cors";
import express, { type Express, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { Prisma } from "../generated";
import { ZodError } from "zod";
import { comercialApiRouter } from "./routes/api";
import { type CommercialRequest, verifyCommercialServiceRequest } from "./security/serviceAuth";
import { CommercialDomainError } from "./utils/domainError";
import { prismaComercial } from "./db/prisma";
import { createComercialGuardianAgent } from "./guardianAgent";

function loopbackMetricsOnly(req: Request, res: Response, next: NextFunction) {
  const address = req.socket.remoteAddress || "";
  if (address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1") {
    return next();
  }
  return res.status(404).end();
}

export function createComercialApp(
  guardianMiddleware?: RequestHandler,
  guardianMetrics?: RequestHandler,
): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({
    limit: "5mb",
    verify: (req: CommercialRequest, _res, buffer) => {
      req.rawBody = Buffer.from(buffer);
    },
  }));
  if (guardianMiddleware) app.use(guardianMiddleware);
  if (guardianMetrics) app.get("/metrics", loopbackMetricsOnly, guardianMetrics);

  app.get("/", (_req, res) => res.json({ ok: true, servicio: "msComercial" }));
  app.get("/health", (_req, res) => res.json({ ok: true, status: "healthy" }));
  app.use("/api", verifyCommercialServiceRequest, comercialApiRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Datos comerciales invalidos", details: err.flatten() });
    }
    if (err instanceof CommercialDomainError) {
      return res.status(err.status).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return res.status(409).json({ error: "Ya existe un registro comercial con esos datos", details: err.meta });
      }
      if (err.code === "P2025") {
        return res.status(404).json({ error: "Registro comercial no encontrado" });
      }
    }
    console.error("msComercial error", err);
    return res.status(500).json({ error: "Error interno de Comercial" });
  });

  return app;
}

export function iniciarServidorComercial(): void {
  const port = Number(process.env.COMERCIAL_PORT || 3004);
  const host = process.env.COMERCIAL_HOST || "127.0.0.1";
  if (!process.env.COMERCIAL_DATABASE_URL) throw new Error("COMERCIAL_DATABASE_URL no configurada");
  if (!process.env.COMERCIAL_SERVICE_SECRET) throw new Error("COMERCIAL_SERVICE_SECRET no configurado");

  const guardianAgent = createComercialGuardianAgent({
    databaseCheck: async () => {
      await prismaComercial.$queryRaw`SELECT 1`;
      return true;
    },
  });
  createComercialApp(guardianAgent.middleware, guardianAgent.metrics).listen(port, host, () => {
    console.log(`msComercial corriendo en http://${host}:${port}`);
    guardianAgent.start();
  });
}
