export type ServiceDestination = 'lathe' | 'wash';
export type DestinationEvidence = 'via' | 'service' | 'ambiguous' | 'missing';
type DestinationInput = {
  viaOrigen: { id: number; nombre: string } | null;
  viaDestino: { id: number; nombre: string } | null;
  torno?: boolean | null;
  lavado?: boolean | null;
};
export function serviceFromTrack(name: string): ServiceDestination | null {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/^via\s+(para\s+|de\s+)?/, '');
  return normalized === 'torno' ? 'lathe' : ['lavado', 'lavadero'].includes(normalized) ? 'wash' : null;
}
export function resolveDestination(m: DestinationInput): { label: string; service: ServiceDestination | null; evidence: DestinationEvidence } {
  // A stored destination wins: service flags also occur on movements returning FROM a service.
  if (m.viaDestino) return {
    label: m.viaDestino.nombre,
    service: m.viaOrigen?.id === m.viaDestino.id ? null : serviceFromTrack(m.viaDestino.nombre),
    evidence: 'via',
  };
  if (m.torno === true && m.lavado === true) return { label: 'Torno / Lavado por confirmar', service: null, evidence: 'ambiguous' };
  if (m.torno === true) return { label: 'Torno', service: 'lathe', evidence: 'service' };
  if (m.lavado === true) return { label: 'Lavado', service: 'wash', evidence: 'service' };
  return { label: 'Sin destino identificado', service: null, evidence: 'missing' };
}
