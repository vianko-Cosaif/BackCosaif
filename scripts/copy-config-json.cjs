const fs = require("fs");
const path = require("path");

const sourceDir = path.join(process.cwd(), "src", "config");
const targetDir = path.join(process.cwd(), "dist", "config");

if (!fs.existsSync(sourceDir)) {
  process.exit(0);
}

fs.mkdirSync(targetDir, { recursive: true });

for (const fileName of fs.readdirSync(sourceDir)) {
  if (!fileName.toLowerCase().endsWith(".json")) continue;
  const src = path.join(sourceDir, fileName);
  const dst = path.join(targetDir, fileName);
  fs.copyFileSync(src, dst);
}
