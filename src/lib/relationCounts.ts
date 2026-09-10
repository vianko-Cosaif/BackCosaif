type CountDelegate = { groupBy: Function };
type RelationKey = 'movimientoId' | 'tornoId' | 'lavadoId' | 'arrastreId';

// Scope aggregation to the selected parents. Prisma's unfiltered relation _count
// can aggregate the entire child table before LIMIT is applied to the parent.
export async function relationCounts(delegate: CountDelegate, field: RelationKey, ids: readonly number[]): Promise<Map<number, number>> {
  const uniqueIds = [...new Set(ids)];
  const counts = new Map<number, number>();
  for (let offset = 0; offset < uniqueIds.length; offset += 500) {
    const rows = await delegate.groupBy({ by: [field], where: { [field]: { in: uniqueIds.slice(offset, offset + 500) } }, _count: { _all: true } });
    for (const row of rows) counts.set(row[field], row._count._all);
  }
  return counts;
}
