import { Router } from "express";

const router = Router();

router.get("/maquinista/availability", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "maquinista-offline",
    checkedAt: new Date().toISOString(),
  });
});

export default router;
