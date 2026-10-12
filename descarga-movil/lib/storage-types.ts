export type QueryResult = { success: true; meta: { changes: number } };

export interface QueryStatement {
  bind(...values: (string | number | null)[]): QueryStatement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: true }>;
  run(): Promise<QueryResult>;
}

export interface ReleaseDatabase {
  prepare(sql: string): QueryStatement;
  batch(statements: QueryStatement[]): Promise<QueryResult[]>;
}

export type ApkHead = { key: string; size: number; httpEtag: string };
export type ApkObject = ApkHead & { body: ReadableStream<Uint8Array>; arrayBuffer(): Promise<ArrayBuffer> };
export type ApkRange = { offset?: number; length?: number; suffix?: number };
export type UploadedPart = { partNumber: number; etag: string };

export interface MultipartUpload {
  key: string;
  uploadId: string;
  uploadPart(partNumber: number, bytes: Uint8Array): Promise<UploadedPart>;
  complete(parts: UploadedPart[]): Promise<ApkHead>;
  abort(): Promise<void>;
}

export interface ApkBucket {
  head(key: string): Promise<ApkHead | null>;
  get(key: string, options?: { range?: ApkRange }): Promise<ApkObject | null>;
  delete(key: string): Promise<void>;
  createMultipartUpload(key: string, options?: unknown): Promise<MultipartUpload>;
  resumeMultipartUpload(key: string, uploadId: string): MultipartUpload;
}
