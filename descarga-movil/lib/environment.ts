import { resolve } from "node:path";
import { LocalBucket, LocalDatabase } from "./local-storage.ts";
import type { Environment } from "./api.ts";

const state = globalThis as typeof globalThis & { cosaifDownloadStorage?: { DB: LocalDatabase; BUCKET: LocalBucket } };

export function getEnvironment(): Environment {
  if (!state.cosaifDownloadStorage) {
    const directory = resolve(process.env.COSAIF_DOWNLOAD_DATA_DIR || ".data");
    state.cosaifDownloadStorage = { DB: new LocalDatabase(directory), BUCKET: new LocalBucket(directory) };
  }
  return {
    ...state.cosaifDownloadStorage,
    BACKCOSAIF_URL: process.env.BACKCOSAIF_URL || "http://127.0.0.1:3008",
    SESSION_SECRET: process.env.SESSION_SECRET,
  };
}

export function canonicalRequest(request: Request, origin = process.env.APP_ORIGIN) {
  if (!origin) return request;
  const configured = new URL(origin);
  if (!['http:', 'https:'].includes(configured.protocol) || configured.username || configured.password || configured.pathname !== "/" || configured.search || configured.hash) throw new Error("Invalid APP_ORIGIN");
  const url = new URL(request.url);
  url.protocol = configured.protocol;
  url.host = configured.host;
  url.port = configured.port;
  return new Request(url, request);
}
