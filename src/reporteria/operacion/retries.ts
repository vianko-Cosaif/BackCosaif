import type { ReportRow } from './analytics';

export function analyzeRetries(rows: ReportRow[]) {
  const byId = new Map(rows.map(r => [r.id, r]));
  const parent = new Map(rows.map(r => [r.id, r.id]));
  const root = (id: number): number => { let key = id; while (parent.get(key) !== key) key = parent.get(key)!; return key; };
  const linked = new Set<number>();
  for (const row of rows) {
    const next = row.reprogrammedTo === null ? undefined : byId.get(row.reprogrammedTo);
    if (!next || next.companyId !== row.companyId || next.localityId !== row.localityId || next.locomotive !== row.locomotive || next.id === row.id) continue;
    const a = root(row.id), b = root(next.id); if (a !== b) parent.set(b, a);
    linked.add(row.id); linked.add(next.id);
  }
  const groups = new Map<number, ReportRow[]>();
  for (const row of rows) if (linked.has(row.id) || row.reprogrammedTo !== null || row.cancelledByIncidentLimit) {
    const key = root(row.id); if (!groups.has(key)) groups.set(key, []); groups.get(key)!.push(row);
  }
  return [...groups.values()].map(group => {
    const sorted = [...group].sort((a, b) => a.requestedAt.localeCompare(b.requestedAt) || a.id - b.id);
    const first = sorted[0], last = sorted[sorted.length - 1];
    return {
      key: String(first.id), company: first.company, client: new Set(sorted.map(r => r.clientKey)).size === 1 ? first.client : 'Varios clientes (ver movimientos)', locomotive: first.locomotive,
      ids: sorted.map(r => r.id), attempts: sorted.length, state: last.stateLabel,
      clientDelayMinutes: sorted.reduce((s, r) => s + (r.clientDelay ?? 0), 0),
      clientDelayMissing: sorted.filter(r => ['DETENIDO', 'CANCELADO'].includes(r.state) && r.clientDelay === null).length,
      waitMinutes: sorted.reduce((s, r) => s + (r.wait ?? 0), 0),
      executionMinutes: sorted.reduce((s, r) => s + (r.execution ?? 0), 0),
      incidents: sorted.reduce((s, r) => s + r.incidentCount, 0),
      cancelledByIncidentLimit: sorted.some(r => r.cancelledByIncidentLimit),
      continuesOutside: sorted.some(r => r.reprogrammedTo !== null && !sorted.some(x => x.id === r.reprogrammedTo)),
    };
  }).sort((a, b) => b.clientDelayMinutes - a.clientDelayMinutes || Number(a.key) - Number(b.key));
}
