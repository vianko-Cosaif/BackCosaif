const { spawnSync } = require("child_process");
const path = require("path");
const { loadCommercialEnvironment } = require("../msComercial/configureDatabase.cjs");

loadCommercialEnvironment({ announce: true });

const command = process.argv[2];
const allowed = {
  generate: ["generate"],
  push: ["db", "push"],
};
if (!allowed[command]) {
  process.stderr.write("Uso: node scripts/prisma-comercial.cjs generate|push\n");
  process.exit(2);
}

const prismaCli = path.join(__dirname, "..", "node_modules", "prisma", "build", "index.js");
const schema = path.join(__dirname, "..", "msComercial", "prisma", "schema.prisma");
const result = spawnSync(process.execPath, [prismaCli, ...allowed[command], "--schema", schema], {
  env: process.env,
  encoding: "utf8",
  stdio: "inherit",
});
process.exit(result.status ?? 1);
