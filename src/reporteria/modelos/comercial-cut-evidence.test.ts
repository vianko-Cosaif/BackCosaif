import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { buildCommercialCutEvidence, renderCommercialCutEvidencePdf, renderCommercialGeneralCutPdf } from "./comercial-cut-evidence";
import { closeBrowser } from "./pdf-browser";
import type { CommercialOperation } from "./comercial-crm-analytics";

const operations: CommercialOperation[] = Array.from({ length: 4 }, (_, index) => ({
  key: "COSAIF:NATURAL:" + (index + 1),
  sourceSystem: "COSAIF",
  origin: "NATURAL",
  sourceId: String(index + 1),
  empresaId: 10,
  empresa: "Cliente Demo",
  localidadId: 1,
  localidad: "Guadalajara",
  locomotiveNumber: 900 + index,
  wagons: 0,
  requestedQuantity: 1,
  viaOrigen: "Via A",
  viaDestino: "Via B",
  requestedBy: "Solicitante " + (index + 1),
  status: "CONCLUIDO",
  completed: true,
  cancelled: false,
  stopped: false,
  services: ["MOVIMIENTO"],
  requestedAt: "2026-07-0" + (index + 1) + "T14:00:00.000Z",
  startedAt: "2026-07-0" + (index + 1) + "T14:15:00.000Z",
  completedAt: "2026-07-0" + (index + 1) + "T15:00:00.000Z",
  operationAt: "2026-07-0" + (index + 1) + "T15:00:00.000Z",
  incidents: 0,
  reference: "Movimiento #" + (index + 1),
}));

async function run() {
  const evidence = buildCommercialCutEvidence({
    contract: {
      id: 8,
      folio: "ALT-2026",
      nombre: "Contrato demo",
      moneda: "MXN",
      montoMaximo: 1000,
      cliente: { empresaId: 10, empresaNombre: "Cliente Demo" },
      paquetes: [{
        id: 12,
        nombre: "Movimientos mensuales",
        servicio: "MOVIMIENTO",
        origenOperacion: "NATURAL",
        unidad: "MOVIMIENTO",
        periodicidad: "MENSUAL",
        localidadId: 1,
        estadosIncluidos: ["CONCLUIDO"],
        cantidadIncluida: 2,
        importeExcedente: 50,
        activo: true,
        vigenciaInicio: "2026-01-01",
      }],
    },
    operations,
    periodStart: "2026-07-01",
    periodEnd: "2026-07-31",
    periodLabel: "julio 2026",
    selectedMonths: 1,
  });
  assert.equal(evidence.rules[0].included, 2);
  assert.equal(evidence.rules[0].consumed, 4);
  assert.equal(evidence.rules[0].excess, 2);
  assert.equal(evidence.excessRows.length, 2);
  assert.equal(evidence.excessRows[0].movementId, "COSAIF-3");
  assert.equal(evidence.excessRows[0].requester, "Solicitante 3");
  assert.equal(evidence.totals.base, 1000);
  assert.equal(evidence.totals.extras, 100);
  assert.equal(evidence.totals.calculated, 1100);

  const pdf = await renderCommercialCutEvidencePdf(evidence);
  assert.ok(pdf.buffer.length > 20_000, "El PDF debe contener diseño y detalle");
  const generalPdf = await renderCommercialGeneralCutPdf([
    evidence,
    {
      ...evidence,
      period: { ...evidence.period, start: "2026-08-01", end: "2026-08-31", label: "agosto 2026" },
      cut: { ...evidence.cut, folio: "PRE-ALT-2026-2026-08" },
      rules: evidence.rules.map((rule) => ({ ...rule, consumed: 1, excess: 0, extraAmount: 0 })),
      excessRows: [],
      totals: { ...evidence.totals, extras: 0, calculated: 1000, official: 1000, balance: 1000 },
    },
  ], { months: ["2026-07", "2026-08"], scope: "Guadalajara · Movimientos naturales" });
  assert.ok(generalPdf.buffer.length > 25_000, "El Corte general debe contener resumen multi-mes y evidencia");
  const output = path.resolve("output/pdf");
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, "corte-comercial-evidencia-demo.pdf"), pdf.buffer);
  await fs.writeFile(path.join(output, "corte-general-evidencia-demo.pdf"), generalPdf.buffer);
  console.log("PDF de corte verificado: " + pdf.buffer.length + " bytes; Corte general: " + generalPdf.buffer.length + " bytes; 2 excedentes identificados");
  await closeBrowser();
}

void run();
