// Additive, checksummed SQL migrations. Uses psql; never runs against a database
// unless --apply or --check is explicitly supplied by the operator.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');
const postgresEnvironment = require('./pg-env.cjs');
const root = path.resolve(__dirname, '..');
const target = process.argv.find(a => a.startsWith('--target='))?.slice(9);
const targets = {
  main: ['DATABASE_URL', '.env'],
  torno: ['TORNO_DATABASE_URL', 'msTorno/.env.torno'],
  torreon: ['TORREON_DATABASE_URL', 'ms_torreon/.env.torreon'],
  comercial: ['COMERCIAL_DATABASE_URL', 'msComercial/.env.comercial'],
};
if (!targets[target]) throw new Error('Usa --target=main|torno|torreon|comercial');
const version = process.argv.find(a => a.startsWith('--version='))?.slice(10) || 'security-20260907';
if (!['security-20260907', 'performance-20260908'].includes(version) || (version === 'performance-20260908' && target !== 'main')) throw new Error('Versión o destino de migración no permitido');
const sql = fs.readFileSync(path.join(root, 'migrations', version, `${target}.sql`), 'utf8');
const checksum = crypto.createHash('sha256').update(sql).digest('hex');
if (!process.argv.includes('--apply') && !process.argv.includes('--check')) {
  console.log(`${target}: ${version}, sha256 ${checksum}. Usa --check o --apply.`);
  process.exit(0);
}
const [variable, envPath] = targets[target];
const defaults = fs.existsSync(path.join(root, envPath)) ? dotenv.parse(fs.readFileSync(path.join(root, envPath))) : {};
const url = process.env[variable] || defaults[variable];
if (!url) throw new Error(`Falta ${variable}`);
const checkOnly = process.argv.includes('--check');
const script = checkOnly ? `SELECT 1 / CASE WHEN EXISTS (SELECT 1 FROM security_schema_migrations WHERE version = '${version}' AND checksum = '${checksum}') THEN 1 ELSE 0 END;` : `
BEGIN;
SELECT pg_advisory_xact_lock(64090, 1);
CREATE TABLE IF NOT EXISTS security_schema_migrations (version TEXT PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM security_schema_migrations WHERE version = '${version}' AND checksum <> '${checksum}') THEN RAISE EXCEPTION 'El checksum de la migración aplicada cambió'; END IF;
END $$;
SELECT EXISTS (SELECT 1 FROM security_schema_migrations WHERE version = '${version}') AS already_applied \\gset
\\if :already_applied
\\echo Migración previamente aplicada
\\else
${sql}
INSERT INTO security_schema_migrations(version, checksum) VALUES ('${version}', '${checksum}');
\\endif
COMMIT;
`;
const result = spawnSync(process.env.PSQL_BIN || 'psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1'], {
  input: script, encoding: 'utf8', env: postgresEnvironment(url), stdio: ['pipe', 'pipe', 'pipe'],
});
if (result.error || result.status) {
  // Do not print connection strings or driver errors containing credentials.
  console.error(`${target}: migración ${checkOnly ? 'pendiente o no verificable' : 'fallida'}. Revisa conectividad y compatibilidad del esquema.`);
  if (result.error?.code === 'ENOENT') console.error('psql no está instalado o no está en PATH.');
  process.exit(1);
}
console.log(`${target}: ${version} ${checkOnly ? 'verificada' : 'aplicada/verificada'} (${checksum}).`);
