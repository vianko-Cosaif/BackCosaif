import { createHash, randomUUID } from "node:crypto";
import { createReadStream, mkdirSync } from "node:fs";
import { link, mkdir, open, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { DatabaseSync } from "node:sqlite";
import type { ApkBucket, ApkHead, ApkRange, MultipartUpload, QueryResult, QueryStatement, ReleaseDatabase, UploadedPart } from "./storage-types.ts";

class LocalStatement implements QueryStatement {
  private database: DatabaseSync;
  private sql: string;
  private values: (string | number | null)[];
  constructor(database: DatabaseSync, sql: string, values: (string | number | null)[] = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }
  bind(...values: (string | number | null)[]) { return new LocalStatement(this.database, this.sql, values); }
  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const row = this.database.prepare(this.sql).get(...this.values);
    return (column && row ? row[column] : row ?? null) as T | null;
  }
  async all<T = Record<string, unknown>>() {
    return { results: this.database.prepare(this.sql).all(...this.values) as T[], success: true as const };
  }
  runSync(): QueryResult {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
  async run() { return this.runSync(); }
}

export class LocalDatabase implements ReleaseDatabase {
  readonly sqlite: DatabaseSync;
  constructor(directory: string) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.sqlite = new DatabaseSync(join(directory, "releases.sqlite"), { timeout: 5000 });
    this.sqlite.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  }
  prepare(sql: string) { return new LocalStatement(this.sqlite, sql); }
  async batch(statements: QueryStatement[]) {
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      // Execute the whole transaction synchronously so concurrent requests cannot interleave.
      const results = statements.map((statement) => {
        if (!(statement instanceof LocalStatement)) throw new Error("Invalid local statement");
        return statement.runSync();
      });
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) { this.sqlite.exec("ROLLBACK"); throw error; }
  }
  close() { this.sqlite.close(); }
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT";

export class LocalBucket implements ApkBucket {
  private objects: string;
  private multipart: string;
  constructor(directory: string) {
    this.objects = join(directory, "apks");
    this.multipart = join(directory, "multipart");
    for (const path of [this.objects, this.multipart]) mkdirSync(path, { recursive: true, mode: 0o700 });
  }
  private objectPath(key: string) {
    const match = /^releases\/([0-9a-f-]+)\.apk$/.exec(key);
    if (!match || !uuid.test(match[1])) throw new Error("Invalid APK key");
    return join(this.objects, match[1] + ".apk");
  }
  private uploadPath(id: string) {
    if (!uuid.test(id)) throw new Error("Invalid upload ID");
    return join(this.multipart, id);
  }
  async head(key: string): Promise<ApkHead | null> {
    try {
      const file = await stat(this.objectPath(key));
      return { key, size: file.size, httpEtag: `"${key.slice(9, -4)}-${file.size}"` };
    } catch (error) { if (missing(error)) return null; throw error; }
  }
  async get(key: string, options?: { range?: ApkRange }) {
    const head = await this.head(key);
    if (!head) return null;
    const range = options?.range;
    const start = range?.suffix !== undefined ? Math.max(0, head.size - range.suffix) : range?.offset ?? 0;
    const length = range?.suffix !== undefined ? head.size - start : range?.length ?? head.size - start;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(length) || start < 0 || length < 1 || start + length > head.size) throw new Error("Invalid APK range");
    const body = Readable.toWeb(createReadStream(this.objectPath(key), { start, end: start + length - 1 })) as ReadableStream<Uint8Array>;
    return { ...head, body, arrayBuffer: () => new Response(body).arrayBuffer() };
  }
  async delete(key: string) { await rm(this.objectPath(key), { force: true }); }
  async createMultipartUpload(key: string) {
    this.objectPath(key);
    const id = randomUUID();
    const directory = this.uploadPath(id);
    await mkdir(directory, { mode: 0o700 });
    await writeFile(join(directory, "upload.json"), JSON.stringify({ key }), { flag: "wx", mode: 0o600 });
    return this.resumeMultipartUpload(key, id);
  }
  resumeMultipartUpload(key: string, uploadId: string): MultipartUpload {
    const target = this.objectPath(key);
    const directory = this.uploadPath(uploadId);
    const validate = async () => {
      if (JSON.parse(await readFile(join(directory, "upload.json"), "utf8")).key !== key) throw new Error("Upload key mismatch");
    };
    const partPath = (part: UploadedPart) => {
      if (!Number.isSafeInteger(part.partNumber) || part.partNumber < 1 || part.partNumber > 64 || !/^[0-9a-f]{64}$/.test(part.etag)) throw new Error("Invalid upload part");
      return join(directory, `${part.partNumber}-${part.etag}.part`);
    };
    return {
      key, uploadId,
      uploadPart: async (partNumber, bytes) => {
        await validate();
        const part = { partNumber, etag: createHash("sha256").update(bytes).digest("hex") };
        try { await writeFile(partPath(part), bytes, { flag: "wx", mode: 0o600 }); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
        return part;
      },
      complete: async (parts) => {
        await validate();
        if (!parts.length || parts.some((part, index) => part.partNumber !== index + 1)) throw new Error("Incomplete multipart upload");
        const temporary = target + "." + randomUUID() + ".tmp";
        const output = await open(temporary, "wx", 0o600);
        try {
          for (const part of parts) {
            const hash = createHash("sha256");
            for await (const chunk of createReadStream(partPath(part))) {
              hash.update(chunk);
              const bytes = chunk as Buffer;
              let offset = 0;
              while (offset < bytes.length) offset += (await output.write(bytes, offset, bytes.length - offset)).bytesWritten;
            }
            if (hash.digest("hex") !== part.etag) throw new Error("Upload part checksum mismatch");
          }
          await output.sync();
          // Hard-link publication is atomic and never replaces an existing APK.
          await link(temporary, target);
        } finally { await output.close(); await rm(temporary, { force: true }); }
        await rm(directory, { recursive: true });
        return (await this.head(key))!;
      },
      abort: async () => { await validate(); await rm(directory, { recursive: true }); },
    };
  }
}
