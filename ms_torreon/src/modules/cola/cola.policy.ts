type QueueUnit = { id: number; fechaRecepcion: Date | string; fechaHabilitacion: Date | string | null; ordenManual: number | null };
const time = (value: Date | string) => new Date(value).getTime();
export function compareNaturalUnits(a: QueueUnit, b: QueueUnit) {
  const rank = (unit: QueueUnit) => unit.fechaHabilitacion ? 0 : unit.ordenManual !== null ? 1 : 2;
  const category = rank(a) - rank(b);
  if (category) return category;
  if (a.fechaHabilitacion && b.fechaHabilitacion) return time(a.fechaHabilitacion) - time(b.fechaHabilitacion) || a.id - b.id;
  if (a.ordenManual !== null && b.ordenManual !== null) return a.ordenManual - b.ordenManual || a.id - b.id;
  return time(a.fechaRecepcion) - time(b.fechaRecepcion) || a.id - b.id;
}
export const NATURAL_DISPATCH_ROLES = new Set(['COORDINADOR', 'SUPERVISOR', 'ADMINISTRADOR']);
export const NATURAL_SOLUTION_ROLES = new Set([...NATURAL_DISPATCH_ROLES, 'CLIENTE', 'CLIENTE_ADMIN', 'CLIENTE_COOR']);
