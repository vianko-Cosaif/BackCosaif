export type Release = {
  id: string;
  version: string;
  versionCode: number;
  fileName: string;
  size: number;
  sha256: string;
  minAndroid: string;
  notes: string;
  createdAt: string;
  createdByName: string;
  isCurrent: boolean;
  publishedAt?: string;
};

export type AdminUser = { id: number; nombre: string; rol: "ADMINISTRADOR" };
export const MAX_APK_BYTES = 512 * 1024 * 1024;
export const CHUNK_BYTES = 8 * 1024 * 1024;
export const formatBytes = (size: number) => `${(size / 1024 / 1024).toLocaleString("es-MX", { maximumFractionDigits: 1 })} MB`;
export const formatDate = (value: string) => new Date(value).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric", timeZone: "America/Monterrey" });
