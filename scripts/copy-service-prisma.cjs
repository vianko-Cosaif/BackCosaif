const fs = require("node:fs");
const path = require("node:path");

const service = process.argv[2];
if (!["msTorno", "ms_torreon", "msComercial"].includes(service)) {
  throw new Error("Usa msTorno, ms_torreon o msComercial.");
}
const root = path.resolve(__dirname, "..");
const source = path.join(root, service, "generated");
const destination = path.join(root, service, "dist", "generated");
if (!fs.existsSync(path.join(source, "index.js")) || !fs.existsSync(path.join(source, "schema.prisma"))) {
  throw new Error(`Genera el cliente Prisma de ${service} antes de compilar.`);
}
// TypeScript resuelve los tipos generados, pero no copia el cliente JavaScript
// ni su motor nativo. Los imports compilados resuelven dist/generated.
fs.cpSync(source, destination, { recursive: true });
require(path.join(destination, "index.js"));
console.log(`Cliente Prisma empaquetado: ${service}`);
