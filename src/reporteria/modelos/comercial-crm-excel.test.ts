import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { buildCommercialCrmWorkbook } from "./comercial-crm-excel";

async function run() {
  const trend = Array.from({ length: 12 }, (_, index) => ({
    key: `2026-${String(index + 1).padStart(2, "0")}`,
    label: `Mes ${index + 1}`,
    natural: 10 + index,
    arrastre: 4 + index,
    wagons: 16 + index,
    wash: index % 3,
    turning: index % 2,
    total: 14 + index * 2,
    completed: 12 + index,
    cancelled: 1,
  }));
  const analytics = {
    meta: {
      reference: "2026-01_2026-12",
      range: { from: "2026-01-01T00:00:00.000-06:00", toExclusive: "2027-01-01T00:00:00.000-06:00" },
      torreonAvailable: true,
      months: 2,
      selectedMonthKeys: ["2026-01", "2026-12"],
      periodLabel: "enero de 2026 · diciembre de 2026",
    },
    catalogs: { localities: [{ id: 1, nombre: "Torreon" }] },
    kpis: { operations: 210, completed: 190, cancelled: 4, stopped: 3, arrastre: 75, wash: 18, turning: 9, monthlyGrowthPct: 12.5 },
    trend,
    clients: [{ id: 1, name: "Alstom", total: 210, completed: 190, natural: 135, arrastre: 75, wagons: 260, wash: 18, turning: 9 }],
    yards: [{ id: 1, name: "Torreon", total: 210, completed: 190, natural: 135, arrastre: 75, wagons: 260, wash: 18, turning: 9 }],
    currentBreakdown: [{ empresaId: 1, localidadId: 1, empresa: "Alstom", localidad: "Torreon", natural: 20, arrastre: 10, wagons: 34, wash: 3, turning: 1, completed: 30 }],
    contractBreakdown: [
      { empresaId: 1, localidadId: 1, origin: "NATURAL" as const, service: "MOVIMIENTO" as const, status: "CONCLUIDO", count: 135, wagons: 0, incidents: 2 },
      { empresaId: 1, localidadId: 1, origin: "ARRASTRE" as const, service: "MOVIMIENTO" as const, status: "CONCLUIDO", count: 18, wagons: 34, incidents: 1 },
      { empresaId: 1, localidadId: 1, origin: "ARRASTRE" as const, service: "MOVIMIENTO" as const, status: "CANCELADO", count: 2, wagons: 0, incidents: 0 },
    ],
    operations: {
      data: [{
        key: "TORREON:ARRASTRE:1",
        sourceSystem: "TORREON" as const,
        origin: "ARRASTRE" as const,
        sourceId: "1",
        empresaId: 1,
        empresa: "Alstom",
        localidadId: 1,
        localidad: "Torreon",
        locomotiveNumber: null,
        wagons: 4,
        requestedQuantity: 4,
        requestedBy: "Cliente Alstom",
        viaOrigen: "Vía Arrastre A",
        viaDestino: "Vía Arrastre B",
        status: "CONCLUIDO",
        completed: true,
        cancelled: false,
        stopped: false,
        services: ["MOVIMIENTO" as const, "LAVADO" as const],
        requestedAt: "2026-12-01T12:00:00.000Z",
        completedAt: "2026-12-01T13:00:00.000Z",
        operationAt: "2026-12-01T13:00:00.000Z",
        incidents: 0,
        reference: "Arrastre #1",
      }],
      meta: { total: 1 },
    },
  };
  const crm = {
    available: true,
    clients: [{ id: 1, empresaId: 1, empresaNombre: "Alstom" }],
    contracts: [
      {
        id: 1, clienteComercialId: 1, folio: "ALT-2026", nombre: "Contrato Alstom", estado: "VIGENTE", fechaInicio: "2026-01-01", fechaFin: "2026-12-31", diaCorte: 25, moneda: "MXN", montoMaximo: null,
        cliente: { empresaId: 1, empresaNombre: "Alstom" }, _count: { paquetes: 2 },
        paquetes: [
          { id: 1, nombre: "Arrastre mensual", servicio: "MOVIMIENTO", origenOperacion: "ARRASTRE", unidad: "VAGON", periodicidad: "MENSUAL", localidadId: 1, estadosIncluidos: ["CONCLUIDO"], cantidadIncluida: "3", montoPaquete: "5000", importeExcedente: "750", vigenciaInicio: "2026-01-01", vigenciaFin: "2026-12-31", activo: true },
          { id: 2, nombre: "Lavado extra", servicio: "LAVADO", origenOperacion: "ARRASTRE", unidad: "SERVICIO", periodicidad: "MENSUAL", localidadId: 1, estadosIncluidos: ["CONCLUIDO"], cantidadIncluida: "0", montoPaquete: "1200", importeExcedente: "300", vigenciaInicio: "2026-01-01", vigenciaFin: "2026-12-31", activo: true },
        ],
      },
      {
        id: 2, clienteComercialId: 1, folio: "RESERVADO-2026", nombre: "Contrato sin monto publicado", estado: "VIGENTE", fechaInicio: "2026-01-01", fechaFin: "2026-12-31", diaCorte: 31, moneda: "MXN", montoMaximo: null,
        cliente: { empresaId: 1, empresaNombre: "Alstom" }, _count: { paquetes: 1 },
        paquetes: [{ id: 3, nombre: "Servicio reservado", servicio: "MOVIMIENTO", origenOperacion: "NATURAL", unidad: "MOVIMIENTO", periodicidad: "MENSUAL", localidadId: 1, estadosIncluidos: ["CONCLUIDO"], cantidadIncluida: null, montoPaquete: null, importeExcedente: null, vigenciaInicio: "2026-01-01", vigenciaFin: "2026-12-31", activo: true }],
      },
    ],
    packages: [{ id: 1, clienteComercialId: 1, nombre: "Arrastre mensual", servicio: "MOVIMIENTO", origenOperacion: "ARRASTRE", unidad: "VAGON", periodicidad: "MENSUAL", localidadId: 1, estadosIncluidos: ["CONCLUIDO"], cantidadIncluida: "3", cliente: { empresaId: 1, empresaNombre: "Alstom" }, contrato: { folio: "ALT-2026", estado: "VIGENTE" } }],
    cuts: [
      { id: 10, contratoId: 2, folio: "CORTE-RES-01", periodoInicio: "2026-01-01", periodoFin: "2026-01-31", fechaCorte: "2026-01-31", fechaVencimiento: null, estado: "APROBADO", total: null, facturaFolio: null, aprobadoPorId: 7, aprobadoAt: "2026-02-01T09:00:00.000Z", updatedById: 7, updatedAt: "2026-02-01T09:00:00.000Z", pagos: [], historial: [], detalles: [], cliente: { empresaId: 1, empresaNombre: "Alstom" }, cobranza: { total: null, pagado: 0, saldo: null, vencido: false, montoPendienteCaptura: true } },
      { id: 11, contratoId: 1, folio: "CORTE-12", periodoInicio: "2026-12-01", periodoFin: "2026-12-31", fechaCorte: "2026-12-31", fechaVencimiento: "2027-01-30", estado: "PAGADO", total: "7250", facturaFolio: "F-100", aprobadoPorId: 7, aprobadoAt: "2027-01-02T09:00:00.000Z", updatedById: 9, updatedAt: "2027-01-15T16:20:00.000Z", pagos: [{ id: 81, monto: "7250", fechaPago: "2027-01-15", referencia: "TRANSFERENCIA-81", metodo: "SPEI", registradoPorId: 9, createdAt: "2027-01-15T16:20:00.000Z" }], historial: [{ id: 91, accion: "ACTUALIZAR_ESTADO", estadoAnterior: "FACTURADO", estadoNuevo: "PAGADO", actorId: 9, actorNombre: "María Comercial", actorRol: "COMERCIAL", cambios: { estado: { anterior: "FACTURADO", nuevo: "PAGADO" }, pago: { monto: 7250, referencia: "TRANSFERENCIA-81" } }, createdAt: "2027-01-15T16:20:00.000Z" }], detalles: [{ id: 1 }], cliente: { empresaId: 1, empresaNombre: "Alstom" }, cobranza: { total: 7250, pagado: 7250, saldo: 0, vencido: false, montoPendienteCaptura: false } },
    ],
    collection: { porCobrar: 0, vencido: 0, cobrado: 7250, cortesSinMonto: 1 },
  };

  const buffer = await buildCommercialCrmWorkbook({ analytics, crm, template: "COMPLETO", title: "COSAIF Comercial · Alstom" });
  assert.ok(buffer.length > 20_000, "El archivo debe contener estilos, grafica y hojas de datos");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  const names = workbook.worksheets.map((sheet) => sheet.name);
  for (const required of ["Resumen", "Naturales", "Arrastre", "Tendencia del periodo", "Volumen por patio", "Contratos", "Cumplimiento contractual", "Cortes y estados", "Control financiero", "Detalle financiero", "Excedentes cobrables", "Pagos registrados", "Historial de cortes", "Operaciones auditables", "Guía del archivo"]) {
    assert.ok(names.includes(required), `Falta la hoja ${required}`);
  }
  assert.equal(workbook.getWorksheet("Cumplimiento contractual")?.getCell("K2").value, "CONCLUIDO");
  assert.equal(workbook.getWorksheet("Cumplimiento contractual")?.getCell("R5").value, "EXCEDIDO");
  assert.equal(workbook.getWorksheet("Cortes y estados")?.getCell("G4").value, "PAGADO");
  assert.equal(workbook.getWorksheet("Cortes y estados")?.getCell("T4").value, 7250);
  assert.equal(workbook.getWorksheet("Cortes y estados")?.getCell("U4").value, 7250);
  assert.equal(workbook.getWorksheet("Cortes y estados")?.getCell("V4").value, 0);
  assert.equal(workbook.getWorksheet("Cortes y estados")?.getCell("S3").value, "OPCIONAL / NO CAPTURADO");
  assert.deepEqual(workbook.getWorksheet("Control financiero")?.getCell("B5").value, { formula: "COUNTA('Cortes y estados'!$D$2:$D$5)" });
  assert.equal(workbook.getWorksheet("Detalle financiero")?.getCell("N5").value, 750);
  assert.equal(workbook.getWorksheet("Excedentes cobrables")?.getCell("F2").value, "TORREON-1");
  assert.equal(workbook.getWorksheet("Pagos registrados")?.getCell("J2").value, "TRANSFERENCIA-81");
  assert.equal(workbook.getWorksheet("Historial de cortes")?.getCell("H2").value, "María Comercial");
  const zip = await JSZip.loadAsync(buffer);
  const fileNames = Object.keys(zip.files);
  assert.ok(fileNames.some((name) => /^xl\/charts\/chart\d+\.xml$/.test(name)), "El Excel debe incluir gráficas nativas");
  assert.ok(!fileNames.some((name) => /^xl\/media\/image\d+\./.test(name)), "El reporte CRM no debe pegar gráficas como imágenes");
  if (process.env.COSAIF_EXCEL_OUTPUT) {
    await mkdir(path.dirname(process.env.COSAIF_EXCEL_OUTPUT), { recursive: true });
    await writeFile(process.env.COSAIF_EXCEL_OUTPUT, buffer);
  }
  const customBuffer = await buildCommercialCrmWorkbook({
    analytics,
    crm,
    template: "COMPLETO",
    title: "Reporte construido por Comercial",
    sections: ["PATIOS", "OPERACIONES"],
    operationColumns: ["CLIENTE", "PATIO", "ESTADO"],
  });
  const customWorkbook = new ExcelJS.Workbook();
  await customWorkbook.xlsx.load(customBuffer as any);
  assert.deepEqual(customWorkbook.worksheets.map((sheet) => sheet.name), ["Volumen por patio", "Operaciones auditables"]);
  assert.equal(customWorkbook.getWorksheet("Operaciones auditables")?.getCell("A1").value, "Cliente");
  assert.equal(customWorkbook.getWorksheet("Operaciones auditables")?.getCell("B1").value, "Patio");
  assert.equal(customWorkbook.getWorksheet("Operaciones auditables")?.getCell("C1").value, "Estado");

  const naturalOnlyBuffer = await buildCommercialCrmWorkbook({
    analytics,
    crm,
    template: "COMPLETO",
    title: "Reporte de Guadalajara",
    sections: ["RESUMEN", "NATURAL", "ARRASTRE", "TENDENCIA", "PATIOS", "CLIENTES", "OPERACIONES", "GUIA"],
    operationColumns: ["CLIENTE", "TIPO", "VAGONES", "ESTADO"],
    includeArrastre: false,
  });
  const naturalOnlyWorkbook = new ExcelJS.Workbook();
  await naturalOnlyWorkbook.xlsx.load(naturalOnlyBuffer as any);
  assert.equal(naturalOnlyWorkbook.getWorksheet("Arrastre"), undefined, "Arrastre no debe existir fuera de Torreón");
  const trendValues = naturalOnlyWorkbook.getWorksheet("Tendencia del periodo")?.getRow(1).values;
  const trendHeaders = Array.isArray(trendValues) ? trendValues.map(String) : [];
  assert.ok(!trendHeaders.includes("Arrastres"), "La tendencia natural no debe mostrar Arrastre");
  assert.ok(!trendHeaders.includes("Vagones"), "La tendencia natural no debe mostrar Vagones");
  const operationValues = naturalOnlyWorkbook.getWorksheet("Operaciones auditables")?.getRow(1).values;
  const operationHeaders = Array.isArray(operationValues) ? operationValues.map(String) : [];
  assert.ok(!operationHeaders.includes("Vagones"), "El detalle natural no debe mostrar Vagones");

  const emptyAnalytics = {
    ...analytics,
    kpis: Object.fromEntries(Object.keys(analytics.kpis).map((key) => [key, 0])),
    trend: analytics.trend.map((item) => ({ ...item, natural: 0, arrastre: 0, wagons: 0, wash: 0, turning: 0, total: 0, completed: 0, cancelled: 0 })),
    clients: [],
    yards: [],
    currentBreakdown: [],
    contractBreakdown: [],
    operations: { data: [], meta: { total: 0 } },
  };
  const unavailableCrm = { available: false, clients: [], contracts: [], packages: [], cuts: [], collection: null };
  const emptyBuffer = await buildCommercialCrmWorkbook({
    analytics: emptyAnalytics,
    crm: unavailableCrm,
    template: "COMPLETO",
    title: "Reporte sin información",
    sections: ["RESUMEN", "NATURAL", "ARRASTRE", "CONTRATOS", "PAQUETES", "COBRANZA", "OPERACIONES"],
  });
  const emptyWorkbook = new ExcelJS.Workbook();
  await emptyWorkbook.xlsx.load(emptyBuffer as any);
  assert.equal(emptyWorkbook.getWorksheet("Naturales")?.getCell("A5").value, "Sin información de Naturales");
  assert.equal(emptyWorkbook.getWorksheet("Arrastre")?.getCell("A5").value, "Sin información de Arrastre");
  assert.equal(emptyWorkbook.getWorksheet("Contratos")?.getCell("A5").value, "Fuente comercial no disponible");
  assert.match(String(emptyWorkbook.getWorksheet("Cumplimiento contractual")?.getCell("A8").value), /fuente comercial no está disponible/i);
  assert.match(String(emptyWorkbook.getWorksheet("Operaciones auditables")?.getCell("A8").value), /no hay datos disponibles/i);
  console.log(`Excel comercial verificado: ${buffer.length} bytes, ${names.length} hojas; constructor configurable correcto`);
}

void run();
