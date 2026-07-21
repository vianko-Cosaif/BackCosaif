import ExcelJS from "exceljs";
import sharp from "sharp";
import type { CommercialOperation } from "./comercial-crm-analytics";

type Analytics = {
  meta: { reference: string; range: { from: string; toExclusive: string }; torreonAvailable: boolean; periodLabel?: string };
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
export type CrmExcelSection = "RESUMEN" | "NATURAL" | "ARRASTRE" | "TENDENCIA" | "PATIOS" | "CLIENTES" | "CONTRATOS" | "PAQUETES" | "COBRANZA" | "OPERACIONES" | "GUIA";
export type CrmExcelOperationColumn = "FUENTE" | "TIPO" | "REFERENCIA" | "CLIENTE" | "PATIO" | "LOCOMOTORA" | "VAGONES" | "SERVICIOS" | "ESTADO" | "SOLICITUD" | "FINALIZACION" | "INCIDENTES";

const DEFAULT_OPERATION_COLUMNS: CrmExcelOperationColumn[] = ["FUENTE", "TIPO", "REFERENCIA", "CLIENTE", "PATIO", "LOCOMOTORA", "VAGONES", "SERVICIOS", "ESTADO", "SOLICITUD", "FINALIZACION", "INCIDENTES"];

const TEMPLATE_SECTIONS: Record<CrmExcelTemplate, CrmExcelSection[]> = {
  DIRECCION: ["RESUMEN", "NATURAL", "ARRASTRE", "TENDENCIA", "PATIOS", "CLIENTES", "GUIA"],
  CONTRATO: ["RESUMEN", "NATURAL", "ARRASTRE", "CONTRATOS", "PAQUETES", "OPERACIONES", "GUIA"],
  COBRANZA: ["RESUMEN", "NATURAL", "ARRASTRE", "CLIENTES", "COBRANZA", "OPERACIONES", "GUIA"],
  COMPLETO: ["RESUMEN", "NATURAL", "ARRASTRE", "TENDENCIA", "PATIOS", "CLIENTES", "CONTRATOS", "PAQUETES", "COBRANZA", "OPERACIONES", "GUIA"],
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

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);
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

async function monthlyChart(trend: Analytics["trend"], includeArrastre: boolean) {
  const width = 1100;
  const height = 380;
  const margin = { left: 58, right: 22, top: 42, bottom: 58 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const series = [
    { key: "natural", label: "Natural", color: "#059669" },
    ...(includeArrastre ? [{ key: "arrastre", label: "Arrastre", color: "#2563eb" }] : []),
    { key: "wash", label: "Lavado", color: "#0891b2" },
    { key: "turning", label: "Torno", color: "#d97706" },
  ];
  const max = Math.max(1, ...trend.flatMap((item) => series.map((entry) => number(item[entry.key]))));
  const group = plotWidth / Math.max(1, trend.length);
  const bar = Math.max(5, Math.min(15, group / (series.length + 1)));
  const grid = Array.from({ length: 5 }, (_, index) => {
    const y = margin.top + (plotHeight / 4) * index;
    const value = Math.round(max * (1 - index / 4));
    return `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#e2e8f0"/><text x="${margin.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#64748b">${value}</text>`;
  }).join("");
  const bars = trend.map((item, index) => {
    const center = margin.left + group * index + group / 2;
    const values = series.map((entry) => number(item[entry.key]));
    const rects = values.map((value, keyIndex) => {
      const h = value / max * plotHeight;
      const x = center + (keyIndex - (series.length - 1) / 2) * bar + 1;
      const y = margin.top + plotHeight - h;
      return `<rect x="${x}" y="${y}" width="${bar - 2}" height="${h}" rx="2" fill="${series[keyIndex].color}"/>`;
    }).join("");
    return `${rects}<text x="${center}" y="${height - 28}" text-anchor="middle" font-size="10" fill="#475569">${escapeXml(text(item.label))}</text>`;
  }).join("");
  const legend = series.map((entry, index) => `<rect x="${margin.left + index * 150}" y="14" width="12" height="12" rx="2" fill="${entry.color}"/><text x="${margin.left + index * 150 + 18}" y="25" font-size="12" font-weight="700" fill="#334155">${entry.label}</text>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" rx="18" fill="#ffffff"/>${legend}${grid}${bars}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
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

async function originExecutiveChart(trend: Analytics["trend"], origin: "NATURAL" | "ARRASTRE") {
  const width = 1100;
  const height = 350;
  const margin = { left: 58, right: 24, top: 48, bottom: 58 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const series = origin === "NATURAL"
    ? [{ key: "natural", label: "Movimientos naturales", color: "#059669" }, { key: "wash", label: "Lavados", color: "#0891b2" }, { key: "turning", label: "Torneados", color: "#d97706" }]
    : [{ key: "arrastre", label: "Solicitudes de arrastre", color: "#2563eb" }, { key: "wagons", label: "Vagones", color: "#7c3aed" }];
  const max = Math.max(1, ...trend.flatMap((item) => series.map((entry) => number(item[entry.key]))));
  const groupWidth = plotWidth / Math.max(1, trend.length);
  const barWidth = Math.max(5, Math.min(22, groupWidth / (series.length + 1)));
  const grid = Array.from({ length: 5 }, (_, index) => {
    const y = margin.top + plotHeight / 4 * index;
    return `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#e2e8f0"/><text x="${margin.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#64748b">${Math.round(max * (1 - index / 4))}</text>`;
  }).join("");
  const bars = trend.map((item, index) => {
    const center = margin.left + groupWidth * index + groupWidth / 2;
    const rects = series.map((entry, seriesIndex) => {
      const value = number(item[entry.key]);
      const barHeight = value / max * plotHeight;
      const x = center + (seriesIndex - (series.length - 1) / 2) * barWidth - barWidth / 2;
      return `<rect x="${x}" y="${margin.top + plotHeight - barHeight}" width="${barWidth - 2}" height="${barHeight}" rx="3" fill="${entry.color}"/>`;
    }).join("");
    return `${rects}<text x="${center}" y="${height - 25}" text-anchor="middle" font-size="10" fill="#475569">${escapeXml(text(item.label))}</text>`;
  }).join("");
  const legend = series.map((entry, index) => `<rect x="${margin.left + index * 220}" y="16" width="13" height="13" rx="3" fill="${entry.color}"/><text x="${margin.left + index * 220 + 20}" y="28" font-size="12" font-weight="700" fill="#334155">${entry.label}</text>`).join("");
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" rx="18" fill="#ffffff"/>${legend}${grid}${bars}</svg>`)).png().toBuffer();
}

async function addOriginExecutiveSheet(workbook: ExcelJS.Workbook, analytics: Analytics, origin: "NATURAL" | "ARRASTRE") {
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
    return;
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
  const chart = await originExecutiveChart(analytics.trend, origin);
  const chartId = workbook.addImage({ buffer: chart as any, extension: "png" });
  sheet.addImage(chartId, { tl: { col: 0, row: 16 }, ext: { width: 1100, height: 350 } });
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
}

function packageUsage(item: any, analytics: Analytics) {
  const empresaId = item.cliente?.empresaId;
  const includedStatuses = Array.isArray(item.estadosIncluidos) && item.estadosIncluidos.length
    ? item.estadosIncluidos.map(String)
    : ["CONCLUIDO"];
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

function addSummarySheet(workbook: ExcelJS.Workbook, analytics: Analytics, title: string, includeArrastre: boolean) {
  const sheet = workbook.addWorksheet("Resumen", { properties: { tabColor: { argb: COLORS.emerald } } });
  setSheetDefaults(sheet);
  for (let column = 1; column <= 12; column += 1) sheet.getColumn(column).width = 13;
  styleTitle(sheet, title, `Periodo analizado: ${analytics.meta.periodLabel || `${analytics.meta.range.from.slice(0, 10)} a ${analytics.meta.range.toExclusive.slice(0, 10)}`}`, 12);
  const total = number(analytics.kpis.operations);
  if (!total) {
    addNoDataPanel(sheet, "Sin información para el resumen", operationalNoDataDetail());
    return { sheet, imageRow: null };
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
  return { sheet, imageRow: 16 as number | null };
}

export async function buildCommercialCrmWorkbook(input: {
  analytics: Analytics;
  crm: CrmData;
  template: CrmExcelTemplate;
  title: string;
  sections?: CrmExcelSection[];
  operationColumns?: CrmExcelOperationColumn[];
  includeArrastre?: boolean;
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

  if (sections.has("RESUMEN")) {
    const summary = addSummarySheet(workbook, input.analytics, input.title, includeArrastre);
    if (summary.imageRow != null) {
      const chartBuffer = await monthlyChart(input.analytics.trend, includeArrastre);
      const chartId = workbook.addImage({ buffer: chartBuffer as any, extension: "png" });
      summary.sheet.addImage(chartId, { tl: { col: 0, row: summary.imageRow - 1 }, ext: { width: 1100, height: 380 } });
      for (let row = 16; row <= 36; row += 1) summary.sheet.getRow(row).height = 18;
    }
  }

  if (sections.has("NATURAL")) await addOriginExecutiveSheet(workbook, input.analytics, "NATURAL");
  if (sections.has("ARRASTRE")) await addOriginExecutiveSheet(workbook, input.analytics, "ARRASTRE");

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
      { header: "Día de corte", key: "diaCorte", width: 14 }, { header: "Orden de compra", key: "ordenCompra", width: 20 },
      { header: "Reglas de movimientos", key: "reglas", width: 22 },
    ], input.crm.contracts.map((item) => ({ cliente: item.cliente?.empresaNombre, folio: item.folio, nombre: item.nombre, estado: item.estado, inicio: excelDate(item.fechaInicio), fin: excelDate(item.fechaFin), diaCorte: item.diaCorte, ordenCompra: item.ordenCompra, reglas: number(item._count?.paquetes) })));
  }

  if (sections.has("PAQUETES")) {
    const packageRows = input.crm.packages.map((item) => {
      const usage = packageUsage(item, input.analytics);
      return {
        cliente: item.cliente?.empresaNombre,
        contrato: item.contrato?.folio,
        paquete: item.nombre,
        servicio: item.servicio,
        origen: item.origenOperacion || "TODOS",
        patio: input.analytics.catalogs.localities.find((locality) => locality.id === item.localidadId)?.nombre || "TODOS",
        unidad: item.unidad,
        periodicidad: item.periodicidad,
        estados: (Array.isArray(item.estadosIncluidos) && item.estadosIncluidos.length ? item.estadosIncluidos : ["CONCLUIDO"]).join(", "),
        incluido: usage.limit,
        consumido: usage.used,
        porcentaje: usage.percent == null ? null : usage.percent / 100,
        excedente: usage.excess,
        semaforo: usage.percent == null ? "SIN LIMITE" : usage.percent >= 100 ? "EXCEDIDO" : usage.percent >= 80 ? "ATENCION" : "EN RANGO",
      };
    });
    if (!packageRows.length) addNoDataSheet(workbook, "Cumplimiento contractual", periodLabel, input.crm.available ? "Sin reglas contractuales para este alcance" : "Fuente comercial no disponible", crmNoDataDetail("reglas contractuales", input.crm.available));
    else {
      const packageSheet = addDataSheet(workbook, "Cumplimiento contractual", [
        { header: "Cliente", key: "cliente", width: 27 }, { header: "Contrato", key: "contrato", width: 17 },
        { header: "Paquete / regla", key: "paquete", width: 34 }, { header: "Servicio", key: "servicio", width: 15 },
        { header: "Operación", key: "origen", width: 14 }, { header: "Patio", key: "patio", width: 22 },
        { header: "Unidad", key: "unidad", width: 14 }, { header: "Periodicidad", key: "periodicidad", width: 18 },
        { header: "Estados que cuentan", key: "estados", width: 30 },
        { header: "Incluido", key: "incluido", width: 13 }, { header: "Consumido", key: "consumido", width: 13 },
        { header: "% consumo", key: "porcentaje", width: 14, format: "0.0%" }, { header: "Excedente", key: "excedente", width: 13 },
        { header: "Semáforo", key: "semaforo", width: 15 },
      ], packageRows);
      for (let row = 2; row <= packageSheet.rowCount; row += 1) {
        const status = text(packageSheet.getCell(row, 14).value);
        const color = status === "EXCEDIDO" ? COLORS.rose : status === "ATENCION" ? COLORS.amber : status === "EN RANGO" ? COLORS.green : COLORS.blue;
        packageSheet.getCell(row, 14).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
        packageSheet.getCell(row, 14).font = { bold: true, color: { argb: COLORS.white } };
      }
    }
  }

  if (sections.has("COBRANZA")) {
    const cutRows = input.crm.cuts.map((item) => ({
      cliente: item.cliente?.empresaNombre,
      folio: item.folio,
      factura: item.facturaFolio,
      periodoInicio: excelDate(item.periodoInicio),
      periodoFin: excelDate(item.periodoFin),
      fechaCorte: excelDate(item.fechaCorte),
      vencimiento: excelDate(item.fechaVencimiento),
      estado: item.cobranza?.vencido ? "VENCIDO" : item.estado,
      movimientos: Array.isArray(item.detalles) ? item.detalles.length : 0,
      total: item.cobranza?.total == null ? null : item.cobranza.total,
      pagado: item.cobranza?.pagado,
      saldo: item.cobranza?.saldo,
      montoPendiente: item.cobranza?.montoPendienteCaptura ? "SI" : "NO",
    }));
    if (!cutRows.length) addNoDataSheet(workbook, "Cortes y saldo opcional", periodLabel, input.crm.available ? "Sin cortes para este alcance" : "Fuente comercial no disponible", crmNoDataDetail("cortes", input.crm.available));
    else {
      const cutSheet = addDataSheet(workbook, "Cortes y saldo opcional", [
        { header: "Cliente", key: "cliente", width: 28 }, { header: "Corte", key: "folio", width: 18 },
        { header: "Factura", key: "factura", width: 18 }, { header: "Periodo inicio", key: "periodoInicio", width: 15, format: "dd/mmm/yyyy" },
        { header: "Periodo fin", key: "periodoFin", width: 15, format: "dd/mmm/yyyy" }, { header: "Fecha corte", key: "fechaCorte", width: 15, format: "dd/mmm/yyyy" },
        { header: "Vencimiento", key: "vencimiento", width: 15, format: "dd/mmm/yyyy" }, { header: "Estado", key: "estado", width: 16 },
        { header: "Movimientos asociados", key: "movimientos", width: 22 }, { header: "Saldo inicial manual", key: "total", width: 20, format: "$#,##0.00" },
        { header: "Aplicado", key: "pagado", width: 18, format: "$#,##0.00" }, { header: "Saldo restante", key: "saldo", width: 18, format: "$#,##0.00" },
        { header: "Saldo por capturar", key: "montoPendiente", width: 20 },
      ], cutRows);
      for (let row = 2; row <= cutSheet.rowCount; row += 1) {
        const status = text(cutSheet.getCell(row, 8).value);
        if (status === "VENCIDO") {
          cutSheet.getCell(row, 8).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.rose } };
          cutSheet.getCell(row, 8).font = { bold: true, color: { argb: COLORS.white } };
        }
      }
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
    { concept: "Resumen", description: "Indicadores y gráfica automática del periodo y patio seleccionados." },
    { concept: "Naturales", description: "Unidad de negocio independiente: clientes de movimientos naturales, cumplimiento, cancelación, incidentes, lavado y torneado." },
    ...(includeArrastre ? [{ concept: "Arrastre", description: "Unidad de negocio exclusiva de Torreón: clientes, solicitudes, vagones, promedio por solicitud, cumplimiento e incidentes." }] : []),
    { concept: "Cumplimiento contractual", description: "Compara los movimientos reales del periodo con la cantidad incluida y cuenta solo los estados configurados en cada regla." },
    { concept: "Saldo opcional", description: "Los importes permanecen vacíos salvo que Comercial capture manualmente un saldo para seguimiento." },
    { concept: "Fuente de verdad", description: "Los datos operativos son de solo lectura. Contratos, reglas y cortes pertenecen únicamente a msComercial." },
  ]);
    dictionary.getColumn(2).alignment = { wrapText: true, vertical: "top" };
    dictionary.eachRow((row) => { if (row.number > 1) row.height = 34; });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
