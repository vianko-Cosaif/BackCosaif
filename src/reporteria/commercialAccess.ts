import { PERMISSIONS } from '../auth/accessPolicy';
import { requirePermission } from '../auth/authorize';

export const requireCommercialReportAccess = requirePermission(
  PERMISSIONS.REPORTS_COMMERCIAL_READ,
);
