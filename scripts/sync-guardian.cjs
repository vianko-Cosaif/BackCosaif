// Generated copies keep each service independently buildable with its current rootDir.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/guardian/guardianOutbox.ts'), 'utf8');
for (const service of ['msTorno', 'ms_torreon', 'msComercial']) {
  const target = path.join(root, service, 'src/guardianOutbox.ts');
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== source) {
      throw new Error(`Guardian transport drift in ${service}; run node scripts/sync-guardian.cjs`);
    }
  } else fs.writeFileSync(target, source);
}
