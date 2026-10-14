export class RequestError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export async function requestJSON<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.method && init.method !== "GET") headers.set("x-cosaif-request", "1");
  if (typeof init.body === "string") headers.set("content-type", "application/json");
  let response: Response;
  try { response = await fetch(path, { ...init, headers, credentials: "same-origin", cache: "no-store" }); }
  catch { throw new RequestError("No hay conexión. Revisa tu red e inténtalo de nuevo.", 0); }
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new RequestError(body.error || "No fue posible completar la operación.", response.status);
  return body as T;
}

export const messageOf = (error: unknown) => error instanceof Error ? error.message : "Ocurrió un error. Inténtalo de nuevo.";
