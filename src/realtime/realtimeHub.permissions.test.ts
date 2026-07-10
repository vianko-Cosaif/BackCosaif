import assert from 'node:assert/strict';
import type { AuthenticatedUser } from '../types/auth';
import { realtimeAudienceForUser } from './realtimeHub';

function user(role: string, empresaId?: number, localidadId?: number): AuthenticatedUser {
  return {
    id: 1,
    nombre: 'Prueba',
    rol: role,
    empresa: empresaId ? { id: empresaId, nombre: 'Empresa' } : undefined,
    localidad: localidadId ? { id: localidadId, nombre: 'Localidad', estado: 'ACTIVA' } : undefined,
    auth: { jti: 'test' },
  };
}

assert.deepEqual(realtimeAudienceForUser(user('ADMINISTRADOR'), { localidadId: 99 }), { mode: 'all' });
assert.deepEqual(realtimeAudienceForUser(user('COORDINADOR', undefined, 2), { localidadId: 99 }), { mode: 'localidad', id: 2 });
assert.deepEqual(realtimeAudienceForUser(user('CLIENTE', 7, 2), { localidadId: 99 }), { mode: 'empresaLocalidad', empresaId: 7, localidadId: 2 });
assert.deepEqual(realtimeAudienceForUser(user('SUPERVISOR', undefined, 3), { localidadId: 99 }), { mode: 'localidad', id: 3 });
assert.deepEqual(realtimeAudienceForUser(user('CLIENTE', 7), { localidadId: 4 }), { mode: 'empresaLocalidad', empresaId: 7, localidadId: 4 });

console.log('Permisos realtime: OK');
