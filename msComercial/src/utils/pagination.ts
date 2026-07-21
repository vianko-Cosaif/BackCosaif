import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export function paginationArgs(input: { page: number; pageSize: number }) {
  return {
    skip: (input.page - 1) * input.pageSize,
    take: input.pageSize,
  };
}

export function paginated<T>(items: T[], total: number, page: number, pageSize: number) {
  return {
    data: items,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
