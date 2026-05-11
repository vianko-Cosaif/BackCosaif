import type { Request, Response } from "express";
import { ok } from "./http";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export type Pagination = {
  enabled: boolean;
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

function firstQueryValue(value: unknown) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parsePositiveInt(value: unknown, fallback: number) {
  const raw = firstQueryValue(value);
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getPagination(req: Request): Pagination {
  const enabled = req.query.page !== undefined || req.query.pageSize !== undefined;
  const page = parsePositiveInt(req.query.page, 1);
  const requestedPageSize = parsePositiveInt(req.query.pageSize, DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);

  return {
    enabled,
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function paginationArgs(pagination: Pagination): Record<string, number> {
  return pagination.enabled ? { skip: pagination.skip, take: pagination.take } : {};
}

export function respondPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  pagination: Pagination
) {
  if (!pagination.enabled) return ok(res, data);

  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  return ok(res, data, {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages,
    hasNextPage: pagination.page < totalPages,
    hasPrevPage: pagination.page > 1,
  });
}
