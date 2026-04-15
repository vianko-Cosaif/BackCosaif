export function parseIntParam(value: string, field: string): number {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new Error(`Invalid int param: ${field}`);
  return n;
}

