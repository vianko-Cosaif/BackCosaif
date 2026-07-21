import assert from "node:assert/strict";
import ExcelJS from "exceljs";
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
      reference: "2026-12",
      range: { from: "2026-01-01T00:00:00.000-06:00", toExclusive: "2027-01-01T00:00:00.000-06:00" },
      torreonAvailable: true,
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
        status: "CONCLUIDO",
        completed: true,
        cancelled: false,
        stopped: false,
        services: ["MOVIMIENTO" as const],
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
    contracts: [{ id: 1, clienteComercialId: 1, folio: "ALT-2026", nombre: "Contrato Alstom", estado: "VIGENTE", fechaInicio: "2026-01-01", fechaFin: "2026-12-31", diaCorte: 25, cliente: { empresaNombre: "Alstom" }, _count: { paquetes: 1 } }],
    packages: [{ id: 1, clienteComercialId: 1, nombre: "30 arrastres", servicio: "MOVIMIENTO", origenOperacion: "ARRASTRE", unidad: "MOVIMIENTO", periodicidad: "MENSUAL", localidadId: 1, estadosIncluidos: ["CONCLUIDO", "CANCELADO"], cantidadIncluida: "30", cliente: { empresaId: 1, empresaNombre: "Alstom" }, contrato: { folio: "ALT-2026" } }],
    cuts: [{ id: 1, folio: "CORTE-12", periodoInicio: "2026-12-01", periodoFin: "2026-12-31", fechaCorte: "2026-12-31", fechaVencimiento: "2027-01-30", estado: "FACTURADO", facturaFolio: "F-100", detalles: [{ id: 1 }], cliente: { empresaNombre: "Alstom" }, cobranza: { total: 100000, pagado: 20000, saldo: 80000, vencido: false, montoPendienteCaptura: false } }],
    collection: { porCobrar: 80000, vencido: 0, cobrado: 20000, cortesSinMonto: 0 },
  };

  const buffer = await buildCommercialCrmWorkbook({ analytics, crm, template: "COMPLETO", title: "COSAIF Comercial · Alstom" });
  assert.ok(buffer.length > 20_000, "El archivo debe contener estilos, grafica y hojas de datos");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  const names = workbook.worksheets.map((sheet) => sheet.name);
  for (const required of ["Resumen", "Naturales", "Arrastre", "Tendencia del periodo", "Volumen por patio", "Contratos", "Cumplimiento contractual", "Cortes y saldo opcional", "Operaciones auditables", "Guía del archivo"]) {
    assert.ok(names.includes(required), `Falta la hoja ${required}`);
  }
  assert.equal(workbook.getWorksheet("Cumplimiento contractual")?.getCell("I2").value, "CONCLUIDO, CANCELADO");
  assert.equal(workbook.getWorksheet("Cumplimiento contractual")?.getCell("N2").value, "EN RANGO");
  assert.equal(workbook.getWorksheet("Cortes y saldo opcional")?.getCell("L2").value, 80000);
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
