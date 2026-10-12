import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { handleApi } from "../lib/api.ts";
import { CHUNK_BYTES } from "../lib/contracts.ts";
import { parseRange } from "../lib/apk.ts";
import { LocalBucket, LocalDatabase } from "../lib/local-storage.ts";

function d1() {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync(new URL("../drizzle/", import.meta.url)).filter((file) => file.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  function prepare(sql, values = []) {
    return {
      bind(...parameters) { return prepare(sql, parameters); },
      async first(column) { const row = sqlite.prepare(sql).get(...values) ?? null; return column && row ? row[column] : row; },
      async all() { return { results: sqlite.prepare(sql).all(...values), success: true }; },
      async run() { const result = sqlite.prepare(sql).run(...values); return { success: true, meta: { changes: Number(result.changes) } }; },
    };
  }
  return { sqlite, prepare, async batch(statements) { sqlite.exec("BEGIN"); try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec("COMMIT"); return results; } catch (error) { sqlite.exec("ROLLBACK"); throw error; } } };
}

function r2() {
  const objects = new Map();
  const uploads = new Map();
  const hash = (data) => createHash("sha256").update(data).digest("hex");
  function multipart(key, uploadId) {
    return { key, uploadId,
      async uploadPart(partNumber, bytes) { const upload = uploads.get(uploadId); assert(upload); const value = new Uint8Array(bytes).slice(); const etag = hash(value); upload.parts.set(partNumber, { bytes: value, etag }); return { partNumber, etag }; },
      async complete(parts) { const upload = uploads.get(uploadId); assert(upload); const bytes = Buffer.concat(parts.map((part) => { const stored = upload.parts.get(part.partNumber); assert.equal(stored.etag, part.etag); return Buffer.from(stored.bytes); })); objects.set(key, bytes); uploads.delete(uploadId); return this.head?.(key) || { key, size: bytes.length }; },
      async abort() { uploads.delete(uploadId); },
    };
  }
  return { objects, uploads,
    async createMultipartUpload(key) { const id = crypto.randomUUID(); uploads.set(id, { key, parts: new Map() }); return multipart(key, id); },
    resumeMultipartUpload: multipart,
    async head(key) { const bytes = objects.get(key); return bytes ? { key, size: bytes.length, httpEtag: `"${hash(bytes)}"` } : null; },
    async get(key, options) {
      const original = objects.get(key); if (!original) return null;
      const range = options?.range;
      const bytes = range ? (range.suffix ? original.subarray(Math.max(0, original.length - range.suffix)) : original.subarray(range.offset ?? 0, (range.offset ?? 0) + (range.length ?? original.length))) : original;
      const value = Uint8Array.from(bytes);
      return { key, size: original.length, body: new ReadableStream({ start(controller) { for (let offset = 0; offset < value.length; offset += 65536) controller.enqueue(value.slice(offset, offset + 65536)); controller.close(); } }), async arrayBuffer() { return value.slice().buffer; } };
    },
    async delete(key) { objects.delete(key); },
  };
}

// ZIP-shaped fixtures only, never distributed or saved as actual release APKs.
function fixtureApk(payload = 40, manifest = true) {
  const records = [{ name: manifest ? "AndroidManifest.xml" : "readme.txt", bytes: Buffer.from("fixture manifest") }, { name: "assets/test.bin", bytes: Buffer.alloc(payload, 7) }];
  const local = []; const central = []; let offset = 0;
  for (const record of records) {
    const name = Buffer.from(record.name);
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt32LE(record.bytes.length, 18); header.writeUInt32LE(record.bytes.length, 22); header.writeUInt16LE(name.length, 26);
    const directory = Buffer.alloc(46); directory.writeUInt32LE(0x02014b50); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6); directory.writeUInt32LE(record.bytes.length, 20); directory.writeUInt32LE(record.bytes.length, 24); directory.writeUInt16LE(name.length, 28); directory.writeUInt32LE(offset, 42);
    local.push(header, name, record.bytes); central.push(directory, name); offset += header.length + name.length + record.bytes.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(records.length, 8); end.writeUInt16LE(records.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

function harness(storage) {
  const DB = storage?.DB ?? d1(); const BUCKET = storage?.BUCKET ?? r2();
  const env = { DB, BUCKET, BACKCOSAIF_URL: "https://back.example", SESSION_SECRET: randomBytes(32).toString("base64url") };
  const state = { role: "ADMINISTRADOR", active: true, logouts: 0, calls: [] };
  async function backend(url, init) {
    const path = new URL(url).pathname; state.calls.push({ path, init, url });
    if (path === "/usuarios/login") return Response.json({ token: "upstream-private-jwt", user: { rol: "ADMINISTRADOR" } });
    if (path === "/usuarios/logout") { state.logouts++; return new Response(null, { status: 204 }); }
    if (path === "/usuarios/me") return state.active ? Response.json({ user: { id: 1, nombre: "Admin", rol: state.role } }) : Response.json({ error: "revocado" }, { status: 401 });
    throw new Error("Unexpected backend path");
  }
  let cookie = "";
  async function call(path, { method = "GET", body, headers = {}, authenticated = true } = {}) {
    const init = { method, headers: { ...(authenticated && cookie ? { cookie } : {}), ...(!["GET", "HEAD"].includes(method) ? { origin: "https://download.example", "x-cosaif-request": "1" } : {}), ...headers } };
    if (body !== undefined) { init.body = Buffer.isBuffer(body) ? body : JSON.stringify(body); if (!Buffer.isBuffer(body)) init.headers["content-type"] = "application/json"; }
    return handleApi(new Request(`https://download.example/api${path}`, init), env, backend);
  }
  async function login() { const response = await call("/auth/login", { method: "POST", body: { nombre: "admin", contrasena: "fixture-password" } }); if (response.ok) cookie = response.headers.get("set-cookie").split(";")[0]; return response; }
  async function save(bytes, code, version = `${code}.0.0`) {
    const begin = await call("/admin/uploads", { method: "POST", body: { version, versionCode: code, minAndroid: "Android 8.0 o superior", fileName: "cosaif.apk", notes: `Notas ${code}`, size: bytes.length } });
    assert.equal(begin.status, 201, await begin.clone().text()); const upload = await begin.json();
    for (let i = 0; i < upload.partCount; i++) { const part = await call(`/admin/uploads/${upload.id}/parts/${i + 1}`, { method: "PUT", body: bytes.subarray(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES) }); assert.equal(part.status, 200, await part.clone().text()); }
    const completed = await call(`/admin/uploads/${upload.id}/complete`, { method: "POST" });
    return { completed, upload };
  }
  return { env, DB, BUCKET, state, call, login, save };
}

test("login validates /usuarios/me, encrypts the JWT, and rejects a forged login role", async () => {
  const h = harness(); const login = await h.login(); assert.equal(login.status, 200);
  const header = login.headers.get("set-cookie"); assert.match(header, /HttpOnly/); assert.match(header, /Secure/); assert.match(header, /SameSite=Strict/); assert(!header.includes("upstream-private-jwt"));
  assert(!JSON.stringify(await login.json()).includes("token"));
  const credentials = JSON.parse(h.state.calls[0].init.body); assert.equal(credentials.platform, "cosaif-download");
  h.state.role = "COORDINADOR"; const rejected = await h.login(); assert.equal(rejected.status, 403); assert.equal(h.state.logouts, 1);
});

test("anonymous users and revoked or demoted users cannot access or modify the archive", async () => {
  const h = harness();
  assert.equal((await h.call("/admin/releases", { authenticated: false })).status, 401);
  assert.equal((await h.call("/admin/uploads", { authenticated: false, method: "POST", body: {} })).status, 401);
  await h.login(); h.state.role = "CLIENTE";
  assert.equal((await h.call("/admin/releases")).status, 403);
  assert.equal((await h.call("/admin/uploads", { method: "POST", body: {} })).status, 403);
  h.state.role = "ADMINISTRADOR"; h.state.active = false;
  assert.equal((await h.call("/admin/releases")).status, 401);
  assert.equal((await h.DB.prepare("SELECT COUNT(*) AS count FROM releases").first()).count, 0);
});

test("cross-origin writes and forged cookies are rejected before storage changes", async () => {
  const h = harness(); await h.login();
  assert.equal((await h.call("/admin/uploads", { method: "POST", body: {}, headers: { origin: "https://attacker.example" } })).status, 403);
  assert.equal((await h.call("/admin/uploads", { method: "POST", body: {}, headers: { "x-cosaif-request": "0" } })).status, 403);
  assert.equal((await h.call("/admin/releases", { headers: { cookie: "__Host-cosaif-download=ADMINISTRADOR" } })).status, 401);
  assert.equal(h.BUCKET.uploads.size, 0);
});

test("multipart upload, checksum, publication and restoration keep all original files", async () => {
  const h = harness(); await h.login();
  const bytes1 = fixtureApk(CHUNK_BYTES + 3);
  const first = await h.save(bytes1, 1); assert.equal(first.upload.partCount, 2); assert.equal(first.completed.status, 201);
  const release1 = (await first.completed.json()).release;
  assert.equal(release1.sha256, createHash("sha256").update(bytes1).digest("hex"));
  assert.equal((await h.call(`/admin/uploads/${first.upload.id}/complete`, { method: "POST" })).status, 200);
  assert.equal((await h.call("/current", { authenticated: false })).status, 200);
  assert.equal((await h.call("/download", { authenticated: false })).status, 404);
  assert.equal((await h.call(`/admin/releases/${release1.id}/publish`, { method: "POST", body: { expectedCurrentId: null } })).status, 200);
  const bytes2 = fixtureApk(70); const second = await h.save(bytes2, 2); assert.equal(second.completed.status, 201); const release2 = (await second.completed.json()).release;
  assert.equal((await h.call(`/admin/releases/${release2.id}/publish`, { method: "POST", body: { expectedCurrentId: release1.id } })).status, 200);
  assert.deepEqual(Buffer.from(await (await h.call("/download", { authenticated: false })).arrayBuffer()), bytes2);
  assert.equal((await h.call(`/admin/releases/${release1.id}/publish`, { method: "POST", body: { expectedCurrentId: release2.id } })).status, 200);
  assert.deepEqual(Buffer.from(await (await h.call("/download", { authenticated: false })).arrayBuffer()), bytes1);
  const archive = await (await h.call("/admin/releases")).json(); assert.equal(archive.total, 2); assert.equal(archive.current.id, release1.id); assert.equal(h.BUCKET.objects.size, 2);
  assert.equal((await h.DB.prepare("SELECT COUNT(*) AS count FROM publication_events").first()).count, 3);
  assert.equal((await h.call(`/admin/releases/${release2.id}/download`, { authenticated: false })).status, 401);
  assert.deepEqual(Buffer.from(await (await h.call(`/admin/releases/${release2.id}/download`)).arrayBuffer()), bytes2);
});

test("bad APKs, duplicate build codes and incomplete uploads never change the published release", async () => {
  const h = harness(); await h.login();
  const first = await h.save(fixtureApk(), 1); const release = (await first.completed.json()).release;
  await h.call(`/admin/releases/${release.id}/publish`, { method: "POST", body: { expectedCurrentId: null } });
  const invalid = await h.save(fixtureApk(40, false), 2); assert.equal(invalid.completed.status, 400);
  assert.equal(h.BUCKET.objects.size, 1);
  const duplicate = await h.call("/admin/uploads", { method: "POST", body: { version: "1.0.0", versionCode: 1, fileName: "cosaif.apk", size: 100, minAndroid: "Android", notes: "" } }); assert.equal(duplicate.status, 409);
  const begin = await h.call("/admin/uploads", { method: "POST", body: { version: "3.0.0", versionCode: 3, fileName: "cosaif.apk", size: 100, minAndroid: "Android", notes: "" } }); const upload = await begin.json();
  assert.equal((await h.call(`/admin/uploads/${upload.id}/complete`, { method: "POST" })).status, 400);
  assert.equal((await h.call(`/admin/uploads/${upload.id}`, { method: "DELETE" })).status, 200);
  assert.equal((await (await h.call("/current")).json()).release.id, release.id);
});

test("stale publication requests cannot overwrite a newer publication", async () => {
  const h = harness(); await h.login();
  const first = await h.save(fixtureApk(), 1); const a = (await first.completed.json()).release;
  const second = await h.save(fixtureApk(), 2); const b = (await second.completed.json()).release;
  await h.call(`/admin/releases/${a.id}/publish`, { method: "POST", body: { expectedCurrentId: null } });
  const conflict = await h.call(`/admin/releases/${b.id}/publish`, { method: "POST", body: { expectedCurrentId: null } }); assert.equal(conflict.status, 409);
  assert.equal((await (await h.call("/current")).json()).release.id, a.id);
  assert.equal((await h.DB.prepare("SELECT COUNT(*) AS count FROM publication_events").first()).count, 1);
});

test("downloads support HEAD, byte ranges and suffix ranges without exposing history", async () => {
  const h = harness(); await h.login(); const bytes = fixtureApk(); const saved = await h.save(bytes, 1); const release = (await saved.completed.json()).release;
  await h.call(`/admin/releases/${release.id}/publish`, { method: "POST", body: { expectedCurrentId: null } });
  const response = await h.call("/download", { authenticated: false, headers: { range: "bytes=0-3" } }); assert.equal(response.status, 206); assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes.subarray(0, 4)); assert.equal(response.headers.get("content-range"), `bytes 0-3/${bytes.length}`);
  const suffix = await h.call("/download", { authenticated: false, headers: { range: "bytes=-8" } }); assert.equal(suffix.status, 206); assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), bytes.subarray(-8));
  const head = await h.call("/download", { authenticated: false, method: "HEAD" }); assert.equal(head.status, 200); assert.equal(head.headers.get("content-length"), String(bytes.length)); assert.equal((await head.arrayBuffer()).byteLength, 0);
  assert.equal((await h.call("/download", { headers: { range: "bytes=999999-" } })).status, 416);
  assert.throws(() => parseRange("bytes=0-2,4-6", bytes.length));
});

test("missing encryption configuration fails closed and logout still clears the cookie", async () => {
  const h = harness(); h.env.SESSION_SECRET = "";
  assert.equal((await h.login()).status, 503);
  assert.equal(h.state.calls.length, 0);
  const logout = await h.call("/auth/logout", { method: "POST" }); assert.equal(logout.status, 200); assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
});

test("the permanent BackCosaif2 URL is used when no override is configured", async () => {
  const h = harness(); h.env.BACKCOSAIF_URL = "";
  assert.equal((await h.login()).status, 200);
  assert.equal(h.state.calls[0].url, "http://76.13.100.184:3008/usuarios/login");
  assert.equal(h.state.calls[1].url, "http://76.13.100.184:3008/usuarios/me");
});

test("sandbox storage persists multipart APKs, history and restoration after reopening", async () => {
  const directory = mkdtempSync(join(tmpdir(), "cosaif-download-storage-"));
  let DB = new LocalDatabase(directory);
  try {
    DB.sqlite.exec(readFileSync(new URL("../drizzle/0000_careless_blink.sql", import.meta.url), "utf8"));
    const h = harness({ DB, BUCKET: new LocalBucket(directory) });
    await h.login();
    const bytes = fixtureApk(CHUNK_BYTES + 2200);
    const saved = await h.save(bytes, 101);
    assert.equal(saved.upload.partCount, 2);
    assert.equal(saved.completed.status, 201, await saved.completed.clone().text());
    const first = (await saved.completed.json()).release;
    assert.equal(first.sha256, createHash("sha256").update(bytes).digest("hex"));
    assert.equal((await h.call(`/admin/releases/${first.id}/publish`, { method: "POST", body: { expectedCurrentId: null } })).status, 200);
    const secondSave = await h.save(fixtureApk(50), 102);
    const second = (await secondSave.completed.json()).release;
    assert.equal((await h.call(`/admin/releases/${second.id}/publish`, { method: "POST", body: { expectedCurrentId: first.id } })).status, 200);
    DB.close();
    DB = new LocalDatabase(directory);
    const reopened = harness({ DB, BUCKET: new LocalBucket(directory) });
    await reopened.login();
    assert.equal((await (await reopened.call("/current", { authenticated: false })).json()).release.id, second.id);
    const catalog = await (await reopened.call("/admin/releases")).json();
    assert.equal(catalog.total, 2);
    assert.equal((await reopened.call(`/admin/releases/${first.id}/publish`, { method: "POST", body: { expectedCurrentId: second.id } })).status, 200);
    const download = await reopened.call("/download", { authenticated: false });
    assert.equal(download.status, 200);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
    const partial = await reopened.call("/download", { authenticated: false, headers: { range: "bytes=10-29" } });
    assert.equal(partial.status, 206);
    assert.deepEqual(Buffer.from(await partial.arrayBuffer()), bytes.subarray(10, 30));
    assert.equal((await DB.prepare("SELECT COUNT(*) AS total FROM publication_events").first()).total, 3);
  } finally { DB.close(); rmSync(directory, { recursive: true, force: true }); }
});

test("sandbox transactions roll back and file paths cannot escape private storage", async () => {
  const directory = mkdtempSync(join(tmpdir(), "cosaif-download-boundaries-"));
  const DB = new LocalDatabase(directory);
  const bucket = new LocalBucket(directory);
  try {
    DB.sqlite.exec("CREATE TABLE sample (id INTEGER PRIMARY KEY)");
    await assert.rejects(DB.batch([DB.prepare("INSERT INTO sample VALUES (1)"), DB.prepare("INSERT INTO sample VALUES (1)")]));
    assert.equal((await DB.prepare("SELECT COUNT(*) AS total FROM sample").first()).total, 0);
    await assert.rejects(bucket.head("../../.env.production"));
    assert.throws(() => bucket.resumeMultipartUpload("releases/00000000-0000-4000-8000-000000000000.apk", "../../escape"));
    const upload = await bucket.createMultipartUpload("releases/00000000-0000-4000-8000-000000000000.apk");
    const part = await upload.uploadPart(1, Uint8Array.from([1, 2, 3]));
    await assert.rejects(upload.complete([{ ...part, etag: "0".repeat(64) }]));
    assert.equal(await bucket.head(upload.key), null);
    await upload.abort();
  } finally { DB.close(); rmSync(directory, { recursive: true, force: true }); }
});
