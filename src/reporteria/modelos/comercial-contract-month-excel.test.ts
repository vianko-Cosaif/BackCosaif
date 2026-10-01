import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { buildContractMonthWorkbook } from "./comercial-contract-month-excel";

async function run() {
  const buffer = await buildContractMonthWorkbook({
    contract: {
      id: 8,
      folio: "ALT-2026",
      nombre: "Contrato Alstom",
      estado: "VIGENTE",
      fechaInicio: "2026-01-01",
      fechaFin: "2026-12-31",
      cliente: { empresaId: 1, empresaNombre: "Alstom" },
    },
    monthKey: "2026-07",
    periodLabel: "julio 2026",
    scopeLabel: "Arrastre",
    localityNames: new Map([[2, "Torreon"]]),
    rules: [{
      id: 12,
      nombre: "Arrastre mensual",
      servicio: "MOVIMIENTO",
      origenOperacion: "ARRASTRE",
      unidad: "VAGON",
      periodicidad: "MENSUAL",
      localidadId: 2,
      estadosIncluidos: ["CONCLUIDO"],
      cantidadIncluida: "10",
    }],
    operations: [{
      key: "TORREON:ARRASTRE:44",
      sourceSystem: "TORREON",
      origin: "ARRASTRE",
      sourceId: "44",
      empresaId: 1,
      empresa: "Alstom",
      localidadId: 2,
      localidad: "Torreon",
      locomotiveNumber: null,
      wagons: 4,
      requestedQuantity: 4,
      viaOrigen: "Vía A",
      viaDestino: "Vía B",
      requestedBy: "Cliente Alstom",
      status: "CONCLUIDO",
      completed: true,
      cancelled: false,
      stopped: false,
      services: ["MOVIMIENTO", "LAVADO"],
      requestedAt: "2026-07-04T12:00:00.000Z",
      startedAt: "2026-07-04T12:30:00.000Z",
      completedAt: "2026-07-04T13:45:00.000Z",
      operationAt: "2026-07-04T13:45:00.000Z",
      incidents: 0,
      reference: "Arrastre #44",
    }],
  });

  assert.ok(buffer.length > 15_000, "El archivo debe contener estilos, detalle y gráficas");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Resumen", "Movimientos", "Cumplimiento", "Guía"]);
  const movements = workbook.getWorksheet("Movimientos");
  assert.equal(movements?.getCell("A1").value, "Movimiento");
  assert.equal(movements?.getCell("C1").value, "Solicitado por");
  assert.equal(movements?.getCell("D1").value, "Cantidad solicitada");
  assert.equal(movements?.getCell("E1").value, "Vía origen");
  assert.equal(movements?.getCell("F1").value, "Vía destino");
  assert.equal(movements?.getCell("C2").value, "Cliente Alstom");
  assert.equal(movements?.getCell("D2").value, 4);
  assert.equal(movements?.getCell("E2").value, "Vía A");
  assert.equal(movements?.getCell("F2").value, "Vía B");
  assert.equal(movements?.getCell("K2").value, "MOVIMIENTO");
  assert.equal(workbook.getWorksheet("Cumplimiento")?.getCell("I2").value, 4);
  assert.equal(workbook.getWorksheet("Cumplimiento")?.getCell("J2").value, 0);
  assert.match(String(workbook.getWorksheet("Guía")?.getCell("B2").value), /Arrastre/);

  const zip = await JSZip.loadAsync(buffer);
  const fileNames = Object.keys(zip.files);
  assert.ok(fileNames.some((name) => /^xl\/charts\/chart\d+\.xml$/.test(name)), "El Excel mensual debe incluir gráficas nativas");
  assert.ok(!fileNames.some((name) => /^xl\/media\/image\d+\./.test(name)), "Las gráficas no deben ser imágenes pegadas");
  console.log(`Excel contrato-mes verificado: ${buffer.length} bytes, detalle y gráficas correctos`);
}

void run();
