const assert = require('node:assert/strict');
const fs = require('node:fs');
const { loader } = require('./support/load-ts.cjs');
async function main() {
  let writes = 0, scans = 0, timers = 0;
  const failWrite = () => { writes++; throw new Error('Expiry may never mutate requests or incidents'); };
  const module = loader({ 'ms_torreon/src/db/prisma': { prismaTorreon: {
    $transaction: failWrite, incidenteTorreonFerro: { findMany: () => { scans++; return []; }, updateMany: failWrite }, movimientoTorreonFerro: { create: failWrite, update: failWrite },
  } } }, { setInterval: () => { timers++; } })('ms_torreon/src/modules/incidentes/incidentExpiry.ts');
  for (const elapsed of [9, 10, 60, 24 * 60, 30 * 24 * 60]) {
    assert.equal((await module.expireNaturalIncident(50, new Date(Date.now() + elapsed * 60000))).changed, false);
  }
  module.startIncidentExpiry()();
  assert.equal(writes, 0); assert.equal(scans, 0); assert.equal(timers, 0);
  assert.ok(!fs.readFileSync('ms_torreon/src/Servidor.ts', 'utf8').includes('startIncidentExpiry'), 'Service startup never starts an expiry worker');
  console.log('PASS Torreón persistence: no deadline, scans, timed cancellation or replacement requests');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
