import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { AdminUser } from "./contracts.ts";

export type AuthEnvironment = { BACKCOSAIF_URL?: string; SESSION_SECRET?: string };
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("x-cosaif-request") !== "1") {
    throw new ApiError(403, "Solicitud no permitida. Recarga la página e inténtalo de nuevo.");
  }
}

export async function readBytes(request: Request, maximum: number) {
  if (Number(request.headers.get("content-length")) > maximum) throw new ApiError(413, "El archivo supera el tamaño permitido.");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new ApiError(413, "El archivo supera el tamaño permitido."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ApiError(415, "Envía los datos como JSON.");
  try {
    const result = JSON.parse(new TextDecoder().decode(await readBytes(request, 16_384)));
    if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error();
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "Los datos enviados no son válidos.");
  }
}

function sessionKey(environment: AuthEnvironment) {
  const key = Buffer.from(environment.SESSION_SECRET ?? "", "base64url");
  if (key.length !== 32) throw new ApiError(503, "El acceso de administración aún no está configurado.");
  return key;
}

const cookieName = (request: Request) => new URL(request.url).protocol === "https:" ? "__Host-cosaif-download" : "cosaif-download";

export function sessionCookie(request: Request, token: string, environment: AuthEnvironment) {
  if (token.length > 3000) throw new ApiError(502, "La respuesta de inicio de sesión no es válida.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sessionKey(environment), iv);
  cipher.setAAD(Buffer.from(new URL(request.url).origin));
  const plaintext = JSON.stringify({ token, expires: Date.now() + 24 * 60 * 60 * 1000 });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const value = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
  return `${cookieName(request)}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}

export function clearCookie(request: Request) {
  return `${cookieName(request)}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}

export function sessionToken(request: Request, environment: AuthEnvironment): string {
  const cookie = request.headers.get("cookie")?.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith(`${cookieName(request)}=`));
  if (!cookie) throw new ApiError(401, "Inicia sesión para continuar.");
  try {
    const value = Buffer.from(cookie.slice(cookie.indexOf("=") + 1), "base64url");
    if (value.length < 29 || value.length > 4096) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", sessionKey(environment), value.subarray(0, 12));
    decipher.setAAD(Buffer.from(new URL(request.url).origin));
    decipher.setAuthTag(value.subarray(12, 28));
    const decoded = JSON.parse(Buffer.concat([decipher.update(value.subarray(28)), decipher.final()]).toString("utf8"));
    if (typeof decoded.token !== "string" || !Number.isFinite(decoded.expires) || decoded.expires < Date.now()) throw new Error();
    return decoded.token;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "Tu sesión venció. Inicia sesión de nuevo.");
  }
}

export async function backendFetch(environment: AuthEnvironment, path: string, init: RequestInit, transport: typeof fetch = fetch) {
  const base = (environment.BACKCOSAIF_URL?.trim() || "http://76.13.100.184:3008").replace(/\/+$/, "");
  let origin: URL;
  try { origin = new URL(base); } catch { throw new ApiError(503, "La conexión con BackCosaif2 no está configurada correctamente."); }
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash) throw new ApiError(503, "La conexión con BackCosaif2 no está configurada correctamente.");
  try {
    return await transport(`${base}${path}`, { ...init, headers: { accept: "application/json", ...Object.fromEntries(new Headers(init.headers)) }, redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(12_000) });
  } catch { throw new ApiError(503, "BackCosaif2 no está disponible. Inténtalo más tarde."); }
}

export async function administrator(token: string, environment: AuthEnvironment, transport: typeof fetch = fetch): Promise<AdminUser> {
  const response = await backendFetch(environment, "/usuarios/me", { headers: { authorization: `Bearer ${token}` } }, transport);
  if (response.status === 401) throw new ApiError(401, "Tu sesión venció. Inicia sesión de nuevo.");
  if (response.status === 403) throw new ApiError(403, "Tu cuenta no tiene acceso al panel.");
  if (!response.ok) throw new ApiError(503, "No fue posible verificar tu sesión con BackCosaif2.");
  const profile = await response.json() as { user?: { id?: number; nombre?: string; rol?: string } };
  if (profile.user?.rol !== "ADMINISTRADOR" || !Number.isSafeInteger(profile.user.id) || Number(profile.user.id) < 1) throw new ApiError(403, "Solo un administrador puede entrar a este panel.");
  return { id: profile.user.id as number, nombre: String(profile.user.nombre ?? "Administrador"), rol: "ADMINISTRADOR" };
}
