import type { MovimientoPagination } from '../../models/Movimientos/movimiento.types';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const firstQueryValue = (value: unknown): string | undefined => {
  if (Array.isArray(value)) return firstQueryValue(value[0]);
  return typeof value === 'string' ? value : undefined;
};

export const readMovimientoPagination = (
  query: Record<string, unknown>
): { pagination?: MovimientoPagination; error?: string } => {
  const rawPage = firstQueryValue(query.page);
  const rawPageSize = firstQueryValue(query.pageSize);

  if (rawPage === undefined && rawPageSize === undefined) return {};

  if (rawPage !== undefined && (!/^\d+$/.test(rawPage) || Number(rawPage) < 1)) {
    return { error: 'page debe ser un entero positivo' };
  }
  if (rawPageSize !== undefined && (!/^\d+$/.test(rawPageSize) || Number(rawPageSize) < 1)) {
    return { error: 'pageSize debe ser un entero positivo' };
  }

  const page = rawPage ? Number(rawPage) : 1;
  const requestedPageSize = rawPageSize ? Number(rawPageSize) : DEFAULT_PAGE_SIZE;

  return {
    pagination: {
      page,
      pageSize: Math.min(MAX_PAGE_SIZE, requestedPageSize),
    },
  };
};
