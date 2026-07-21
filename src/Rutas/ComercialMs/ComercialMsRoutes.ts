import { Router, type Request } from "express";
import { authenticateAccess } from "../../auth/authenticateAccess";
import { prisma } from "../../lib/prisma";
import { proxyToComercialMs } from "../../services/comercialMs/comercialMsClient";
import type { AuthenticatedUser } from "../../types/auth";
import { CommercialCrmAnalyticsModel } from "../../reporteria/modelos/comercial-crm-analytics";
import {
  buildCommercialCrmWorkbook,
  type CrmExcelOperationColumn,
  type CrmExcelSection,
  type CrmExcelTemplate,
} from "../../reporteria/modelos/comercial-crm-excel";

const router = Router();
const ALLOWED_ROLES = new Set(["ADMINISTRADOR", "COMERCIAL"]);

router.use(authenticateAccess);
router.use((req, res, next) => {
  const user = req.user as AuthenticatedUser | undefined;
  const role = String(user?.rol ?? "").toUpperCase();
  if (!user || !ALLOWED_ROLES.has(role)) {
    return res.status(403).json({ error: "Solo ADMINISTRADOR o COMERCIAL puede acceder al CRM comercial" });
  }
  return next();
});

function restPath(req: Request) {
  const base = req.baseUrl;
  const value = req.originalUrl.startsWith(base) ? req.originalUrl.slice(base.length) : req.originalUrl;
  return value || "/";
}

router.get("/analitica", async (req, res) => {
  try {
    const parsePositive = (value: unknown) => {
      const number = Number(value);
      return Number.isInteger(number) && number > 0 ? number : undefined;
    };
    const originRaw = String(req.query.origin || "").toUpperCase();
    const periodRaw = String(req.query.period || "").toUpperCase();
    const data = await CommercialCrmAnalyticsModel.generate({
      reference: typeof req.query.reference === "string" ? req.query.reference : undefined,
      referenceDate: typeof req.query.referenceDate === "string" ? req.query.referenceDate : undefined,
      period: ["WEEK", "MONTH", "BIMONTH", "SEMESTER", "YEAR"].includes(periodRaw)
        ? periodRaw as "WEEK" | "MONTH" | "BIMONTH" | "SEMESTER" | "YEAR"
        : undefined,
      months: parsePositive(req.query.months),
      empresaId: parsePositive(req.query.empresaId),
      localidadId: parsePositive(req.query.localidadId),
      origin: originRaw === "NATURAL" || originRaw === "ARRASTRE" ? originRaw : undefined,
      page: parsePositive(req.query.page),
      pageSize: parsePositive(req.query.pageSize),
    });
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "No se pudo generar la analitica comercial" });
  }
});

router.post("/excel", async (req, res) => {
  try {
    const user = req.user as AuthenticatedUser;
    const allowedTemplates = new Set<CrmExcelTemplate>(["DIRECCION", "CONTRATO", "COBRANZA", "COMPLETO"]);
    const allowedSections = new Set<CrmExcelSection>(["RESUMEN", "NATURAL", "ARRASTRE", "TENDENCIA", "PATIOS", "CLIENTES", "CONTRATOS", "PAQUETES", "COBRANZA", "OPERACIONES", "GUIA"]);
    const allowedOperationColumns = new Set<CrmExcelOperationColumn>(["FUENTE", "TIPO", "REFERENCIA", "CLIENTE", "PATIO", "LOCOMOTORA", "VAGONES", "SERVICIOS", "ESTADO", "SOLICITUD", "FINALIZACION", "INCIDENTES"]);
    const requestedTemplate = String(req.body?.template || "DIRECCION").toUpperCase() as CrmExcelTemplate;
    const template = allowedTemplates.has(requestedTemplate) ? requestedTemplate : "DIRECCION";
    const empresaId = Number.isInteger(Number(req.body?.empresaId)) && Number(req.body?.empresaId) > 0 ? Number(req.body.empresaId) : undefined;
    const localidadId = Number.isInteger(Number(req.body?.localidadId)) && Number(req.body?.localidadId) > 0 ? Number(req.body.localidadId) : undefined;
    const reference = /^\d{4}-\d{2}$/.test(String(req.body?.reference || "")) ? String(req.body.reference) : undefined;
    const referenceDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.referenceDate || "")) ? String(req.body.referenceDate) : undefined;
    const periodRaw = String(req.body?.period || "MONTH").toUpperCase();
    const period = ["WEEK", "MONTH", "BIMONTH", "SEMESTER", "YEAR"].includes(periodRaw)
      ? periodRaw as "WEEK" | "MONTH" | "BIMONTH" | "SEMESTER" | "YEAR"
      : "MONTH";
    const originRaw = String(req.body?.origin || "").toUpperCase();
    const origin = originRaw === "NATURAL" || originRaw === "ARRASTRE" ? originRaw : undefined;
    const sections = Array.isArray(req.body?.sections)
      ? req.body.sections.map((item: unknown) => String(item).toUpperCase()).filter((item: string): item is CrmExcelSection => allowedSections.has(item as CrmExcelSection))
      : undefined;
    const operationColumns = Array.isArray(req.body?.operationColumns)
      ? req.body.operationColumns.map((item: unknown) => String(item).toUpperCase()).filter((item: string): item is CrmExcelOperationColumn => allowedOperationColumns.has(item as CrmExcelOperationColumn))
      : undefined;
    const includeArrastreRequested = req.body?.includeArrastre !== false;
    const analytics = await CommercialCrmAnalyticsModel.generate({
      reference,
      referenceDate,
      period,
      empresaId,
      localidadId,
      origin,
      page: 1,
      pageSize: 10_000,
      exportAll: true,
    });
    const selectedLocality = localidadId ? analytics.catalogs.localities.find((item) => item.id === localidadId)?.nombre : undefined;
    const localityAllowsArrastre = !localidadId || String(selectedLocality || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("torreon");
    const includeArrastre = includeArrastreRequested && localityAllowsArrastre && origin !== "NATURAL";
    const effectiveSections = sections?.filter((section: CrmExcelSection) => includeArrastre || section !== "ARRASTRE");

    const actor = { id: user.id, role: String(user.rol) };
    let crm: {
      available: boolean;
      clients: any[];
      contracts: any[];
      packages: any[];
      cuts: any[];
      collection: Record<string, number> | null;
    } = { available: false, clients: [], contracts: [], packages: [], cuts: [], collection: null };
    try {
      const clientResponse = await proxyToComercialMs("/clientes?pageSize=100", { method: "GET", actor });
      const clients = (clientResponse.data as any)?.data ?? [];
      const selectedClient = empresaId ? clients.find((item: any) => Number(item.empresaId) === empresaId) : null;
      if (empresaId && !selectedClient) {
        crm = { available: true, clients, contracts: [], packages: [], cuts: [], collection: null };
        throw new Error("CLIENTE_SIN_FICHA_COMERCIAL");
      }
      const common = new URLSearchParams({ pageSize: "100" });
      if (selectedClient) common.set("clienteComercialId", String(selectedClient.id));
      const cutParams = new URLSearchParams(common);
      cutParams.set("desde", analytics.meta.range.from.slice(0, 10));
      cutParams.set("hasta", new Date(Date.parse(analytics.meta.range.toExclusive) - 86_400_000).toISOString().slice(0, 10));
      const [contractsResponse, packagesResponse, cutsResponse, collectionResponse] = await Promise.all([
        proxyToComercialMs(`/contratos?${common}`, { method: "GET", actor }),
        proxyToComercialMs(`/paquetes?${common}`, { method: "GET", actor }),
        proxyToComercialMs(`/cobranza/cortes?${cutParams}`, { method: "GET", actor }),
        proxyToComercialMs(`/cobranza/resumen${selectedClient ? `?clienteComercialId=${selectedClient.id}` : ""}`, { method: "GET", actor }),
      ]);
      const rangeFrom = Date.parse(analytics.meta.range.from);
      const rangeTo = Date.parse(analytics.meta.range.toExclusive);
      const overlapsRange = (from: unknown, to: unknown) => {
        const start = Date.parse(String(from));
        const end = to ? Date.parse(String(to)) : Number.POSITIVE_INFINITY;
        return Number.isFinite(start) && start < rangeTo && end >= rangeFrom;
      };
      const contracts = ((contractsResponse.data as any)?.data ?? []).filter((item: any) => overlapsRange(item.fechaInicio, item.fechaFin));
      const packages = ((packagesResponse.data as any)?.data ?? []).filter((item: any) =>
        (!localidadId || !item.localidadId || Number(item.localidadId) === localidadId)
        && (!origin || !item.origenOperacion || item.origenOperacion === origin)
        && overlapsRange(item.vigenciaInicio, item.vigenciaFin),
      );
      const cuts = ((cutsResponse.data as any)?.data ?? []).flatMap((item: any) => {
        if (!localidadId && !origin) return [item];
        const detalles = Array.isArray(item.detalles)
          ? item.detalles.filter((detail: any) => (!localidadId || Number(detail.localidadId) === localidadId) && (!origin || detail.fuente === origin))
          : [];
        return detalles.length ? [{ ...item, detalles }] : [];
      });
      crm = {
        available: true,
        clients,
        contracts,
        packages,
        cuts,
        collection: collectionResponse.data as Record<string, number>,
      };
    } catch (crmError) {
      if (crmError instanceof Error && crmError.message === "CLIENTE_SIN_FICHA_COMERCIAL") {
        // La fuente esta disponible; el cliente seleccionado aun no tiene ficha CRM.
      } else {
        console.warn("Excel comercial generado sin CRM", crmError instanceof Error ? crmError.message : crmError);
      }
    }

    const selectedCompany = empresaId ? analytics.catalogs.companies.find((item) => item.id === empresaId)?.nombre : null;
    const reportName = String(req.body?.reportName || "Reporte comercial").trim().slice(0, 80) || "Reporte comercial";
    const title = `${reportName} · ${selectedCompany || "Toda la cartera"}`;
    const buffer = await buildCommercialCrmWorkbook({ analytics, crm, template, title, sections: effectiveSections, operationColumns, includeArrastre });
    const safeCompany = String(selectedCompany || "cartera")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 50);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const safeReport = reportName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 50) || "Reporte";
    res.setHeader("Content-Disposition", `attachment; filename="COSAIF_${safeReport}_${safeCompany}_${analytics.meta.reference}.xlsx"`);
    res.setHeader("Content-Length", String(buffer.length));
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "No se pudo generar el Excel comercial" });
  }
});

router.all("/*", async (req, res) => {
  try {
    const user = req.user as AuthenticatedUser;
    const rest = restPath(req);
    let body = ["GET", "HEAD"].includes(req.method.toUpperCase()) ? undefined : req.body;

    if (req.method.toUpperCase() === "POST" && rest.split("?")[0] === "/clientes") {
      const empresaId = Number(req.body?.empresaId);
      if (!Number.isInteger(empresaId) || empresaId <= 0) {
        return res.status(400).json({ error: "empresaId es obligatorio" });
      }
      const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { id: true, nombre: true } });
      if (!empresa) return res.status(404).json({ error: "La empresa operativa no existe" });
      body = { ...req.body, empresaId: empresa.id, empresaNombre: empresa.nombre };
    }

    const result = await proxyToComercialMs(rest, {
      method: req.method,
      body,
      actor: { id: user.id, role: String(user.rol) },
    });
    if (result.status === 204) return res.status(204).send();
    return res.status(result.status).send(result.data);
  } catch (error: any) {
    return res.status(Number(error?.status) || 502).json({
      error: error?.message ?? "No se pudo contactar a msComercial",
      details: error?.details ?? null,
    });
  }
});

export default router;
