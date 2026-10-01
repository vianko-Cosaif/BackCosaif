const postgresEnvironment = require('../scripts/pg-env.cjs');
// Explicitly isolated test cluster only. Never defaults to a project DATABASE_URL.
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const root = path.resolve(__dirname, '..');
const admin = process.env.SECURITY_TEST_DB_ADMIN_URL;
if (!admin || new URL(admin).hostname !== '127.0.0.1' || new URL(admin).port !== '55439') throw new Error('Requires isolated SECURITY_TEST_DB_ADMIN_URL on 127.0.0.1:55439');
const targets = { main: 'prisma/schema.prisma', torno: 'msTorno/prisma/schema.prisma', torreon: 'ms_torreon/prisma/schema.prisma', comercial: 'msComercial/prisma/schema.prisma' };
const baselineRef = process.argv.find(arg => arg.startsWith('--baseline-ref='))?.slice(15);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'backcosaif-baseline-'));
try {
for (const [target, schema] of Object.entries(targets)) {
  const database = `security_${target}`;
  const url = new URL(admin); url.pathname = `/${database}`;
  if (process.argv.includes('--reset')) execFileSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1'], { input: `DROP DATABASE IF EXISTS ${database} WITH (FORCE);`, env: postgresEnvironment(admin), stdio: ['pipe', 'pipe', 'pipe'] });
  execFileSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-q'], { input: `CREATE DATABASE ${database};`, env: postgresEnvironment(admin), stdio: ['pipe', 'pipe', 'pipe'] });
  let baseline = schema;
  if (baselineRef) {
    baseline = path.join(temporary, `${target}.prisma`);
    fs.writeFileSync(baseline, execFileSync('git', ['show', `${baselineRef}:${schema}`], { cwd: root }));
  }
  const sql = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', baseline, '--script'], { cwd: root, encoding: 'utf8' });
  execFileSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1'], { input: sql, env: postgresEnvironment(url.toString()), stdio: ['pipe', 'pipe', 'pipe'] });
  const variable = { main: 'DATABASE_URL', torno: 'TORNO_DATABASE_URL', torreon: 'TORREON_DATABASE_URL', comercial: 'COMERCIAL_DATABASE_URL' }[target];
  for (const mode of ['--apply', '--apply', '--check']) execFileSync(process.execPath, ['scripts/security-migrate.cjs', `--target=${target}`, mode], { cwd: root, env: { ...process.env, [variable]: url.toString() }, stdio: 'inherit' });
  if (target === 'main') for (const mode of ['--apply', '--apply', '--check']) execFileSync(process.execPath, ['scripts/security-migrate.cjs', '--target=main', '--version=performance-20260908', mode], { cwd: root, env: { ...process.env, DATABASE_URL: url.toString() }, stdio: 'inherit' });
}
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }
