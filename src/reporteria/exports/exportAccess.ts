import { createHash } from 'crypto';
import { buildAuthorizationProfile, hasPermission, PERMISSIONS, type AuthorizationPrincipal } from '../../auth/accessPolicy';
import { applyQueryScope } from '../../auth/authorize';
import { boundedReportFilters, type MovementFilters } from '../../application/movements/movementQuery';

export type ExportActor = AuthorizationPrincipal & { id: number; activo?: boolean };
export function reportError(status: number, message: string) { return Object.assign(new Error(message), { status }); }
export function exportAuthorization(actor: ExportActor) {
  const profile = buildAuthorizationProfile(actor);
  if (actor.activo === false || !hasPermission(profile, PERMISSIONS.REPORTS_EXPORT) || !hasPermission(profile, PERMISSIONS.MOVEMENTS_READ)) {
    throw reportError(403, 'No tienes permisos para exportar movimientos');
  }
  const hash = createHash('sha256').update(JSON.stringify({ role: profile.role, scope: profile.scope, permissions: [...profile.permissions].sort(), policy: profile.policyVersion })).digest('hex');
  return { profile, hash };
}
export function authorizeExportFilters(actor: ExportActor, value: unknown): MovementFilters {
  // Validate first, then enforce the authenticated scope, never trust body IDs.
  const filters = boundedReportFilters(value);
  const { profile } = exportAuthorization(actor);
  const query: Record<string, unknown> = { ...filters };
  if (!applyQueryScope(profile, query).allowed) throw reportError(403, 'El reporte está fuera de tu alcance');
  return boundedReportFilters(query);
}
