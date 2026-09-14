import { mean, quantile, ratio } from './analytics';

export type IncidentRow = {
  id: number; movementId: number; company: string; companyId: number; client: string;
  locomotive: number; description: string; state: string; startedAt: string; endedAt: string | null;
  duration: number | null; reporterId: number | null; reporter: string; openAge: number | null;
};
export function incidentStats(rows: IncidentRow[]) {
  const closed = rows.filter(i => i.state !== 'ABIERTO' && i.duration !== null).map(i => i.duration!);
  const resolved = rows.filter(i => i.state === 'RESUELTO');
  const times = resolved.flatMap(i => i.duration === null ? [] : [i.duration]);
  return {
    total: rows.length, movements: new Set(rows.map(i => i.movementId)).size,
    open: rows.filter(i => i.state === 'ABIERTO').length,
    closed: rows.filter(i => i.state === 'CERRADO').length,
    resolved: resolved.length, resolutionN: times.length, resolutionAverage: mean(times),
    resolutionMedian: quantile(times, .5), resolutionP90: quantile(times, .9),
    resolutionMissing: resolved.length - times.length,
    durationN: closed.length, medianClose: quantile(closed, .5),
    missingClose: rows.filter(i => i.state !== 'ABIERTO' && i.duration === null).length,
    oldestOpen: Math.max(0, ...rows.map(i => i.openAge ?? 0)),
  };
}
export function analyzeIncidents(rows: IncidentRow[]) {
  const descriptions = new Map<string, IncidentRow[]>();
  const reporters = new Map<string, IncidentRow[]>();
  for (const row of rows) {
    const text = row.description.trim().toLocaleLowerCase('es-MX').replace(/\s+/g, ' ') || 'Sin descripción';
    const id = String(row.reporterId ?? 'unassigned');
    for (const [map, key] of [[descriptions, text], [reporters, id]] as const) {
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
  }
  return {
    ...incidentStats(rows),
    frequent: [...descriptions].map(([description, list]) => ({ description, count: list.length, movements: new Set(list.map(i => i.movementId)).size, share: ratio(list.length, rows.length) })).sort((a, b) => b.count - a.count || a.description.localeCompare(b.description)),
    reporters: [...reporters].map(([key, list]) => ({ key, label: list[0].reporter, ...incidentStats(list) })).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)),
  };
}
