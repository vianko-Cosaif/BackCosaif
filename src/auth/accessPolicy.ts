import { Rol } from '@prisma/client';

export const AUTHORIZATION_POLICY_VERSION = 2;

export const PERMISSIONS = {
  SESSION_READ: 'session.read',
  USERS_READ: 'users.read',
  USERS_MANAGE: 'users.manage',
  CATALOGS_READ: 'catalogs.read',
  COMPANIES_MANAGE: 'companies.manage',
  OPERATIONAL_CATALOGS_MANAGE: 'catalogs.operational.manage',
  CATALOG_CONFIGURATION_MANAGE: 'catalogs.configuration.manage',
  UPDATES_READ: 'updates.read',
  UPDATES_MANAGE: 'updates.manage',
  MOVEMENTS_READ: 'movements.read',
  MOVEMENTS_CREATE: 'movements.create',
  MOVEMENTS_EDIT: 'movements.edit',
  MOVEMENTS_CANCEL: 'movements.cancel',
  MOVEMENTS_DELETE: 'movements.delete',
  MOVEMENTS_OPERATE: 'movements.operate',
  ROUNDS_READ: 'rounds.read',
  ROUNDS_CREATE: 'rounds.create',
  ROUNDS_EDIT: 'rounds.edit',
  ROUNDS_DELETE: 'rounds.delete',
  ROUNDS_OPERATE: 'rounds.operate',
  INCIDENTS_READ: 'incidents.read',
  INCIDENTS_MANAGE: 'incidents.manage',
  INCIDENTS_CREATE: 'incidents.create',
  INCIDENTS_UPDATE: 'incidents.update',
  INCIDENTS_RESOLVE: 'incidents.resolve',
  INCIDENTS_DELETE: 'incidents.delete',
  INCIDENTS_MAINTENANCE: 'incidents.maintenance',
  TORNO_READ: 'torno.read',
  TORNO_OPERATE: 'torno.operate',
  TORREON_READ: 'torreon.read',
  TORREON_CREATE: 'torreon.create',
  TORREON_OPERATE: 'torreon.operate',
  REPORTS_ADMIN_READ: 'reports.admin.read',
  REPORTS_COORDINATOR_READ: 'reports.coordinator.read',
  REPORTS_CLIENT_READ: 'reports.client.read',
  REPORTS_COMMERCIAL_READ: 'reports.commercial.read',
  REPORTS_EXPORT: 'reports.export',
  OFFLINE_MAQUINISTA_READ: 'offline.maquinista.read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type AuthorizationScopeMode =
  | 'GLOBAL'
  | 'COMMERCIAL'
  | 'COMPANY'
  | 'LOCALITY'
  | 'COMPANY_LOCALITY'
  | 'DENY';

export type RoleArea =
  | 'administrador'
  | 'comercial'
  | 'coordinador'
  | 'supervisor'
  | 'cliente'
  | 'unsupported';

export type NavModuleId =
  | 'dashboard'
  | 'movimientos'
  | 'torreon_arrastres'
  | 'torno'
  | 'configuracion'
  | 'usuarios'
  | 'incidentes'
  | 'reporteria'
  | 'commercial_general'
  | 'commercial_clients'
  | 'commercial_contracts'
  | 'commercial_packages'
  | 'commercial_collections'
  | 'commercial_reports';

export type FrontendCapabilities = {
  area: RoleArea;
  home: string;
  label: string;
  isClientLike: boolean;
  isOperationalOnly: boolean;
  canUseWeb: boolean;
  canCreateMovements: boolean;
  canViewMovementDuration: boolean;
  canViewAllCompanies: boolean;
  canViewCompanyWide: boolean;
  canSwitchLocalidad: boolean;
  canViewNaturalMovements: boolean;
  canViewTorreonArrastres: boolean;
  canCreateTorreonArrastres: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canViewTorno: boolean;
  navModules: NavModuleId[];
};

export type AuthorizationProfile = {
  policyVersion: number;
  role: string;
  roleLabel: string;
  platforms: {
    web: boolean;
    mobile: boolean;
  };
  scope: {
    mode: AuthorizationScopeMode;
    empresaId: number | null;
    localidadId: number | null;
  };
  permissions: Permission[];
  capabilities: FrontendCapabilities;
};

export type AuthorizationPrincipal = {
  rol?: string | null;
  empresaId?: number | null;
  localidadId?: number | null;
  empresa?: { id: number } | null;
  localidad?: { id: number } | null;
};

type RoleDefinition = {
  label: string;
  mobile: boolean;
  scope: AuthorizationScopeMode;
  permissions: Permission[];
  capabilities: FrontendCapabilities;
};

const unsupportedCapabilities = (label: string): FrontendCapabilities => ({
  area: 'unsupported',
  home: '/login',
  label,
  isClientLike: false,
  isOperationalOnly: true,
  canUseWeb: false,
  canCreateMovements: false,
  canViewMovementDuration: false,
  canViewAllCompanies: false,
  canViewCompanyWide: false,
  canSwitchLocalidad: false,
  canViewNaturalMovements: false,
  canViewTorreonArrastres: false,
  canCreateTorreonArrastres: false,
  canManageUsers: false,
  canViewReports: false,
  canViewTorno: false,
  navModules: [],
});

const adminCapabilities: FrontendCapabilities = {
  area: 'administrador',
  home: '/administrador',
  label: 'Administrador',
  isClientLike: false,
  isOperationalOnly: false,
  canUseWeb: true,
  canCreateMovements: true,
  canViewMovementDuration: true,
  canViewAllCompanies: true,
  canViewCompanyWide: true,
  canSwitchLocalidad: true,
  canViewNaturalMovements: true,
  canViewTorreonArrastres: true,
  canCreateTorreonArrastres: true,
  canManageUsers: true,
  canViewReports: true,
  canViewTorno: false,
  navModules: ['dashboard', 'movimientos', 'configuracion', 'usuarios', 'incidentes', 'reporteria'],
};

const commercialCapabilities: FrontendCapabilities = {
  area: 'comercial',
  home: '/comercial/reporte-general',
  label: 'Comercial',
  isClientLike: false,
  isOperationalOnly: false,
  canUseWeb: true,
  canCreateMovements: false,
  canViewMovementDuration: true,
  canViewAllCompanies: true,
  canViewCompanyWide: true,
  canSwitchLocalidad: true,
  canViewNaturalMovements: false,
  canViewTorreonArrastres: false,
  canCreateTorreonArrastres: false,
  canManageUsers: false,
  canViewReports: true,
  canViewTorno: false,
  navModules: [
    'commercial_general',
    'commercial_clients',
    'commercial_contracts',
    'commercial_packages',
    'commercial_collections',
    'commercial_reports',
  ],
};

const coordinatorCapabilities: FrontendCapabilities = {
  ...adminCapabilities,
  area: 'coordinador',
  home: '/coordinador',
  label: 'Coordinador',
  canViewAllCompanies: true,
  canSwitchLocalidad: false,
  canViewTorno: true,
  navModules: ['dashboard', 'movimientos', 'torno', 'usuarios', 'incidentes', 'reporteria'],
};

const supervisorCapabilities: FrontendCapabilities = {
  area: 'supervisor',
  home: '/supervisor',
  label: 'Supervisor',
  isClientLike: false,
  isOperationalOnly: false,
  canUseWeb: true,
  canCreateMovements: true,
  canViewMovementDuration: true,
  canViewAllCompanies: false,
  canViewCompanyWide: false,
  canSwitchLocalidad: false,
  canViewNaturalMovements: true,
  canViewTorreonArrastres: false,
  canCreateTorreonArrastres: false,
  canManageUsers: false,
  canViewReports: false,
  canViewTorno: true,
  navModules: ['dashboard', 'movimientos', 'torno', 'incidentes'],
};

const clientCapabilities: FrontendCapabilities = {
  area: 'cliente',
  home: '/cliente',
  label: 'Cliente',
  isClientLike: true,
  isOperationalOnly: false,
  canUseWeb: true,
  canCreateMovements: true,
  canViewMovementDuration: false,
  canViewAllCompanies: false,
  canViewCompanyWide: false,
  canSwitchLocalidad: false,
  canViewNaturalMovements: true,
  canViewTorreonArrastres: false,
  canCreateTorreonArrastres: false,
  canManageUsers: false,
  canViewReports: false,
  canViewTorno: true,
  navModules: ['dashboard', 'movimientos', 'torno', 'incidentes'],
};

const clientAdminCapabilities: FrontendCapabilities = {
  ...clientCapabilities,
  label: 'Cliente admin',
  canViewCompanyWide: true,
  canViewTorreonArrastres: true,
  canCreateTorreonArrastres: true,
  navModules: ['dashboard', 'movimientos', 'torreon_arrastres', 'torno', 'incidentes'],
};

const arrastreCapabilities: FrontendCapabilities = {
  area: 'cliente',
  home: '/cliente/torreon',
  label: 'Arrastre Torreón',
  isClientLike: true,
  isOperationalOnly: true,
  canUseWeb: true,
  canCreateMovements: false,
  canViewMovementDuration: false,
  canViewAllCompanies: false,
  canViewCompanyWide: false,
  canSwitchLocalidad: false,
  canViewNaturalMovements: false,
  canViewTorreonArrastres: true,
  canCreateTorreonArrastres: true,
  canManageUsers: false,
  canViewReports: false,
  canViewTorno: false,
  navModules: ['dashboard', 'torreon_arrastres', 'incidentes'],
};

const COMMON_READ: Permission[] = [
  PERMISSIONS.SESSION_READ,
  PERMISSIONS.CATALOGS_READ,
  PERMISSIONS.UPDATES_READ,
];

const NATURAL_CLIENT: Permission[] = [
  ...COMMON_READ,
  PERMISSIONS.MOVEMENTS_READ,
  PERMISSIONS.MOVEMENTS_CREATE,
  PERMISSIONS.MOVEMENTS_EDIT,
  PERMISSIONS.MOVEMENTS_CANCEL,
  PERMISSIONS.ROUNDS_READ,
  PERMISSIONS.ROUNDS_CREATE,
  PERMISSIONS.ROUNDS_EDIT,
  PERMISSIONS.INCIDENTS_READ,
  PERMISSIONS.INCIDENTS_MANAGE,
  PERMISSIONS.INCIDENTS_CREATE,
  PERMISSIONS.INCIDENTS_UPDATE,
  PERMISSIONS.INCIDENTS_RESOLVE,
  PERMISSIONS.TORNO_READ,
  PERMISSIONS.REPORTS_CLIENT_READ,
];

const ROLE_DEFINITIONS: Record<Rol, RoleDefinition> = {
  [Rol.ADMINISTRADOR]: {
    label: 'Administrador',
    mobile: true,
    scope: 'GLOBAL',
    capabilities: adminCapabilities,
    permissions: [
      ...COMMON_READ,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.COMPANIES_MANAGE,
      PERMISSIONS.OPERATIONAL_CATALOGS_MANAGE,
      PERMISSIONS.CATALOG_CONFIGURATION_MANAGE,
      PERMISSIONS.UPDATES_MANAGE,
      PERMISSIONS.MOVEMENTS_READ,
      PERMISSIONS.MOVEMENTS_CREATE,
      PERMISSIONS.MOVEMENTS_EDIT,
      PERMISSIONS.MOVEMENTS_CANCEL,
      PERMISSIONS.MOVEMENTS_DELETE,
      PERMISSIONS.MOVEMENTS_OPERATE,
      PERMISSIONS.ROUNDS_READ,
      PERMISSIONS.ROUNDS_CREATE,
      PERMISSIONS.ROUNDS_EDIT,
      PERMISSIONS.ROUNDS_DELETE,
      PERMISSIONS.ROUNDS_OPERATE,
      PERMISSIONS.INCIDENTS_READ,
      PERMISSIONS.INCIDENTS_MANAGE,
      PERMISSIONS.INCIDENTS_CREATE,
      PERMISSIONS.INCIDENTS_UPDATE,
      PERMISSIONS.INCIDENTS_RESOLVE,
      PERMISSIONS.INCIDENTS_DELETE,
      PERMISSIONS.INCIDENTS_MAINTENANCE,
      PERMISSIONS.TORNO_READ,
      PERMISSIONS.TORNO_OPERATE,
      PERMISSIONS.TORREON_READ,
      PERMISSIONS.TORREON_CREATE,
      PERMISSIONS.TORREON_OPERATE,
      PERMISSIONS.REPORTS_ADMIN_READ,
      PERMISSIONS.REPORTS_COORDINATOR_READ,
      PERMISSIONS.REPORTS_CLIENT_READ,
      PERMISSIONS.REPORTS_COMMERCIAL_READ,
      PERMISSIONS.REPORTS_EXPORT,
    ],
  },
  [Rol.COMERCIAL]: {
    label: 'Comercial',
    mobile: false,
    scope: 'COMMERCIAL',
    capabilities: commercialCapabilities,
    permissions: [
      PERMISSIONS.SESSION_READ,
      PERMISSIONS.REPORTS_COMMERCIAL_READ,
      PERMISSIONS.REPORTS_EXPORT,
    ],
  },
  [Rol.COORDINADOR]: {
    label: 'Coordinador',
    mobile: true,
    scope: 'LOCALITY',
    capabilities: coordinatorCapabilities,
    permissions: [
      ...COMMON_READ,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.OPERATIONAL_CATALOGS_MANAGE,
      PERMISSIONS.MOVEMENTS_READ,
      PERMISSIONS.MOVEMENTS_CREATE,
      PERMISSIONS.MOVEMENTS_EDIT,
      PERMISSIONS.MOVEMENTS_CANCEL,
      PERMISSIONS.MOVEMENTS_OPERATE,
      PERMISSIONS.ROUNDS_READ,
      PERMISSIONS.ROUNDS_CREATE,
      PERMISSIONS.ROUNDS_EDIT,
      PERMISSIONS.ROUNDS_DELETE,
      PERMISSIONS.ROUNDS_OPERATE,
      PERMISSIONS.INCIDENTS_READ,
      PERMISSIONS.INCIDENTS_MANAGE,
      PERMISSIONS.INCIDENTS_CREATE,
      PERMISSIONS.INCIDENTS_UPDATE,
      PERMISSIONS.INCIDENTS_RESOLVE,
      PERMISSIONS.INCIDENTS_DELETE,
      PERMISSIONS.INCIDENTS_MAINTENANCE,
      PERMISSIONS.TORNO_READ,
      PERMISSIONS.TORNO_OPERATE,
      PERMISSIONS.TORREON_READ,
      PERMISSIONS.TORREON_OPERATE,
      PERMISSIONS.REPORTS_COORDINATOR_READ,
      PERMISSIONS.REPORTS_EXPORT,
    ],
  },
  [Rol.SUPERVISOR]: {
    label: 'Supervisor',
    mobile: true,
    scope: 'LOCALITY',
    capabilities: supervisorCapabilities,
    permissions: [
      ...COMMON_READ,
      PERMISSIONS.MOVEMENTS_READ,
      PERMISSIONS.MOVEMENTS_CREATE,
      PERMISSIONS.MOVEMENTS_EDIT,
      PERMISSIONS.MOVEMENTS_CANCEL,
      PERMISSIONS.MOVEMENTS_OPERATE,
      PERMISSIONS.ROUNDS_READ,
      PERMISSIONS.ROUNDS_CREATE,
      PERMISSIONS.ROUNDS_EDIT,
      PERMISSIONS.ROUNDS_OPERATE,
      PERMISSIONS.INCIDENTS_READ,
      PERMISSIONS.INCIDENTS_MANAGE,
      PERMISSIONS.INCIDENTS_CREATE,
      PERMISSIONS.INCIDENTS_UPDATE,
      PERMISSIONS.INCIDENTS_RESOLVE,
      PERMISSIONS.TORNO_READ,
      PERMISSIONS.TORNO_OPERATE,
      PERMISSIONS.TORREON_READ,
      PERMISSIONS.TORREON_OPERATE,
    ],
  },
  [Rol.CLIENTE]: {
    label: 'Cliente',
    mobile: true,
    scope: 'COMPANY_LOCALITY',
    capabilities: clientCapabilities,
    permissions: NATURAL_CLIENT,
  },
  [Rol.CLIENTE_ADMIN]: {
    label: 'Cliente admin',
    mobile: true,
    scope: 'COMPANY',
    capabilities: clientAdminCapabilities,
    permissions: [
      ...NATURAL_CLIENT,
      PERMISSIONS.TORREON_READ,
      PERMISSIONS.TORREON_CREATE,
    ],
  },
  [Rol.CLIENTE_COOR]: {
    label: 'Cliente coordinador',
    mobile: true,
    scope: 'COMPANY',
    capabilities: { ...clientAdminCapabilities, label: 'Cliente coordinador' },
    permissions: [
      ...NATURAL_CLIENT,
      PERMISSIONS.TORREON_READ,
      PERMISSIONS.TORREON_CREATE,
    ],
  },
  [Rol.ARRASTRE_TORREON]: {
    label: 'Arrastre Torreón',
    mobile: true,
    scope: 'COMPANY_LOCALITY',
    capabilities: arrastreCapabilities,
    permissions: [
      ...COMMON_READ,
      PERMISSIONS.INCIDENTS_READ,
      PERMISSIONS.INCIDENTS_MANAGE,
      PERMISSIONS.INCIDENTS_CREATE,
      PERMISSIONS.INCIDENTS_UPDATE,
      PERMISSIONS.INCIDENTS_RESOLVE,
      PERMISSIONS.TORREON_READ,
      PERMISSIONS.TORREON_CREATE,
    ],
  },
  [Rol.OPERADOR]: {
    label: 'Operador',
    mobile: true,
    scope: 'LOCALITY',
    capabilities: unsupportedCapabilities('Operador'),
    permissions: [
      ...COMMON_READ,
      PERMISSIONS.MOVEMENTS_READ,
      PERMISSIONS.MOVEMENTS_OPERATE,
      PERMISSIONS.ROUNDS_READ,
      PERMISSIONS.ROUNDS_OPERATE,
      PERMISSIONS.INCIDENTS_READ,
      PERMISSIONS.INCIDENTS_MANAGE,
      PERMISSIONS.INCIDENTS_CREATE,
      PERMISSIONS.INCIDENTS_UPDATE,
      PERMISSIONS.INCIDENTS_RESOLVE,
    ],
  },
  [Rol.MAQUINISTA]: {
    label: 'Maquinista',
    mobile: true,
    scope: 'LOCALITY',
    capabilities: unsupportedCapabilities('Maquinista'),
    permissions: [
      ...COMMON_READ,
      PERMISSIONS.MOVEMENTS_READ,
      PERMISSIONS.MOVEMENTS_OPERATE,
      PERMISSIONS.ROUNDS_READ,
      PERMISSIONS.ROUNDS_OPERATE,
      PERMISSIONS.INCIDENTS_READ,
      PERMISSIONS.INCIDENTS_MANAGE,
      PERMISSIONS.INCIDENTS_CREATE,
      PERMISSIONS.INCIDENTS_UPDATE,
      PERMISSIONS.INCIDENTS_RESOLVE,
      PERMISSIONS.OFFLINE_MAQUINISTA_READ,
    ],
  },
  [Rol.MAQUINISTA_ARRASTRE]: {
    label: 'Maquinista arrastre',
    mobile: true,
    scope: 'LOCALITY',
    capabilities: unsupportedCapabilities('Maquinista arrastre'),
    permissions: [
      ...COMMON_READ,
      PERMISSIONS.INCIDENTS_READ,
      PERMISSIONS.INCIDENTS_MANAGE,
      PERMISSIONS.INCIDENTS_CREATE,
      PERMISSIONS.INCIDENTS_UPDATE,
      PERMISSIONS.INCIDENTS_RESOLVE,
      PERMISSIONS.TORREON_READ,
      PERMISSIONS.TORREON_OPERATE,
      PERMISSIONS.OFFLINE_MAQUINISTA_READ,
    ],
  },
  [Rol.TORNO]: {
    label: 'Tornero',
    mobile: true,
    scope: 'LOCALITY',
    capabilities: unsupportedCapabilities('Tornero'),
    permissions: [
      ...COMMON_READ,
      PERMISSIONS.INCIDENTS_READ,
      PERMISSIONS.INCIDENTS_MANAGE,
      PERMISSIONS.INCIDENTS_CREATE,
      PERMISSIONS.INCIDENTS_UPDATE,
      PERMISSIONS.INCIDENTS_RESOLVE,
      PERMISSIONS.TORNO_READ,
      PERMISSIONS.TORNO_OPERATE,
    ],
  },
  [Rol.LAVADO]: {
    label: 'Lavadero',
    mobile: true,
    scope: 'LOCALITY',
    capabilities: unsupportedCapabilities('Lavadero'),
    permissions: [
      ...COMMON_READ,
      PERMISSIONS.MOVEMENTS_READ,
      PERMISSIONS.MOVEMENTS_OPERATE,
      PERMISSIONS.ROUNDS_READ,
      PERMISSIONS.ROUNDS_OPERATE,
      PERMISSIONS.INCIDENTS_READ,
      PERMISSIONS.INCIDENTS_MANAGE,
      PERMISSIONS.INCIDENTS_CREATE,
      PERMISSIONS.INCIDENTS_UPDATE,
      PERMISSIONS.INCIDENTS_RESOLVE,
    ],
  },
};

export function normalizeRole(value: unknown): Rol | null {
  const normalized = String(value ?? '').trim().toUpperCase();
  return Object.values(Rol).includes(normalized as Rol) ? (normalized as Rol) : null;
}

export function buildAuthorizationProfile(principal: AuthorizationPrincipal): AuthorizationProfile {
  const role = normalizeRole(principal.rol);
  const empresaId = Number(principal.empresa?.id ?? principal.empresaId) || null;
  const localidadId = Number(principal.localidad?.id ?? principal.localidadId) || null;

  if (!role) {
    return {
      policyVersion: AUTHORIZATION_POLICY_VERSION,
      role: String(principal.rol ?? '').trim().toUpperCase() || 'UNKNOWN',
      roleLabel: 'Rol no reconocido',
      platforms: { web: false, mobile: false },
      scope: { mode: 'DENY', empresaId, localidadId },
      permissions: [],
      capabilities: unsupportedCapabilities('Rol no reconocido'),
    };
  }

  const definition = ROLE_DEFINITIONS[role];
  return {
    policyVersion: AUTHORIZATION_POLICY_VERSION,
    role,
    roleLabel: definition.label,
    platforms: {
      web: definition.capabilities.canUseWeb,
      mobile: definition.mobile,
    },
    scope: {
      mode: definition.scope,
      empresaId,
      localidadId,
    },
    permissions: [...new Set(definition.permissions)],
    capabilities: {
      ...definition.capabilities,
      navModules: [...definition.capabilities.navModules],
    },
  };
}

export function hasPermission(
  profile: AuthorizationProfile | undefined,
  permission: Permission,
): boolean {
  return Boolean(profile?.permissions.includes(permission));
}
