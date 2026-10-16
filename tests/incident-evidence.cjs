// Synthetic files and in-memory database only; never imports a live Prisma client.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const sharp = require('sharp');
const { loader, invoke, logger } = require('./support/load-ts.cjs');

async function main() {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'cosaif-evidence-test-'));
  const root = path.join(cwd, 'uploads/incidentes');
  const globals = { process: { env: { NODE_ENV: 'test', AUDIT_ENABLED: 'false' }, cwd: () => cwd, hrtime: process.hrtime } };
  const config = { maxWidth: 1920, maxHeight: 1080, quality: 85, maxFileSize: 10 * 1024 * 1024, carpetaBase: root };
  const load = loader({ 'src/config/imagenes.config': { IMAGEN_CONFIG: config } }, globals);
  const images = load('src/services/incidentEvidence.ts');
  const png = await sharp({ create: { width: 12, height: 8, channels: 3, background: '#aa3344' } }).png().toBuffer();
  const dataUrl = 'data:image/png;base64,' + png.toString('base64');
  const files = async () => (await fs.readdir(root, { recursive: true }).catch(() => [])).filter(f => f.endsWith('.jpeg')).sort();
  const verify = async paths => { for (const file of paths) assert.equal((await sharp(await fs.readFile(path.join(root, file))).metadata()).format, 'jpeg'); };
  try {
    assert.equal((await images.saveIncidentImages()).length, 0);
    const four = await images.saveIncidentImages([png, png, png, png], 1);
    assert.equal(new Set(four).size, 4); await verify(four);
    const count = (await files()).length;
    await assert.rejects(() => images.saveIncidentImages([png, png, png, png, png]), e => e.status === 400);
    await assert.rejects(() => images.saveIncidentImages([png, Buffer.from('invalid')]), e => e.status === 400);
    assert.equal((await files()).length, count, 'Partial image processing never leaves a successful first file behind');

    let rows = [], id = 0, fail = false, ambiguous = false;
    const tx = {
      $queryRaw: async () => [],
      incidente: {
        findFirst: async ({ where }) => rows.find(row => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null,
        findUnique: async ({ where }) => rows.find(row => row.id === where.id) ?? null,
        create: async ({ data }) => { const row = { ...data, id: ++id }; rows.push(row); return row; },
        update: async ({ where, data }) => { const row = rows.find(row => row.id === where.id); Object.assign(row, data); return row; },
      },
    };
    const db = { ...tx, $transaction: async run => {
      const snapshot = structuredClone(rows);
      try {
        const result = await run(tx);
        if (fail) throw Error('Synthetic rollback');
        if (ambiguous) throw Error('Commit acknowledged late');
        return result;
      } catch (error) { if (!ambiguous) rows = snapshot; throw error; }
    } };
    const report = { descripcion: 'Synthetic incident', movimientoId: 5, usuarioId: 8, imagenes: [png, png, png, png] };
    const created = await images.createIncidentWithEvidence(db, report);
    assert.equal(created.isNew, true); assert.equal(images.incidentImagePaths(created.incidente).length, 4);
    await verify(images.incidentImagePaths(created.incidente));
    const saved = (await files()).length;
    const retry = await images.createIncidentWithEvidence(db, report);
    assert.equal(retry.isNew, false); assert.equal(retry.incidente.id, created.incidente.id);
    assert.equal((await files()).length, saved, 'Confirmed retries discard unused new batch and retain original files');
    await assert.rejects(() => images.createIncidentWithEvidence(db, { ...report, imagenes: [png] }), e => e.status === 409);
    assert.equal(images.incidentImagePaths(rows[0]).length, 4);
    const legacy = await images.createIncidentWithEvidence(db, { ...report, movimientoId: 6, imagenes: [] });
    assert.equal(images.incidentImagePaths(legacy.incidente).length, 0, 'Photos are optional');
    const repaired = await images.createIncidentWithEvidence(db, { ...report, movimientoId: 6, imagenes: [png] });
    assert.equal(repaired.incidente.id, legacy.incidente.id); assert.equal(images.incidentImagePaths(repaired.incidente).length, 1);
    fail = true;
    await assert.rejects(() => images.createIncidentWithEvidence(db, { ...report, movimientoId: 7 }), /Synthetic rollback/);
    assert.equal(rows.some(row => row.movimientoId === 7), false, 'Failed DB transaction never leaves an image-less incident');
    fail = false; ambiguous = true;
    await assert.rejects(() => images.createIncidentWithEvidence(db, { ...report, movimientoId: 8 }), /acknowledged late/);
    await verify(images.incidentImagePaths(rows.find(row => row.movimientoId === 8)));
    ambiguous = false;

    // Exercise the actual replacement model: old evidence is retained until commit succeeds.
    const model = loader({
      'src/lib/prisma': { prisma: db }, 'src/services/incidentEvidence': images,
      'src/jobs/durableJobs': { registerJob() {} }, 'src/utils/logger': { logger },
      'src/models/Incidente/incidente.logger': { incidenteError: logger },
      'src/models/Movimientos/Ronda/RondaModel': { RondaModel: {} },
      'src/services/tornoMs/tornoMsClient': {}, 'src/services/NotificadorFCM': { NotificadorFCM: {} },
      'src/realtime/realtimeHub': {},
    }, globals)('src/models/Incidente/IncidenteModel.ts').IncidenteModel;
    const original = [...images.incidentImagePaths(rows[0])];
    fail = true;
    await assert.rejects(() => model.editarIncidente(rows[0].id, { imagenes: [png] }), /Synthetic rollback/);
    await verify(original); assert.deepEqual(Array.from(images.incidentImagePaths(rows[0])), original);
    fail = false;
    const edited = await model.editarIncidente(rows[0].id, { imagenes: [png, png] });
    assert.equal(images.incidentImagePaths(edited).length, 2); await verify(images.incidentImagePaths(edited));
    for (const file of original) await assert.rejects(() => fs.stat(path.join(root, file)), { code: 'ENOENT' });

    const naturalSchema = load('ms_torreon/src/modules/incidentes/incidente.schemas.ts').crearIncidenteMovimientoSchema;
    const arrastreSchema = load('ms_torreon/src/modules/arrastres/arrastre.schemas.ts').crearIncidenteArrastreSchema;
    for (const schema of [naturalSchema, arrastreSchema]) {
      for (const length of [0, 1, 4]) assert.equal(schema.parse({ creadoPorId: 8, motivo: 'Synthetic incident', fotos: Array.from({ length }, () => ({ dataUrl })) }).fotos.length, length);
      assert.equal(schema.parse({ creadoPorId: 8, motivo: 'Synthetic incident' }).fotos.length, 0);
      assert.equal(schema.safeParse({ creadoPorId: 8, motivo: 'Synthetic incident', fotos: Array(5).fill({ dataUrl }) }).success, false);
      for (const url of ['file:///private/device/photo.jpg', 'content://photo/1', '2026/10/15/unknown.jpeg']) assert.equal(schema.safeParse({ creadoPorId: 8, motivo: 'Synthetic incident', fotos: [{ url }] }).success, false);
    }
    const store = load('ms_torreon/src/utils/imagenesTorreon.ts').guardarFotoTorreon;
    const torreon = await Promise.all(Array.from({ length: 4 }, (_, orden) => store({ dataUrl }, { entidad: 'incidente_movimiento', referenciaId: 4, orden })));
    assert.equal(new Set(torreon.map(photo => photo.storageKey)).size, 4); await verify(torreon.map(photo => photo.storageKey));

    let selected = { id: 2, incidenteId: 4, url: torreon[0].url, storageKey: torreon[0].storageKey };
    const evidence = loader({ 'ms_torreon/src/db/prisma': { prismaTorreon: {
      incidenteTorreonFoto: { findFirst: async ({ where }) => where.id === selected.id && where.incidenteId === selected.incidenteId ? { ...selected, incidente: { localidadId: 2, movimiento: { empresaId: 3 } } } : null },
      incidenteArrastreFoto: { findFirst: async ({ where }) => where.id === selected.id && where.incidenteId === selected.incidenteId ? { ...selected, incidente: { localidadId: 2, arrastre: { empresaId: 3 } } } : null },
    } } }, globals)('ms_torreon/src/modules/incidentes/incidente.evidencia.ts').evidenciaNatural;
    for (const tipo of ['NATURAL', 'ARRASTRE']) {
      const result = await evidence(4, 2, tipo);
      assert.match(result.dataUrl, /^data:image\/jpeg;base64,/); assert.equal(result.empresaId, 3); assert.equal(result.localidadId, 2);
      await assert.rejects(() => evidence(5, 2, tipo), e => e.status === 404);
      const originalKey = selected.storageKey;
      selected.storageKey = '../private.json'; await assert.rejects(() => evidence(4, 2, tipo), e => e.status === 404);
      selected.storageKey = originalKey;
    }
    // Both types use the gateway's existing company/locality authorization before reading bytes.
    let scope = { empresaId: 3, localidadId: 2 };
    const guard = loader({ 'src/lib/prisma': { prisma: {} }, 'src/lib/servicePrisma': { prismaTorreon: {
      incidenteTorreonFerro: { findUnique: async () => ({ movimiento: scope }) },
      incidenteArrastreTorreon: { findUnique: async () => ({ arrastre: scope }) },
    } } })('src/auth/torreonScope.ts').requireTorreonScope;
    for (const [rol, tipo] of [['CLIENTE', 'NATURAL'], ['ARRASTRE_TORREON', 'ARRASTRE'], ['MAQUINISTA', 'NATURAL'], ['MAQUINISTA_ARRASTRE', 'ARRASTRE']]) {
      const req = { method: 'GET', path: '/incidentes/4/fotos/2', query: { tipo }, user: { id: 8, rol, empresa: { id: 3 }, localidad: { id: 2 } } };
      scope = { empresaId: 3, localidadId: 2 }; assert.equal((await invoke(guard, req)).allowed, true);
      scope = { empresaId: 3, localidadId: 9 }; assert.equal((await invoke(guard, req)).statusCode, 403);
      if (rol.includes('CLIENTE') || rol === 'ARRASTRE_TORREON') { scope = { empresaId: 9, localidadId: 2 }; assert.equal((await invoke(guard, req)).statusCode, 403); }
    }
    console.log('PASS incident evidence: optional0–4 real JPEGs; no truncation/URI-only success; atomic GDL persistence, duplicate repair, rollback/uncertain commit preservation; replacement after commit; authenticated natural/arrastre reads, cross-scope/foreign-ID/traversal rejection');
  } finally { await fs.rm(cwd, { recursive: true, force: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
