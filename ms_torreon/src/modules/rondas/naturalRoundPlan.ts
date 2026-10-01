type QueueItem = { empresaId: number; prioridad: string; estado: string };

/** Altas disponibles en R1; bajas estables, con un turno por empresa y ronda. */
export function naturalRoundPlan<T extends QueueItem>(ordered: readonly T[], roundOf?: (row: T) => number): T[][] {
  const high = ordered.filter(row => row.prioridad === 'ALTA' && row.estado !== 'BLOQUEADO');
  const highSet = new Set(high);
  const low = ordered.filter(row => !highSet.has(row));
  const existing = roundOf ? [...new Set(low.map(roundOf))].sort((a, b) => a - b) : [];
  const rounds: T[][] = existing.map(() => []);
  for (const row of low) {
    // Preserve existing low-priority rounds when another movement finishes.
    // Only duplicate company slots spill forward; unrelated companies keep their turn.
    let index = roundOf ? existing.indexOf(roundOf(row)) : 0;
    while (rounds[index]?.some(item => item.empresaId === row.empresaId)) index++;
    (rounds[index] ??= []).push(row);
  }
  const nonempty = rounds.filter(items => items.length);
  for (let i = 1; i < nonempty.length; i++) {
    const previous = nonempty[i - 1].at(-1)?.empresaId;
    if (nonempty[i][0]?.empresaId === previous) {
      const other = nonempty[i].findIndex(row => row.empresaId !== previous && row.estado !== 'BLOQUEADO');
      if (other > 0) nonempty[i].unshift(...nonempty[i].splice(other, 1));
    }
  }
  return high.length ? [high, ...nonempty] : nonempty;
}
