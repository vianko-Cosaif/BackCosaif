import ExcelJS from "exceljs";
import type { CommercialOperation } from "./comercial-crm-analytics";
import { addNativeColumnChartData, injectNativeExcelCharts, type NativeExcelChartSpec } from "./native-excel-charts";

type ContractRule = {
  id: number;
  nombre: string;
  servicio: string;
  origenOperacion?: "NATURAL" | "ARRASTRE" | null;
  unidad: string;
  periodicidad: string;
  localidadId?: number | null;
  estadosIncluidos?: string[];
  cantidadIncluida?: string | number | null;
};

type Contract = {
  id: number;
  folio: string;
  nombre: string;
  estado: string;
  fechaInicio: string | Date;
  fechaFin?: string | Date | null;
  cliente?: { empresaId: number; empresaNombre: string };
};

type Input = {
  contract: Contract;
  rules: ContractRule[];
  operations: CommercialOperation[];
  monthKey: string;
  periodLabel: string;
  scopeLabel: string;
  localityNames: Map<number, string>;
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
  violet: "FF7C3AED",
  white: "FFFFFFFF",
  soft: "FFF8FAFC",
  line: "FFE2E8F0",
  muted: "FF64748B",
};

const DEFAULT_BILLABLE_STATUSES = ["CONCLUIDO", "CANCELADO", "DETENIDO", "EN_PROCESO"];

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function excelDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function setSheetDefaults(sheet: ExcelJS.Worksheet, frozenRows = 1) {
  sheet.views = [{ state: "frozen", ySplit: frozenRows, showGridLines: false }];
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

function addTitle(sheet: ExcelJS.Worksheet, title: string, subtitle: string, lastColumn: number) {
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

function addKpi(sheet: ExcelJS.Worksheet, range: string, label: string, value: string | number, color: string) {
  sheet.mergeCells(range);
  const cell = sheet.getCell(range.split(":")[0]);
  cell.value = { richText: [
    { text: `${label.toUpperCase()}\n`, font: { name: "Aptos", size: 9, bold: true, color: { argb: COLORS.muted } } },
    { text: String(value), font: { name: "Aptos Display", size: 20, bold: true, color: { argb: color } } },
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

function styleTable(sheet: ExcelJS.Worksheet, headerRow = 1) {
  const header = sheet.getRow(headerRow);
  header.height = 28;
  header.eachCell((cell) => {
    cell.font = { name: "Aptos", bold: true, size: 10, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.slate } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: COLORS.emerald } } };
  });
  sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: Math.max(1, sheet.columnCount) } };
  sheet.views = [{ state: "frozen", ySplit: headerRow, showGridLines: false }];
  for (let rowNumber = headerRow + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (rowNumber % 2 === 0) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.soft } };
    row.eachCell((cell) => {
      cell.font = { name: "Aptos", size: 10, color: { argb: COLORS.navy } };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: COLORS.line } } };
    });
  }
}

function operationMatchesRule(operation: CommercialOperation, rule: ContractRule) {
  const statuses = rule.estadosIncluidos?.length ? rule.estadosIncluidos : DEFAULT_BILLABLE_STATUSES;
  return statuses.includes(operation.status)
    && (!rule.localidadId || operation.localidadId === rule.localidadId)
    && (!rule.origenOperacion || operation.origin === rule.origenOperacion)
    && operation.services.includes(rule.servicio as "MOVIMIENTO" | "LAVADO" | "TORNEADO");
}

function ruleUsage(rule: ContractRule, operations: CommercialOperation[], monthKey: string) {
  const matching = operations.filter((operation) => operationMatchesRule(operation, rule));
  const used = rule.unidad === "VAGON"
    ? matching.reduce((sum, operation) => sum + operation.wagons, 0)
    : matching.length;
  const quantity = rule.cantidadIncluida == null ? null : number(rule.cantidadIncluida);
  const [year, month] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const limit = quantity == null || rule.unidad === "TARIFA_FIJA"
    ? null
    : rule.periodicidad === "SEMANAL"
      ? quantity * Math.ceil(daysInMonth / 7)
      : quantity;
  const excess = limit == null ? 0 : Math.max(0, used - limit);
  const percent = limit ? used / limit : null;
  return { used, limit, excess, percent };
}

function dailyRows(operations: CommercialOperation[]) {
  const rows = new Map<string, { label: string; movements: number; quantity: number }>();
  for (const operation of operations) {
    const key = operation.requestedAt.slice(0, 10);
    const item = rows.get(key) || { label: new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`)), movements: 0, quantity: 0 };
    item.movements += 1;
    item.quantity += operation.requestedQuantity ?? (operation.origin === "ARRASTRE" ? operation.wagons : 1);
    rows.set(key, item);
  }
  return [...rows.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, item]) => item);
}

function statusRows(operations: CommercialOperation[]) {
  const rows = new Map<string, { status: string; movements: number; quantity: number }>();
  for (const operation of operations) {
    const item = rows.get(operation.status) || { status: operation.status, movements: 0, quantity: 0 };
    item.movements += 1;
    item.quantity += operation.requestedQuantity ?? (operation.origin === "ARRASTRE" ? operation.wagons : 1);
    rows.set(operation.status, item);
  }
  return [...rows.values()].sort((a, b) => b.movements - a.movements || a.status.localeCompare(b.status, "es"));
}

function addSummarySheet(workbook: ExcelJS.Workbook, input: Input) {
  const sheet = workbook.addWorksheet("Resumen", { properties: { tabColor: { argb: COLORS.emerald } } });
  setSheetDefaults(sheet);
  for (let column = 1; column <= 12; column += 1) sheet.getColumn(column).width = 13;
  addTitle(sheet, `${input.contract.folio} · ${input.contract.nombre}`, `${input.contract.cliente?.empresaNombre || "Cliente"} · ${input.periodLabel} · ${input.scopeLabel}`, 12);

  const totalQuantity = input.operations.reduce((sum, operation) => sum + (operation.requestedQuantity ?? (operation.origin === "ARRASTRE" ? operation.wagons : 1)), 0);
  const completed = input.operations.filter((operation) => operation.completed).length;
  const incidents = input.operations.reduce((sum, operation) => sum + operation.incidents, 0);
  const excess = input.rules.reduce((sum, rule) => sum + ruleUsage(rule, input.operations, input.monthKey).excess, 0);
  addKpi(sheet, "A5:C8", "Movimientos", input.operations.length, COLORS.navy);
  addKpi(sheet, "D5:F8", "Cantidad solicitada", totalQuantity, COLORS.blue);
  addKpi(sheet, "G5:I8", "Concluidos", completed, COLORS.green);
  addKpi(sheet, "J5:L8", "Excedente", excess, excess ? COLORS.rose : COLORS.emerald);
  for (let row = 5; row <= 8; row += 1) sheet.getRow(row).height = 24;

  sheet.mergeCells("A10:L10");
  sheet.getCell("A10").value = `Cliente: ${input.contract.cliente?.empresaNombre || "—"}  ·  Contrato: ${input.contract.nombre}  ·  Estado: ${input.contract.estado}  ·  Incidentes: ${incidents}`;
  sheet.getCell("A10").font = { bold: true, size: 11, color: { argb: COLORS.slate } };
  sheet.getCell("A10").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.soft } };
  sheet.getCell("A10").alignment = { vertical: "middle", wrapText: true };
  sheet.getRow(10).height = 28;

  const charts: NativeExcelChartSpec[] = [];
  const days = dailyRows(input.operations);
  const statuses = statusRows(input.operations);
  if (days.length) {
    const chart = addNativeColumnChartData(sheet, {
      title: "Movimientos y cantidad solicitada por día",
      categories: days.map((item) => item.label),
      series: [
        { name: "Movimientos", color: COLORS.emerald, values: days.map((item) => item.movements) },
        { name: "Cantidad solicitada", color: COLORS.blue, values: days.map((item) => item.quantity) },
      ],
      startColumn: 14,
      startRow: 13,
      anchor: { fromCol: 0, fromRow: 12, toCol: 7, toRow: 32 },
    });
    if (chart) charts.push(chart);
  }
  if (statuses.length) {
    const chart = addNativeColumnChartData(sheet, {
      title: "Movimientos por estado",
      categories: statuses.map((item) => item.status),
      series: [
        { name: "Movimientos", color: COLORS.violet, values: statuses.map((item) => item.movements) },
        { name: "Cantidad solicitada", color: COLORS.cyan, values: statuses.map((item) => item.quantity) },
      ],
      startColumn: 18,
      startRow: 13,
      anchor: { fromCol: 7, fromRow: 12, toCol: 12, toRow: 32 },
    });
    if (chart) charts.push(chart);
  }
  for (let row = 13; row <= 32; row += 1) sheet.getRow(row).height = 18;

  sheet.mergeCells("A35:L35");
  sheet.getCell("A35").value = input.operations.length
    ? "Las hojas Movimientos y Cumplimiento contienen el detalle auditable del mes."
    : "No se encontraron movimientos cobrables para las reglas de este contrato durante el mes.";
  sheet.getCell("A35").font = { italic: true, color: { argb: COLORS.muted } };
  sheet.getCell("A35").alignment = { horizontal: "center" };
  return charts;
}

function addMovementsSheet(workbook: ExcelJS.Workbook, input: Input) {
  const sheet = workbook.addWorksheet("Movimientos", { properties: { tabColor: { argb: COLORS.blue } } });
  setSheetDefaults(sheet);
  const scopedServices = new Set(input.rules.map((rule) => rule.servicio));
  sheet.columns = [
    { header: "Movimiento", key: "movement", width: 24 },
    { header: "Cliente", key: "client", width: 28 },
    { header: "Solicitado por", key: "requestedBy", width: 24 },
    { header: "Cantidad solicitada", key: "quantity", width: 18 },
    { header: "Vía origen", key: "fromTrack", width: 24 },
    { header: "Vía destino", key: "toTrack", width: 24 },
    { header: "Fecha solicitud", key: "requestedAt", width: 20, style: { numFmt: "dd/mmm/yyyy hh:mm" } },
    { header: "Fecha inicio", key: "startedAt", width: 20, style: { numFmt: "dd/mmm/yyyy hh:mm" } },
    { header: "Fecha fin", key: "completedAt", width: 20, style: { numFmt: "dd/mmm/yyyy hh:mm" } },
    { header: "Tipo", key: "origin", width: 14 },
    { header: "Servicios", key: "services", width: 24 },
    { header: "Estado", key: "status", width: 17 },
    { header: "Patio", key: "yard", width: 22 },
    { header: "Locomotora", key: "locomotive", width: 14 },
    { header: "Incidentes", key: "incidents", width: 12 },
    { header: "Fuente", key: "source", width: 14 },
  ];
  for (const operation of input.operations) sheet.addRow({
    movement: operation.reference,
    client: operation.empresa,
    requestedBy: operation.requestedBy || operation.empresa,
    quantity: operation.requestedQuantity ?? (operation.origin === "ARRASTRE" ? operation.wagons : 1),
    fromTrack: operation.viaOrigen || "Sin vía capturada",
    toTrack: operation.viaDestino || "Sin vía capturada",
    requestedAt: excelDate(operation.requestedAt),
    startedAt: excelDate(operation.startedAt),
    completedAt: excelDate(operation.completedAt),
    origin: operation.origin,
    services: operation.services.filter((service) => scopedServices.has(service)).join(", "),
    status: operation.status,
    yard: operation.localidad,
    locomotive: operation.locomotiveNumber,
    incidents: operation.incidents,
    source: operation.sourceSystem,
  });
  styleTable(sheet);
  if (!input.operations.length) {
    sheet.addRow({ movement: "Sin movimientos cobrables para este contrato y mes" });
    sheet.mergeCells(2, 1, 3, 16);
    sheet.getCell(2, 1).alignment = { vertical: "middle", horizontal: "center" };
    sheet.getCell(2, 1).font = { italic: true, color: { argb: COLORS.muted } };
  }
}

function addComplianceSheet(workbook: ExcelJS.Workbook, input: Input) {
  const sheet = workbook.addWorksheet("Cumplimiento", { properties: { tabColor: { argb: COLORS.amber } } });
  setSheetDefaults(sheet);
  sheet.columns = [
    { header: "Regla contractual", key: "rule", width: 34 },
    { header: "Servicio", key: "service", width: 16 },
    { header: "Operación", key: "origin", width: 16 },
    { header: "Patio", key: "yard", width: 24 },
    { header: "Unidad", key: "unit", width: 16 },
    { header: "Periodicidad", key: "periodicity", width: 18 },
    { header: "Estados cobrables", key: "statuses", width: 34 },
    { header: "Contratado", key: "limit", width: 14 },
    { header: "Consumido", key: "used", width: 14 },
    { header: "Excedente", key: "excess", width: 14 },
    { header: "% consumo", key: "percent", width: 14, style: { numFmt: "0.0%" } },
    { header: "Semáforo", key: "status", width: 16 },
  ];
  for (const rule of input.rules) {
    const usage = ruleUsage(rule, input.operations, input.monthKey);
    sheet.addRow({
      rule: rule.nombre,
      service: rule.servicio,
      origin: rule.origenOperacion || "TODOS",
      yard: rule.localidadId ? input.localityNames.get(rule.localidadId) || `Patio #${rule.localidadId}` : "TODOS",
      unit: rule.unidad,
      periodicity: rule.periodicidad,
      statuses: (rule.estadosIncluidos?.length ? rule.estadosIncluidos : DEFAULT_BILLABLE_STATUSES).join(", "),
      limit: usage.limit,
      used: usage.used,
      excess: usage.excess,
      percent: usage.percent,
      status: usage.percent == null ? "SIN LÍMITE" : usage.percent >= 1 ? "EXCEDIDO" : usage.percent >= .8 ? "ATENCIÓN" : "EN RANGO",
    });
  }
  styleTable(sheet);
  for (let row = 2; row <= sheet.rowCount; row += 1) {
    const status = String(sheet.getCell(row, 12).value || "");
    const color = status === "EXCEDIDO" ? COLORS.rose : status === "ATENCIÓN" ? COLORS.amber : status === "EN RANGO" ? COLORS.green : COLORS.blue;
    sheet.getCell(row, 12).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    sheet.getCell(row, 12).font = { bold: true, color: { argb: COLORS.white } };
  }
}

function addGuideSheet(workbook: ExcelJS.Workbook, input: Input) {
  const sheet = workbook.addWorksheet("Guía");
  setSheetDefaults(sheet);
  sheet.columns = [{ header: "Hoja / campo", key: "subject", width: 30 }, { header: "Descripción", key: "description", width: 100 }];
  [
    { subject: "Alcance", description: `Contrato ${input.contract.folio} · ${input.periodLabel} · ${input.scopeLabel}. El archivo no mezcla otros contratos, meses ni tipos de servicio.` },
    { subject: "Resumen", description: "Indicadores del mes y gráficas nativas editables de actividad diaria y estados." },
    { subject: "Movimientos", description: "Detalle auditable: cliente, solicitante, cantidad solicitada, vías, fechas, servicio, estado, patio e incidentes." },
    { subject: "Cumplimiento", description: "Compara cada regla vigente del contrato contra los movimientos cobrables del mes." },
    { subject: "Cantidad solicitada", description: "En arrastre corresponde a vagones. En movimientos naturales y servicios corresponde a una solicitud." },
    { subject: "Fecha inicio", description: "Permanece vacía cuando la operación todavía no ha iniciado." },
    { subject: "Fecha fin", description: "Permanece vacía cuando la operación todavía no ha concluido." },
  ].forEach((row) => sheet.addRow(row));
  styleTable(sheet);
  sheet.getColumn(2).alignment = { wrapText: true, vertical: "top" };
  sheet.eachRow((row) => { if (row.number > 1) row.height = 34; });
}

export async function buildContractMonthWorkbook(input: Input) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "COSAIF Comercial";
  workbook.company = "Vianko";
  workbook.subject = "Detalle mensual independiente por contrato";
  workbook.title = `${input.contract.folio} · ${input.periodLabel} · ${input.scopeLabel}`;
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  const charts = addSummarySheet(workbook, input);
  addMovementsSheet(workbook, input);
  addComplianceSheet(workbook, input);
  addGuideSheet(workbook, input);

  const buffer = await workbook.xlsx.writeBuffer();
  return injectNativeExcelCharts(Buffer.from(buffer), charts);
}
