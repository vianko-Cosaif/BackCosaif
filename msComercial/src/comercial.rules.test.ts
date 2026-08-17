import assert from "node:assert/strict";
import { signCommercialRequest } from "./security/serviceAuth";
import { calculatePlanAmount, validatePlanCanBeApproved, validatePlanTransition } from "./modules/planes/plan.rules";
import { planCreateSchema } from "./modules/planes/plan.schemas";
import { contratoCreateSchema } from "./modules/contratos/contrato.schemas";

assert.equal(
  calculatePlanAmount([
    { cantidad: 2, importeUnitarioAcordado: 1500 },
    { cantidad: "1.5", importeUnitarioAcordado: "200" },
    { cantidad: 9, importeUnitarioAcordado: null },
  ]),
  3300,
);

assert.doesNotThrow(() =>
  validatePlanCanBeApproved({
    cliente: { requiereOrdenCompra: true },
    ordenCompra: "OC-2026-100",
    detalles: [{ importeUnitarioAcordado: 100 }],
  }),
);
assert.throws(
  () => validatePlanCanBeApproved({ cliente: { requiereOrdenCompra: false }, detalles: [] }),
  /al menos un concepto/,
);
assert.throws(
  () => validatePlanCanBeApproved({
    cliente: { requiereOrdenCompra: false },
    detalles: [{ importeUnitarioAcordado: null }],
  }),
  /necesitan una tarifa/,
);

assert.doesNotThrow(() => validatePlanTransition("BORRADOR", "APROBADO"));
assert.doesNotThrow(() => validatePlanTransition("APROBADO", "EN_EJECUCION"));
assert.throws(() => validatePlanTransition("EN_EJECUCION", "BORRADOR"), /no puede cambiar/);

const validPlan = planCreateSchema.parse({
  clienteComercialId: 1,
  folio: "PLAN-2026-001",
  nombre: "Plan semanal",
  fechaInicio: "2026-07-20T00:00:00.000Z",
  fechaFin: "2026-07-26T23:59:59.000Z",
  detalles: [],
});
assert.equal(validPlan.periodicidad, "UNICO");
assert.equal(validPlan.estado, "BORRADOR");

const annualContractWithMonthlyControl = contratoCreateSchema.parse({
  clienteComercialId: 1,
  folio: "CONT-2026-001",
  nombre: "Contrato anual con control mensual",
  fechaInicio: "2026-01-01T00:00:00.000Z",
  fechaFin: "2026-12-31T23:59:59.000Z",
  reglaInicial: {
    nombre: "120 movimientos por mes",
    unidad: "MOVIMIENTO",
    periodicidad: "MENSUAL",
    cantidadIncluida: 120,
    estadosIncluidos: ["CONCLUIDO"],
  },
});
assert.equal(annualContractWithMonthlyControl.reglaInicial?.periodicidad, "MENSUAL");
assert.equal(annualContractWithMonthlyControl.reglaInicial?.cantidadIncluida, 120);
assert.equal(annualContractWithMonthlyControl.fechaFin?.getUTCFullYear(), 2026);

const signed = signCommercialRequest({
  method: "POST",
  pathWithQuery: "/api/clientes",
  timestamp: "1784567890000",
  nonce: "test-nonce",
  bodyHash: "abc123",
  actorId: "10",
  actorRole: "COMERCIAL",
  secret: "test-secret",
});
assert.match(signed, /^v1=[a-f0-9]{64}$/);
assert.notEqual(
  signed,
  signCommercialRequest({
    method: "POST",
    pathWithQuery: "/api/clientes",
    timestamp: "1784567890000",
    nonce: "test-nonce",
    bodyHash: "abc123",
    actorId: "11",
    actorRole: "COMERCIAL",
    secret: "test-secret",
  }),
  "La firma debe proteger tambien la identidad del usuario",
);

console.log("Reglas comerciales verificadas correctamente");
