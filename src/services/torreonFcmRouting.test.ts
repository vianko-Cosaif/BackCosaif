import assert from 'node:assert/strict';
import { Rol } from '@prisma/client';
import { resolverAudienciaFcmTorreon } from './torreonFcmRouting';

const creado = resolverAudienciaFcmTorreon('arrastre_creado');
assert.equal(creado?.audience, 'OPERACION_ARRASTRE');
assert.deepEqual(creado?.roles, [Rol.MAQUINISTA_ARRASTRE, Rol.COORDINADOR, Rol.SUPERVISOR]);

const editado = resolverAudienciaFcmTorreon('arrastre_editado');
assert.equal(editado?.audience, 'MAQUINISTA_ARRASTRE');

const concluido = resolverAudienciaFcmTorreon('arrastre_concluido');
assert.equal(concluido?.audience, 'CLIENTE_ARRASTRE');
assert.ok(concluido?.roles.includes(Rol.ARRASTRE_TORREON));
assert.ok(concluido?.roles.includes(Rol.MAQUINISTA_ARRASTRE));

const incidente = resolverAudienciaFcmTorreon('arrastre_incidente');
assert.equal(incidente?.audience, 'CLIENTE_CONTROL_ARRASTRE');
assert.equal(incidente?.url, '/cliente/torreon/incidentes');

const resuelto = resolverAudienciaFcmTorreon('arrastre_incidente_resuelto');
assert.equal(resuelto?.audience, 'OPERACION_ARRASTRE');

const naturalCreado = resolverAudienciaFcmTorreon('torreon_movimiento_creado');
assert.equal(naturalCreado?.audience, 'OPERACION_NATURAL');
assert.deepEqual(naturalCreado?.roles, [Rol.MAQUINISTA, Rol.COORDINADOR, Rol.SUPERVISOR]);

const naturalIniciado = resolverAudienciaFcmTorreon('torreon_movimiento_iniciado');
assert.equal(naturalIniciado?.audience, 'CLIENTE_NATURAL');
assert.ok(naturalIniciado?.roles.includes(Rol.CLIENTE));
assert.ok(!naturalIniciado?.roles.includes(Rol.ARRASTRE_TORREON));

const naturalIncidente = resolverAudienciaFcmTorreon('nuevo_incidente');
assert.equal(naturalIncidente?.audience, 'CLIENTE_CONTROL_NATURAL');
assert.equal(naturalIncidente?.url, '/incidentes?source=torreon');

const naturalResuelto = resolverAudienciaFcmTorreon('incidente_resuelto_cliente');
assert.equal(naturalResuelto?.audience, 'OPERACION_NATURAL');

const naturalCerrado = resolverAudienciaFcmTorreon('incidente_cerrado_manual');
assert.equal(naturalCerrado?.audience, 'OPERACION_NATURAL');

assert.equal(resolverAudienciaFcmTorreon('torreon_ronda_orden'), null);

console.log('Torreon FCM routing tests passed');

assert.deepEqual(resuelto?.roles, creado?.roles);
assert.deepEqual(naturalResuelto?.roles, naturalCreado?.roles);
assert.deepEqual(incidente?.roles, [Rol.ARRASTRE_TORREON, Rol.COORDINADOR, Rol.SUPERVISOR, Rol.MAQUINISTA_ARRASTRE]);
assert.deepEqual(naturalIncidente?.roles, [Rol.CLIENTE, Rol.CLIENTE_ADMIN, Rol.CLIENTE_COOR, Rol.COORDINADOR, Rol.SUPERVISOR, Rol.MAQUINISTA]);
assert.deepEqual(resolverAudienciaFcmTorreon('arrastre_pendiente_recordatorio')?.roles, creado?.roles);
assert.deepEqual(resolverAudienciaFcmTorreon('movimiento_pendiente_recordatorio')?.roles, naturalCreado?.roles);
