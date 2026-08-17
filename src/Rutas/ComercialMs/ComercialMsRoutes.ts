import { Router, type Request } from "express";
import { authenticateAccess } from "../../auth/authenticateAccess";
import { prisma } from "../../lib/prisma";
import { proxyToComercialMs } from "../../services/comercialMs/comercialMsClient";
import type { AuthenticatedUser } from "../../types/auth";
import { PERMISSIONS } from "../../auth/accessPolicy";
import { requirePermission } from "../../auth/authorize";
import { CommercialCrmAnalyticsModel, generateCommercialAnalyticsForMonths, type CommercialAnalyticsFilters } from "../../reporteria/modelos/comercial-crm-analytics";
import { buildCommercialCutEvidence, renderCommercialCutEvidencePdf, renderCommercialGeneralCutPdf } from "../../reporteria/modelos/comercial-cut-evidence";
import { buildContractMonthWorkbook } from "../../reporteria/modelos/comercial-contract-month-excel";
import {
  buildCommercialCrmWorkbook,
  type CrmExcelOperationColumn,
  type CrmExcelSection,
  type CrmExcelTemplate,
} from "../../reporteria/modelos/comercial-crm-excel";

const router = Router();

router.use(authenticateAccess);
router.use(requirePermission(PERMISSIONS.REPORTS_COMMERCIAL_READ));

function restPath(req: Request) {
  const base = req.baseUrl;
  const value = req.originalUrl.startsWith(base) ? req.originalUrl.slice(base.length) : req.originalUrl;
  return value || "/";
}

async function fetchCommercialCollection(path: string, actor: { id: number; role: string }) {
  const rows: any[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const separator = path.includes("?") ? "&" : "?";
    const response = await proxyToComercialMs(`${path}${separator}page=${page}`, { method: "GET", actor });
    const payload = response.data as any;
    rows.push(...(Array.isArray(payload?.data) ? payload.data : []));
    totalPages = Math.min(Number(payload?.meta?.totalPages || 1), 50);
    page += 1;
  } while (page <= totalPages);
  return rows;
}

router.get("/analitica", async (req, res) => {
  try {
    const parsePositive = (value: unknown) => {
      const number = Number(value);
      return Number.isInteger(number) && number > 0 ? number : undefined;
    };
    const empresaIds = typeof req.query.empresaIds === "string"
      ? [...new Set(req.query.empresaIds.split(",").map((value) => parsePositive(value)).filter((value): value is number => value != null))]
      : undefined;
    const originRaw = String(req.query.origin || "").toUpperCase();
    const periodRaw = String(req.query.period || "").toUpperCase();
    const monthKeys = typeof req.query.monthKeys === "string"
      ? [...new Set(req.query.monthKeys.split(",").filter((value) => /^\d{4}-\d{2}$/.test(value)))].sort().slice(0, 24)
      : [];
    const analyticsFilters: CommercialAnalyticsFilters = {
      reference: typeof req.query.reference === "string" ? req.query.reference : undefined,
      referenceDate: typeof req.query.referenceDate === "string" ? req.query.referenceDate : undefined,
      period: ["WEEK", "MONTH", "BIMONTH", "SEMESTER", "YEAR"].includes(periodRaw)
        ? periodRaw as "WEEK" | "MONTH" | "BIMONTH" | "SEMESTER" | "YEAR"
        : undefined,
      months: parsePositive(req.query.months),
      empresaId: parsePositive(req.query.empresaId),
      empresaIds: empresaIds?.length ? empresaIds : undefined,
      localidadId: parsePositive(req.query.localidadId),
      origin: originRaw === "NATURAL" || originRaw === "ARRASTRE" ? originRaw as "NATURAL" | "ARRASTRE" : undefined,
      page: parsePositive(req.query.page),
      pageSize: parsePositive(req.query.pageSize),
    };
    const data = monthKeys.length
      ? await generateCommercialAnalyticsForMonths(analyticsFilters, monthKeys)
      : await CommercialCrmAnalyticsModel.generate(analyticsFilters);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "No se pudo generar la analitica comercial" });
  }
});

async function loadCommercialCutEvidence(req: Request) {
  const user = req.user as AuthenticatedUser;
  const contractId = Number(req.body?.contractId);
  const cutId = Number(req.body?.cutId);
  const localityId = Number.isInteger(Number(req.body?.localidadId)) && Number(req.body.localidadId) > 0 ? Number(req.body.localidadId) : undefined;
  const originRaw = String(req.body?.origin || "").toUpperCase();
  const origin = originRaw === "NATURAL" || originRaw === "ARRASTRE" ? originRaw as "NATURAL" | "ARRASTRE" : undefined;
  const periodRaw = String(req.body?.period || "MONTH").toUpperCase();
  const period = ["WEEK", "MONTH", "BIMONTH", "SEMESTER", "YEAR"].includes(periodRaw)
    ? periodRaw as "WEEK" | "MONTH" | "BIMONTH" | "SEMESTER" | "YEAR"
    : "MONTH";
  const referenceDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.referenceDate || "")) ? String(req.body.referenceDate) : undefined;
  if (!Number.isInteger(contractId) || contractId <= 0) throw new Error("contractId es obligatorio");
  const actor = { id: user.id, role: String(user.rol) };
  const [contractResponse, cutResponse] = await Promise.all([
    proxyToComercialMs("/contratos/" + contractId, { method: "GET", actor }),
    Number.isInteger(cutId) && cutId > 0
      ? proxyToComercialMs("/cobranza/cortes/" + cutId, { method: "GET", actor })
      : Promise.resolve(null),
  ]);
  const contract = contractResponse.data as any;
  const cut = cutResponse?.data as any;
  if (!contract?.cliente?.empresaId) throw new Error("El contrato no tiene un cliente operativo vinculado");
  if (cut && Number(cut.contratoId) !== contractId) throw new Error("El corte no pertenece al contrato seleccionado");
  const analytics = await CommercialCrmAnalyticsModel.generate({
    referenceDate,
    period,
    empresaId: Number(contract.cliente.empresaId),
    localidadId: localityId,
    origin,
    page: 1,
    pageSize: 10_000,
    exportAll: true,
  });
  const requestedStart = String(req.body?.periodStart || "").slice(0, 10);
  const requestedEnd = String(req.body?.periodEnd || "").slice(0, 10);
  const periodStart = /^\d{4}-\d{2}-\d{2}$/.test(requestedStart)
    ? requestedStart
    : String(cut?.periodoInicio || analytics.meta.range.from).slice(0, 10);
  const periodEnd = /^\d{4}-\d{2}-\d{2}$/.test(requestedEnd)
    ? requestedEnd
    : String(cut?.periodoFin || new Date(Date.parse(analytics.meta.range.toExclusive) - 86_400_000).toISOString()).slice(0, 10);
  return buildCommercialCutEvidence({
    contract,
    operations: analytics.operations.data,
    periodStart,
    periodEnd,
    periodLabel: analytics.meta.periodLabel,
    selectedMonths: analytics.meta.months,
    localityId,
    origin,
    cut,
  });
}

router.post("/cobranza/evidencia", async (req, res) => {
  try {
    return res.json(await loadCommercialCutEvidence(req));
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "No se pudo generar la evidencia del corte" });
  }
});

router.post("/cobranza/evidencia/pdf", async (req, res) => {
  try {
    const pdf = await renderCommercialCutEvidencePdf(await loadCommercialCutEvidence(req));
    res.setHeader("Content-Type", pdf.contentType);
    res.setHeader("Content-Disposition", 'attachment; filename="' + pdf.filename + '"');
    res.setHeader("Content-Length", String(pdf.buffer.length));
    return res.send(pdf.buffer);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "No se pudo generar el PDF del corte" });
  }
});

router.post("/cobranza/corte-general/pdf", async (req, res) => {
  try {
    const user = req.user as AuthenticatedUser;
    const contractIds = Array.isArray(req.body?.contractIds)
      ? [...new Set(req.body.contractIds.map((value: unknown) => Number(value)).filter((value: number) => Number.isInteger(value) && value > 0))]
      : [];
    const months: string[] = Array.isArray(req.body?.months)
      ? [...new Set<string>(req.body.months.map((value: unknown) => String(value)).filter((value: string) => /^\d{4}-\d{2}$/.test(value)))].sort()
      : [];
    const localityId = Number.isInteger(Number(req.body?.localidadId)) && Number(req.body.localidadId) > 0 ? Number(req.body.localidadId) : undefined;
    const originRaw = String(req.body?.origin || "").toUpperCase();
    const origin = originRaw === "NATURAL" || originRaw === "ARRASTRE" ? originRaw as "NATURAL" | "ARRASTRE" : undefined;
    if (!contractIds.length) return res.status(400).json({ error: "Seleccione al menos un contrato" });
    if (contractIds.length > 100) return res.status(400).json({ error: "El Corte general admite hasta 100 contratos" });
    if (!months.length) return res.status(400).json({ error: "Seleccione al menos un mes" });
    if (months.length > 24) return res.status(400).json({ error: "El Corte general admite hasta 24 meses" });

    const actor = { id: user.id, role: String(user.rol) };
    const selectedIds = new Set(contractIds);
    const firstStart = `${months[0]}-01`;
    const lastMonth = new Date(`${months[months.length - 1]}-01T12:00:00.000Z`);
    const lastEnd = new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    const [allContracts, cuts] = await Promise.all([
      fetchCommercialCollection("/contratos?pageSize=100", actor),
      fetchCommercialCollection(`/cobranza/cortes?pageSize=100&desde=${firstStart}&hasta=${lastEnd}`, actor),
    ]);
    const contracts = allContracts.filter((contract: any) => selectedIds.has(Number(contract.id)));
    if (!contracts.length) return res.status(404).json({ error: "No se encontraron los contratos seleccionados" });
    const empresaIds = [...new Set<number>(contracts.map((contract: any) => Number(contract.cliente?.empresaId)).filter((value: number) => Number.isInteger(value) && value > 0))];

    const evidences = [];
    let scopeLocality = localityId ? `Patio #${localityId}` : "Todos los patios";
    for (const month of months) {
      const monthStart = `${month}-01`;
      const monthDate = new Date(`${monthStart}T12:00:00.000Z`);
      const monthEnd = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
      const analytics = await CommercialCrmAnalyticsModel.generate({
        referenceDate: monthStart,
        period: "MONTH",
        empresaIds,
        localidadId: localityId,
        origin,
        page: 1,
        pageSize: 10_000,
        exportAll: true,
      });
      if (localityId) scopeLocality = analytics.catalogs.localities.find((item) => item.id === localityId)?.nombre || scopeLocality;
      for (const contract of contracts) {
        const contractStart = String(contract.fechaInicio || "").slice(0, 10);
        const contractEnd = contract.fechaFin ? String(contract.fechaFin).slice(0, 10) : "9999-12-31";
        if (contractStart > monthEnd || contractEnd < monthStart || contract.estado === "CANCELADO") continue;
        const cut = cuts
          .filter((item: any) => Number(item.contratoId) === Number(contract.id)
            && String(item.periodoInicio).slice(0, 10) <= monthEnd
            && String(item.periodoFin).slice(0, 10) >= monthStart)
          .sort((left: any, right: any) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")))[0];
        evidences.push(buildCommercialCutEvidence({
          contract,
          operations: analytics.operations.data,
          periodStart: monthStart,
          periodEnd: monthEnd,
          periodLabel: analytics.meta.periodLabel,
          selectedMonths: 1,
          localityId,
          origin,
          cut,
        }));
      }
    }
    const scope = [scopeLocality, origin === "ARRASTRE" ? "Arrastre Torreón" : origin === "NATURAL" ? "Movimientos naturales" : "Naturales y arrastre separados"].join(" · ");
    const pdf = await renderCommercialGeneralCutPdf(evidences, { months, scope });
    res.setHeader("Content-Type", pdf.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${pdf.filename}"`);
    res.setHeader("Content-Length", String(pdf.buffer.length));
    return res.send(pdf.buffer);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "No se pudo generar el Corte general" });
  }
});

router.post("/excel/contrato-mes", async (req, res) => {
  try {
    const user = req.user as AuthenticatedUser;
    const contractId = Number(req.body?.contractId);
    const monthKey = String(req.body?.month || "");
    const localidadId = Number.isInteger(Number(req.body?.localidadId)) && Number(req.body.localidadId) > 0 ? Number(req.body.localidadId) : undefined;
    const originRaw = String(req.body?.origin || "").toUpperCase();
    const origin = originRaw === "NATURAL" || originRaw === "ARRASTRE" ? originRaw as "NATURAL" | "ARRASTRE" : undefined;
    const ruleIds = Array.isArray(req.body?.ruleIds)
      ? [...new Set(req.body.ruleIds.map((value: unknown) => Number(value)).filter((value: number) => Number.isInteger(value) && value > 0))]
      : [];
    if (!Number.isInteger(contractId) || contractId <= 0) return res.status(400).json({ error: "contractId es obligatorio" });
    if (!/^\d{4}-\d{2}$/.test(monthKey)) return res.status(400).json({ error: "month debe tener formato AAAA-MM" });
    if (!ruleIds.length) return res.status(400).json({ error: "Debe indicar la tarjeta contractual que desea descargar" });

    const actor = { id: user.id, role: String(user.rol) };
    const contractResponse = await proxyToComercialMs(`/contratos/${contractId}`, { method: "GET", actor });
    const contract = contractResponse.data as any;
    if (!contract?.cliente?.empresaId) return res.status(404).json({ error: "El contrato no tiene un cliente operativo vinculado" });

    const monthStart = new Date(`${monthKey}-01T00:00:00.000Z`);
    const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
    const overlapsMonth = (from: unknown, to: unknown) => {
      const start = Date.parse(String(from));
      const end = to ? Date.parse(String(to)) + 86_400_000 : Number.POSITIVE_INFINITY;
      return Number.isFinite(start) && start < monthEnd.getTime() && end >= monthStart.getTime();
    };
    const trackedServices = new Set(["MOVIMIENTO", "LAVADO", "TORNEADO"]);
    const rules = (Array.isArray(contract.paquetes) ? contract.paquetes : []).filter((rule: any) =>
      rule.activo !== false
      && ruleIds.includes(Number(rule.id))
      && trackedServices.has(String(rule.servicio))
      && overlapsMonth(rule.vigenciaInicio, rule.vigenciaFin)
      && (!localidadId || !rule.localidadId || Number(rule.localidadId) === localidadId)
      && (!origin || !rule.origenOperacion || rule.origenOperacion === origin),
    );
    if (!rules.length) return res.status(409).json({ error: "La tarjeta seleccionada no tiene reglas vigentes para este mes y alcance" });

    const selectedServices = [...new Set(rules.map((rule: any) => String(rule.servicio)))];
    const selectedOrigins = [...new Set(rules.map((rule: any) => String(rule.origenOperacion || "")).filter(Boolean))];
    const effectiveOrigin = origin || (selectedOrigins.length === 1 ? selectedOrigins[0] : undefined);
    const scopeLabel = selectedServices.length !== 1
      ? "Servicios"
      : selectedServices[0] === "LAVADO"
        ? "Lavado"
        : selectedServices[0] === "TORNEADO"
          ? "Torno"
          : effectiveOrigin === "ARRASTRE"
            ? "Arrastre"
            : "Naturales";

    const analytics = await CommercialCrmAnalyticsModel.generate({
      referenceDate: `${monthKey}-01`,
      period: "MONTH",
      empresaId: Number(contract.cliente.empresaId),
      localidadId,
      origin,
      page: 1,
      pageSize: 10_000,
      exportAll: true,
    });
    const defaultStatuses = ["CONCLUIDO", "CANCELADO", "DETENIDO", "EN_PROCESO"];
    const operations = analytics.operations.data.filter((operation) => rules.some((rule: any) => {
      const statuses = Array.isArray(rule.estadosIncluidos) && rule.estadosIncluidos.length ? rule.estadosIncluidos : defaultStatuses;
      return statuses.includes(operation.status)
        && (!rule.localidadId || operation.localidadId === Number(rule.localidadId))
        && (!rule.origenOperacion || operation.origin === rule.origenOperacion)
        && operation.services.includes(rule.servicio);
    }));
    const localityNames = new Map<number, string>(analytics.catalogs.localities.map((item) => [item.id, item.nombre]));
    const buffer = await buildContractMonthWorkbook({
      contract,
      rules,
      operations,
      monthKey,
      periodLabel: analytics.meta.periodLabel,
      scopeLabel,
      localityNames,
    });
    const safe = (value: unknown, fallback: string) => String(value || fallback).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 50) || fallback;
    const filename = `COSAIF_${safe(contract.folio, "Contrato")}_${safe(contract.cliente.empresaNombre, "Cliente")}_${safe(scopeLabel, "Servicios")}_${monthKey}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", String(buffer.length));
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "No se pudo generar el Excel del contrato" });
  }
});

router.post("/excel", async (req, res) => {
  try {
    const user = req.user as AuthenticatedUser;
    const allowedTemplates = new Set<CrmExcelTemplate>(["DIRECCION", "CONTRATO", "COBRANZA", "COMPLETO"]);
    const allowedSections = new Set<CrmExcelSection>(["RESUMEN", "NATURAL", "ARRASTRE", "TENDENCIA", "PATIOS", "CLIENTES", "CONTRATOS", "PAQUETES", "COBRANZA", "FINANZAS", "EXCEDENTES", "PAGOS", "HISTORIAL", "OPERACIONES", "GUIA"]);
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
    const origin = originRaw === "NATURAL" || originRaw === "ARRASTRE" ? originRaw as "NATURAL" | "ARRASTRE" : undefined;
    const monthKeys: string[] = Array.isArray(req.body?.months)
      ? [...new Set<string>((req.body.months as unknown[]).map((value) => String(value)).filter((value) => /^\d{4}-\d{2}$/.test(value)))].sort().slice(0, 24)
      : [];
    const sections = Array.isArray(req.body?.sections)
      ? req.body.sections.map((item: unknown) => String(item).toUpperCase()).filter((item: string): item is CrmExcelSection => allowedSections.has(item as CrmExcelSection))
      : undefined;
    const operationColumns = Array.isArray(req.body?.operationColumns)
      ? req.body.operationColumns.map((item: unknown) => String(item).toUpperCase()).filter((item: string): item is CrmExcelOperationColumn => allowedOperationColumns.has(item as CrmExcelOperationColumn))
      : undefined;
    const includeArrastreRequested = req.body?.includeArrastre !== false;
    const analyticsFilters: CommercialAnalyticsFilters = {
      reference,
      referenceDate,
      period,
      empresaId,
      localidadId,
      origin,
      page: 1,
      pageSize: 10_000,
      exportAll: true,
    };
    const analytics = monthKeys.length
      ? await generateCommercialAnalyticsForMonths(analyticsFilters, monthKeys)
      : await CommercialCrmAnalyticsModel.generate(analyticsFilters);
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
      const clients = await fetchCommercialCollection("/clientes?pageSize=100", actor);
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
      cutParams.set("includeHistorial", "true");
      const [contractsResponse, packagesResponse, cutsResponse, collectionResponse] = await Promise.all([
        fetchCommercialCollection(`/contratos?${common}`, actor),
        fetchCommercialCollection(`/paquetes?${common}`, actor),
        fetchCommercialCollection(`/cobranza/cortes?${cutParams}`, actor),
        proxyToComercialMs(`/cobranza/resumen${selectedClient ? `?clienteComercialId=${selectedClient.id}` : ""}`, { method: "GET", actor }),
      ]);
      const rangeFrom = Date.parse(analytics.meta.range.from);
      const rangeTo = Date.parse(analytics.meta.range.toExclusive);
      const selectedMonthRanges = monthKeys.map((month) => {
        const start = Date.parse(`${month}-01T00:00:00.000Z`);
        const [year, monthNumber] = month.split("-").map(Number);
        const end = Date.UTC(year, monthNumber, 1);
        return { start, end };
      });
      const overlapsRange = (from: unknown, to: unknown) => {
        const start = Date.parse(String(from));
        const end = to ? Date.parse(String(to)) : Number.POSITIVE_INFINITY;
        if (!Number.isFinite(start)) return false;
        if (selectedMonthRanges.length) return selectedMonthRanges.some((month) => start < month.end && end >= month.start);
        return start < rangeTo && end >= rangeFrom;
      };
      const ruleMatchesScope = (rule: any) =>
        (!localidadId || !rule.localidadId || Number(rule.localidadId) === localidadId)
        && (!origin || !rule.origenOperacion || rule.origenOperacion === origin)
        && overlapsRange(rule.vigenciaInicio, rule.vigenciaFin);
      const contracts = contractsResponse.filter((item: any) => {
        const rules = Array.isArray(item.paquetes) ? item.paquetes : [];
        return item.estado !== "CANCELADO"
          && overlapsRange(item.fechaInicio, item.fechaFin)
          && (!rules.length || rules.some(ruleMatchesScope));
      });
      const contractIds = new Set(contracts.map((item: any) => Number(item.id)));
      const packages = packagesResponse.filter((item: any) =>
        (!localidadId || !item.localidadId || Number(item.localidadId) === localidadId)
        && (!origin || !item.origenOperacion || item.origenOperacion === origin)
        && overlapsRange(item.vigenciaInicio, item.vigenciaFin),
      );
      const cuts = cutsResponse.filter((item: any) => overlapsRange(item.periodoInicio, item.periodoFin)).flatMap((item: any) => {
        if (!localidadId && !origin) return [item];
        if (item.contratoId && contractIds.has(Number(item.contratoId))) return [item];
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
    const buffer = await buildCommercialCrmWorkbook({ analytics, crm, template, title, sections: effectiveSections, operationColumns, includeArrastre, scope: { localidadId, origin } });
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
      actor: { id: user.id, role: String(user.rol), name: user.nombre },
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
