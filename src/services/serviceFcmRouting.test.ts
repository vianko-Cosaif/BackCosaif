import assert from 'node:assert/strict';
import { Rol } from '@prisma/client';
import {
  resolverAudienciaFcmMovimiento,
  resolverAudienciaFcmServicio,
  tipoServicioFcm,
} from './serviceFcmRouting';
import { uniqueTokensFromUsers } from './fcmAudience';

assert.equal(tipoServicioFcm({ torno: true }), 'TORNO');
assert.equal(tipoServicioFcm({ lavado: true }), 'LAVADO');
assert.equal(tipoServicioFcm({ torno: true, lavado: true }), 'TORNO_LAVADO');
assert.equal(tipoServicioFcm({}), null);

assert.deepEqual(
  resolverAudienciaFcmMovimiento('nuevo_movimiento', { torno: true })?.roles,
  [Rol.MAQUINISTA]
);
assert.deepEqual(
  resolverAudienciaFcmMovimiento('nuevo_movimiento', { lavado: true })?.roles,
  [Rol.MAQUINISTA]
);
assert.deepEqual(
  resolverAudienciaFcmMovimiento('nuevo_movimiento', {})?.roles,
  [Rol.MAQUINISTA]
);
assert.deepEqual(
  resolverAudienciaFcmMovimiento('movimiento_editado', { torno: true })?.roles,
  [Rol.MAQUINISTA]
);
assert.deepEqual(
  resolverAudienciaFcmMovimiento('cambio_prioridad', { lavado: true })?.roles,
  [Rol.MAQUINISTA]
);
assert.ok(
  resolverAudienciaFcmMovimiento('movimiento_concluido', { torno: true })?.roles.includes(Rol.CLIENTE)
);
assert.ok(
  !resolverAudienciaFcmMovimiento('movimiento_concluido', { torno: true })?.roles.includes(Rol.TORNO)
);
assert.equal(
  resolverAudienciaFcmMovimiento('nuevo_incidente', { lavado: true })?.audience,
  'CLIENTE_NATURAL'
);

const concluido = resolverAudienciaFcmServicio('servicio_torno_concluido', 'TORNO');
assert.equal(concluido?.audience, 'CLIENTE_SERVICIO');
assert.ok(concluido?.roles.includes(Rol.CLIENTE));
assert.ok(!concluido?.roles.includes(Rol.TORNO));

const incidente = resolverAudienciaFcmServicio('incidente_torno_reportado', 'TORNO');
assert.equal(incidente?.audience, 'CLIENTE_CONTROL_SERVICIO');
assert.ok(incidente?.roles.includes(Rol.SUPERVISOR));
assert.ok(!incidente?.roles.includes(Rol.MAQUINISTA));

const resuelto = resolverAudienciaFcmServicio('incidente_torno_resuelto', 'TORNO');
assert.equal(resuelto?.audience, 'TODOS_SERVICIO');
assert.ok(resuelto?.roles.includes(Rol.TORNO));
assert.ok(resuelto?.roles.includes(Rol.CLIENTE));

const cambioNavaja = resolverAudienciaFcmServicio('cambio_navaja_concluido', 'TORNO');
assert.equal(cambioNavaja?.audience, 'OPERACION_CONTROL_SERVICIO');
assert.ok(cambioNavaja?.roles.includes(Rol.TORNO));
assert.ok(cambioNavaja?.roles.includes(Rol.COORDINADOR));
assert.ok(!cambioNavaja?.roles.includes(Rol.CLIENTE));

const tokensSoloGdl = uniqueTokensFromUsers([
  { localidadId: 10, fcmTokens: [{ token: 'torreon-null', localidadId: null }] },
  { localidadId: 20, fcmTokens: [{ token: 'gdl-null', localidadId: null }] },
  { localidadId: 10, fcmTokens: [{ token: 'gdl-explicito', localidadId: 20 }] },
  { localidadId: 20, fcmTokens: [{ token: 'torreon-explicito', localidadId: 10 }] },
], 20);
assert.deepEqual(tokensSoloGdl.sort(), ['gdl-explicito', 'gdl-null']);

console.log('Service FCM routing tests passed');
