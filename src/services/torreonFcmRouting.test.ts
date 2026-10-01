import assert from 'node:assert/strict';
import { Rol } from '@prisma/client';
import { resolverAudienciaFcmTorreon } from './torreonFcmRouting';

const creado = resolverAudienciaFcmTorreon('arrastre_creado');
assert.equal(creado?.audience, 'MAQUINISTA_ARRASTRE');
assert.deepEqual(creado?.roles, [Rol.MAQUINISTA_ARRASTRE]);

const editado = resolverAudienciaFcmTorreon('arrastre_editado');
assert.equal(editado?.audience, 'MAQUINISTA_ARRASTRE');

const concluido = resolverAudienciaFcmTorreon('arrastre_concluido');
assert.equal(concluido?.audience, 'CLIENTE_ARRASTRE');
assert.ok(concluido?.roles.includes(Rol.ARRASTRE_TORREON));
assert.ok(!concluido?.roles.includes(Rol.MAQUINISTA_ARRASTRE));

const incidente = resolverAudienciaFcmTorreon('arrastre_incidente');
assert.equal(incidente?.audience, 'CLIENTE_ARRASTRE');
assert.equal(incidente?.url, '/cliente/torreon/incidentes');

const resuelto = resolverAudienciaFcmTorreon('arrastre_incidente_resuelto');
assert.equal(resuelto?.audience, 'MAQUINISTA_ARRASTRE');

const naturalCreado = resolverAudienciaFcmTorreon('torreon_movimiento_creado');
assert.equal(naturalCreado?.audience, 'MAQUINISTA_NATURAL');
assert.deepEqual(naturalCreado?.roles, [Rol.MAQUINISTA]);

const naturalIniciado = resolverAudienciaFcmTorreon('torreon_movimiento_iniciado');
assert.equal(naturalIniciado?.audience, 'CLIENTE_NATURAL');
assert.ok(naturalIniciado?.roles.includes(Rol.CLIENTE));
assert.ok(!naturalIniciado?.roles.includes(Rol.ARRASTRE_TORREON));

const naturalIncidente = resolverAudienciaFcmTorreon('nuevo_incidente');
assert.equal(naturalIncidente?.audience, 'CLIENTE_NATURAL');
assert.equal(naturalIncidente?.url, '/incidentes?source=torreon');

const naturalResuelto = resolverAudienciaFcmTorreon('incidente_resuelto_cliente');
assert.equal(naturalResuelto?.audience, 'MAQUINISTA_NATURAL');

const naturalCerrado = resolverAudienciaFcmTorreon('incidente_cerrado_manual');
assert.equal(naturalCerrado?.audience, 'MAQUINISTA_NATURAL');

assert.equal(resolverAudienciaFcmTorreon('torreon_ronda_orden'), null);

console.log('Torreon FCM routing tests passed');
