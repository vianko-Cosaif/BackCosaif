import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import nextEnvironment from "@next/env";
import { LocalDatabase } from "../lib/local-storage.ts";

nextEnvironment.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
const database = new LocalDatabase(resolve(process.env.COSAIF_DOWNLOAD_DATA_DIR || ".data"));
try {
  database.sqlite.exec("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  for (const file of readdirSync(new URL("../drizzle/", import.meta.url)).filter((name) => name.endsWith(".sql")).sort()) {
    if (database.sqlite.prepare("SELECT name FROM schema_migrations WHERE name = ?").get(file)) continue;
    database.sqlite.exec("BEGIN IMMEDIATE");
    try {
      database.sqlite.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
      database.sqlite.prepare("INSERT INTO schema_migrations VALUES (?, ?)").run(file, new Date().toISOString());
      database.sqlite.exec("COMMIT");
      console.log(`Applied download-storage migration: ${file}`);
    } catch (error) { database.sqlite.exec("ROLLBACK"); throw error; }
  }
} finally { database.close(); }
