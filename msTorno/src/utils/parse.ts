export function parseIntParam(value: string | string[] | undefined, field: string): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  if (!Number.isInteger(n)) throw new Error(`Invalid int param: ${field}`);
  return n;
}

