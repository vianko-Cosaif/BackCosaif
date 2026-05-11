import express, { Express, Request, Response } from "express";
import cors from "cors";

const PORT = process.env.TORNO_PORT || "3001";

export function iniciarServidorTorno(): void {
  try {
    const app: Express = express();

    app.use(express.json());
    app.use(cors());

    app.get("/", (_req: Request, res: Response) => {
      res.json({ ok: true, servicio: "msTorno" });
    });

    app.get("/health", (_req: Request, res: Response) => {
      res.json({ ok: true, status: "healthy" });
    });

    app.listen(PORT, () => {
      console.log(`msTorno corriendo en puerto ${PORT}`);
    });
  } catch (error) {
    console.error("Error al iniciar msTorno:", error);
    process.exit(1);
  }
}
