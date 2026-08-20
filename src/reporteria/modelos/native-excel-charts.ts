import ExcelJS from "exceljs";
import JSZip from "jszip";

export type NativeExcelChartAnchor = {
  fromCol: number;
  fromRow: number;
  toCol: number;
  toRow: number;
};

export type NativeExcelChartSeriesInput = {
  name: string;
  color?: string;
  pointColors?: string[];
  values: Array<number | null | undefined>;
};

export type NativeExcelChartSpec = {
  sheetName: string;
  title: string;
  categories: string[];
  categoriesFormula: string;
  series: Array<{
    name: string;
    nameFormula: string;
    valuesFormula: string;
    color?: string;
    pointColors?: string[];
    values: number[];
  }>;
  anchor: NativeExcelChartAnchor;
};

const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const DRAWING_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing";
const CHART_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart";
const DRAWING_CT = "application/vnd.openxmlformats-officedocument.drawing+xml";
const CHART_CT = "application/vnd.openxmlformats-officedocument.drawingml.chart+xml";

function cleanText(value: unknown) {
  return value == null ? "" : String(value);
}

function safeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);
}

function unescapeXml(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function columnName(column: number) {
  let value = column;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name || "A";
}

function quotedSheetName(sheetName: string) {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

function cellFormula(sheetName: string, column: number, row: number) {
  return `${quotedSheetName(sheetName)}!$${columnName(column)}$${row}`;
}

function rangeFormula(sheetName: string, fromColumn: number, fromRow: number, toColumn: number, toRow: number) {
  return `${quotedSheetName(sheetName)}!$${columnName(fromColumn)}$${fromRow}:$${columnName(toColumn)}$${toRow}`;
}

function normalizeColor(value?: string) {
  const raw = cleanText(value || "2563EB").replace(/[^a-fA-F0-9]/g, "");
  const rgb = raw.length >= 8 ? raw.slice(-6) : raw;
  return (rgb || "2563EB").padStart(6, "0").slice(-6).toUpperCase();
}

function parseXmlAttributes(fragment: string) {
  const attrs = new Map<string, string>();
  for (const match of fragment.matchAll(/([\w:.-]+)="([^"]*)"/g)) attrs.set(match[1], unescapeXml(match[2]));
  return attrs;
}

function buildRelationshipsXml(relationships: string[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join("")}</Relationships>`;
}

function nextPartNumber(zip: JSZip, regex: RegExp) {
  let max = 0;
  for (const name of Object.keys(zip.files)) {
    const match = name.match(regex);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

async function readZipText(zip: JSZip, path: string) {
  const file = zip.file(path);
  if (!file) throw new Error(`No se encontró ${path} dentro del XLSX`);
  return file.async("string");
}

async function workbookSheetTargets(zip: JSZip) {
  const workbookXml = await readZipText(zip, "xl/workbook.xml");
  const relsXml = await readZipText(zip, "xl/_rels/workbook.xml.rels");
  const relTargets = new Map<string, string>();
  for (const match of relsXml.matchAll(/<Relationship\b([^>]*)\/>/g)) {
    const attrs = parseXmlAttributes(match[1]);
    const id = attrs.get("Id");
    const target = attrs.get("Target");
    if (id && target) relTargets.set(id, target);
  }
  const sheets = new Map<string, string>();
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*)\/>/g)) {
    const attrs = parseXmlAttributes(match[1]);
    const name = attrs.get("name");
    const relationId = attrs.get("r:id");
    const target = relationId ? relTargets.get(relationId) : null;
    if (!name || !target) continue;
    const normalized = target.startsWith("/") ? target.replace(/^\/+/, "") : `xl/${target}`;
    sheets.set(name, normalized.replace(/\/{2,}/g, "/"));
  }
  return sheets;
}

function addContentTypeOverride(contentTypesXml: string, partName: string, contentType: string) {
  if (contentTypesXml.includes(`PartName="${partName}"`)) return contentTypesXml;
  return contentTypesXml.replace(
    "</Types>",
    `<Override PartName="${partName}" ContentType="${contentType}"/></Types>`,
  );
}

function chartCache(values: string[]) {
  return `<c:ptCount val="${values.length}"/>${values.map((value, index) => `<c:pt idx="${index}"><c:v>${escapeXml(value)}</c:v></c:pt>`).join("")}`;
}

function numberCache(values: number[]) {
  return `<c:formatCode>#,##0</c:formatCode><c:ptCount val="${values.length}"/>${values.map((value, index) => `<c:pt idx="${index}"><c:v>${safeNumber(value)}</c:v></c:pt>`).join("")}`;
}

function buildChartXml(chart: NativeExcelChartSpec, chartNumber: number) {
  const categoryAxis = 600000000 + chartNumber * 2;
  const valueAxis = categoryAxis + 1;
  const seriesXml = chart.series.map((series, index) => {
    const color = normalizeColor(series.color);
    const pointColors = series.pointColors?.length
      ? series.pointColors.map((pointColor, pointIndex) => `<c:dPt><c:idx val="${pointIndex}"/><c:spPr><a:solidFill><a:srgbClr val="${normalizeColor(pointColor)}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr></c:dPt>`).join("")
      : "";
    return `<c:ser>
      <c:idx val="${index}"/><c:order val="${index}"/>
      <c:tx><c:strRef><c:f>${escapeXml(series.nameFormula)}</c:f><c:strCache>${chartCache([series.name])}</c:strCache></c:strRef></c:tx>
      <c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr>
      ${pointColors}
      <c:cat><c:strRef><c:f>${escapeXml(chart.categoriesFormula)}</c:f><c:strCache>${chartCache(chart.categories)}</c:strCache></c:strRef></c:cat>
      <c:val><c:numRef><c:f>${escapeXml(series.valuesFormula)}</c:f><c:numCache>${numberCache(series.values)}</c:numCache></c:numRef></c:val>
    </c:ser>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${REL_NS}">
  <c:date1904 val="0"/>
  <c:lang val="es-MX"/>
  <c:roundedCorners val="0"/>
  <c:chart>
    <c:title>
      <c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="es-MX" sz="1200" b="1"/><a:t>${escapeXml(chart.title)}</a:t></a:r></a:p></c:rich></c:tx>
      <c:layout/><c:overlay val="0"/>
    </c:title>
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:layout/>
      <c:barChart>
        <c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>
        ${seriesXml}
        <c:dLbls><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>
        <c:gapWidth val="65"/>
        <c:axId val="${categoryAxis}"/><c:axId val="${valueAxis}"/>
      </c:barChart>
      <c:catAx>
        <c:axId val="${categoryAxis}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/>
        <c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>
        <c:crossAx val="${valueAxis}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/>
      </c:catAx>
      <c:valAx>
        <c:axId val="${valueAxis}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines/>
        <c:numFmt formatCode="#,##0" sourceLinked="0"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>
        <c:crossAx val="${categoryAxis}"/><c:crosses val="autoZero"/><c:crossBetween val="between"/>
      </c:valAx>
    </c:plotArea>
    <c:legend><c:legendPos val="b"/><c:layout/><c:overlay val="0"/></c:legend>
    <c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/><c:showDLblsOverMax val="0"/>
  </c:chart>
  <c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></c:spPr>
  <c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1000" latin="Aptos"/></a:pPr></a:p></c:txPr>
</c:chartSpace>`;
}

function buildDrawingAnchor(chart: NativeExcelChartSpec, relationshipId: string, index: number) {
  return `<xdr:twoCellAnchor editAs="oneCell">
    <xdr:from><xdr:col>${chart.anchor.fromCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${chart.anchor.fromRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>${chart.anchor.toCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${chart.anchor.toRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro="">
      <xdr:nvGraphicFramePr><xdr:cNvPr id="${index + 2}" name="${escapeXml(chart.title)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
      <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
      <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="${REL_NS}" r:id="${relationshipId}"/></a:graphicData></a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>`;
}

function buildDrawingXml(anchors: string[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchors.join("")}</xdr:wsDr>`;
}

async function attachDrawingToSheet(zip: JSZip, sheetPath: string, drawingFile: string) {
  const worksheetXml = await readZipText(zip, sheetPath);
  const relsPath = sheetPath.replace("xl/worksheets/", "xl/worksheets/_rels/") + ".rels";
  const existingRels = zip.file(relsPath) ? await readZipText(zip, relsPath) : buildRelationshipsXml([]);
  const relationshipIds = Array.from(existingRels.matchAll(/Id="rId(\d+)"/g)).map((match) => Number(match[1]));
  const nextRelationshipId = `rId${Math.max(0, ...relationshipIds) + 1}`;
  const drawingTarget = `../drawings/${drawingFile.split("/").pop()}`;
  const relXml = `<Relationship Id="${nextRelationshipId}" Type="${DRAWING_REL}" Target="${drawingTarget}"/>`;
  const updatedRels = existingRels.replace("</Relationships>", `${relXml}</Relationships>`);

  const withNamespace = worksheetXml.replace(/<worksheet\b([^>]*)>/, (match, attrs: string) =>
    attrs.includes("xmlns:r=") ? match : `<worksheet${attrs} xmlns:r="${REL_NS}">`,
  );
  const updatedWorksheet = withNamespace.includes("<drawing ")
    ? withNamespace
    : withNamespace.replace("</worksheet>", `<drawing r:id="${nextRelationshipId}"/></worksheet>`);

  zip.file(relsPath, updatedRels);
  zip.file(sheetPath, updatedWorksheet);
}

export function addNativeColumnChartData(
  sheet: ExcelJS.Worksheet,
  options: {
    title: string;
    categories: string[];
    series: NativeExcelChartSeriesInput[];
    startRow: number;
    startColumn: number;
    anchor: NativeExcelChartAnchor;
  },
) {
  const categories = options.categories.map(cleanText);
  const series = options.series.filter((item) => item.values.length).map((item) => ({
    ...item,
    values: categories.map((_, index) => safeNumber(item.values[index])),
  }));
  if (!categories.length || !series.length) return null;

  const labelCell = sheet.getCell(Math.max(1, options.startRow - 1), options.startColumn);
  labelCell.value = "Datos de gráfica nativa";
  labelCell.font = { name: "Aptos", size: 9, italic: true, color: { argb: "FF64748B" } };

  const headerRow = sheet.getRow(options.startRow);
  const categoryHeader = sheet.getCell(options.startRow, options.startColumn);
  categoryHeader.value = "Periodo";
  categoryHeader.font = { bold: true, color: { argb: "FF0F172A" } };
  categoryHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  series.forEach((item, index) => {
    const cell = sheet.getCell(options.startRow, options.startColumn + index + 1);
    cell.value = item.name;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${normalizeColor(item.color)}` } };
    cell.alignment = { horizontal: "center" };
  });
  headerRow.height = Math.max(headerRow.height || 0, 22);

  categories.forEach((category, rowIndex) => {
    const rowNumber = options.startRow + rowIndex + 1;
    const categoryCell = sheet.getCell(rowNumber, options.startColumn);
    categoryCell.value = category;
    categoryCell.font = { name: "Aptos", size: 9, color: { argb: "FF334155" } };
    categoryCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowIndex % 2 ? "FFFFFFFF" : "FFF8FAFC" } };
    series.forEach((item, seriesIndex) => {
      const cell = sheet.getCell(rowNumber, options.startColumn + seriesIndex + 1);
      cell.value = item.values[rowIndex];
      cell.numFmt = "#,##0";
      cell.font = { name: "Aptos", size: 9, color: { argb: "FF0F172A" } };
      cell.alignment = { horizontal: "right" };
    });
    sheet.getRow(rowNumber).height = Math.max(sheet.getRow(rowNumber).height || 0, 18);
  });

  sheet.getColumn(options.startColumn).width = Math.max(sheet.getColumn(options.startColumn).width || 0, 14);
  for (let index = 1; index <= series.length; index += 1) {
    sheet.getColumn(options.startColumn + index).width = Math.max(sheet.getColumn(options.startColumn + index).width || 0, 12);
  }

  const lastRow = options.startRow + categories.length;
  return {
    sheetName: sheet.name,
    title: options.title,
    categories,
    categoriesFormula: rangeFormula(sheet.name, options.startColumn, options.startRow + 1, options.startColumn, lastRow),
    series: series.map((item, index) => ({
      name: item.name,
      nameFormula: cellFormula(sheet.name, options.startColumn + index + 1, options.startRow),
      valuesFormula: rangeFormula(sheet.name, options.startColumn + index + 1, options.startRow + 1, options.startColumn + index + 1, lastRow),
      color: item.color,
      pointColors: item.pointColors,
      values: item.values,
    })),
    anchor: options.anchor,
  } satisfies NativeExcelChartSpec;
}

export async function injectNativeExcelCharts(input: Buffer | ArrayBuffer, charts: NativeExcelChartSpec[]) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (!charts.length) return buffer;

  const zip = await JSZip.loadAsync(buffer);
  const sheetTargets = await workbookSheetTargets(zip);
  let contentTypesXml = await readZipText(zip, "[Content_Types].xml");
  let chartNumber = nextPartNumber(zip, /^xl\/charts\/chart(\d+)\.xml$/);
  let drawingNumber = nextPartNumber(zip, /^xl\/drawings\/drawing(\d+)\.xml$/);
  const grouped = new Map<string, NativeExcelChartSpec[]>();

  for (const chart of charts) grouped.set(chart.sheetName, [...(grouped.get(chart.sheetName) || []), chart]);

  for (const [sheetName, sheetCharts] of grouped.entries()) {
    const sheetPath = sheetTargets.get(sheetName);
    if (!sheetPath) continue;
    const drawingFile = `xl/drawings/drawing${drawingNumber}.xml`;
    const anchors: string[] = [];
    const relationships: string[] = [];

    sheetCharts.forEach((chart, index) => {
      const chartFile = `xl/charts/chart${chartNumber}.xml`;
      const chartRelationshipId = `rId${index + 1}`;
      zip.file(chartFile, buildChartXml(chart, chartNumber));
      relationships.push(`<Relationship Id="${chartRelationshipId}" Type="${CHART_REL}" Target="../charts/chart${chartNumber}.xml"/>`);
      anchors.push(buildDrawingAnchor(chart, chartRelationshipId, index));
      contentTypesXml = addContentTypeOverride(contentTypesXml, `/${chartFile}`, CHART_CT);
      chartNumber += 1;
    });

    zip.file(drawingFile, buildDrawingXml(anchors));
    zip.file(`xl/drawings/_rels/drawing${drawingNumber}.xml.rels`, buildRelationshipsXml(relationships));
    contentTypesXml = addContentTypeOverride(contentTypesXml, `/${drawingFile}`, DRAWING_CT);
    await attachDrawingToSheet(zip, sheetPath, drawingFile);
    drawingNumber += 1;
  }

  zip.file("[Content_Types].xml", contentTypesXml);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
