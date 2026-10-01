import type { CommercialOperation } from "./comercial-crm-analytics";
import { DateTime } from "luxon";
import { getBrowser } from "./pdf-browser";
import { baseCss, escapeHtml, safeFilename } from "./pdf-helpers";

type Rule = {
  id: number;
  nombre: string;
  servicio: "MOVIMIENTO" | "LAVADO" | "TORNEADO";
  origenOperacion?: "NATURAL" | "ARRASTRE" | null;
  unidad: string;
  periodicidad: string;
  localidadId?: number | null;
  estadosIncluidos?: string[];
  cantidadIncluida?: string | number | null;
  montoPaquete?: string | number | null;
  importeExcedente?: string | number | null;
  tarifaExcedente?: { importeUnitario?: string | number | null } | null;
  activo?: boolean;
  vigenciaInicio: string | Date;
  vigenciaFin?: string | Date | null;
};

type Contract = {
  id: number;
  folio: string;
  nombre: string;
  moneda?: string;
  montoMaximo?: string | number | null;
  cliente?: { empresaId: number; empresaNombre: string };
  paquetes?: Rule[];
};

type Cut = {
  id: number;
  folio: string;
  estado: string;
  total?: string | number | null;
  periodoInicio: string | Date;
  periodoFin: string | Date;
  fechaVencimiento?: string | Date | null;
  facturaFolio?: string | null;
  aprobadoPorId?: number | null;
  aprobadoAt?: string | Date | null;
  updatedById?: number | null;
  updatedAt?: string | Date | null;
  pagos?: Array<{ monto: string | number }>;
};

export type CommercialCutEvidenceRow = {
  key: string;
  ruleId: number;
  serviceLabel: string;
  movementId: string;
  reference: string;
  requester: string;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  fromTrack: string | null;
  toTrack: string | null;
  status: string;
  locality: string;
  quantity: number;
  excessQuantity: number;
  unitRate: number | null;
  amount: number | null;
};

export type CommercialCutEvidenceRule = {
  ruleId: number;
  name: string;
  serviceLabel: string;
  unitLabel: string;
  included: number | null;
  consumed: number;
  excess: number;
  unitRate: number | null;
  extraAmount: number | null;
  missingRate: boolean;
};

export type CommercialCutEvidence = {
  generatedAt: string;
  contract: { id: number; folio: string; name: string; client: string; currency: string };
  cut: { id: number | null; folio: string; state: string; invoice: string | null; dueDate: string | null; approvedAt: string | null; approvedById: number | null; updatedAt: string | null; updatedById: number | null };
  period: { start: string; end: string; label: string; periods: number };
  totals: { base: number | null; extras: number; calculated: number | null; official: number | null; paid: number; balance: number | null; missingBase: boolean; missingRates: number };
  rules: CommercialCutEvidenceRule[];
  excessRows: CommercialCutEvidenceRow[];
};

const DEFAULT_STATUSES = ["CONCLUIDO", "CANCELADO", "DETENIDO", "EN_PROCESO"];

function nullableNumber(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateKey(value: string | Date | null | undefined) {
  if (!value) return null;
  return (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10);
}

function operationDateKey(value: string | Date | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date
    ? DateTime.fromJSDate(value)
    : DateTime.fromISO(String(value), { setZone: true });
  return parsed.isValid ? parsed.setZone("America/Mexico_City").toISODate() : dateKey(value);
}

function periodsFor(periodicity: string, months: number, start: string, end: string) {
  const days = Math.max(1, Math.round((Date.parse(end + "T12:00:00Z") - Date.parse(start + "T12:00:00Z")) / 86_400_000) + 1);
  if (periodicity === "SEMANAL") return Math.ceil(days / 7);
  if (periodicity === "MENSUAL") return Math.max(1, months);
  if (periodicity === "BIMESTRAL") return Math.max(1, Math.ceil(months / 2));
  if (periodicity === "SEMESTRAL") return Math.max(1, Math.ceil(months / 6));
  if (periodicity === "ANUAL") return Math.max(1, Math.ceil(months / 12));
  return 1;
}

function serviceLabel(rule: Rule) {
  if (rule.servicio === "LAVADO") return "Lavado";
  if (rule.servicio === "TORNEADO") return "Torno";
  return rule.origenOperacion === "ARRASTRE" ? "Arrastre" : "Naturales";
}

function unitLabel(rule: Rule) {
  if (rule.unidad === "VAGON") return "vagones";
  if (rule.unidad === "SERVICIO") return "servicios";
  return "movimientos";
}

function operationQuantity(operation: CommercialOperation, rule: Rule) {
  return rule.unidad === "VAGON" ? Number(operation.requestedQuantity ?? operation.wagons ?? 0) : 1;
}

function matchesRule(operation: CommercialOperation, rule: Rule, companyId: number) {
  const statuses = rule.estadosIncluidos?.length ? rule.estadosIncluidos : DEFAULT_STATUSES;
  return operation.empresaId === companyId
    && statuses.includes(operation.status)
    && operation.services.includes(rule.servicio)
    && (!rule.localidadId || operation.localidadId === Number(rule.localidadId))
    && (!rule.origenOperacion || operation.origin === rule.origenOperacion);
}

export function buildCommercialCutEvidence(input: {
  contract: Contract;
  operations: CommercialOperation[];
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  selectedMonths: number;
  localityId?: number;
  origin?: "NATURAL" | "ARRASTRE";
  cut?: Cut | null;
}): CommercialCutEvidence {
  const companyId = Number(input.contract.cliente?.empresaId || 0);
  const rules = (input.contract.paquetes || []).filter((rule) =>
    rule.activo !== false
    && ["MOVIMIENTO", "LAVADO", "TORNEADO"].includes(rule.servicio)
    && (!input.localityId || !rule.localidadId || Number(rule.localidadId) === input.localityId)
    && (!input.origin || !rule.origenOperacion || rule.origenOperacion === input.origin)
    && (dateKey(rule.vigenciaInicio) || input.periodStart) <= input.periodEnd
    && (!rule.vigenciaFin || (dateKey(rule.vigenciaFin) || input.periodEnd) >= input.periodStart)
  );
  const excessRows: CommercialCutEvidenceRow[] = [];
  const summaries: CommercialCutEvidenceRule[] = [];
  const serviceBases: number[] = [];
  const periodCounts: number[] = [];

  for (const rule of rules) {
    const periods = periodsFor(rule.periodicidad, input.selectedMonths, input.periodStart, input.periodEnd);
    periodCounts.push(periods);
    const serviceBase = nullableNumber(rule.montoPaquete);
    if (serviceBase != null) serviceBases.push(serviceBase * periods);
    const includedPerPeriod = nullableNumber(rule.cantidadIncluida);
    const included = includedPerPeriod == null ? null : includedPerPeriod * periods;
    const rate = nullableNumber(rule.importeExcedente ?? rule.tarifaExcedente?.importeUnitario);
    const matching = input.operations
      .filter((operation) => {
        const key = operationDateKey(operation.operationAt);
        return !!key && key >= input.periodStart && key <= input.periodEnd && matchesRule(operation, rule, companyId);
      })
      .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt) || a.key.localeCompare(b.key));
    let cumulative = 0;
    let excess = 0;
    for (const operation of matching) {
      const quantity = operationQuantity(operation, rule);
      const previous = cumulative;
      cumulative += quantity;
      const previousExcess = included == null ? 0 : Math.max(0, previous - included);
      const currentExcess = included == null ? 0 : Math.max(0, cumulative - included);
      const excessQuantity = currentExcess - previousExcess;
      if (excessQuantity <= 0) continue;
      excess += excessQuantity;
      excessRows.push({
        key: String(rule.id) + ":" + operation.key,
        ruleId: rule.id,
        serviceLabel: serviceLabel(rule),
        movementId: operation.sourceSystem + "-" + operation.sourceId,
        reference: operation.reference,
        requester: operation.requestedBy || operation.empresa,
        requestedAt: operation.requestedAt,
        startedAt: operation.startedAt || null,
        completedAt: operation.completedAt,
        fromTrack: operation.viaOrigen || null,
        toTrack: operation.viaDestino || null,
        status: operation.status,
        locality: operation.localidad,
        quantity,
        excessQuantity,
        unitRate: rate,
        amount: rate == null ? null : excessQuantity * rate,
      });
    }
    summaries.push({
      ruleId: rule.id,
      name: rule.nombre,
      serviceLabel: serviceLabel(rule),
      unitLabel: unitLabel(rule),
      included,
      consumed: cumulative,
      excess,
      unitRate: rate,
      extraAmount: excess > 0 && rate == null ? null : excess * Number(rate || 0),
      missingRate: excess > 0 && rate == null,
    });
  }

  const contractBase = nullableNumber(input.contract.montoMaximo);
  const base = serviceBases.length
    ? serviceBases.reduce((sum, value) => sum + value, 0)
    : contractBase == null ? null : contractBase * Math.max(1, ...periodCounts);
  const missingRates = summaries.filter((rule) => rule.missingRate).length;
  const extras = summaries.reduce((sum, rule) => sum + Number(rule.extraAmount || 0), 0);
  const calculated = base == null || missingRates ? null : base + extras;
  const official = nullableNumber(input.cut?.total) ?? calculated;
  const paid = (input.cut?.pagos || []).reduce((sum, payment) => sum + Number(payment.monto || 0), 0);
  const balance = official == null ? null : Math.max(0, official - paid);
  return {
    generatedAt: new Date().toISOString(),
    contract: { id: input.contract.id, folio: input.contract.folio, name: input.contract.nombre, client: input.contract.cliente?.empresaNombre || "Cliente", currency: input.contract.moneda || "MXN" },
    cut: {
      id: input.cut?.id || null,
      folio: input.cut?.folio || "PRE-" + input.contract.folio + "-" + input.periodStart.slice(0, 7),
      state: input.cut?.estado || "CALCULADO",
      invoice: input.cut?.facturaFolio || null,
      dueDate: dateKey(input.cut?.fechaVencimiento),
      approvedAt: input.cut?.aprobadoAt ? new Date(input.cut.aprobadoAt).toISOString() : null,
      approvedById: input.cut?.aprobadoPorId || null,
      updatedAt: input.cut?.updatedAt ? new Date(input.cut.updatedAt).toISOString() : null,
      updatedById: input.cut?.updatedById || null,
    },
    period: { start: input.periodStart, end: input.periodEnd, label: input.periodLabel, periods: Math.max(1, ...periodCounts) },
    totals: { base, extras, calculated, official, paid, balance, missingBase: base == null, missingRates },
    rules: summaries,
    excessRows: excessRows.sort((a, b) => a.requestedAt.localeCompare(b.requestedAt) || a.key.localeCompare(b.key)),
  };
}

function money(value: number | null, currency: string) {
  if (value == null) return "Pendiente";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

function dateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" }).format(date);
}

function css() {
  return baseCss()
    + "@page{size:A4 landscape;margin:12mm 10mm 15mm}body{background:#fff;padding:0;color:#0f172a}"
    + ".hero{padding:20px;color:#fff;border-radius:14px;background:linear-gradient(135deg,#0f172a,#155e75 60%,#047857)}"
    + ".hero h1{margin:5px 0 4px;font-size:28px}.hero-grid{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:start}"
    + ".tag{display:inline-block;padding:4px 9px;border-radius:999px;background:#d1fae5;color:#065f46;font-size:9px;font-weight:900;text-transform:uppercase;white-space:nowrap}"
    + ".hero .tag{background:rgba(255,255,255,.92);color:#0f172a}.hero-meta{text-align:right;font-size:10px;line-height:1.7;color:#d1fae5}"
    + ".formula{margin-top:12px;display:grid;grid-template-columns:repeat(6,1fr);gap:8px}.metric{padding:11px;border:1px solid #dbe5e1;border-radius:10px;background:#f8fafc}"
    + ".metric b{display:block;margin-top:4px;font-size:17px}.metric span{color:#64748b;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}"
    + ".section{margin-top:14px;break-inside:avoid}.section h2{margin:0 0 7px;font-size:15px}table{width:100%;border-collapse:collapse;table-layout:fixed}"
    + "th{padding:6px 5px;color:#475569;background:#eaf2f0;border-bottom:2px solid #0f766e;font-size:8px;text-align:left;text-transform:uppercase}"
    + "td{padding:6px 5px;border-bottom:1px solid #e2e8f0;font-size:8.5px;vertical-align:top;overflow-wrap:anywhere}tr:nth-child(even) td{background:#f8fafc}"
    + ".right{text-align:right}.warning{color:#9a3412;font-weight:900}.ok{color:#047857;font-weight:900}"
    + ".method{padding:12px 14px;border-left:4px solid #0f766e;background:#ecfdf5;font-size:9px;line-height:1.6}.empty{padding:18px;text-align:center;border:1px dashed #cbd5e1;border-radius:10px;color:#64748b;font-size:10px}";
}

export async function renderCommercialCutEvidencePdf(evidence: CommercialCutEvidence) {
  const currency = evidence.contract.currency;
  const ruleRows = evidence.rules.map((rule) =>
    "<tr><td><span class='tag'>" + escapeHtml(rule.serviceLabel) + "</span><br>" + escapeHtml(rule.name) + "</td>"
    + "<td>" + (rule.included == null ? "Sin limite" : String(rule.included) + " " + escapeHtml(rule.unitLabel)) + "</td>"
    + "<td class='right'>" + rule.consumed + "</td><td class='right " + (rule.excess ? "warning" : "ok") + "'>" + rule.excess + "</td>"
    + "<td class='right'>" + money(rule.unitRate, currency) + "</td><td class='right'>" + money(rule.extraAmount, currency) + "</td></tr>"
  ).join("") || "<tr><td colspan='6'>Sin reglas contractuales para el periodo.</td></tr>";
  const detailRows = evidence.excessRows.map((row) =>
    "<tr><td><b>" + escapeHtml(row.movementId) + "</b><br>" + escapeHtml(row.reference) + "</td>"
    + "<td><span class='tag'>" + escapeHtml(row.serviceLabel) + "</span><br>" + escapeHtml(row.status) + "</td>"
    + "<td>" + escapeHtml(row.requester) + "</td><td>" + dateTime(row.requestedAt) + "</td><td>" + dateTime(row.startedAt) + "</td><td>" + dateTime(row.completedAt) + "</td>"
    + "<td>" + escapeHtml(row.fromTrack || "-") + " -> " + escapeHtml(row.toTrack || "-") + "<br>" + escapeHtml(row.locality) + "</td>"
    + "<td class='right'>" + row.quantity + "</td><td class='right warning'>" + row.excessQuantity + "</td><td class='right'>" + money(row.unitRate, currency) + "</td><td class='right'>" + money(row.amount, currency) + "</td></tr>"
  ).join("") || "<tr><td colspan='11'><div class='empty'>No se detectaron operaciones fuera de la cantidad incluida.</div></td></tr>";
  const html = "<!doctype html><html><head><meta charset='utf-8'><style>" + css() + "</style></head><body>"
    + "<div class='hero'><div class='hero-grid'><div><span class='tag'>Evidencia de corte</span><h1>" + escapeHtml(evidence.contract.client) + "</h1><div>" + escapeHtml(evidence.contract.folio) + " - " + escapeHtml(evidence.contract.name) + "</div></div>"
    + "<div class='hero-meta'><b>Corte:</b> " + escapeHtml(evidence.cut.folio) + "<br><b>Estado:</b> " + escapeHtml(evidence.cut.state) + "<br><b>Periodo:</b> " + escapeHtml(evidence.period.start) + " a " + escapeHtml(evidence.period.end) + "<br><b>Factura:</b> " + escapeHtml(evidence.cut.invoice || "Pendiente") + "<br><b>Aprobacion:</b> " + escapeHtml(evidence.cut.approvedAt ? dateTime(evidence.cut.approvedAt) + (evidence.cut.approvedById ? " / usuario #" + evidence.cut.approvedById : "") : "Pendiente") + "</div></div></div>"
    + "<div class='formula'><div class='metric'><span>Monto base</span><b>" + money(evidence.totals.base,currency) + "</b></div><div class='metric'><span>Servicios extra</span><b>" + money(evidence.totals.extras,currency) + "</b></div><div class='metric'><span>Total calculado</span><b>" + money(evidence.totals.calculated,currency) + "</b></div><div class='metric'><span>Total aprobado/guardado</span><b>" + money(evidence.totals.official,currency) + "</b></div><div class='metric'><span>Cobrado</span><b>" + money(evidence.totals.paid,currency) + "</b></div><div class='metric'><span>Saldo</span><b>" + money(evidence.totals.balance,currency) + "</b></div></div>"
    + "<div class='section'><h2>1. Resumen contractual por servicio</h2><table><thead><tr><th style='width:27%'>Servicio y regla</th><th>Incluido</th><th>Consumido</th><th>Excedente</th><th>Tarifa extra</th><th>Importe extra</th></tr></thead><tbody>" + ruleRows + "</tbody></table></div>"
    + "<div class='section'><h2>2. Operaciones que generaron excedente</h2><table><thead><tr><th style='width:12%'>ID / referencia</th><th style='width:9%'>Servicio / estado</th><th style='width:9%'>Solicitante</th><th>Solicitud</th><th>Inicio</th><th>Fin</th><th style='width:13%'>Via origen -> destino</th><th>Cantidad</th><th>Fuera de rango</th><th>Tarifa</th><th>Importe</th></tr></thead><tbody>" + detailRows + "</tbody></table></div>"
    + "<div class='section method'><b>Metodo de determinacion:</b> las operaciones cobrables se ordenan por fecha de solicitud. Cada una consume primero la cantidad incluida del contrato. La porcion que rebasa el limite se identifica como excedente; su importe es cantidad excedente por tarifa unitaria. Si falta una tarifa o el monto base, el total permanece pendiente y el documento lo indica expresamente.<br><b>Generado:</b> " + dateTime(evidence.generatedAt) + ". Este documento conserva los identificadores operativos necesarios para conciliacion y aclaraciones." + (evidence.cut.updatedAt ? "<br><b>Ultima edicion del corte:</b> " + dateTime(evidence.cut.updatedAt) + (evidence.cut.updatedById ? " por usuario #" + evidence.cut.updatedById : "") + "." : "") + "</div></body></html>";
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const buffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div style='font-size:8px;color:#64748b;width:100%;padding:0 10mm;text-align:right'>COSAIF Comercial - Evidencia auditable</div>",
      footerTemplate: "<div style='font-size:8px;color:#64748b;width:100%;padding:0 10mm;display:flex;justify-content:space-between'><span>" + escapeHtml(evidence.cut.folio) + "</span><span>Pagina <span class='pageNumber'></span> de <span class='totalPages'></span></span></div>",
      margin: { top: "14mm", right: "10mm", bottom: "16mm", left: "10mm" },
    });
    return {
      filename: safeFilename("COSAIF_Corte_" + evidence.contract.folio + "_" + evidence.period.start + "_" + evidence.period.end + ".pdf"),
      contentType: "application/pdf" as const,
      buffer: Buffer.from(buffer),
    };
  } finally {
    await page.close();
  }
}

function evidenceContractKind(evidence: CommercialCutEvidence) {
  const kinds = new Set(evidence.rules.map((rule) => {
    if (rule.serviceLabel === "Naturales") return "Movimiento natural";
    if (rule.serviceLabel === "Arrastre") return "Arrastre Torreón";
    if (rule.serviceLabel === "Torno") return "Torneado";
    return rule.serviceLabel;
  }));
  if (!kinds.size) return "Sin clasificación";
  if (kinds.size > 1) return "Contrato mixto";
  return [...kinds][0];
}

function generalCss() {
  return css()
    + ".general-hero{background:linear-gradient(135deg,#0b1f33,#0f4c5c 55%,#0f766e)}"
    + ".scope{margin-top:9px;color:#d1fae5;font-size:10px;font-weight:700}"
    + ".general-formula{grid-template-columns:repeat(6,1fr)}"
    + ".group-title{display:flex;align-items:center;justify-content:space-between;margin:15px 0 7px;padding-bottom:6px;border-bottom:2px solid #0f766e}"
    + ".group-title h2{margin:0;font-size:15px}.group-title span{font-size:9px;font-weight:900;color:#475569;text-transform:uppercase}"
    + ".audit-card{margin-top:12px;padding:10px;border:1px solid #dbe5e1;border-radius:10px;break-inside:avoid}"
    + ".audit-card h3{margin:0 0 3px;font-size:12px}.audit-card p{margin:0 0 7px;color:#64748b;font-size:8.5px}"
    + ".page-break{break-before:page}.muted{color:#64748b}";
}

export async function renderCommercialGeneralCutPdf(evidences: CommercialCutEvidence[], options?: { months?: string[]; scope?: string }) {
  if (!evidences.length) throw new Error("No hay contratos y meses para generar el Corte general");
  const ordered = [...evidences].sort((left, right) =>
    evidenceContractKind(left).localeCompare(evidenceContractKind(right))
    || left.contract.client.localeCompare(right.contract.client)
    || left.contract.folio.localeCompare(right.contract.folio)
    || left.period.start.localeCompare(right.period.start));
  const currencies = new Set(ordered.map((evidence) => evidence.contract.currency));
  const currency = currencies.size === 1 ? ordered[0].contract.currency : "MXN";
  const amount = (value: number | null) => currencies.size === 1
    ? money(value, currency)
    : value == null ? "Pendiente" : new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(value) + " (moneda del contrato)";
  const totals = ordered.reduce((summary, evidence) => ({
    consumed: summary.consumed + evidence.rules.reduce((sum, rule) => sum + rule.consumed, 0),
    excess: summary.excess + evidence.rules.reduce((sum, rule) => sum + rule.excess, 0),
    extras: summary.extras + evidence.totals.extras,
    calculated: summary.calculated + Number(evidence.totals.calculated || 0),
    pending: summary.pending + (evidence.totals.calculated == null ? 1 : 0),
    operations: summary.operations + evidence.excessRows.length,
  }), { consumed: 0, excess: 0, extras: 0, calculated: 0, pending: 0, operations: 0 });
  const monthKeys = [...new Set(options?.months?.length ? options.months : ordered.map((evidence) => evidence.period.start.slice(0, 7)))].sort();
  const contractCount = new Set(ordered.map((evidence) => evidence.contract.id)).size;
  const groups = new Map<string, CommercialCutEvidence[]>();
  for (const evidence of ordered) {
    const kind = evidenceContractKind(evidence);
    groups.set(kind, [...(groups.get(kind) || []), evidence]);
  }
  const groupHtml = [...groups.entries()].map(([kind, rows]) => {
    const tableRows = rows.map((evidence) => {
      const includedRules = evidence.rules.filter((rule) => rule.included != null);
      const included = includedRules.length ? includedRules.reduce((sum, rule) => sum + Number(rule.included || 0), 0) : null;
      const consumed = evidence.rules.reduce((sum, rule) => sum + rule.consumed, 0);
      const excess = evidence.rules.reduce((sum, rule) => sum + rule.excess, 0);
      return "<tr><td><b>" + escapeHtml(evidence.contract.client) + "</b><br><span class='muted'>" + escapeHtml(evidence.contract.folio + " · " + evidence.contract.name) + "</span></td>"
        + "<td>" + escapeHtml(evidence.period.label) + "<br><span class='muted'>" + escapeHtml(evidence.period.start + " a " + evidence.period.end) + "</span></td>"
        + "<td class='right'>" + (included == null ? "Sin límite" : included) + "</td><td class='right'>" + consumed + "</td>"
        + "<td class='right " + (excess ? "warning" : "ok") + "'>" + excess + "</td><td class='right'>" + amount(evidence.totals.extras) + "</td>"
        + "<td class='right'>" + amount(evidence.totals.calculated) + "</td><td>" + escapeHtml(evidence.cut.state) + "<br><span class='muted'>" + escapeHtml(evidence.cut.folio) + "</span></td></tr>";
    }).join("");
    return "<section class='section'><div class='group-title'><h2>" + escapeHtml(kind) + "</h2><span>" + rows.length + " contrato-mes</span></div>"
      + "<table><thead><tr><th style='width:23%'>Cliente / contrato</th><th style='width:15%'>Mes del corte</th><th class='right'>Incluido</th><th class='right'>Consumido</th><th class='right'>Excedente</th><th class='right'>Importe extra</th><th class='right'>Total calculado</th><th>Estado / folio</th></tr></thead><tbody>" + tableRows + "</tbody></table></section>";
  }).join("");
  const audits = ordered.filter((evidence) => evidence.excessRows.length).map((evidence) => {
    const rows = evidence.excessRows.map((row) => "<tr><td><b>" + escapeHtml(row.movementId) + "</b><br>" + escapeHtml(row.reference) + "</td>"
      + "<td>" + escapeHtml(row.serviceLabel) + "</td><td>" + escapeHtml(row.requester) + "</td><td>" + dateTime(row.requestedAt) + "</td>"
      + "<td>" + dateTime(row.completedAt) + "</td><td>" + escapeHtml((row.fromTrack || "-") + " -> " + (row.toTrack || "-")) + "</td>"
      + "<td class='right warning'>" + row.excessQuantity + "</td><td class='right'>" + money(row.unitRate, evidence.contract.currency) + "</td><td class='right'>" + money(row.amount, evidence.contract.currency) + "</td></tr>").join("");
    return "<div class='audit-card'><h3>" + escapeHtml(evidence.contract.client + " · " + evidence.contract.folio + " · " + evidence.period.label) + "</h3>"
      + "<p>" + escapeHtml(evidence.cut.folio + " · " + evidence.period.start + " a " + evidence.period.end) + "</p>"
      + "<table><thead><tr><th style='width:18%'>ID / referencia</th><th>Servicio</th><th>Solicitante</th><th>Solicitud</th><th>Fin</th><th style='width:16%'>Vía origen -> destino</th><th class='right'>Fuera rango</th><th class='right'>Tarifa</th><th class='right'>Importe</th></tr></thead><tbody>" + rows + "</tbody></table></div>";
  }).join("");
  const periodLabel = monthKeys.length === 1 ? monthKeys[0] : monthKeys[0] + " a " + monthKeys[monthKeys.length - 1];
  const html = "<!doctype html><html><head><meta charset='utf-8'><style>" + generalCss() + "</style></head><body>"
    + "<div class='hero general-hero'><div class='hero-grid'><div><span class='tag'>Corte general</span><h1>Concentrado contractual multi-mes</h1><div class='scope'>" + escapeHtml(options?.scope || "Todos los contratos seleccionados") + "</div></div>"
    + "<div class='hero-meta'><b>Meses:</b> " + escapeHtml(monthKeys.join(", ")) + "<br><b>Contratos:</b> " + contractCount + "<br><b>Renglones contrato-mes:</b> " + ordered.length + "<br><b>Generado:</b> " + dateTime(new Date().toISOString()) + "</div></div></div>"
    + "<div class='formula general-formula'><div class='metric'><span>Contratos</span><b>" + contractCount + "</b></div><div class='metric'><span>Consumo contractual</span><b>" + totals.consumed + "</b></div><div class='metric'><span>Excedentes</span><b>" + totals.excess + "</b></div><div class='metric'><span>Importe extra</span><b>" + amount(totals.extras) + "</b></div><div class='metric'><span>Total calculado</span><b>" + amount(totals.calculated) + "</b></div><div class='metric'><span>Por completar</span><b>" + totals.pending + "</b></div></div>"
    + "<div class='section method'><b>Lectura del reporte:</b> cada renglón representa un contrato dentro de un mes específico. El excedente es únicamente la cantidad que rebasa lo incluido en la regla contractual; no se infieren cargos cuando el consumo permanece dentro del límite.</div>"
    + groupHtml
    + "<section class='section page-break'><div class='group-title'><h2>Evidencia exacta de excedentes</h2><span>" + totals.operations + " operaciones</span></div>"
    + (audits || "<div class='empty'>En los meses seleccionados no existen operaciones fuera del límite contractual. El resultado cero fue validado contra las reglas y el consumo de cada contrato.</div>") + "</section>"
    + "<div class='section method'><b>Método auditable:</b> las operaciones se ordenan por fecha de solicitud; primero consumen la cantidad incluida y solamente la porción posterior se reporta como excedente. Las tablas de evidencia conservan ID, solicitante, fechas, vías, tarifa e importe.</div></body></html>";
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const buffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div style='font-size:8px;color:#64748b;width:100%;padding:0 10mm;text-align:right'>COSAIF Comercial · Corte general</div>",
      footerTemplate: "<div style='font-size:8px;color:#64748b;width:100%;padding:0 10mm;display:flex;justify-content:space-between'><span>" + escapeHtml(periodLabel) + "</span><span>Página <span class='pageNumber'></span> de <span class='totalPages'></span></span></div>",
      margin: { top: "14mm", right: "10mm", bottom: "16mm", left: "10mm" },
    });
    return {
      filename: safeFilename("COSAIF_Corte_General_" + monthKeys[0] + "_a_" + monthKeys[monthKeys.length - 1] + ".pdf"),
      contentType: "application/pdf" as const,
      buffer: Buffer.from(buffer),
    };
  } finally {
    await page.close();
  }
}
