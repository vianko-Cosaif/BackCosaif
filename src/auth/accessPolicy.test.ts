import assert from 'node:assert/strict';
import { Rol } from '@prisma/client';
import {
  AUTHORIZATION_POLICY_VERSION,
  PERMISSIONS,
  buildAuthorizationProfile,
  hasPermission,
} from './accessPolicy';
import { applyQueryScope } from './authorize';
import { LoginAttemptStore } from './loginRateLimit';
import { resourceFitsAuthorizationScope } from './resourceScope';
import { isCorsOriginAllowed, parseAllowedOrigins } from './corsPolicy';

const profile = (rol: string, empresaId = 10, localidadId = 20) =>
  buildAuthorizationProfile({ rol, empresaId, localidadId });

for (const role of Object.values(Rol)) {
  const current = profile(role);
  assert.equal(current.policyVersion, AUTHORIZATION_POLICY_VERSION);
  assert.equal(current.role, role);
  assert.notEqual(current.scope.mode, 'DENY');
  assert.equal(hasPermission(current, PERMISSIONS.SESSION_READ), true);
  assert.equal(new Set(current.permissions).size, current.permissions.length);
}

const unknown = profile('ROOT');
assert.equal(unknown.scope.mode, 'DENY');
assert.deepEqual(unknown.permissions, []);
assert.equal(unknown.platforms.web, false);
assert.equal(unknown.platforms.mobile, false);

const admin = profile(Rol.ADMINISTRADOR);
assert.equal(admin.scope.mode, 'GLOBAL');
assert.equal(hasPermission(admin, PERMISSIONS.COMPANIES_MANAGE), true);
assert.equal(hasPermission(admin, PERMISSIONS.REPORTS_ADMIN_READ), true);
assert.equal(hasPermission(admin, PERMISSIONS.MOVEMENTS_DELETE), true);
assert.equal(hasPermission(admin, PERMISSIONS.ROUNDS_DELETE), true);
assert.equal(hasPermission(admin, PERMISSIONS.INCIDENTS_MAINTENANCE), true);

const coordinator = profile(Rol.COORDINADOR);
assert.equal(coordinator.scope.mode, 'LOCALITY');
assert.equal(coordinator.scope.localidadId, 20);
assert.equal(hasPermission(coordinator, PERMISSIONS.USERS_MANAGE), true);
assert.equal(hasPermission(coordinator, PERMISSIONS.OPERATIONAL_CATALOGS_MANAGE), true);
assert.equal(hasPermission(coordinator, PERMISSIONS.COMPANIES_MANAGE), false);
assert.equal(hasPermission(coordinator, PERMISSIONS.REPORTS_ADMIN_READ), false);
assert.equal(hasPermission(coordinator, PERMISSIONS.ROUNDS_DELETE), true);
assert.equal(hasPermission(coordinator, PERMISSIONS.INCIDENTS_DELETE), true);

const supervisor = profile(Rol.SUPERVISOR);
assert.equal(hasPermission(supervisor, PERMISSIONS.MOVEMENTS_OPERATE), true);
assert.equal(hasPermission(supervisor, PERMISSIONS.MOVEMENTS_CREATE), true);
assert.equal(supervisor.capabilities.canCreateMovements, true);
assert.equal(hasPermission(supervisor, PERMISSIONS.ROUNDS_DELETE), false);
assert.equal(hasPermission(supervisor, PERMISSIONS.INCIDENTS_DELETE), false);
assert.equal(hasPermission(supervisor, PERMISSIONS.USERS_MANAGE), false);

const client = profile(Rol.CLIENTE);
assert.equal(client.scope.mode, 'COMPANY_LOCALITY');
assert.equal(client.scope.empresaId, 10);
assert.equal(client.scope.localidadId, 20);
assert.equal(hasPermission(client, PERMISSIONS.MOVEMENTS_CREATE), true);
assert.equal(hasPermission(client, PERMISSIONS.MOVEMENTS_OPERATE), false);
assert.equal(hasPermission(client, PERMISSIONS.MOVEMENTS_CANCEL), true);
assert.equal(hasPermission(client, PERMISSIONS.ROUNDS_EDIT), true);
assert.equal(hasPermission(client, PERMISSIONS.ROUNDS_OPERATE), false);

const clientAdmin = profile(Rol.CLIENTE_ADMIN);
assert.equal(clientAdmin.scope.mode, 'COMPANY');
assert.equal(hasPermission(clientAdmin, PERMISSIONS.TORREON_CREATE), true);

const commercial = profile(Rol.COMERCIAL);
assert.equal(commercial.scope.mode, 'COMMERCIAL');
assert.equal(hasPermission(commercial, PERMISSIONS.REPORTS_COMMERCIAL_READ), true);
assert.equal(hasPermission(commercial, PERMISSIONS.MOVEMENTS_READ), false);
assert.equal(commercial.capabilities.canCreateMovements, false);

const maquinista = profile(Rol.MAQUINISTA);
assert.equal(hasPermission(maquinista, PERMISSIONS.MOVEMENTS_OPERATE), true);
assert.equal(hasPermission(maquinista, PERMISSIONS.MOVEMENTS_EDIT), false);
assert.equal(hasPermission(maquinista, PERMISSIONS.ROUNDS_OPERATE), true);

assert.equal(hasPermission(profile(Rol.MAQUINISTA), PERMISSIONS.OFFLINE_MAQUINISTA_READ), true);
assert.equal(hasPermission(profile(Rol.MAQUINISTA_ARRASTRE), PERMISSIONS.OFFLINE_MAQUINISTA_READ), true);
assert.equal(hasPermission(profile(Rol.OPERADOR), PERMISSIONS.OFFLINE_MAQUINISTA_READ), false);

const coordinatorQuery: Record<string, unknown> = { empresaId: '99' };
assert.deepEqual(applyQueryScope(coordinator, coordinatorQuery), { allowed: true });
assert.equal(coordinatorQuery.localidadId, '20');
assert.equal(coordinatorQuery.empresaId, '99');

const forgedCoordinatorQuery: Record<string, unknown> = { localidadId: '999' };
assert.deepEqual(applyQueryScope(coordinator, forgedCoordinatorQuery), {
  allowed: false,
  reason: 'locality_scope_mismatch',
});

const clientQuery: Record<string, unknown> = {};
assert.deepEqual(applyQueryScope(client, clientQuery), { allowed: true });
assert.deepEqual(clientQuery, { empresaId: '10', localidadId: '20' });

const forgedClientQuery: Record<string, unknown> = { empresaId: '11', localidadId: '20' };
assert.deepEqual(applyQueryScope(client, forgedClientQuery), {
  allowed: false,
  reason: 'company_scope_mismatch',
});

const adminQuery: Record<string, unknown> = { empresaId: '99', localidadId: '88' };
assert.deepEqual(applyQueryScope(admin, adminQuery), { allowed: true });
assert.deepEqual(adminQuery, { empresaId: '99', localidadId: '88' });

assert.equal(resourceFitsAuthorizationScope(admin, { empresaId: 999, localidadId: 999 }), true);
assert.equal(resourceFitsAuthorizationScope(coordinator, { empresaId: 999, localidadId: 20 }), true);
assert.equal(resourceFitsAuthorizationScope(coordinator, { empresaId: 10, localidadId: 21 }), false);
assert.equal(resourceFitsAuthorizationScope(client, { empresaId: 10, localidadId: 20 }), true);
assert.equal(resourceFitsAuthorizationScope(client, { empresaId: 10, localidadId: 21 }), false);
assert.equal(resourceFitsAuthorizationScope(clientAdmin, { empresaId: 10, localidadId: 999 }), true);
assert.equal(resourceFitsAuthorizationScope(clientAdmin, { empresaId: 11, localidadId: 20 }), false);

const corsOrigins = parseAllowedOrigins('https://App.Example.com/, https://admin.example.com');
assert.equal(isCorsOriginAllowed(undefined, 'enforce', corsOrigins), true);
assert.equal(isCorsOriginAllowed('https://app.example.com', 'enforce', corsOrigins), true);
assert.equal(isCorsOriginAllowed('https://evil.example.com', 'enforce', corsOrigins), false);
assert.equal(isCorsOriginAllowed('https://evil.example.com', 'compat', corsOrigins), true);

const loginAttempts = new LoginAttemptStore(3, 1_000, 2_000);
assert.equal(loginAttempts.retryAfterMs('ip|user', 100), 0);
loginAttempts.recordFailure('ip|user', 100);
loginAttempts.recordFailure('ip|user', 200);
assert.equal(loginAttempts.retryAfterMs('ip|user', 250), 0);
loginAttempts.recordFailure('ip|user', 300);
assert.equal(loginAttempts.retryAfterMs('ip|user', 400), 1_900);
loginAttempts.clear('ip|user');
assert.equal(loginAttempts.retryAfterMs('ip|user', 500), 0);

const expiredAttempts = new LoginAttemptStore(2, 1_000, 2_000);
expiredAttempts.recordFailure('ip|other', 100);
expiredAttempts.recordFailure('ip|other', 1_500);
assert.equal(expiredAttempts.retryAfterMs('ip|other', 1_600), 0);

console.log('Política central de autorización: OK');
