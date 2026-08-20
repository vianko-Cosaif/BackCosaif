#!/usr/bin/env node
const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "..", "ms_torreon", ".env.torreon"),
  override: false,
});

const { PrismaClient } = require("../ms_torreon/generated");

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();

const VIA_REFERENCES = [
  ["arrastre_torreon", "via_origen_id"],
  ["arrastre_torreon", "via_destino_id"],
  ["arrastre_torreon_vagon", "via_origen_id"],
  ["arrastre_torreon_vagon", "via_id"],
  ["incidente_arrastre_torreon", "via_bloqueada_id"],
];

const SECCION_REFERENCES = [
  ["arrastre_torreon", "seccion_origen_id"],
  ["arrastre_torreon", "seccion_destino_id"],
  ["arrastre_torreon_vagon", "seccion_origen_id"],
  ["arrastre_torreon_vagon", "seccion_id"],
  ["incidente_arrastre_torreon", "seccion_bloqueada_id"],
];

function numberOrNull(value) {
  return value === null || typeof value === "undefined" ? null : Number(value);
}

function isDense(summary) {
  const idsAreDense = (catalogo) =>
    catalogo.count === 0 || (catalogo.minId === 1 && catalogo.maxId === catalogo.count);
  return idsAreDense(summary.vias) && idsAreDense(summary.secciones);
}

async function getSummary(client) {
  const [vias, secciones] = await Promise.all([
    client.$queryRawUnsafe(`
      SELECT
        COUNT(*)::integer AS count,
        MIN(id)::integer AS min_id,
        MAX(id)::integer AS max_id
      FROM "via_arrastre_torreon"
    `),
    client.$queryRawUnsafe(`
      SELECT
        COUNT(*)::integer AS count,
        MIN(id)::integer AS min_id,
        MAX(id)::integer AS max_id
      FROM "seccion_arrastre_torreon"
    `),
  ]);

  return {
    vias: {
      count: Number(vias[0].count),
      minId: numberOrNull(vias[0].min_id),
      maxId: numberOrNull(vias[0].max_id),
    },
    secciones: {
      count: Number(secciones[0].count),
      minId: numberOrNull(secciones[0].min_id),
      maxId: numberOrNull(secciones[0].max_id),
    },
  };
}

async function getDanglingReferences(client) {
  return client.$queryRawUnsafe(`
    SELECT source, COUNT(*)::integer AS count
    FROM (
      SELECT 'arrastre_torreon.via_origen_id' AS source
      FROM "arrastre_torreon" AS arrastre
      WHERE arrastre."via_origen_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "via_arrastre_torreon" AS via
          WHERE via.id = arrastre."via_origen_id"
        )

      UNION ALL

      SELECT 'arrastre_torreon.via_destino_id' AS source
      FROM "arrastre_torreon" AS arrastre
      WHERE arrastre."via_destino_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "via_arrastre_torreon" AS via
          WHERE via.id = arrastre."via_destino_id"
        )

      UNION ALL

      SELECT 'arrastre_torreon_vagon.via_origen_id' AS source
      FROM "arrastre_torreon_vagon" AS vagon
      WHERE vagon."via_origen_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "via_arrastre_torreon" AS via
          WHERE via.id = vagon."via_origen_id"
        )

      UNION ALL

      SELECT 'arrastre_torreon_vagon.via_id' AS source
      FROM "arrastre_torreon_vagon" AS vagon
      WHERE vagon."via_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "via_arrastre_torreon" AS via
          WHERE via.id = vagon."via_id"
        )

      UNION ALL

      SELECT 'incidente_arrastre_torreon.via_bloqueada_id' AS source
      FROM "incidente_arrastre_torreon" AS incidente
      WHERE incidente."via_bloqueada_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "via_arrastre_torreon" AS via
          WHERE via.id = incidente."via_bloqueada_id"
        )

      UNION ALL

      SELECT 'arrastre_torreon.seccion_origen_id' AS source
      FROM "arrastre_torreon" AS arrastre
      WHERE arrastre."seccion_origen_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "seccion_arrastre_torreon" AS seccion
          WHERE seccion.id = arrastre."seccion_origen_id"
        )

      UNION ALL

      SELECT 'arrastre_torreon.seccion_destino_id' AS source
      FROM "arrastre_torreon" AS arrastre
      WHERE arrastre."seccion_destino_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "seccion_arrastre_torreon" AS seccion
          WHERE seccion.id = arrastre."seccion_destino_id"
        )

      UNION ALL

      SELECT 'arrastre_torreon_vagon.seccion_origen_id' AS source
      FROM "arrastre_torreon_vagon" AS vagon
      WHERE vagon."seccion_origen_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "seccion_arrastre_torreon" AS seccion
          WHERE seccion.id = vagon."seccion_origen_id"
        )

      UNION ALL

      SELECT 'arrastre_torreon_vagon.seccion_id' AS source
      FROM "arrastre_torreon_vagon" AS vagon
      WHERE vagon."seccion_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "seccion_arrastre_torreon" AS seccion
          WHERE seccion.id = vagon."seccion_id"
        )

      UNION ALL

      SELECT 'incidente_arrastre_torreon.seccion_bloqueada_id' AS source
      FROM "incidente_arrastre_torreon" AS incidente
      WHERE incidente."seccion_bloqueada_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "seccion_arrastre_torreon" AS seccion
          WHERE seccion.id = incidente."seccion_bloqueada_id"
        )
    ) AS referencias_huerfanas
    GROUP BY source
    ORDER BY source
  `);
}

async function assertNoDanglingReferences(client) {
  const dangling = await getDanglingReferences(client);
  if (dangling.length) {
    throw new Error("Hay referencias de arrastre sin catálogo: " + JSON.stringify(dangling));
  }
}

async function assertPositiveCatalogIds(client) {
  const [invalidos] = await client.$queryRawUnsafe(`
    SELECT
      (SELECT COUNT(*)::integer FROM "via_arrastre_torreon" WHERE id <= 0) AS vias,
      (SELECT COUNT(*)::integer FROM "seccion_arrastre_torreon" WHERE id <= 0) AS secciones
  `);

  if (Number(invalidos.vias) || Number(invalidos.secciones)) {
    throw new Error("El catálogo contiene IDs no positivos; deteniendo la normalización para no sobrescribir un estado incompleto.");
  }
}

async function assertDenseIds(client) {
  const summary = await getSummary(client);
  if (!isDense(summary)) {
    throw new Error("La normalización no produjo IDs consecutivos: " + JSON.stringify(summary));
  }
  return summary;
}

async function createMaps(tx) {
  await tx.$executeRawUnsafe(`
    CREATE TEMP TABLE "_torreon_via_id_map" ON COMMIT DROP AS
    SELECT
      id AS old_id,
      (ROW_NUMBER() OVER (ORDER BY localidad_id, numero, id))::integer AS new_id
    FROM "via_arrastre_torreon"
  `);

  await tx.$executeRawUnsafe(`
    CREATE TEMP TABLE "_torreon_seccion_id_map" ON COMMIT DROP AS
    SELECT
      seccion.id AS old_id,
      (ROW_NUMBER() OVER (ORDER BY via_map.new_id, seccion.numero, seccion.id))::integer AS new_id
    FROM "seccion_arrastre_torreon" AS seccion
    INNER JOIN "_torreon_via_id_map" AS via_map ON via_map.old_id = seccion.via_id
  `);
}

async function remapReferencesToNegative(tx, references, mapTable) {
  for (const [table, column] of references) {
    await tx.$executeRawUnsafe(
      'UPDATE "' + table + '" AS target ' +
        'SET "' + column + '" = -mapping.new_id ' +
        'FROM "' + mapTable + '" AS mapping ' +
        'WHERE target."' + column + '" = mapping.old_id'
    );
  }
}

async function restorePositiveReferences(tx, references) {
  for (const [table, column] of references) {
    await tx.$executeRawUnsafe(
      'UPDATE "' + table + '" SET "' + column + '" = -"' + column + '" ' +
        'WHERE "' + column + '" < 0'
    );
  }
}

async function normalizeCatalogIds() {
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '5s'");
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(927401)");
      await tx.$executeRawUnsafe(`
        LOCK TABLE
          "via_arrastre_torreon",
          "seccion_arrastre_torreon",
          "arrastre_torreon",
          "arrastre_torreon_vagon",
          "incidente_arrastre_torreon"
        IN SHARE ROW EXCLUSIVE MODE
      `);

      await assertPositiveCatalogIds(tx);
      await assertNoDanglingReferences(tx);
      await createMaps(tx);

      await remapReferencesToNegative(tx, VIA_REFERENCES, "_torreon_via_id_map");
      await remapReferencesToNegative(tx, SECCION_REFERENCES, "_torreon_seccion_id_map");

      await tx.$executeRawUnsafe(`
        UPDATE "via_arrastre_torreon" AS via
        SET id = -map.new_id
        FROM "_torreon_via_id_map" AS map
        WHERE via.id = map.old_id
      `);
      await tx.$executeRawUnsafe(`
        UPDATE "seccion_arrastre_torreon" AS seccion
        SET id = -map.new_id
        FROM "_torreon_seccion_id_map" AS map
        WHERE seccion.id = map.old_id
      `);

      await tx.$executeRawUnsafe(`
        UPDATE "via_arrastre_torreon"
        SET id = -id
        WHERE id < 0
      `);
      await tx.$executeRawUnsafe(`
        UPDATE "seccion_arrastre_torreon"
        SET id = -id
        WHERE id < 0
      `);

      await restorePositiveReferences(tx, VIA_REFERENCES);
      await restorePositiveReferences(tx, SECCION_REFERENCES);

      await assertDenseIds(tx);
      await assertNoDanglingReferences(tx);
    },
    { maxWait: 10000, timeout: 30000 }
  );
}

async function main() {
  const before = await getSummary(prisma);
  await assertNoDanglingReferences(prisma);
  console.log("Estado actual: " + JSON.stringify(before));

  if (!apply) {
    console.log(
      isDense(before)
        ? "El catálogo ya usa IDs consecutivos."
        : "Modo verificación: ejecuta con --apply para normalizar los IDs en una sola transacción."
    );
    return;
  }

  if (isDense(before)) {
    console.log("No se requieren cambios.");
    return;
  }

  await normalizeCatalogIds();
  const after = await assertDenseIds(prisma);
  await assertNoDanglingReferences(prisma);
  console.log("Estado normalizado: " + JSON.stringify(after));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
