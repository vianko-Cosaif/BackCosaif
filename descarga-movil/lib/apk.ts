import { createHash } from "node:crypto";
import { ApiError } from "./auth.ts";
import type { ApkBucket } from "./storage-types.ts";

// Structural APK validation; release metadata is entered by the administrator.
// Signature verification remains the responsibility of the Android build pipeline.
export async function inspectApk(bucket: ApkBucket, key: string, expectedSize: number) {
  const head = await bucket.head(key);
  if (!head || head.size !== expectedSize) throw new ApiError(400, "El archivo está incompleto. Vuelve a cargarlo.");
  const tail = await bucket.get(key, { range: { suffix: Math.min(65_557, head.size) } });
  if (!tail) throw new ApiError(400, "No fue posible leer el archivo.");
  const bytes = new Uint8Array(await tail.arrayBuffer());
  const view = new DataView(bytes.buffer);
  let end = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) { end = i; break; }
  }
  if (end < 0) throw new ApiError(400, "El archivo no es una APK válida.");
  const entries = view.getUint16(end + 10, true);
  const length = view.getUint32(end + 12, true);
  const offset = view.getUint32(end + 16, true);
  const endOffset = head.size - bytes.length + end;
  if (view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0 || view.getUint16(end + 8, true) !== entries || entries === 0 || entries > 20_000 || length > 8 * 1024 * 1024 || offset + length !== endOffset) {
    throw new ApiError(400, "La APK usa un formato no admitido o está dañada.");
  }
  const central = await bucket.get(key, { range: { offset, length } });
  if (!central) throw new ApiError(400, "La APK está dañada.");
  const directory = new Uint8Array(await central.arrayBuffer());
  const directoryView = new DataView(directory.buffer);
  let position = 0;
  let manifestOffset: number | null = null;
  for (let entry = 0; entry < entries; entry++) {
    if (position + 46 > directory.length || directoryView.getUint32(position, true) !== 0x02014b50) throw new ApiError(400, "La APK está dañada.");
    const nameLength = directoryView.getUint16(position + 28, true);
    const step = 46 + nameLength + directoryView.getUint16(position + 30, true) + directoryView.getUint16(position + 32, true);
    if (position + step > directory.length) throw new ApiError(400, "La APK está dañada.");
    const name = new TextDecoder().decode(directory.subarray(position + 46, position + 46 + nameLength));
    if (name === "AndroidManifest.xml") {
      if (manifestOffset !== null || directoryView.getUint16(position + 8, true) & 1 || directoryView.getUint32(position + 24, true) === 0) throw new ApiError(400, "El manifiesto de Android no es válido.");
      manifestOffset = directoryView.getUint32(position + 42, true);
      if (manifestOffset + 30 > offset) throw new ApiError(400, "El manifiesto de Android está dañado.");
    }
    position += step;
  }
  if (position !== directory.length || manifestOffset === null) throw new ApiError(400, "El archivo no contiene un manifiesto de Android. Selecciona una APK.");
  const local = await bucket.get(key, { range: { offset: manifestOffset, length: 30 } });
  if (!local || new DataView(await local.arrayBuffer()).getUint32(0, true) !== 0x04034b50) throw new ApiError(400, "El manifiesto de Android está dañado.");
  const object = await bucket.get(key);
  if (!object) throw new ApiError(400, "La APK no está disponible.");
  const hash = createHash("sha256");
  const reader = object.body.getReader();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      hash.update(value);
    }
  } finally { reader.releaseLock(); }
  return hash.digest("hex");
}

export function parseRange(header: string | null, size: number): { offset: number; length: number } | undefined {
  if (!header) return;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) throw new ApiError(416, "El rango de descarga no es válido.");
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start || (!match[1] && Number(match[2]) === 0)) throw new ApiError(416, "El rango de descarga no es válido.");
  return { offset: start, length: end - start + 1 };
}
