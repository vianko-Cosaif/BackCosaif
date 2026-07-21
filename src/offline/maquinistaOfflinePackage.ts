import { spawn } from "child_process";
import { createHash, createHmac, randomUUID } from "crypto";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

import type { AuthenticatedUser } from "../types/auth";
import { prisma } from "../lib/prisma";

const { PrismaClient: TorreonPrismaClient } = require("../../ms_torreon/generated");
const prismaTorreon = new TorreonPrismaClient();

export type MaquinistaOfflineProfile =
  | "GDL_NATURAL"
  | "TORREON_NATURAL"
  | "TORREON_ARRASTRE";

type PackageFile = {
  name: string;
  path: string;
  bytes: number;
  sha256: string;
};

export type MaquinistaOfflineManifest = {
  packageId: string;
  profile: MaquinistaOfflineProfile;
  schemaVersion: number;
  userId: number;
  localidadId: number;
  createdAt: string;
  expiresAt: string;
  snapshot: Omit<PackageFile, "path"> & { url: string };
  journal: Omit<PackageFile, "path"> & { url: string };
  dataVersion: string;
  signature: string;
};

export type MaquinistaOfflinePackageResult =
  | { notModified: true; etag: string }
  | { notModified: false; etag: string; manifest: MaquinistaOfflineManifest };

type CachedPackage = {
  ownerId: number;
  expiresAtMs: number;
  directory: string;
  manifest: MaquinistaOfflineManifest;
  snapshot: PackageFile;
  journal: PackageFile;
};

const SCHEMA_VERSION = 1;
const PACKAGE_TTL_MS = 15 * 60 * 1000;
const SNAPSHOT_VALIDITY_MS = 12 * 60 * 60 * 1000;
const PACKAGE_ROOT = path.join(os.tmpdir(), "cosaif-offline-maquinista");
const packages = new Map<string, CachedPackage>();

const ACTIVE_GDL_STATES = ["SOLICITADO", "EN_PROCESO", "DETENIDO"] as const;
const ACTIVE_TORREON_ROUND_STATES = ["ABIERTA", "EN_PROCESO"] as const;
const ACTIVE_ARRASTRE_STATES = ["SOLICITADO", "EN_PROCESO", "DETENIDO"] as const;

const normalize = (value: unknown) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "");

const positiveInt = (value: unknown) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const sqlValue = (value: unknown): string => {
  if (value == null) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Date) return `'${value.toISOString()}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
};

const jsonValue = (value: unknown) => sqlValue(JSON.stringify(value));

const values = (...items: unknown[]) => `(${items.map(sqlValue).join(",")})`;

const toJsonSafe = <T>(value: T): T => JSON.parse(JSON.stringify(value));

function resolveProfile(user: AuthenticatedUser): MaquinistaOfflineProfile {
  const role = normalize(user.rol);
  const localidad = normalize(user.localidad?.nombre);

  if (role === "MAQUINISTA_ARRASTRE" && localidad === "TORREON") {
    return "TORREON_ARRASTRE";
  }
  if (role === "MAQUINISTA") {
    return localidad === "TORREON" ? "TORREON_NATURAL" : "GDL_NATURAL";
  }

  const error = new Error("El paquete offline solicitado no corresponde a un maquinista");
  (error as any).status = 403;
  throw error;
}

const commonSnapshotSchema = `
PRAGMA foreign_keys = ON;
PRAGMA user_version = ${SCHEMA_VERSION};
CREATE TABLE snapshot_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
CREATE TABLE rounds (
  id INTEGER PRIMARY KEY NOT NULL,
  number INTEGER NOT NULL,
  state TEXT NOT NULL,
  localidad_id INTEGER NOT NULL,
  opened_at TEXT,
  payload_json TEXT NOT NULL
);
CREATE TABLE movements (
  id INTEGER PRIMARY KEY NOT NULL,
  round_id INTEGER,
  source TEXT NOT NULL,
  company_id INTEGER,
  company_name TEXT,
  locomotive_number INTEGER NOT NULL,
  movement_state TEXT NOT NULL,
  round_state TEXT,
  priority TEXT,
  round_number INTEGER,
  round_order INTEGER,
  via_origin TEXT,
  via_destination TEXT,
  requested_at TEXT,
  started_at TEXT,
  finished_at TEXT,
  operator_id INTEGER,
  payload_json TEXT NOT NULL
);
CREATE INDEX movements_round_idx ON movements(round_number, round_order);
CREATE INDEX movements_state_idx ON movements(movement_state, round_state);
CREATE TABLE arrastres (
  id INTEGER PRIMARY KEY NOT NULL,
  company_id INTEGER NOT NULL,
  state TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  started_at TEXT,
  operator_id INTEGER,
  payload_json TEXT NOT NULL
);
CREATE TABLE wagons (
  id INTEGER PRIMARY KEY NOT NULL,
  arrastre_id INTEGER NOT NULL,
  number TEXT,
  position INTEGER NOT NULL,
  state TEXT NOT NULL,
  origin_label TEXT,
  destination_label TEXT,
  operator_id INTEGER,
  requested_at TEXT,
  started_at TEXT,
  payload_json TEXT NOT NULL
);
CREATE INDEX wagons_arrastre_idx ON wagons(arrastre_id, position);
CREATE INDEX wagons_state_idx ON wagons(state, operator_id);
CREATE TABLE incidents (
  source TEXT NOT NULL,
  id INTEGER NOT NULL,
  movement_id INTEGER,
  arrastre_id INTEGER,
  wagon_id INTEGER,
  state TEXT NOT NULL,
  reason TEXT NOT NULL,
  started_at TEXT,
  payload_json TEXT NOT NULL,
  PRIMARY KEY(source, id)
);
`;

const journalSchema = `
PRAGMA foreign_keys = ON;
PRAGMA user_version = ${SCHEMA_VERSION};
CREATE TABLE journal_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
CREATE TABLE outbox_events (
  event_id TEXT PRIMARY KEY NOT NULL,
  profile TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  media_json TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT
);
CREATE UNIQUE INDEX outbox_sequence_idx ON outbox_events(user_id, device_id, sequence);
CREATE INDEX outbox_pending_idx ON outbox_events(status, sequence);
`;

async function loadGdlNatural(localidadId: number) {
  return prisma.ronda.findMany({
    where: {
      localidadId,
      concluido: false,
      movimiento: { estado: { in: [...ACTIVE_GDL_STATES] } },
    },
    include: {
      empresa: true,
      movimiento: {
        include: {
          empresa: true,
          viaOrigen: true,
          viaDestino: true,
          incidentes: { where: { estado: "ABIERTO" } },
        },
      },
    },
    orderBy: [{ rondaNumero: "asc" }, { orden: "asc" }],
    take: 250,
  });
}

async function loadTorreonNatural(localidadId: number) {
  return prismaTorreon.rondaTorreon.findMany({
    where: { localidadId, estado: { in: [...ACTIVE_TORREON_ROUND_STATES] } },
    include: {
      movimientos: {
        include: { movimiento: { include: { incidentes: true } }, bloqueadoPorIncidente: true },
        orderBy: { orden: "asc" },
      },
    },
    orderBy: [{ numeroRonda: "asc" }, { createdAt: "asc" }],
    take: 100,
  });
}

async function loadTorreonArrastre(localidadId: number) {
  return prismaTorreon.arrastreTorreon.findMany({
    where: { localidadId, estado: { in: [...ACTIVE_ARRASTRE_STATES] } },
    include: {
      vagones: { orderBy: { orden: "asc" } },
      incidentes: { where: { estado: "ABIERTO" }, orderBy: { fechaInicio: "asc" } },
    },
    orderBy: [{ estado: "asc" }, { ordenSolicitud: "asc" }, { fechaSolicitud: "asc" }],
    take: 100,
  });
}

async function snapshotSql(
  profile: MaquinistaOfflineProfile,
  user: AuthenticatedUser,
  createdAt: string,
  expiresAt: string
) {
  const localidadId = positiveInt(user.localidad?.id)!;
  const statements = [
    commonSnapshotSchema,
    "BEGIN IMMEDIATE;",
    `INSERT INTO snapshot_meta(key,value) VALUES
      ${values("profile", profile)},
      ${values("schemaVersion", String(SCHEMA_VERSION))},
      ${values("userId", String(user.id))},
      ${values("localidadId", String(localidadId))},
      ${values("localidadNombre", user.localidad?.nombre ?? "")},
      ${values("createdAt", createdAt)},
      ${values("expiresAt", expiresAt)};`,
  ];

  if (profile === "GDL_NATURAL") {
    const rows = await loadGdlNatural(localidadId);
    for (const row of rows) {
      const movement = toJsonSafe(row.movimiento);
      statements.push(
        `INSERT OR IGNORE INTO rounds VALUES ${values(
          row.id,
          row.rondaNumero,
          row.concluido ? "CERRADA" : "ABIERTA",
          row.localidadId,
          row.createdAt,
          JSON.stringify(toJsonSafe(row))
        )};`,
        `INSERT OR REPLACE INTO movements VALUES ${values(
          row.movimiento.id,
          row.id,
          "cosaif",
          row.empresaId,
          row.empresa?.nombre ?? row.movimiento.empresa?.nombre,
          row.movimiento.locomotiveNumber,
          row.movimiento.estado,
          row.concluido ? "CONCLUIDO" : "PENDIENTE",
          row.movimiento.prioridad,
          row.rondaNumero,
          row.orden,
          row.movimiento.viaOrigen?.nombre,
          row.movimiento.viaDestino?.nombre,
          row.movimiento.fechaSolicitud,
          row.movimiento.fechaInicio,
          row.movimiento.fechaFin,
          row.movimiento.operadorId,
          JSON.stringify(movement)
        )};`
      );
      for (const incident of row.movimiento.incidentes ?? []) {
        statements.push(`INSERT OR REPLACE INTO incidents VALUES ${values(
          "cosaif",
          incident.id,
          row.movimiento.id,
          null,
          null,
          incident.estado,
          (incident as any).descripcion ?? "Incidente abierto",
          incident.fechaInicio,
          JSON.stringify(toJsonSafe(incident))
        )};`);
      }
    }
  } else if (profile === "TORREON_NATURAL") {
    const rounds = await loadTorreonNatural(localidadId);
    for (const round of rounds) {
      statements.push(`INSERT OR REPLACE INTO rounds VALUES ${values(
        round.id,
        round.numeroRonda,
        round.estado,
        round.localidadId,
        round.fechaApertura,
        JSON.stringify(toJsonSafe(round))
      )};`);
      for (const row of round.movimientos) {
        const movement = toJsonSafe(row.movimiento);
        statements.push(`INSERT OR REPLACE INTO movements VALUES ${values(
          row.movimiento.id,
          round.id,
          "torreon",
          row.movimiento.empresaId,
          row.movimiento.empresaNombreSnapshot,
          row.movimiento.locomotiveNumber,
          row.movimiento.estado,
          row.estado,
          row.movimiento.prioridad,
          round.numeroRonda,
          row.orden,
          row.movimiento.viaOrigenNombreSnapshot,
          row.movimiento.viaDestinoNombreSnapshot,
          row.movimiento.fechaSolicitud,
          row.movimiento.fechaInicio,
          row.movimiento.fechaFin,
          row.movimiento.operadorId,
          JSON.stringify(movement)
        )};`);
        for (const incident of row.movimiento.incidentes ?? []) {
          if (incident.estado !== "ABIERTO") continue;
          statements.push(`INSERT OR REPLACE INTO incidents VALUES ${values(
            "torreon_natural",
            incident.id,
            row.movimiento.id,
            null,
            null,
            incident.estado,
            incident.motivo,
            incident.fechaInicio,
            JSON.stringify(toJsonSafe(incident))
          )};`);
        }
      }
    }
  } else {
    const arrastres = await loadTorreonArrastre(localidadId);
    for (const arrastre of arrastres) {
      statements.push(`INSERT OR REPLACE INTO arrastres VALUES ${values(
        arrastre.id,
        arrastre.empresaId,
        arrastre.estado,
        arrastre.fechaSolicitud,
        arrastre.fechaInicio,
        arrastre.operadorId,
        JSON.stringify(toJsonSafe(arrastre))
      )};`);
      for (const wagon of arrastre.vagones) {
        statements.push(`INSERT OR REPLACE INTO wagons VALUES ${values(
          wagon.id,
          arrastre.id,
          wagon.numeroVagon,
          wagon.orden,
          wagon.estado,
          `${wagon.viaOrigenNombre ?? wagon.viaOrigenId ?? "-"} / ${wagon.seccionOrigenNombre ?? wagon.seccionOrigenId ?? "-"}`,
          `${wagon.viaDestinoNombre ?? wagon.viaId ?? "-"} / ${wagon.seccionDestinoNombre ?? wagon.seccionId ?? "-"}`,
          wagon.operadorId,
          wagon.fechaSolicitud,
          wagon.fechaInicio,
          JSON.stringify(toJsonSafe(wagon))
        )};`);
      }
      for (const incident of arrastre.incidentes ?? []) {
        statements.push(`INSERT OR REPLACE INTO incidents VALUES ${values(
          "torreon_arrastre",
          incident.id,
          null,
          arrastre.id,
          incident.vagonId,
          incident.estado,
          incident.motivo,
          incident.fechaInicio,
          JSON.stringify(toJsonSafe(incident))
        )};`);
      }
    }
  }

  statements.push("COMMIT;", "PRAGMA optimize;");
  return statements.join("\n");
}

function journalSql(profile: MaquinistaOfflineProfile, user: AuthenticatedUser, createdAt: string) {
  return [
    journalSchema,
    "BEGIN IMMEDIATE;",
    `INSERT INTO journal_meta(key,value) VALUES
      ${values("profile", profile)},
      ${values("schemaVersion", String(SCHEMA_VERSION))},
      ${values("userId", String(user.id))},
      ${values("localidadId", String(user.localidad?.id ?? ""))},
      ${values("createdAt", createdAt)};`,
    "COMMIT;",
  ].join("\n");
}

async function runProcess(command: string, args: string[], sql: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "ignore", "pipe"] });
    let stderr = "";
    const timeout = setTimeout(() => child.kill("SIGKILL"), 45_000);
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(stderr || `SQLite terminó con código ${code}`));
    });
    child.stdin.end(sql);
  });
}

async function createSqliteDatabase(filePath: string, sql: string) {
  await fs.rm(filePath, { force: true });
  const sqliteBinary = process.env.SQLITE3_BIN || "sqlite3";
  try {
    await runProcess(sqliteBinary, [filePath], sql);
    return;
  } catch (error: any) {
    if (error?.code !== "ENOENT") throw error;
  }

  const prismaCli = path.resolve(process.cwd(), "node_modules/prisma/build/index.js");
  await fs.access(prismaCli);
  await runProcess(process.execPath, [prismaCli, "db", "execute", "--url", `file:${filePath}`, "--stdin"], sql);
}

async function describeFile(filePath: string): Promise<PackageFile> {
  const data = await fs.readFile(filePath);
  return {
    name: path.basename(filePath),
    path: filePath,
    bytes: data.byteLength,
    sha256: createHash("sha256").update(data).digest("hex"),
  };
}

const manifestSignature = (manifest: Omit<MaquinistaOfflineManifest, "signature">) => {
  const secret = process.env.OFFLINE_PACKAGE_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("OFFLINE_PACKAGE_SECRET o JWT_SECRET no configurado");
  return createHmac("sha256", secret).update(JSON.stringify(manifest)).digest("hex");
};

async function cleanupExpiredPackages() {
  const now = Date.now();
  await Promise.all(Array.from(packages.entries()).map(async ([id, entry]) => {
    if (entry.expiresAtMs > now) return;
    packages.delete(id);
    await fs.rm(entry.directory, { recursive: true, force: true }).catch(() => {});
  }));
}

const snapshotDataVersion = (source: string, createdAt: string, expiresAt: string) => (
  createHash("sha256")
    .update(source.split(createdAt).join("<createdAt>").split(expiresAt).join("<expiresAt>"))
    .digest("hex")
);

const snapshotEtag = (
  userId: number,
  profile: MaquinistaOfflineProfile,
  dataVersion: string
) => `"maquinista-${SCHEMA_VERSION}-${userId}-${profile}-${dataVersion}"`;

export async function createMaquinistaOfflinePackage(
  user: AuthenticatedUser,
  knownEtag?: string | null
): Promise<MaquinistaOfflinePackageResult> {
  await cleanupExpiredPackages();
  const localidadId = positiveInt(user.localidad?.id);
  if (!localidadId) {
    const error = new Error("El usuario no tiene una localidad válida");
    (error as any).status = 409;
    throw error;
  }

  const profile = resolveProfile(user);
  const packageId = randomUUID();
  const directory = path.join(PACKAGE_ROOT, packageId);
  const snapshotPath = path.join(directory, "snapshot.db");
  const journalPath = path.join(directory, "journal.db");
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SNAPSHOT_VALIDITY_MS).toISOString();

  await fs.mkdir(directory, { recursive: true });
  try {
    const snapshotSource = await snapshotSql(profile, user, createdAt, expiresAt);
    const dataVersion = snapshotDataVersion(snapshotSource, createdAt, expiresAt);
    const etag = snapshotEtag(user.id, profile, dataVersion);
    if (knownEtag === etag) {
      await fs.rm(directory, { recursive: true, force: true }).catch(() => {});
      return { notModified: true, etag };
    }
    const journalSource = journalSql(profile, user, createdAt);
    await createSqliteDatabase(snapshotPath, snapshotSource);
    await createSqliteDatabase(journalPath, journalSource);

    const [snapshot, journal] = await Promise.all([
      describeFile(snapshotPath),
      describeFile(journalPath),
    ]);
    const unsigned = {
      packageId,
      profile,
      schemaVersion: SCHEMA_VERSION,
      userId: user.id,
      localidadId,
      createdAt,
      expiresAt,
      snapshot: {
        name: snapshot.name,
        bytes: snapshot.bytes,
        sha256: snapshot.sha256,
        url: `/offline/maquinista/packages/${packageId}/snapshot`,
      },
      journal: {
        name: journal.name,
        bytes: journal.bytes,
        sha256: journal.sha256,
        url: `/offline/maquinista/packages/${packageId}/journal`,
      },
      dataVersion,
    };
    const manifest: MaquinistaOfflineManifest = {
      ...unsigned,
      signature: manifestSignature(unsigned),
    };
    packages.set(packageId, {
      ownerId: user.id,
      expiresAtMs: Date.now() + PACKAGE_TTL_MS,
      directory,
      manifest,
      snapshot,
      journal,
    });
    return { notModified: false, etag, manifest };
  } catch (error) {
    await fs.rm(directory, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

export function getMaquinistaOfflinePackageFile(
  packageId: string,
  kind: "snapshot" | "journal",
  user: AuthenticatedUser
) {
  const entry = packages.get(packageId);
  if (!entry || entry.expiresAtMs <= Date.now()) {
    const error = new Error("El paquete offline expiró; solicita uno nuevo");
    (error as any).status = 404;
    throw error;
  }
  if (entry.ownerId !== user.id) {
    const error = new Error("El paquete offline pertenece a otro usuario");
    (error as any).status = 403;
    throw error;
  }
  return entry[kind];
}
