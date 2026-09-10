const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const logDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'backcosaif-tests-'));
const files = [
  'src/auth/accessPolicy.test.ts', 'src/realtime/realtimeHub.permissions.test.ts',
  'src/security/securityAudit.test.ts', 'src/services/naturalFcmRouting.test.ts',
  'src/services/serviceFcmRouting.test.ts', 'src/services/torreonFcmRouting.test.ts',
  'msComercial/src/comercial.rules.test.ts', 'src/reporteria/modelos/comercial-crm-excel.test.ts',
  'src/reporteria/modelos/comercial-contract-month-excel.test.ts',
];
for (const file of files) {
  const args = file.startsWith('msComercial/') ? ['--project', 'msComercial/tsconfig.json'] : [];
  const result = spawnSync(process.execPath, ['node_modules/ts-node/dist/bin.js', '--files', ...args, file], {
    encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test', AUDIT_ENABLED: 'false', LOG_DIR: logDirectory, JWT_SECRET: 'synthetic-test-secret-not-for-production' },
  });
  if (result.status) { console.error(`FAIL ${file}\n${result.stdout}\n${result.stderr}`); process.exit(result.status || 1); }
  console.log(`PASS ${file}`);
}
for (const file of ['tests/security-regressions.cjs', 'tests/idempotency-regressions.cjs', 'tests/pdf-regressions.cjs', 'tests/outbox-dispatch-regressions.cjs', 'tests/performance-regressions.cjs']) {
  const result = spawnSync(process.execPath, [file], { stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
fs.rmSync(logDirectory, { recursive: true, force: true });
