import { ReportRow, groupRows, summarize } from './analytics';

export function destinationKind(row: ReportRow): 'lathe' | 'wash' | null {
  return row.destinationService;
}
const entryEvidence = (rows: ReportRow[]) => ({
  completedVia: rows.filter(r => r.state === 'CONCLUIDO' && r.destinationEvidence === 'via').length,
  completedService: rows.filter(r => r.state === 'CONCLUIDO' && r.destinationEvidence === 'service').length,
  serviceRequests: rows.filter(r => r.destinationEvidence === 'service').length,
});
export function analyzeDestinations(rows: ReportRow[], target: number) {
  return (['lathe', 'wash'] as const).map(key => {
    const selected = rows.filter(r => destinationKind(r) === key);
    const completed = selected.filter(r => r.state === 'CONCLUIDO');
    return {
      key, label: key === 'lathe' ? 'Torno' : 'Lavado',
      ...summarize(selected, target), ...entryEvidence(selected),
      completed: summarize(completed, target),
      clients: groupRows(selected, r => r.clientKey, r => r.company + ' / ' + r.client, target).map(g => ({
        ...g, ...entryEvidence(selected.filter(r => r.clientKey === g.key)), completed: summarize(completed.filter(r => r.clientKey === g.key), target),
      })),
      companies: groupRows(selected, r => String(r.companyId), r => r.company, target),
    };
  });
}
