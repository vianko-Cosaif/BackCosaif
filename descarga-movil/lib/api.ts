import { administrator, ApiError, backendFetch, clearCookie, readBytes, readJson, requireSameOrigin, sessionCookie, sessionToken } from "./auth.ts";
import { inspectApk, parseRange } from "./apk.ts";
import { CHUNK_BYTES, MAX_APK_BYTES } from "./contracts.ts";
import type { AdminUser, Release } from "./contracts.ts";
import type { ApkBucket, ReleaseDatabase } from "./storage-types.ts";

export type Environment = { DB?: ReleaseDatabase; BUCKET?: ApkBucket; BACKCOSAIF_URL?: string; SESSION_SECRET?: string };
type Row = {
  id: string; version: string; version_code: number; file_name: string; object_key: string;
  size: number; sha256: string; min_android: string; notes: string; created_at: string;
  created_by: number; created_by_name: string; current_id?: string; published_at?: string;
};
type Upload = {
  id: string; object_key: string; multipart_id: string; metadata: string; size: number;
  part_count: number; user_id: number; created_at: string; expires_at: string; state: string; locked_at: number;
};
type Metadata = { version: string; versionCode: number; fileName: string; size: number; minAndroid: string; notes: string; createdByName: string };

const json = (value: unknown, status = 200, headers?: HeadersInit) => Response.json(value, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff", ...Object.fromEntries(new Headers(headers)) } });
const database = (env: Environment) => { if (!env.DB) throw new ApiError(503, "El almacenamiento aún no está disponible."); return env.DB; };
const bucket = (env: Environment) => { if (!env.BUCKET) throw new ApiError(503, "El almacenamiento de archivos aún no está disponible."); return env.BUCKET; };
const release = (row: Row): Release => ({ id: row.id, version: row.version, versionCode: row.version_code, fileName: row.file_name, size: row.size, sha256: row.sha256, minAndroid: row.min_android, notes: row.notes, createdAt: row.created_at, createdByName: row.created_by_name, isCurrent: row.id === row.current_id, publishedAt: row.published_at });
const selection = "SELECT r.*, p.release_id AS current_id, p.published_at FROM releases r LEFT JOIN publication p ON p.id = 1";

export function validateMetadata(body: Record<string, unknown>, user: AdminUser): Metadata {
  const text = (key: string, maximum: number) => {
    const value = body[key];
    if (typeof value !== "string" || value.length > maximum) throw new ApiError(400, `Revisa el campo ${key}.`);
    return value.trim();
  };
  const version = text("version", 60);
  const fileName = text("fileName", 180);
  const minAndroid = text("minAndroid", 50);
  const notes = text("notes", 4000);
  const versionCode = Number(body.versionCode);
  const size = Number(body.size);
  if (!/^[A-Za-z0-9][A-Za-z0-9.+_-]{0,59}$/.test(version)) throw new ApiError(400, "Usa una versión como 1.2.0, sin espacios.");
  if (!Number.isSafeInteger(versionCode) || versionCode < 1 || versionCode > 2_100_000_000) throw new ApiError(400, "El código de versión debe ser un entero positivo.");
  if (!/\.apk$/i.test(fileName) || /[\x00-\x1f/\\]/.test(fileName)) throw new ApiError(400, "Selecciona un archivo con extensión .apk.");
  if (!Number.isSafeInteger(size) || size < 22 || size > MAX_APK_BYTES) throw new ApiError(400, "La APK debe pesar como máximo 512 MB.");
  if (!minAndroid) throw new ApiError(400, "Indica la versión mínima de Android de esta APK.");
  return { version, versionCode, fileName, size, minAndroid, notes, createdByName: user.nombre };
}

async function findRelease(env: Environment, id: string) {
  const row = await database(env).prepare(`${selection} WHERE r.id = ?`).bind(id).first<Row>();
  if (!row) throw new ApiError(404, "La versión no existe.");
  return row;
}

async function current(env: Environment) {
  return database(env).prepare(`${selection} WHERE r.id = p.release_id`).first<Row>();
}

async function uploadFor(env: Environment, id: string, user: AdminUser) {
  const upload = await database(env).prepare("SELECT * FROM uploads WHERE id = ? AND user_id = ?").bind(id, user.id).first<Upload>();
  if (!upload) throw new ApiError(404, "La carga no existe.");
  if (new Date(upload.expires_at).getTime() < Date.now()) throw new ApiError(410, "La carga venció. Vuelve a seleccionar el archivo.");
  return upload;
}

async function download(request: Request, env: Environment, row: Row, privateFile: boolean) {
  const head = await bucket(env).head(row.object_key);
  if (!head || head.size !== row.size) throw new ApiError(404, "Esta APK no está disponible. Contacta al administrador.");
  let range: { offset: number; length: number } | undefined = undefined;
  try { range = parseRange(request.headers.get("range"), head.size); }
  catch (error) {
    if (error instanceof ApiError && error.status === 416) return json({ error: error.message }, 416, { "content-range": `bytes */${head.size}` });
    throw error;
  }
  const headers = new Headers({
    "content-type": "application/vnd.android.package-archive",
    "content-disposition": `attachment; filename="cosaif-${row.version}-${row.version_code}.apk"`,
    "cache-control": privateFile ? "private, no-store" : "no-store",
    "x-content-type-options": "nosniff", "accept-ranges": "bytes", "etag": head.httpEtag,
    "content-length": String(range?.length ?? head.size), "x-apk-sha256": row.sha256,
  });
  if (range) headers.set("content-range", `bytes ${range.offset}-${range.offset + range.length - 1}/${head.size}`);
  if (request.method === "HEAD") return new Response(null, { status: range ? 206 : 200, headers });
  const object = await bucket(env).get(row.object_key, range ? { range } : undefined);
  if (!object) throw new ApiError(404, "Esta APK no está disponible.");
  return new Response(object.body, { status: range ? 206 : 200, headers });
}

async function beginUpload(request: Request, env: Environment, user: AdminUser) {
  const metadata = validateMetadata(await readJson(request), user);
  const db = database(env);
  if (await db.prepare("SELECT id FROM releases WHERE version_code = ?").bind(metadata.versionCode).first()) throw new ApiError(409, "Ya existe una APK con ese código de versión. Usa el código de una compilación nueva.");
  const pending = await db.prepare("SELECT COUNT(*) AS total FROM uploads WHERE user_id = ? AND state IN ('open', 'completing') AND expires_at > ?").bind(user.id, new Date().toISOString()).first<{ total: number }>();
  if ((pending?.total ?? 0) >= 5) throw new ApiError(429, "Hay varias cargas pendientes. Cancela una o espera a que venza.");
  const id = crypto.randomUUID();
  const key = `releases/${id}.apk`;
  const multipart = await bucket(env).createMultipartUpload(key, { httpMetadata: { contentType: "application/vnd.android.package-archive" }, customMetadata: { releaseId: id } });
  const count = Math.ceil(metadata.size / CHUNK_BYTES);
  try {
    await db.prepare("INSERT INTO uploads (id, object_key, multipart_id, metadata, size, part_count, user_id, created_at, expires_at, state, locked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 0)")
      .bind(id, key, multipart.uploadId, JSON.stringify(metadata), metadata.size, count, user.id, new Date().toISOString(), new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()).run();
  } catch (error) { await multipart.abort().catch(() => undefined); throw error; }
  return json({ id, chunkBytes: CHUNK_BYTES, partCount: count }, 201);
}

async function putPart(request: Request, env: Environment, user: AdminUser, id: string, number: number) {
  const upload = await uploadFor(env, id, user);
  if (upload.state !== "open") throw new ApiError(409, "La carga ya no admite cambios.");
  if (!Number.isSafeInteger(number) || number < 1 || number > upload.part_count) throw new ApiError(400, "La parte del archivo no es válida.");
  const expected = number === upload.part_count ? upload.size - (number - 1) * CHUNK_BYTES : CHUNK_BYTES;
  const bytes = await readBytes(request, expected);
  if (bytes.length !== expected) throw new ApiError(400, "La parte del archivo está incompleta. Inténtalo de nuevo.");
  if (number === 1 && new DataView(bytes.buffer).getUint32(0, true) !== 0x04034b50) throw new ApiError(400, "El archivo no tiene el formato de una APK.");
  const part = await bucket(env).resumeMultipartUpload(upload.object_key, upload.multipart_id).uploadPart(number, bytes);
  await database(env).prepare("INSERT INTO upload_parts (upload_id, part_number, etag, size) VALUES (?, ?, ?, ?) ON CONFLICT(upload_id, part_number) DO UPDATE SET etag = excluded.etag, size = excluded.size").bind(id, number, part.etag, bytes.length).run();
  return json({ partNumber: part.partNumber });
}

async function finishUpload(env: Environment, user: AdminUser, id: string) {
  const db = database(env);
  const existing = await db.prepare(`${selection} WHERE r.id = ? AND r.created_by = ?`).bind(id, user.id).first<Row>();
  if (existing) return json({ release: release(existing) });
  const upload = await uploadFor(env, id, user);
  const parts = await db.prepare("SELECT part_number, etag, size FROM upload_parts WHERE upload_id = ? ORDER BY part_number").bind(id).all<{ part_number: number; etag: string; size: number }>();
  if (parts.results.length !== upload.part_count || parts.results.reduce((sum, part) => sum + part.size, 0) !== upload.size || parts.results.some((part, index) => part.part_number !== index + 1)) throw new ApiError(400, "Faltan partes de la APK. Completa la carga antes de continuar.");
  const lock = await db.prepare("UPDATE uploads SET state = 'completing', locked_at = ? WHERE id = ? AND (state = 'open' OR (state = 'completing' AND locked_at < ?))").bind(Date.now(), id, Date.now() - 120_000).run();
  if (lock.meta.changes !== 1) throw new ApiError(409, "La APK se está procesando. Espera un momento.");
  try {
    if (!await bucket(env).head(upload.object_key)) {
      await bucket(env).resumeMultipartUpload(upload.object_key, upload.multipart_id).complete(parts.results.map((part) => ({ partNumber: part.part_number, etag: part.etag })));
    }
    const sha256 = await inspectApk(bucket(env), upload.object_key, upload.size);
    const metadata = JSON.parse(upload.metadata) as Metadata;
    const conflict = await db.prepare("SELECT id FROM releases WHERE version_code = ?").bind(metadata.versionCode).first<{ id: string }>();
    if (conflict && conflict.id !== id) throw new ApiError(409, "Otra carga ya guardó ese código de versión.");
    await db.batch([
      db.prepare("INSERT INTO releases (id, version, version_code, file_name, object_key, size, sha256, min_android, notes, created_at, created_by, created_by_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, metadata.version, metadata.versionCode, metadata.fileName, upload.object_key, upload.size, sha256, metadata.minAndroid, metadata.notes, new Date().toISOString(), user.id, metadata.createdByName),
      db.prepare("UPDATE uploads SET state = 'completed' WHERE id = ?").bind(id),
    ]);
    return json({ release: release(await findRelease(env, id)) }, 201);
  } catch (error) {
    if (error instanceof ApiError && [400, 409].includes(error.status)) {
      await bucket(env).delete(upload.object_key);
      await db.prepare("UPDATE uploads SET state = 'failed' WHERE id = ?").bind(id).run();
    } else {
      await db.prepare("UPDATE uploads SET state = 'open', locked_at = 0 WHERE id = ?").bind(id).run();
    }
    throw error;
  }
}

async function publish(request: Request, env: Environment, user: AdminUser, id: string) {
  const row = await findRelease(env, id);
  const head = await bucket(env).head(row.object_key);
  if (!head || head.size !== row.size) throw new ApiError(409, "La APK guardada no está disponible. No se cambió la descarga activa.");
  const body = await readJson(request);
  if (body.expectedCurrentId !== null && typeof body.expectedCurrentId !== "string") throw new ApiError(400, "Recarga el historial antes de publicar.");
  const expected = String(body.expectedCurrentId ?? "");
  if (row.current_id === id) return json({ release: release(row) });
  const db = database(env);
  const now = new Date().toISOString();
  const results = await db.batch([
    db.prepare("INSERT INTO publication (id, release_id, published_at, published_by) SELECT 1, ?, ?, ? WHERE COALESCE((SELECT release_id FROM publication WHERE id = 1), '') = ? ON CONFLICT(id) DO UPDATE SET release_id = excluded.release_id, published_at = excluded.published_at, published_by = excluded.published_by").bind(id, now, user.id, expected),
    db.prepare("INSERT INTO publication_events (id, release_id, previous_id, created_at, actor_id, actor_name) SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM publication WHERE id = 1 AND release_id = ? AND published_at = ? AND published_by = ?)").bind(crypto.randomUUID(), id, expected || null, now, user.id, user.nombre, id, now, user.id),
  ]);
  if (results[0].meta.changes !== 1) throw new ApiError(409, "Otro administrador cambió la versión activa. Recarga el historial y vuelve a intentarlo.");
  return json({ release: release(await findRelease(env, id)) });
}

export async function handleApi(request: Request, env: Environment, transport: typeof fetch = fetch): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api/, "");
    const method = request.method;
    if (!["GET", "HEAD"].includes(method)) requireSameOrigin(request);
    if (path === "/current" && method === "GET") { const row = await current(env); return json({ release: row ? release(row) : null }); }
    if (path === "/download" && ["GET", "HEAD"].includes(method)) {
      const row = await current(env);
      if (!row) throw new ApiError(404, "Aún no se ha publicado una APK.");
      return await download(request, env, row, false);
    }
    if (path === "/auth/login" && method === "POST") {
      // Fail before requesting a backend session when encryption is unconfigured.
      if (Buffer.from(env.SESSION_SECRET ?? "", "base64url").length !== 32) throw new ApiError(503, "El acceso de administración aún no está configurado.");
      const body = await readJson(request);
      if (typeof body.nombre !== "string" || !body.nombre.trim() || body.nombre.length > 100 || typeof body.contrasena !== "string" || !body.contrasena || body.contrasena.length > 512) throw new ApiError(400, "Escribe tu usuario y contraseña.");
      const response = await backendFetch(env, "/usuarios/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nombre: body.nombre.trim(), contrasena: body.contrasena, platform: "cosaif-download", tipoDispositivo: "WEB", deviceId: "cosaif-download" }) }, transport);
      if ([401, 403].includes(response.status)) throw new ApiError(response.status, "Credenciales incorrectas o cuenta desactivada.");
      if (response.status === 429) throw new ApiError(429, "Demasiados intentos. Espera unos minutos antes de volver a intentar.");
      if (!response.ok) throw new ApiError(503, "No fue posible iniciar sesión con BackCosaif2.");
      const login = await response.json() as { token?: unknown };
      if (typeof login.token !== "string" || !login.token) throw new ApiError(502, "BackCosaif2 devolvió una respuesta inesperada.");
      try {
        const user = await administrator(login.token, env, transport);
        return json({ user }, 200, { "set-cookie": sessionCookie(request, login.token, env) });
      } catch (error) {
        await backendFetch(env, "/usuarios/logout", { method: "POST", headers: { authorization: `Bearer ${login.token}` } }, transport).catch(() => undefined);
        throw error;
      }
    }
    if (path === "/auth/logout" && method === "POST") {
      try { const token = sessionToken(request, env); await backendFetch(env, "/usuarios/logout", { method: "POST", headers: { authorization: `Bearer ${token}` } }, transport); } catch { /* Always clear the local session, including if the backend is offline. */ }
      return json({ ok: true }, 200, { "set-cookie": clearCookie(request) });
    }
    if (path !== "/auth/session" && !path.startsWith("/admin/")) throw new ApiError(404, "La ruta no existe.");
    const user = await administrator(sessionToken(request, env), env, transport);
    if (path === "/auth/session" && method === "GET") return json({ user });
    if (path === "/admin/releases" && method === "GET") {
      const page = Math.max(1, Math.min(100_000, Number(url.searchParams.get("page")) || 1));
      const term = (url.searchParams.get("q") ?? "").slice(0, 100);
      const filter = "%" + term + "%";
      const where = " WHERE r.version LIKE ? OR CAST(r.version_code AS TEXT) LIKE ? OR r.notes LIKE ?";
      const rows = await database(env).prepare(`${selection}${where} ORDER BY r.created_at DESC, r.id DESC LIMIT 20 OFFSET ?`).bind(filter, filter, filter, (Math.floor(page) - 1) * 20).all<Row>();
      const total = await database(env).prepare(`SELECT COUNT(*) AS total FROM releases r${where}`).bind(filter, filter, filter).first<{ total: number }>();
      const active = await current(env);
      return json({ releases: rows.results.map(release), current: active ? release(active) : null, total: total?.total ?? 0, page: Math.floor(page) });
    }
    if (path === "/admin/uploads" && method === "POST") return await beginUpload(request, env, user);
    const part = /^\/admin\/uploads\/([0-9a-f-]{36})\/parts\/(\d+)$/.exec(path);
    if (part && method === "PUT") return await putPart(request, env, user, part[1], Number(part[2]));
    const complete = /^\/admin\/uploads\/([0-9a-f-]{36})\/complete$/.exec(path);
    if (complete && method === "POST") return await finishUpload(env, user, complete[1]);
    const cancel = /^\/admin\/uploads\/([0-9a-f-]{36})$/.exec(path);
    if (cancel && method === "DELETE") {
      const upload = await uploadFor(env, cancel[1], user);
      if (upload.state !== "open") throw new ApiError(409, "Esta carga ya está siendo procesada.");
      await bucket(env).resumeMultipartUpload(upload.object_key, upload.multipart_id).abort().catch(() => undefined);
      await database(env).prepare("UPDATE uploads SET state = 'cancelled' WHERE id = ? AND state = 'open'").bind(upload.id).run();
      return json({ ok: true });
    }
    const publication = /^\/admin\/releases\/([0-9a-f-]{36})\/publish$/.exec(path);
    if (publication && method === "POST") return await publish(request, env, user, publication[1]);
    const historical = /^\/admin\/releases\/([0-9a-f-]{36})\/download$/.exec(path);
    if (historical && ["GET", "HEAD"].includes(method)) return await download(request, env, await findRelease(env, historical[1]), true);
    throw new ApiError(404, "La ruta no existe.");
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    if (!(error instanceof ApiError)) console.error("cosaif-download.api", error instanceof Error ? error.name : "UnknownError");
    return json({ error: error instanceof ApiError ? error.message : "No fue posible completar la operación. Inténtalo de nuevo." }, status, [401, 403].includes(status) ? { "set-cookie": clearCookie(request) } : undefined);
  }
}
