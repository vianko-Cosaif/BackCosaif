import ExcelJS from "exceljs";
import type { CommercialOperation } from "./comercial-crm-analytics";
import { buildCommercialCutEvidence, type CommercialCutEvidence } from "./comercial-cut-evidence";
import { addNativeColumnChartData, injectNativeExcelCharts, type NativeExcelChartSpec } from "./native-excel-charts";

type Analytics = {
  meta: { reference: string; range: { from: string; toExclusive: string }; torreonAvailable: boolean; periodLabel?: string; months?: number; selectedMonthKeys?: string[] };
  kpis: Record<string, number>;
  trend: Array<Record<string, string | number>>;
  clients: Array<Record<string, string | number>>;
  yards: Array<Record<string, string | number>>;
  currentBreakdown: Array<Record<string, string | number>>;
  contractBreakdown: Array<{
    empresaId: number;
    localidadId: number;
    origin: "NATURAL" | "ARRASTRE";
    service: "MOVIMIENTO" | "LAVADO" | "TORNEADO";
    status: string;
    count: number;
    wagons: number;
    incidents: number;
  }>;
  operations: { data: CommercialOperation[]; meta: { total: number } };
  catalogs: { localities: Array<{ id: number; nombre: string }> };
};

type CrmData = {
  available: boolean;
  clients: any[];
  contracts: any[];
  packages: any[];
  cuts: any[];
  collection: Record<string, number> | null;
};

export type CrmExcelTemplate = "DIRECCION" | "CONTRATO" | "COBRANZA" | "COMPLETO";
export type CrmExcelSection = "RESUMEN" | "NATURAL" | "ARRASTRE" | "TENDENCIA" | "PATIOS" | "CLIENTES" | "CONTRATOS" | "PAQUETES" | "COBRANZA" | "FINANZAS" | "EXCEDENTES" | "PAGOS" | "HISTORIAL" | "OPERACIONES" | "GUIA";
export type CrmExcelOperationColumn = "FUENTE" | "TIPO" | "REFERENCIA" | "CLIENTE" | "PATIO" | "LOCOMOTORA" | "VAGONES" | "SERVICIOS" | "ESTADO" | "SOLICITUD" | "FINALIZACION" | "INCIDENTES";

const DEFAULT_OPERATION_COLUMNS: CrmExcelOperationColumn[] = ["FUENTE", "TIPO", "REFERENCIA", "CLIENTE", "PATIO", "LOCOMOTORA", "VAGONES", "SERVICIOS", "ESTADO", "SOLICITUD", "FINALIZACION", "INCIDENTES"];
const DEFAULT_BILLABLE_STATUSES = ["CONCLUIDO", "CANCELADO", "DETENIDO", "EN_PROCESO"];

const TEMPLATE_SECTIONS: Record<CrmExcelTemplate, CrmExcelSection[]> = {
  DIRECCION: ["RESUMEN", "NATURAL", "ARRASTRE", "TENDENCIA", "PATIOS", "CLIENTES", "GUIA"],
  CONTRATO: ["RESUMEN", "NATURAL", "ARRASTRE", "CONTRATOS", "PAQUETES", "FINANZAS", "EXCEDENTES", "HISTORIAL", "OPERACIONES", "GUIA"],
  COBRANZA: ["RESUMEN", "NATURAL", "ARRASTRE", "CLIENTES", "PAQUETES", "COBRANZA", "FINANZAS", "EXCEDENTES", "PAGOS", "HISTORIAL", "OPERACIONES", "GUIA"],
  COMPLETO: ["RESUMEN", "NATURAL", "ARRASTRE", "TENDENCIA", "PATIOS", "CLIENTES", "CONTRATOS", "PAQUETES", "COBRANZA", "FINANZAS", "EXCEDENTES", "PAGOS", "HISTORIAL", "OPERACIONES", "GUIA"],
};

const COLORS = {
  navy: "FF0F172A",
  slate: "FF334155",
  emerald: "FF047857",
  green: "FF059669",
  blue: "FF2563EB",
  cyan: "FF0891B2",
  amber: "FFD97706",
  rose: "FFE11D48",
  white: "FFFFFFFF",
  soft: "FFF8FAFC",
  line: "FFE2E8F0",
  muted: "FF64748B",
};

function text(value: unknown) {
  return value == null ? "" : String(value);
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function excelDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

type ReportScope = { localidadId?: number; origin?: "NATURAL" | "ARRASTRE" };
type ReportEvidenceEntry = { monthKey: string; monthLabel: string; contract: any; cut: any | null; evidence: CommercialCutEvidence };

function reportMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function monthRange(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const start = `${monthKey}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start, end };
}

function overlapsMonth(from: unknown, to: unknown, monthKey: string) {
  const { start, end } = monthRange(monthKey);
  const startsAt = Date.parse(String(from));
  const endsAt = to ? Date.parse(String(to)) + 86_400_000 : Number.POSITIVE_INFINITY;
  return Number.isFinite(startsAt) && startsAt < Date.parse(`${end}T23:59:59.999Z`) + 1 && endsAt >= Date.parse(start);
}

function analyticsMonthKeys(analytics: Analytics) {
  if (analytics.meta.selectedMonthKeys?.length) return [...analytics.meta.selectedMonthKeys].sort();
  const keys: string[] = [];
  const start = new Date(analytics.meta.range.from);
  const end = new Date(analytics.meta.range.toExclusive);
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth() + 1;
  while (Date.UTC(year, month - 1, 1) < end.getTime() && keys.length < 24) {
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) { year += 1; month = 1; }
  }
  return keys.length ? keys : [analytics.meta.reference.slice(0, 7)];
}

function buildReportEvidence(crm: CrmData, analytics: Analytics, scope: ReportScope): ReportEvidenceEntry[] {
  const entries: ReportEvidenceEntry[] = [];
  for (const monthKey of analyticsMonthKeys(analytics)) {
    const range = monthRange(monthKey);
    for (const contract of crm.contracts) {
      if (!contract?.cliente?.empresaId || !overlapsMonth(contract.fechaInicio, contract.fechaFin, monthKey)) continue;
      const cut = crm.cuts.find((item) => Number(item.contratoId) === Number(contract.id) && overlapsMonth(item.periodoInicio, item.periodoFin, monthKey)) || null;
      entries.push({
        monthKey,
        monthLabel: reportMonthLabel(monthKey),
        contract,
        cut,
        evidence: buildCommercialCutEvidence({
          contract,
          operations: analytics.operations.data,
          periodStart: range.start,
          periodEnd: range.end,
          periodLabel: reportMonthLabel(monthKey),
          selectedMonths: 1,
          localityId: scope.localidadId,
          origin: scope.origin,
          cut,
        }),
      });
    }
  }
  return entries;
}

function workflowProgress(state: string) {
  const rank = state === "PAGADO" ? 4 : ["FACTURADO", "PARCIAL", "VENCIDO"].includes(state) ? 3 : state === "APROBADO" ? 2 : state === "EN_REVISION" ? 1 : 0;
  return `${rank} de 4`;
}

function economicStatus(total: unknown) {
  return total == null || total === "" ? "OPCIONAL / NO CAPTURADO" : "CAPTURADO";
}

function historyChangesText(changes: unknown) {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return "Sin detalle adicional";
  const parts: string[] = [];
  for (const [field, raw] of Object.entries(changes as Record<string, unknown>)) {
    if (field === "pago" && raw && typeof raw === "object") {
      const payment = raw as Record<string, unknown>;
      parts.push(`Pago ${number(payment.monto).toFixed(2)}${payment.referencia ? ` · ref. ${text(payment.referencia)}` : ""}`);
      continue;
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const change = raw as Record<string, unknown>;
    if (!("anterior" in change) && !("nuevo" in change)) continue;
    parts.push(`${field}: ${text(change.anterior) || "Sin dato"} → ${text(change.nuevo) || "Sin dato"}`);
  }
  return parts.join(" | ") || "Sin detalle adicional";
}

function setSheetDefaults(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ state: "frozen", ySplit: 1, showGridLines: false }];
  sheet.properties.defaultRowHeight = 20;
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
  sheet.headerFooter.oddFooter = "COSAIF Comercial · Confidencial · Página &P de &N";
}

function styleTitle(sheet: ExcelJS.Worksheet, title: string, subtitle: string, lastColumn: number) {
  sheet.mergeCells(1, 1, 2, lastColumn);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: "Aptos Display", size: 22, bold: true, color: { argb: COLORS.white } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  titleCell.border = { bottom: { style: "thick", color: { argb: COLORS.emerald } } };
  sheet.getRow(1).height = 28;
  sheet.getRow(2).height = 20;
  sheet.mergeCells(3, 1, 3, lastColumn);
  const subtitleCell = sheet.getCell(3, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { name: "Aptos", size: 10, color: { argb: COLORS.muted }, italic: true };
  subtitleCell.alignment = { vertical: "middle" };
  sheet.getRow(3).height = 24;
}

function styleTable(sheet: ExcelJS.Worksheet, headerRow = 1) {
  const row = sheet.getRow(headerRow);
  row.height = 28;
  row.eachCell((cell) => {
    cell.font = { name: "Aptos", bold: true, size: 10, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.slate } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = { bottom: { style: "medium", color: { argb: COLORS.emerald } } };
  });
  sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: Math.max(1, sheet.columnCount) } };
  sheet.views = [{ state: "frozen", ySplit: headerRow, showGridLines: false }];
  for (let rowNumber = headerRow + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const dataRow = sheet.getRow(rowNumber);
    if (rowNumber % 2 === 0) dataRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.soft } };
    dataRow.eachCell((cell) => {
      cell.font = { name: "Aptos", size: 10, color: { argb: COLORS.navy } };
      cell.alignment = { vertical: "middle" };
      cell.border = { bottom: { style: "hair", color: { argb: COLORS.line } } };
    });
  }
}

function addDataSheet(workbook: ExcelJS.Workbook, name: string, columns: Array<{ header: string; key: string; width?: number; format?: string }>, rows: Record<string, unknown>[]) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  setSheetDefaults(sheet);
  sheet.columns = columns.map((column) => ({ header: column.header, key: column.key, width: column.width ?? 16, style: column.format ? { numFmt: column.format } : undefined }));
  for (const item of rows) sheet.addRow(item);
  styleTable(sheet);
  return sheet;
}

function addNoDataPanel(sheet: ExcelJS.Worksheet, heading: string, detail: string) {
  sheet.mergeCells("A5:L6");
  const headingCell = sheet.getCell("A5");
  headingCell.value = heading;
  headingCell.font = { name: "Aptos Display", size: 18, bold: true, color: { argb: COLORS.slate } };
  headingCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.soft } };
  headingCell.alignment = { vertical: "middle", horizontal: "center" };
  headingCell.border = {
    left: { style: "medium", color: { argb: COLORS.amber } },
    top: { style: "thin", color: { argb: COLORS.line } },
    right: { style: "thin", color: { argb: COLORS.line } },
    bottom: { style: "thin", color: { argb: COLORS.line } },
  };
  sheet.mergeCells("A8:L11");
  const detailCell = sheet.getCell("A8");
  detailCell.value = detail;
  detailCell.font = { name: "Aptos", size: 12, color: { argb: COLORS.muted } };
  detailCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  sheet.mergeCells("A13:L13");
  const noteCell = sheet.getCell("A13");
  noteCell.value = "La hoja se conserva porque fue incluida en la configuración del reporte.";
  noteCell.font = { name: "Aptos", size: 10, italic: true, color: { argb: COLORS.muted } };
  noteCell.alignment = { horizontal: "center" };
  sheet.getRow(5).height = 28;
  sheet.getRow(6).height = 28;
  for (let row = 8; row <= 11; row += 1) sheet.getRow(row).height = 24;
}

function addNoDataSheet(workbook: ExcelJS.Workbook, name: string, periodLabel: string, heading: string, detail: string) {
  const sheet = workbook.addWorksheet(name, { properties: { tabColor: { argb: COLORS.amber } } });
  setSheetDefaults(sheet);
  for (let column = 1; column <= 12; column += 1) sheet.getColumn(column).width = 13;
  styleTitle(sheet, name, `Alcance solicitado: ${periodLabel}`, 12);
  addNoDataPanel(sheet, heading, detail);
  return sheet;
}

function operationalNoDataDetail() {
  return "No hay datos disponibles para el periodo, cliente, patio y tipo de operación seleccionados.";
}

function crmNoDataDetail(subject: string, available: boolean) {
  return available
    ? `No hay ${subject} registrados que coincidan con el cliente, patio, tipo de operación y periodo seleccionados.`
    : "La fuente comercial no está disponible. Verifique que msComercial esté activo y configurado antes de consultar esta sección.";
}

function addKpi(sheet: ExcelJS.Worksheet, range: string, label: string, value: string | number, color: string) {
  sheet.mergeCells(range);
  const topLeft = range.split(":")[0];
  const cell = sheet.getCell(topLeft);
  cell.value = { richText: [
    { text: `${label.toUpperCase()}\n`, font: { name: "Aptos", size: 9, bold: true, color: { argb: COLORS.muted } } },
    { text: text(value), font: { name: "Aptos Display", size: 20, bold: true, color: { argb: color } } },
  ] };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.soft } };
  cell.alignment = { vertical: "middle", wrapText: true };
  cell.border = {
    left: { style: "medium", color: { argb: color } },
    top: { style: "thin", color: { argb: COLORS.line } },
    right: { style: "thin", color: { argb: COLORS.line } },
    bottom: { style: "thin", color: { argb: COLORS.line } },
  };
}

function originExecutiveStats(analytics: Analytics, origin: "NATURAL" | "ARRASTRE") {
  const rows = analytics.contractBreakdown.filter((item) => item.origin === origin && item.service === "MOVIMIENTO");
  const total = rows.reduce((sum, item) => sum + number(item.count), 0);
  const completed = rows.filter((item) => item.status === "CONCLUIDO").reduce((sum, item) => sum + number(item.count), 0);
  const cancelled = rows.filter((item) => item.status === "CANCELADO").reduce((sum, item) => sum + number(item.count), 0);
  const stopped = rows.filter((item) => item.status === "DETENIDO").reduce((sum, item) => sum + number(item.count), 0);
  const incidents = rows.reduce((sum, item) => sum + number(item.incidents), 0);
  const volumeKey = origin === "NATURAL" ? "natural" : "arrastre";
  const clients = analytics.clients.map((item) => ({ name: text(item.name), volume: number(item[volumeKey]) })).filter((item) => item.volume > 0).sort((a, b) => b.volume - a.volume);
  const yards = analytics.yards.map((item) => ({ name: text(item.name), volume: number(item[volumeKey]) })).filter((item) => item.volume > 0).sort((a, b) => b.volume - a.volume);
  return {
    total,
    completed,
    cancelled,
    stopped,
    incidents,
    completionRate: total ? completed / total : 0,
    cancellationRate: total ? cancelled / total : 0,
    clients,
    yards,
  };
}

function trendCategories(trend: Analytics["trend"]) {
  return trend.map((item) => text(item.label || item.key));
}

function summaryChartSeries(trend: Analytics["trend"], includeArrastre: boolean) {
  return [
    { key: "natural", name: "Natural", color: COLORS.green },
    ...(includeArrastre ? [{ key: "arrastre", name: "Arrastre", color: COLORS.blue }] : []),
    { key: "wash", name: "Lavado", color: COLORS.cyan },
    { key: "turning", name: "Torneado", color: COLORS.amber },
  ].map((entry) => ({ name: entry.name, color: entry.color, values: trend.map((item) => number(item[entry.key])) }));
}

function originChartSeries(trend: Analytics["trend"], origin: "NATURAL" | "ARRASTRE") {
  const series = origin === "NATURAL"
    ? [
      { key: "natural", name: "Movimientos naturales", color: COLORS.green },
      { key: "wash", name: "Lavados", color: COLORS.cyan },
      { key: "turning", name: "Torneados", color: COLORS.amber },
    ]
    : [
      { key: "arrastre", name: "Solicitudes de arrastre", color: COLORS.blue },
      { key: "wagons", name: "Vagones", color: "FF7C3AED" },
    ];
  return series.map((entry) => ({ name: entry.name, color: entry.color, values: trend.map((item) => number(item[entry.key])) }));
}

function addOriginExecutiveSheet(workbook: ExcelJS.Workbook, analytics: Analytics, origin: "NATURAL" | "ARRASTRE") {
  const natural = origin === "NATURAL";
  const title = natural ? "Naturales" : "Arrastre";
  const accent = natural ? COLORS.emerald : COLORS.blue;
  const stats = originExecutiveStats(analytics, origin);
  const sheet = workbook.addWorksheet(title, { properties: { tabColor: { argb: accent } } });
  setSheetDefaults(sheet);
  for (let column = 1; column <= 12; column += 1) sheet.getColumn(column).width = 13;
  styleTitle(sheet, title, `${analytics.meta.periodLabel || analytics.meta.reference} · Unidad de negocio independiente`, 12);
  if (!stats.total) {
    addNoDataPanel(sheet, `Sin información de ${natural ? "Naturales" : "Arrastre"}`, operationalNoDataDetail());
    return [];
  }
  addKpi(sheet, "A5:C8", natural ? "Movimientos naturales" : "Solicitudes de arrastre", stats.total, accent);
  addKpi(sheet, "D5:F8", "Concluidos", stats.completed, COLORS.green);
  addKpi(sheet, "G5:I8", "Cancelados", stats.cancelled, stats.cancelled ? COLORS.rose : COLORS.green);
  addKpi(sheet, "J5:L8", "Cumplimiento", `${(stats.completionRate * 100).toFixed(1)}%`, stats.completionRate >= 0.9 ? COLORS.green : COLORS.amber);
  addKpi(sheet, "A10:C13", natural ? "Lavados concluidos" : "Vagones movilizados", natural ? number(analytics.kpis.wash) : number(analytics.kpis.wagons), natural ? COLORS.cyan : "FF7C3AED");
  addKpi(sheet, "D10:F13", natural ? "Torneados concluidos" : "Vagones por arrastre", natural ? number(analytics.kpis.turning) : stats.total ? (number(analytics.kpis.wagons) / stats.total).toFixed(1) : "0", COLORS.amber);
  addKpi(sheet, "G10:I13", "Incidentes", stats.incidents, stats.incidents ? COLORS.rose : COLORS.green);
  addKpi(sheet, "J10:L13", "Detenidos", stats.stopped, stats.stopped ? COLORS.amber : COLORS.green);
  sheet.mergeCells("A15:L15");
  const insight = sheet.getCell("A15");
  const topClient = stats.clients[0];
  insight.value = stats.total
    ? `${stats.completionRate >= 0.9 ? "OPERACIÓN CONTROLADA" : "REQUIERE ATENCIÓN"} · ${topClient ? `${topClient.name} concentra ${(topClient.volume / stats.total * 100).toFixed(1)}% del volumen` : "Sin concentración de cliente"} · Cancelación ${(stats.cancellationRate * 100).toFixed(1)}%`
    : "Sin operaciones registradas para este segmento y periodo.";
  insight.font = { bold: true, size: 11, color: { argb: COLORS.white } };
  insight.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stats.completionRate >= 0.9 ? COLORS.emerald : COLORS.amber } };
  insight.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(15).height = 28;
  const charts: NativeExcelChartSpec[] = [];
  const chart = addNativeColumnChartData(sheet, {
    title: natural ? "Evolución de Naturales, Lavado y Torneado" : "Evolución de Arrastre y Vagones",
    categories: trendCategories(analytics.trend),
    series: originChartSeries(analytics.trend, origin),
    startColumn: 14,
    startRow: 17,
    anchor: { fromCol: 0, fromRow: 16, toCol: 12, toRow: 35 },
  });
  if (chart) charts.push(chart);
  for (let row = 17; row <= 35; row += 1) sheet.getRow(row).height = 18;

  sheet.mergeCells("A38:F38");
  sheet.getCell("A38").value = natural ? "CLIENTES DE NATURALES" : "CLIENTES DE ARRASTRE";
  sheet.mergeCells("G38:L38");
  sheet.getCell("G38").value = "DISTRIBUCIÓN POR PATIO";
  for (const cell of [sheet.getCell("A38"), sheet.getCell("G38")]) {
    cell.font = { bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: accent } };
    cell.alignment = { horizontal: "center" };
  }
  const headers = [["A39", "Cliente"], ["D39", "Volumen"], ["F39", "% segmento"], ["G39", "Patio"], ["J39", "Volumen"], ["L39", "% segmento"]] as const;
  for (const [address, value] of headers) {
    const cell = sheet.getCell(address);
    cell.value = value;
    cell.font = { bold: true, color: { argb: COLORS.navy } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.soft } };
  }
  stats.clients.slice(0, 6).forEach((item, index) => {
    const row = 40 + index;
    sheet.mergeCells(`A${row}:C${row}`); sheet.getCell(`A${row}`).value = item.name;
    sheet.mergeCells(`D${row}:E${row}`); sheet.getCell(`D${row}`).value = item.volume;
    sheet.getCell(`F${row}`).value = stats.total ? item.volume / stats.total : 0; sheet.getCell(`F${row}`).numFmt = "0.0%";
  });
  stats.yards.slice(0, 6).forEach((item, index) => {
    const row = 40 + index;
    sheet.mergeCells(`G${row}:I${row}`); sheet.getCell(`G${row}`).value = item.name;
    sheet.mergeCells(`J${row}:K${row}`); sheet.getCell(`J${row}`).value = item.volume;
    sheet.getCell(`L${row}`).value = stats.total ? item.volume / stats.total : 0; sheet.getCell(`L${row}`).numFmt = "0.0%";
  });
  for (let row = 39; row <= 45; row += 1) sheet.getRow(row).height = 22;
  return charts;
}

function packageUsage(item: any, analytics: Analytics) {
  const empresaId = item.cliente?.empresaId;
  const includedStatuses = Array.isArray(item.estadosIncluidos) && item.estadosIncluidos.length
    ? item.estadosIncluidos.map(String)
    : DEFAULT_BILLABLE_STATUSES;
  const rows = analytics.contractBreakdown.filter((row) =>
    number(row.empresaId) === number(empresaId)
    && (!item.localidadId || number(row.localidadId) === number(item.localidadId))
    && (!item.origenOperacion || row.origin === item.origenOperacion)
    && row.service === item.servicio
    && includedStatuses.includes(row.status),
  );
  const used = item.unidad === "VAGON"
    ? rows.reduce((sum, row) => sum + number(row.wagons), 0)
    : rows.reduce((sum, row) => sum + number(row.count), 0);
  const from = new Date(analytics.meta.range.from);
  const to = new Date(analytics.meta.range.toExclusive);
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
  const calendarMonths = Math.max(1, (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + to.getUTCMonth() - from.getUTCMonth());
  const multiplier = item.periodicidad === "SEMANAL"
    ? Math.ceil(days / 7)
    : item.periodicidad === "MENSUAL"
      ? calendarMonths
      : item.periodicidad === "BIMESTRAL"
        ? Math.max(1, Math.ceil(calendarMonths / 2))
        : item.periodicidad === "SEMESTRAL"
          ? Math.max(1, Math.ceil(calendarMonths / 6))
          : item.periodicidad === "ANUAL"
            ? Math.max(1, Math.ceil(calendarMonths / 12))
            : 1;
  const limit = item.cantidadIncluida == null ? null : number(item.cantidadIncluida) * multiplier;
  const percent = limit ? Math.round(used / limit * 1000) / 10 : null;
  return { used, limit, percent, excess: limit == null ? null : Math.max(0, used - limit) };
}

function contractRules(crm: CrmData) {
  const fromContracts = crm.contracts.flatMap((contract) => {
    const rules = Array.isArray(contract.paquetes) ? contract.paquetes : [];
    return rules.map((rule: any) => ({
      ...rule,
      cliente: contract.cliente,
      contrato: { id: contract.id, folio: contract.folio, nombre: contract.nombre, estado: contract.estado },
      contratoMonto: contract.montoMaximo,
      diaCorte: contract.diaCorte,
    }));
  });
  const seen = new Set(fromContracts.map((item: any) => Number(item.id)));
  const fallback = crm.packages.filter((item) => !seen.has(Number(item.id)));
  return [...fromContracts, ...fallback];
}

function primaryRule(contract: any) {
  return Array.isArray(contract?.paquetes) ? contract.paquetes[0] : undefined;
}

function billableStatuses(rule: any) {
  return Array.isArray(rule?.estadosIncluidos) && rule.estadosIncluidos.length ? rule.estadosIncluidos.map(String) as string[] : DEFAULT_BILLABLE_STATUSES;
}

function contractRuleSummary(rule: any) {
  if (!rule) return "Sin regla automática";
  const quantity = rule.unidad === "TARIFA_FIJA"
    ? "Cuota fija"
    : rule.cantidadIncluida != null
      ? `${number(rule.cantidadIncluida)} ${rule.unidad === "VAGON" ? "vagones" : rule.unidad === "SERVICIO" ? "servicios" : "movimientos"}`
      : text(rule.unidad);
  return `${quantity} · ${text(rule.periodicidad)} · ${billableStatuses(rule).join(", ")}`;
}

function cutLabel(day: unknown) {
  return !day || number(day) === 31 ? "Fin de mes" : `Día ${number(day)}`;
}

function clampDate(value: string, boundary: string, mode: "min" | "max") {
  const raw = Date.parse(value);
  const limit = Date.parse(boundary);
  const time = mode === "max" ? Math.max(raw, limit) : Math.min(raw, limit);
  return new Date(time).toISOString().slice(0, 10);
}

function movementSummary(rule: any, contract: any, empresaId: number, analytics: Analytics) {
  const statuses = billableStatuses(rule);
  const service = rule?.servicio || "MOVIMIENTO";
  const rows = analytics.contractBreakdown.filter((row) =>
    number(row.empresaId) === number(empresaId)
    && row.service === service
    && (!rule?.localidadId || number(row.localidadId) === number(rule.localidadId))
    && (!rule?.origenOperacion || row.origin === rule.origenOperacion)
    && (!contract?.cliente?.empresaId || number(row.empresaId) === number(contract.cliente.empresaId)),
  );
  const count = (status: string) => rows.filter((row) => row.status === status).reduce((sum, row) => sum + number(row.count), 0);
  return {
    billable: statuses.reduce((sum, status) => sum + count(status), 0),
    completed: count("CONCLUIDO"),
    cancelled: count("CANCELADO"),
    stopped: count("DETENIDO"),
    inProcess: count("EN_PROCESO"),
  };
}

function buildCutRows(entries: ReportEvidenceEntry[]) {
  const progress = new Map<number, { paid: number; total: number }>();
  for (const entry of entries) {
    const item = progress.get(Number(entry.contract.id)) ?? { paid: 0, total: 0 };
    item.total += 1;
    item.paid += entry.cut?.estado === "PAGADO" ? 1 : 0;
    progress.set(Number(entry.contract.id), item);
  }
  return entries.map((entry) => {
    const cut = entry.cut;
    const evidence = entry.evidence;
    const contractProgress = progress.get(Number(entry.contract.id)) || { paid: 0, total: 1 };
    return {
      mes: entry.monthLabel,
      mesClave: entry.monthKey,
      cliente: evidence.contract.client,
      folio: evidence.cut.folio,
      contrato: `${entry.contract.folio} · ${entry.contract.nombre}`,
      servicios: [...new Set(evidence.rules.map((rule) => rule.serviceLabel))].join(", ") || "Sin regla",
      periodoInicio: excelDate(evidence.period.start),
      periodoFin: excelDate(evidence.period.end),
      fechaCorte: excelDate(cut?.fechaCorte || evidence.period.end),
      vencimiento: excelDate(evidence.cut.dueDate),
      estado: evidence.cut.state,
      semaforo: cut?.cobranza?.vencido && evidence.cut.state !== "PAGADO" ? "VENCIDO" : evidence.cut.state === "PAGADO" ? "COBRADO" : evidence.cut.state === "FACTURADO" ? "POR COBRAR" : "EN PROCESO",
      avance: workflowProgress(evidence.cut.state),
      progresoContrato: `${contractProgress.paid} de ${contractProgress.total} cobrados`,
      origen: cut ? "GUARDADO" : "ESPERADO",
      cobrables: evidence.rules.reduce((sum, rule) => sum + rule.consumed, 0),
      excedentes: evidence.rules.reduce((sum, rule) => sum + rule.excess, 0),
      factura: evidence.cut.invoice,
      informacionEconomica: economicStatus(evidence.totals.official),
      total: evidence.totals.official,
      pagado: evidence.totals.paid,
      saldo: evidence.totals.balance,
      aprobadoPor: evidence.cut.approvedById,
      aprobadoAt: excelDate(evidence.cut.approvedAt),
      actualizadoPor: evidence.cut.updatedById,
      actualizadoAt: excelDate(evidence.cut.updatedAt),
    };
  });
}

function buildFinancialRows(entries: ReportEvidenceEntry[]) {
  return entries.flatMap((entry) => {
    const hasServiceBase = (entry.contract.paquetes || []).some((rule: any) => rule.montoPaquete != null);
    return entry.evidence.rules.map((summary, index) => {
      const rule = (entry.contract.paquetes || []).find((item: any) => Number(item.id) === summary.ruleId);
      const explicitBase = rule?.montoPaquete == null ? null : number(rule.montoPaquete) * entry.evidence.period.periods;
      const serviceBase = explicitBase ?? (!hasServiceBase && index === 0 ? entry.evidence.totals.base : null);
      const serviceAmount = serviceBase == null && summary.extraAmount == null ? null : Number(serviceBase || 0) + Number(summary.extraAmount || 0);
      return {
        mes: entry.monthLabel,
        cliente: entry.evidence.contract.client,
        contrato: `${entry.contract.folio} · ${entry.contract.nombre}`,
        corte: entry.evidence.cut.folio,
        estado: entry.evidence.cut.state,
        servicio: summary.serviceLabel,
        regla: summary.name,
        unidad: summary.unitLabel,
        incluido: summary.included,
        consumido: summary.consumed,
        excedente: summary.excess,
        tarifaExcedente: summary.unitRate,
        montoBaseServicio: serviceBase,
        montoExtra: summary.extraAmount,
        importeServicio: serviceAmount,
        totalOficialCorte: entry.evidence.totals.official,
        cobradoCorte: entry.evidence.totals.paid,
        saldoCorte: entry.evidence.totals.balance,
        informacionEconomica: economicStatus(entry.evidence.totals.official),
      };
    });
  });
}

function buildExcessRows(entries: ReportEvidenceEntry[]) {
  return entries.flatMap((entry) => entry.evidence.excessRows.map((row) => ({
    mes: entry.monthLabel,
    cliente: entry.evidence.contract.client,
    contrato: `${entry.contract.folio} · ${entry.contract.nombre}`,
    corte: entry.evidence.cut.folio,
    servicio: row.serviceLabel,
    movimientoId: row.movementId,
    referencia: row.reference,
    solicitante: row.requester,
    solicitud: excelDate(row.requestedAt),
    inicio: excelDate(row.startedAt),
    fin: excelDate(row.completedAt),
    viaOrigen: row.fromTrack,
    viaDestino: row.toTrack,
    estado: row.status,
    patio: row.locality,
    cantidad: row.quantity,
    cantidadExcedente: row.excessQuantity,
    tarifa: row.unitRate,
    importe: row.amount,
  })));
}

function buildPaymentRows(entries: ReportEvidenceEntry[]) {
  return entries.flatMap((entry) => (entry.cut?.pagos || []).map((payment: any) => ({
    mes: entry.monthLabel,
    cliente: entry.evidence.contract.client,
    contrato: `${entry.contract.folio} · ${entry.contract.nombre}`,
    corte: entry.evidence.cut.folio,
    factura: entry.evidence.cut.invoice,
    estadoCorte: entry.evidence.cut.state,
    pagoId: payment.id,
    fechaPago: excelDate(payment.fechaPago),
    monto: number(payment.monto),
    referencia: payment.referencia,
    metodo: payment.metodo,
    registradoPor: payment.registradoPorId,
    registradoAt: excelDate(payment.createdAt),
  })));
}

function buildHistoryRows(entries: ReportEvidenceEntry[]) {
  return entries.flatMap((entry) => (entry.cut?.historial || []).map((history: any) => ({
    mes: entry.monthLabel,
    cliente: entry.evidence.contract.client,
    contrato: `${entry.contract.folio} · ${entry.contract.nombre}`,
    corte: entry.evidence.cut.folio,
    accion: history.accion,
    estadoAnterior: history.estadoAnterior,
    estadoNuevo: history.estadoNuevo,
    actor: history.actorNombre || `${history.actorRol || "USUARIO"} #${history.actorId}`,
    actorId: history.actorId,
    rol: history.actorRol,
    fecha: excelDate(history.createdAt),
    cambios: historyChangesText(history.cambios),
  })));
}

function stateColor(state: string) {
  if (["PAGADO", "COBRADO"].includes(state)) return COLORS.green;
  if (["FACTURADO", "PARCIAL", "POR COBRAR"].includes(state)) return "FF7C3AED";
  if (state === "APROBADO") return COLORS.cyan;
  if (state === "EN_REVISION") return COLORS.blue;
  if (["VENCIDO", "CANCELADO"].includes(state)) return COLORS.rose;
  return COLORS.amber;
}

function paintStatusColumn(sheet: ExcelJS.Worksheet, column: number) {
  for (let row = 2; row <= sheet.rowCount; row += 1) {
    const cell = sheet.getCell(row, column);
    const value = text(cell.value).toUpperCase();
    if (!value) continue;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stateColor(value) } };
    cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: COLORS.white } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  }
}

function addSummarySheet(workbook: ExcelJS.Workbook, analytics: Analytics, title: string, includeArrastre: boolean) {
  const sheet = workbook.addWorksheet("Resumen", { properties: { tabColor: { argb: COLORS.emerald } } });
  setSheetDefaults(sheet);
  for (let column = 1; column <= 12; column += 1) sheet.getColumn(column).width = 13;
  styleTitle(sheet, title, `Periodo analizado: ${analytics.meta.periodLabel || `${analytics.meta.range.from.slice(0, 10)} a ${analytics.meta.range.toExclusive.slice(0, 10)}`}`, 12);
  const total = number(analytics.kpis.operations);
  if (!total) {
    addNoDataPanel(sheet, "Sin información para el resumen", operationalNoDataDetail());
    return { sheet, charts: [] as NativeExcelChartSpec[] };
  }
  const natural = originExecutiveStats(analytics, "NATURAL");
  const arrastre = originExecutiveStats(analytics, "ARRASTRE");
  const completion = total ? number(analytics.kpis.completed) / total : 0;
  const cancellation = total ? number(analytics.kpis.cancelled) / total : 0;
  const incidentRate = total ? number(analytics.kpis.incidents) / total * 100 : 0;
  const growth = number(analytics.kpis.periodGrowthPct ?? analytics.kpis.monthlyGrowthPct);
  addKpi(sheet, "A5:B8", "Volumen consolidado", total, COLORS.navy);
  addKpi(sheet, "C5:D8", "Cumplimiento", `${(completion * 100).toFixed(1)}%`, completion >= 0.9 ? COLORS.green : COLORS.amber);
  addKpi(sheet, "E5:F8", "Cambio vs periodo anterior", `${growth >= 0 ? "+" : ""}${growth}%`, growth >= 0 ? COLORS.green : COLORS.rose);
  addKpi(sheet, "G5:H8", "Incidentes por 100", incidentRate.toFixed(1), incidentRate <= 3 ? COLORS.green : COLORS.amber);
  addKpi(sheet, "I5:J8", "Movimientos naturales", natural.total, COLORS.emerald);
  addKpi(sheet, "K5:L8", includeArrastre ? "Solicitudes de arrastre" : "Servicios realizados", includeArrastre ? arrastre.total : number(analytics.kpis.wash) + number(analytics.kpis.turning), includeArrastre ? COLORS.blue : COLORS.cyan);
  sheet.getRow(5).height = 26; sheet.getRow(6).height = 24; sheet.getRow(7).height = 24; sheet.getRow(8).height = 24;
  const naturalLead = natural.clients[0];
  const arrastreLead = arrastre.clients[0];
  if (includeArrastre) {
    addKpi(sheet, "A10:C13", "Cliente principal Natural", naturalLead ? `${naturalLead.name} · ${(naturalLead.volume / Math.max(1, natural.total) * 100).toFixed(1)}%` : "Sin datos", COLORS.emerald);
    addKpi(sheet, "D10:F13", "Cliente principal Arrastre", arrastreLead ? `${arrastreLead.name} · ${(arrastreLead.volume / Math.max(1, arrastre.total) * 100).toFixed(1)}%` : "Sin datos", COLORS.blue);
    addKpi(sheet, "G10:I13", "Tasa de cancelación", `${(cancellation * 100).toFixed(1)}%`, cancellation <= 0.03 ? COLORS.green : COLORS.rose);
    addKpi(sheet, "J10:L13", "Vagones movilizados", number(analytics.kpis.wagons), "FF7C3AED");
  } else {
    addKpi(sheet, "A10:D13", "Cliente principal Natural", naturalLead ? `${naturalLead.name} · ${(naturalLead.volume / Math.max(1, natural.total) * 100).toFixed(1)}%` : "Sin datos", COLORS.emerald);
    addKpi(sheet, "E10:H13", "Tasa de cancelación", `${(cancellation * 100).toFixed(1)}%`, cancellation <= 0.03 ? COLORS.green : COLORS.rose);
    addKpi(sheet, "I10:J13", "Lavados", number(analytics.kpis.wash), COLORS.cyan);
    addKpi(sheet, "K10:L13", "Torneados", number(analytics.kpis.turning), COLORS.amber);
  }

  sheet.mergeCells("A15:L15");
  sheet.getCell("A15").value = includeArrastre ? "EVOLUCIÓN COMPARATIVA · NATURALES, ARRASTRE Y SERVICIOS" : "EVOLUCIÓN · NATURALES, LAVADO Y TORNEADO";
  sheet.getCell("A15").font = { bold: true, size: 12, color: { argb: COLORS.navy } };
  const chart = addNativeColumnChartData(sheet, {
    title: includeArrastre ? "Evolución comparativa por unidad" : "Evolución de Naturales y servicios",
    categories: trendCategories(analytics.trend),
    series: summaryChartSeries(analytics.trend, includeArrastre),
    startColumn: 14,
    startRow: 16,
    anchor: { fromCol: 0, fromRow: 15, toCol: 12, toRow: 36 },
  });
  for (let row = 16; row <= 36; row += 1) sheet.getRow(row).height = 18;
  return { sheet, charts: chart ? [chart] : [] };
}

function addFinancialControlSheet(workbook: ExcelJS.Workbook, cutSheet: ExcelJS.Worksheet, periodLabel: string) {
  const sheet = workbook.addWorksheet("Control financiero", { properties: { tabColor: { argb: COLORS.green } } });
  setSheetDefaults(sheet);
  for (let column = 1; column <= 8; column += 1) sheet.getColumn(column).width = column % 2 ? 24 : 18;
  styleTitle(sheet, "Control financiero y avance", `Meses incluidos: ${periodLabel} · Valores no capturados permanecen vacíos y no bloquean el estado`, 8);
  const lastRow = Math.max(2, cutSheet.rowCount);
  const metrics = [
    { label: "Cortes contrato-mes", formula: `=COUNTA('Cortes y estados'!$D$2:$D$${lastRow})`, format: "#,##0", color: COLORS.blue },
    { label: "Cortes cobrados", formula: `=COUNTIF('Cortes y estados'!$G$2:$G$${lastRow},\"PAGADO\")`, format: "#,##0", color: COLORS.green },
    { label: "% cobrados", formula: "=IF(B5=0,0,B6/B5)", format: "0.0%", color: COLORS.emerald },
    { label: "Monto oficial", formula: `=SUM('Cortes y estados'!$T$2:$T$${lastRow})`, format: "$#,##0.00", color: COLORS.slate },
    { label: "Cobrado", formula: `=SUM('Cortes y estados'!$U$2:$U$${lastRow})`, format: "$#,##0.00", color: COLORS.green },
    { label: "Saldo", formula: `=SUM('Cortes y estados'!$V$2:$V$${lastRow})`, format: "$#,##0.00", color: COLORS.amber },
    { label: "Sin monto capturado", formula: `=COUNTIF('Cortes y estados'!$S$2:$S$${lastRow},\"OPCIONAL / NO CAPTURADO\")`, format: "#,##0", color: COLORS.cyan },
  ];
  metrics.forEach((metric, index) => {
    const row = 5 + index;
    const label = sheet.getCell(row, 1);
    const value = sheet.getCell(row, 2);
    label.value = metric.label;
    value.value = { formula: metric.formula.slice(1) };
    value.numFmt = metric.format;
    label.font = { name: "Aptos", size: 10, bold: true, color: { argb: COLORS.slate } };
    value.font = { name: "Aptos Display", size: 16, bold: true, color: { argb: metric.color } };
    for (const cell of [label, value]) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.soft } };
      cell.border = { bottom: { style: "thin", color: { argb: COLORS.line } } };
      cell.alignment = { vertical: "middle" };
    }
    sheet.getRow(row).height = 28;
  });
  const states = ["BORRADOR", "EN_REVISION", "APROBADO", "FACTURADO", "PARCIAL", "PAGADO", "CANCELADO"];
  sheet.getCell("D5").value = "Estado";
  sheet.getCell("E5").value = "Cantidad";
  for (const cell of [sheet.getCell("D5"), sheet.getCell("E5")]) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.slate } };
    cell.font = { bold: true, color: { argb: COLORS.white } };
    cell.alignment = { vertical: "middle" };
  }
  states.forEach((state, index) => {
    const row = 6 + index;
    sheet.getCell(row, 4).value = state;
    sheet.getCell(row, 5).value = { formula: `COUNTIF('Cortes y estados'!$G$2:$G$${lastRow},D${row})` };
    sheet.getCell(row, 5).numFmt = "#,##0";
    const stateCell = sheet.getCell(row, 4);
    stateCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stateColor(state) } };
    stateCell.font = { bold: true, color: { argb: COLORS.white } };
  });
  sheet.mergeCells("A14:H15");
  sheet.getCell("A14").value = "Control: los estados administrativos son independientes del monto. Un corte puede avanzar y cerrarse con información económica opcional; la hoja Historial de cortes conserva quién, cuándo y qué cambió.";
  sheet.getCell("A14").alignment = { wrapText: true, vertical: "middle" };
  sheet.getCell("A14").font = { italic: true, color: { argb: COLORS.muted } };
  sheet.getCell("A14").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.soft } };
  return sheet;
}

export async function buildCommercialCrmWorkbook(input: {
  analytics: Analytics;
  crm: CrmData;
  template: CrmExcelTemplate;
  title: string;
  sections?: CrmExcelSection[];
  operationColumns?: CrmExcelOperationColumn[];
  includeArrastre?: boolean;
  scope?: ReportScope;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "COSAIF Comercial";
  workbook.company = "Vianko";
  workbook.subject = "Analítica comercial, contratos y control de movimientos";
  workbook.title = input.title;
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  const includeArrastre = input.includeArrastre !== false;
  const sections = new Set<CrmExcelSection>(input.sections?.length ? input.sections : TEMPLATE_SECTIONS[input.template]);
  if (!includeArrastre) sections.delete("ARRASTRE");
  const operationColumns = (input.operationColumns?.length ? input.operationColumns : DEFAULT_OPERATION_COLUMNS).filter((column) => includeArrastre || column !== "VAGONES");
  const evidenceEntries = buildReportEvidence(input.crm, input.analytics, input.scope || {});
  const nativeCharts: NativeExcelChartSpec[] = [];

  if (sections.has("RESUMEN")) {
    const summary = addSummarySheet(workbook, input.analytics, input.title, includeArrastre);
    nativeCharts.push(...summary.charts);
  }

  if (sections.has("NATURAL")) nativeCharts.push(...addOriginExecutiveSheet(workbook, input.analytics, "NATURAL"));
  if (sections.has("ARRASTRE")) nativeCharts.push(...addOriginExecutiveSheet(workbook, input.analytics, "ARRASTRE"));

  const periodLabel = input.analytics.meta.periodLabel || input.analytics.meta.reference;

  if (sections.has("TENDENCIA")) {
    if (input.analytics.trend.some((item) => number(item.total) > 0)) addDataSheet(workbook, "Tendencia del periodo", [
      { header: "Periodo", key: "label", width: 15 }, { header: "Naturales", key: "natural", width: 13 },
      ...(includeArrastre ? [{ header: "Arrastres", key: "arrastre", width: 13 }, { header: "Vagones", key: "wagons", width: 13 }] : []),
      { header: "Lavados", key: "wash", width: 13 }, { header: "Torneados", key: "turning", width: 13 },
      { header: "Total", key: "total", width: 13 }, { header: "Concluidas", key: "completed", width: 13 },
      { header: "Canceladas", key: "cancelled", width: 13 },
    ], input.analytics.trend);
    else addNoDataSheet(workbook, "Tendencia del periodo", periodLabel, "Sin tendencia disponible", operationalNoDataDetail());
  }

  if (sections.has("PATIOS")) {
    if (input.analytics.yards.some((item) => number(item.total) > 0)) addDataSheet(workbook, "Volumen por patio", [
      { header: "Patio", key: "name", width: 28 }, { header: "Total", key: "total", width: 12 },
      { header: "Concluidas", key: "completed", width: 13 }, { header: "Naturales", key: "natural", width: 13 },
      ...(includeArrastre ? [{ header: "Arrastres", key: "arrastre", width: 13 }, { header: "Vagones", key: "wagons", width: 13 }] : []),
      { header: "Lavados", key: "wash", width: 13 }, { header: "Torneados", key: "turning", width: 13 },
    ], input.analytics.yards);
    else addNoDataSheet(workbook, "Volumen por patio", periodLabel, "Sin información por patio", operationalNoDataDetail());
  }

  if (sections.has("CLIENTES")) {
    if (input.analytics.clients.some((item) => number(item.total) > 0)) addDataSheet(workbook, "Cartera de clientes", [
      { header: "Cliente", key: "name", width: 30 }, { header: "Total", key: "total", width: 12 },
      { header: "Concluidas", key: "completed", width: 13 }, { header: "Naturales", key: "natural", width: 13 },
      ...(includeArrastre ? [{ header: "Arrastres", key: "arrastre", width: 13 }, { header: "Vagones", key: "wagons", width: 13 }] : []),
      { header: "Lavados", key: "wash", width: 13 }, { header: "Torneados", key: "turning", width: 13 },
    ], input.analytics.clients);
    else addNoDataSheet(workbook, "Cartera de clientes", periodLabel, "Sin información por cliente", operationalNoDataDetail());
  }

  if (sections.has("CONTRATOS")) {
    if (!input.crm.contracts.length) addNoDataSheet(workbook, "Contratos", periodLabel, input.crm.available ? "Sin contratos para este alcance" : "Fuente comercial no disponible", crmNoDataDetail("contratos", input.crm.available));
    else addDataSheet(workbook, "Contratos", [
      { header: "Cliente", key: "cliente", width: 28 }, { header: "Folio", key: "folio", width: 18 },
      { header: "Contrato", key: "nombre", width: 32 }, { header: "Estado", key: "estado", width: 15 },
      { header: "Inicio", key: "inicio", width: 14, format: "dd/mmm/yyyy" }, { header: "Fin", key: "fin", width: 14, format: "dd/mmm/yyyy" },
      { header: "Corte", key: "diaCorte", width: 14 }, { header: "Monto por periodo", key: "monto", width: 18, format: "$#,##0.00" },
      { header: "Orden de compra", key: "ordenCompra", width: 20 }, { header: "Regla automática", key: "regla", width: 48 },
    ], input.crm.contracts.map((item) => ({ cliente: item.cliente?.empresaNombre, folio: item.folio, nombre: item.nombre, estado: item.estado, inicio: excelDate(item.fechaInicio), fin: excelDate(item.fechaFin), diaCorte: cutLabel(item.diaCorte), monto: item.montoMaximo == null ? null : number(item.montoMaximo), ordenCompra: item.ordenCompra, regla: contractRuleSummary(primaryRule(item)) })));
  }

  if (sections.has("PAQUETES")) {
    const packageRows = evidenceEntries.flatMap((entry) => entry.evidence.rules.map((summary) => {
      const rule = (entry.contract.paquetes || []).find((item: any) => Number(item.id) === summary.ruleId) || {};
      const percent = summary.included ? summary.consumed / summary.included : null;
      return {
        mes: entry.monthLabel,
        cliente: entry.evidence.contract.client,
        contrato: entry.contract.folio,
        estadoContrato: entry.contract.estado,
        regla: summary.name,
        servicio: summary.serviceLabel,
        origen: rule.origenOperacion || "TODOS",
        patio: input.analytics.catalogs.localities.find((locality) => locality.id === Number(rule.localidadId))?.nombre || "TODOS",
        unidad: summary.unitLabel,
        periodicidad: rule.periodicidad,
        estados: billableStatuses(rule).join(", "),
        incluido: summary.included,
        consumido: summary.consumed,
        porcentaje: percent,
        excedente: summary.excess,
        corte: entry.evidence.cut.folio,
        estadoCorte: entry.evidence.cut.state,
        semaforo: summary.included == null ? "SIN LIMITE" : percent != null && percent > 1 ? "EXCEDIDO" : percent != null && percent >= 0.8 ? "ATENCION" : "EN RANGO",
      };
    }));
    if (!packageRows.length) addNoDataSheet(workbook, "Cumplimiento contractual", periodLabel, input.crm.available ? "Sin reglas contractuales para este alcance" : "Fuente comercial no disponible", crmNoDataDetail("reglas contractuales", input.crm.available));
    else {
      const packageSheet = addDataSheet(workbook, "Cumplimiento contractual", [
        { header: "Mes", key: "mes", width: 20 }, { header: "Cliente", key: "cliente", width: 27 }, { header: "Contrato", key: "contrato", width: 17 },
        { header: "Estado contrato", key: "estadoContrato", width: 17 }, { header: "Regla del contrato", key: "regla", width: 34 }, { header: "Servicio", key: "servicio", width: 15 },
        { header: "Operación", key: "origen", width: 14 }, { header: "Patio", key: "patio", width: 22 },
        { header: "Unidad", key: "unidad", width: 14 }, { header: "Periodicidad", key: "periodicidad", width: 18 },
        { header: "Estados cobrables", key: "estados", width: 30 },
        { header: "Incluido", key: "incluido", width: 13 }, { header: "Consumido", key: "consumido", width: 13 },
        { header: "% consumo", key: "porcentaje", width: 14, format: "0.0%" }, { header: "Excedente", key: "excedente", width: 13 },
        { header: "Corte", key: "corte", width: 20 }, { header: "Estado corte", key: "estadoCorte", width: 16 }, { header: "Semáforo", key: "semaforo", width: 15 },
      ], packageRows);
      for (let row = 2; row <= packageSheet.rowCount; row += 1) {
        const status = text(packageSheet.getCell(row, 18).value);
        const color = status === "EXCEDIDO" ? COLORS.rose : status === "ATENCION" ? COLORS.amber : status === "EN RANGO" ? COLORS.green : COLORS.blue;
        packageSheet.getCell(row, 18).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
        packageSheet.getCell(row, 18).font = { bold: true, color: { argb: COLORS.white } };
      }
    }
  }

  if (sections.has("COBRANZA")) {
    const cutRows = buildCutRows(evidenceEntries);
    if (!cutRows.length) addNoDataSheet(workbook, "Cortes y estados", periodLabel, input.crm.available ? "Sin cortes para este alcance" : "Fuente comercial no disponible", crmNoDataDetail("cortes", input.crm.available));
    else {
      const cutSheet = addDataSheet(workbook, "Cortes y estados", [
        { header: "Mes", key: "mes", width: 20 }, { header: "Mes clave", key: "mesClave", width: 12 },
        { header: "Cliente", key: "cliente", width: 28 }, { header: "Corte", key: "folio", width: 20 }, { header: "Contrato", key: "contrato", width: 32 }, { header: "Servicios", key: "servicios", width: 28 },
        { header: "Estado", key: "estado", width: 16 }, { header: "Semáforo", key: "semaforo", width: 16 }, { header: "Avance", key: "avance", width: 13 }, { header: "Progreso contrato", key: "progresoContrato", width: 22 },
        { header: "Origen", key: "origen", width: 13 }, { header: "Periodo inicio", key: "periodoInicio", width: 15, format: "dd/mmm/yyyy" }, { header: "Periodo fin", key: "periodoFin", width: 15, format: "dd/mmm/yyyy" },
        { header: "Fecha corte", key: "fechaCorte", width: 15, format: "dd/mmm/yyyy" }, { header: "Vencimiento", key: "vencimiento", width: 15, format: "dd/mmm/yyyy" },
        { header: "Cobrables", key: "cobrables", width: 13 }, { header: "Excedentes", key: "excedentes", width: 13 }, { header: "Factura", key: "factura", width: 20 },
        { header: "Información económica", key: "informacionEconomica", width: 25 }, { header: "Monto oficial", key: "total", width: 18, format: "$#,##0.00" }, { header: "Cobrado", key: "pagado", width: 18, format: "$#,##0.00" }, { header: "Saldo", key: "saldo", width: 18, format: "$#,##0.00" },
        { header: "Aprobó usuario", key: "aprobadoPor", width: 16 }, { header: "Aprobado el", key: "aprobadoAt", width: 19, format: "dd/mmm/yyyy hh:mm" }, { header: "Última edición por", key: "actualizadoPor", width: 18 }, { header: "Última edición", key: "actualizadoAt", width: 19, format: "dd/mmm/yyyy hh:mm" },
      ], cutRows);
      paintStatusColumn(cutSheet, 7);
      paintStatusColumn(cutSheet, 8);
      for (let row = 2; row <= cutSheet.rowCount; row += 1) {
        const cell = cutSheet.getCell(row, 19);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: text(cell.value) === "CAPTURADO" ? "FFD1FAE5" : "FFDBEAFE" } };
        cell.font = { bold: true, color: { argb: text(cell.value) === "CAPTURADO" ? "FF065F46" : "FF1E40AF" } };
      }
      addFinancialControlSheet(workbook, cutSheet, periodLabel);
    }
  }

  if (sections.has("FINANZAS")) {
    const rows = buildFinancialRows(evidenceEntries);
    if (!rows.length) addNoDataSheet(workbook, "Detalle financiero", periodLabel, input.crm.available ? "Sin reglas financieras para el alcance" : "Fuente comercial no disponible", crmNoDataDetail("reglas financieras", input.crm.available));
    else {
      const sheet = addDataSheet(workbook, "Detalle financiero", [
        { header: "Mes", key: "mes", width: 20 }, { header: "Cliente", key: "cliente", width: 28 }, { header: "Contrato", key: "contrato", width: 32 }, { header: "Corte", key: "corte", width: 20 }, { header: "Estado", key: "estado", width: 16 },
        { header: "Servicio", key: "servicio", width: 17 }, { header: "Regla", key: "regla", width: 32 }, { header: "Unidad", key: "unidad", width: 15 }, { header: "Incluido", key: "incluido", width: 13 }, { header: "Consumido", key: "consumido", width: 13 }, { header: "Excedente", key: "excedente", width: 13 },
        { header: "Tarifa excedente", key: "tarifaExcedente", width: 18, format: "$#,##0.00" }, { header: "Base servicio", key: "montoBaseServicio", width: 18, format: "$#,##0.00" }, { header: "Monto extra", key: "montoExtra", width: 18, format: "$#,##0.00" }, { header: "Importe servicio", key: "importeServicio", width: 18, format: "$#,##0.00" },
        { header: "Total oficial corte", key: "totalOficialCorte", width: 20, format: "$#,##0.00" }, { header: "Cobrado corte", key: "cobradoCorte", width: 18, format: "$#,##0.00" }, { header: "Saldo corte", key: "saldoCorte", width: 18, format: "$#,##0.00" }, { header: "Información económica", key: "informacionEconomica", width: 25 },
      ], rows);
      paintStatusColumn(sheet, 5);
    }
  }

  if (sections.has("EXCEDENTES")) {
    const rows = buildExcessRows(evidenceEntries);
    if (!rows.length) addNoDataSheet(workbook, "Excedentes cobrables", periodLabel, "Sin operaciones fuera de rango", "Ninguna operación de los meses elegidos rebasa lo incluido por su contrato.");
    else addDataSheet(workbook, "Excedentes cobrables", [
      { header: "Mes", key: "mes", width: 20 }, { header: "Cliente", key: "cliente", width: 27 }, { header: "Contrato", key: "contrato", width: 30 }, { header: "Corte", key: "corte", width: 20 }, { header: "Servicio", key: "servicio", width: 16 },
      { header: "ID movimiento", key: "movimientoId", width: 20 }, { header: "Referencia", key: "referencia", width: 24 }, { header: "Solicitante", key: "solicitante", width: 24 }, { header: "Solicitud", key: "solicitud", width: 19, format: "dd/mmm/yyyy hh:mm" }, { header: "Inicio", key: "inicio", width: 19, format: "dd/mmm/yyyy hh:mm" }, { header: "Fin", key: "fin", width: 19, format: "dd/mmm/yyyy hh:mm" },
      { header: "Vía origen", key: "viaOrigen", width: 22 }, { header: "Vía destino", key: "viaDestino", width: 22 }, { header: "Estado", key: "estado", width: 16 }, { header: "Patio", key: "patio", width: 22 }, { header: "Cantidad", key: "cantidad", width: 13 }, { header: "Fuera de rango", key: "cantidadExcedente", width: 16 }, { header: "Tarifa", key: "tarifa", width: 16, format: "$#,##0.00" }, { header: "Importe", key: "importe", width: 18, format: "$#,##0.00" },
    ], rows);
  }

  if (sections.has("PAGOS")) {
    const rows = buildPaymentRows(evidenceEntries);
    if (!rows.length) addNoDataSheet(workbook, "Pagos registrados", periodLabel, "Sin pagos registrados", "Los cortes pueden continuar en seguimiento aunque el monto permanezca opcional o reservado.");
    else {
      const sheet = addDataSheet(workbook, "Pagos registrados", [
        { header: "Mes", key: "mes", width: 20 }, { header: "Cliente", key: "cliente", width: 28 }, { header: "Contrato", key: "contrato", width: 32 }, { header: "Corte", key: "corte", width: 20 }, { header: "Factura", key: "factura", width: 20 }, { header: "Estado corte", key: "estadoCorte", width: 16 },
        { header: "ID pago", key: "pagoId", width: 12 }, { header: "Fecha de pago", key: "fechaPago", width: 18, format: "dd/mmm/yyyy" }, { header: "Monto", key: "monto", width: 18, format: "$#,##0.00" }, { header: "Referencia", key: "referencia", width: 24 }, { header: "Método", key: "metodo", width: 18 }, { header: "Registró usuario", key: "registradoPor", width: 17 }, { header: "Registrado el", key: "registradoAt", width: 19, format: "dd/mmm/yyyy hh:mm" },
      ], rows);
      paintStatusColumn(sheet, 6);
    }
  }

  if (sections.has("HISTORIAL")) {
    const rows = buildHistoryRows(evidenceEntries);
    if (!rows.length) addNoDataSheet(workbook, "Historial de cortes", periodLabel, "Sin cambios registrados", "Los siguientes cambios de revisión, aprobación, facturación, cobro o edición aparecerán en esta hoja.");
    else {
      const sheet = addDataSheet(workbook, "Historial de cortes", [
        { header: "Mes", key: "mes", width: 20 }, { header: "Cliente", key: "cliente", width: 28 }, { header: "Contrato", key: "contrato", width: 32 }, { header: "Corte", key: "corte", width: 20 }, { header: "Acción", key: "accion", width: 24 },
        { header: "Estado anterior", key: "estadoAnterior", width: 18 }, { header: "Estado nuevo", key: "estadoNuevo", width: 18 }, { header: "Usuario", key: "actor", width: 28 }, { header: "ID usuario", key: "actorId", width: 13 }, { header: "Rol", key: "rol", width: 18 }, { header: "Fecha", key: "fecha", width: 20, format: "dd/mmm/yyyy hh:mm" }, { header: "Cambios", key: "cambios", width: 70 },
      ], rows);
      paintStatusColumn(sheet, 7);
      sheet.getColumn(12).alignment = { vertical: "top", wrapText: true };
      for (let row = 2; row <= sheet.rowCount; row += 1) sheet.getRow(row).height = 34;
    }
  }

  if (sections.has("OPERACIONES")) {
    const definitions: Record<CrmExcelOperationColumn, { header: string; key: string; width?: number; format?: string }> = {
      FUENTE: { header: "Fuente", key: "sourceSystem", width: 14 },
      TIPO: { header: "Tipo", key: "origin", width: 13 },
      REFERENCIA: { header: "Referencia", key: "reference", width: 22 },
      CLIENTE: { header: "Cliente", key: "empresa", width: 27 },
      PATIO: { header: "Patio", key: "localidad", width: 22 },
      LOCOMOTORA: { header: "Locomotora", key: "locomotiveNumber", width: 14 },
      VAGONES: { header: "Vagones", key: "wagons", width: 12 },
      SERVICIOS: { header: "Servicios", key: "services", width: 25 },
      ESTADO: { header: "Estado", key: "status", width: 16 },
      SOLICITUD: { header: "Solicitud", key: "requestedAt", width: 18, format: "dd/mmm/yyyy hh:mm" },
      FINALIZACION: { header: "Finalización", key: "completedAt", width: 18, format: "dd/mmm/yyyy hh:mm" },
      INCIDENTES: { header: "Incidentes", key: "incidents", width: 12 },
    };
    if (!input.analytics.operations.data.length) addNoDataSheet(workbook, "Operaciones auditables", periodLabel, "Sin movimientos auditables", operationalNoDataDetail());
    else addDataSheet(
      workbook,
      "Operaciones auditables",
      operationColumns.map((column) => definitions[column]),
      input.analytics.operations.data.map((item) => ({ ...item, services: item.services.join(", "), requestedAt: excelDate(item.requestedAt), completedAt: excelDate(item.completedAt) })),
    );
  }

  if (sections.has("GUIA")) {
    const dictionary = addDataSheet(workbook, "Guía del archivo", [
    { header: "Hoja / concepto", key: "concept", width: 30 }, { header: "Cómo leerlo", key: "description", width: 90 },
  ], [
    { concept: "Resumen", description: "Indicadores y gráfica nativa editable del periodo y patio seleccionados." },
    { concept: "Naturales", description: "Unidad de negocio independiente: clientes de movimientos naturales, cumplimiento, cancelación, incidentes, lavado y torneado." },
    ...(includeArrastre ? [{ concept: "Arrastre", description: "Unidad de negocio exclusiva de Torreón: clientes, solicitudes, vagones, promedio por solicitud, cumplimiento e incidentes." }] : []),
    { concept: "Contratos", description: "Es la fuente de verdad comercial: vigencia, monto por periodo, día de corte y regla automática." },
    { concept: "Cumplimiento contractual", description: "Compara movimientos reales contra la regla que nace del contrato y cuenta solo los estados cobrables configurados." },
    { concept: "Cortes y estados", description: "Muestra cada contrato-mes, su avance revisión → aprobado → facturado → cobrado, factura, progreso, monto opcional, cobrado y saldo." },
    { concept: "Control financiero", description: "Resumen formulado desde la hoja Cortes y estados; permite reconciliar cortes, estados, montos, cobros y saldos." },
    { concept: "Detalle financiero", description: "Divide monto base y servicios extra por Naturales, Arrastre, Lavado o Torno, con tarifa, excedente e importe." },
    { concept: "Excedentes cobrables", description: "Justifica cada operación fuera de rango con ID, solicitante, fechas, vías, cantidad, tarifa e importe." },
    { concept: "Pagos registrados", description: "Lista pagos, referencias, métodos, fechas y usuario que los registró." },
    { concept: "Historial de cortes", description: "Bitácora de edición: acción, estado anterior y nuevo, usuario, fecha y valores modificados." },
    { concept: "Fuente de verdad", description: "Los datos operativos son de solo lectura. Contratos, reglas automáticas y cortes pertenecen a msComercial." },
  ]);
    dictionary.getColumn(2).alignment = { wrapText: true, vertical: "top" };
    dictionary.eachRow((row) => { if (row.number > 1) row.height = 34; });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return injectNativeExcelCharts(Buffer.from(buffer), nativeCharts);
}
