import assert from 'node:assert/strict';
import { Rol } from '@prisma/client';
import { resolverAudienciaFcmNatural } from './naturalFcmRouting';

const creado = resolverAudienciaFcmNatural('nuevo_movimiento');
assert.equal(creado?.audience, 'MAQUINISTA_NATURAL');
assert.deepEqual(creado?.roles, [Rol.MAQUINISTA]);

const editado = resolverAudienciaFcmNatural('movimiento_editado');
assert.equal(editado?.audience, 'MAQUINISTA_NATURAL');

const iniciado = resolverAudienciaFcmNatural('movimiento_iniciado');
assert.equal(iniciado?.audience, 'CLIENTE_NATURAL');
assert.ok(iniciado?.roles.includes(Rol.CLIENTE));
assert.ok(!iniciado?.roles.includes(Rol.ARRASTRE_TORREON));

const incidente = resolverAudienciaFcmNatural('nuevo_incidente');
assert.equal(incidente?.audience, 'CLIENTE_NATURAL');
assert.equal(incidente?.url, '/incidentes');

for (const tipo of [
  'incidente_resuelto_cliente',
  'incidente_continuado',
  'incidente_cerrado_manual',
  'incidente_timeout',
]) {
  const routing = resolverAudienciaFcmNatural(tipo);
  assert.equal(routing?.audience, 'MAQUINISTA_NATURAL');
  assert.equal(routing?.url, '/incidentes');
}

const canceladoAutomatico = resolverAudienciaFcmNatural('movimiento_cancelado_incidentes');
assert.equal(canceladoAutomatico?.audience, 'AMBOS_NATURAL');
assert.ok(canceladoAutomatico?.roles.includes(Rol.MAQUINISTA));
assert.ok(canceladoAutomatico?.roles.includes(Rol.CLIENTE));

assert.equal(resolverAudienciaFcmNatural('arrastre_creado'), null);

console.log('Natural FCM routing tests passed');
