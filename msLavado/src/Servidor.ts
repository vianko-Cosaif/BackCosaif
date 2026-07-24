import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import { ZodError } from "zod";
import { apiRouter } from "./routes/api";
import { RequestWithRawBody, verifyServiceSignature } from "./security/serviceAuth";
import { DomainError } from "./utils/domainError";

export function iniciarServidorLavado(): void {
  try {
    const PORT = process.env.LAVADO_PORT || "3004";
    const HOST = process.env.LAVADO_HOST || "127.0.0.1";
    const SERVICE_AUTH_SECRETS = process.env.LAVADO_SERVICE_AUTH_SECRETS;

    if (!SERVICE_AUTH_SECRETS && (!process.env.LAVADO_SERVICE_ID || !process.env.LAVADO_SERVICE_SECRET)) {
      throw new Error("LAVADO_SERVICE_AUTH_SECRETS no esta configurado");
    }

    const app: Express = express();

    app.use(express.json({
      limit: "5mb",
      verify: (req: RequestWithRawBody, _res, buf) => {
        req.rawBody = Buffer.from(buf);
      },
    }));
    app.use(cors());

    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path === "/" || req.path === "/health") {
        return next();
      }
      return verifyServiceSignature(req, res, next);
    });

    app.get("/", (_req: Request, res: Response) => {
      res.json({ ok: true, servicio: "msLavado" });
    });

    app.get("/health", (_req: Request, res: Response) => {
      res.json({ ok: true, status: "healthy", servicio: "msLavado" });
    });

    app.use("/api", apiRouter);

    app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof ZodError) {
        return res.status(400).json({
          ok: false,
          error: "Bad Request",
          message: "Datos de entrada invalidos",
          details: err.flatten(),
        });
      }

      if (err instanceof DomainError) {
        return res.status(err.status).json({
          ok: false,
          error: err.message,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        });
      }

      console.error(err);
      return res.status(500).json({
        ok: false,
        error: "Internal Server Error",
        message: "Error interno de msLavado",
      });
    });

    app.listen(Number(PORT), HOST, () => {
      console.log(`msLavado corriendo en http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error("Error al iniciar msLavado:", error);
    process.exit(1);
  }
}
