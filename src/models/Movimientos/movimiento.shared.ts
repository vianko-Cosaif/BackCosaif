export const ESTADOS_EDITABLES = new Set(['SOLICITADO', 'DETENIDO', 'ESPERA', 'MODIFICADO']);

export const EDITABLE_KEYS = new Set([
  'instrucciones',
  'locomotiveNumber',
  'viaOrigenId',
  'viaDestinoId',
  'tipoMovimiento',
  'posicionCabina',
  'posicionChimenea',
  'direccionEmpuje',
  'torno',
  'lavado',
]);

export type EditableMovimientoInput = Partial<Record<
  | 'instrucciones'
  | 'locomotiveNumber'
  | 'viaOrigenId'
  | 'viaDestinoId'
  | 'tipoMovimiento'
  | 'posicionCabina'
  | 'posicionChimenea'
  | 'direccionEmpuje'
  | 'torno'
  | 'lavado',
  string | number | boolean
>>;

export const getMaquinistaId = (value?: { maquinistaId?: number; operadorId?: number }) =>
  value?.maquinistaId ?? value?.operadorId;

export function pickEditable(data: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const key of Object.keys(data || {})) {
    if (EDITABLE_KEYS.has(key) && data[key] !== undefined) out[key] = data[key];
  }
  return out;
}

export function diff(oldObj: any, newObj: any) {
  const changes: Record<string, { old: any; new: any }> = {};
  for (const key of Object.keys(newObj)) {
    if (oldObj[key] !== newObj[key]) {
      changes[key] = { old: oldObj[key] ?? null, new: newObj[key] };
    }
  }
  return changes;
}
