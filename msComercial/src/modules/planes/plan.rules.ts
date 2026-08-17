import { CommercialDomainError } from "../../utils/domainError";

type PlanStatus = "BORRADOR" | "APROBADO" | "EN_EJECUCION" | "COMPLETADO" | "CANCELADO";

const NEXT_STATUSES: Record<PlanStatus, ReadonlySet<PlanStatus>> = {
  BORRADOR: new Set(["BORRADOR", "APROBADO", "CANCELADO"]),
  APROBADO: new Set(["APROBADO", "EN_EJECUCION", "CANCELADO"]),
  EN_EJECUCION: new Set(["EN_EJECUCION", "COMPLETADO", "CANCELADO"]),
  COMPLETADO: new Set(["COMPLETADO"]),
  CANCELADO: new Set(["CANCELADO"]),
};

export function validatePlanTransition(current: PlanStatus, next: PlanStatus) {
  if (!NEXT_STATUSES[current].has(next)) {
    throw new CommercialDomainError(`El plan no puede cambiar de ${current} a ${next}`, 409);
  }
}

export type ApprovablePlan = {
  ordenCompra?: string | null;
  cliente: { requiereOrdenCompra: boolean };
  detalles: Array<{ importeUnitarioAcordado?: unknown | null }>;
};

export function validatePlanCanBeApproved(plan: ApprovablePlan) {
  if (!plan.detalles.length) {
    throw new CommercialDomainError("El plan necesita al menos un concepto antes de aprobarse", 409);
  }
  if (plan.detalles.some((detalle) => detalle.importeUnitarioAcordado == null)) {
    throw new CommercialDomainError("Todos los conceptos necesitan una tarifa antes de aprobar el plan", 409);
  }
  if (plan.cliente.requiereOrdenCompra && !plan.ordenCompra?.trim()) {
    throw new CommercialDomainError("Este cliente requiere orden de compra para aprobar el plan", 409);
  }
}

export function calculatePlanAmount(detalles: Array<{ cantidad: unknown; importeUnitarioAcordado: unknown | null }>) {
  return detalles.reduce((total, detalle) => {
    if (detalle.importeUnitarioAcordado == null) return total;
    return total + Number(detalle.cantidad) * Number(detalle.importeUnitarioAcordado);
  }, 0);
}
