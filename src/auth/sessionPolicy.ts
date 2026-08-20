import { Rol } from '@prisma/client';
import { StringValue } from 'ms';

const DEFAULT_ACCESS_TTL: StringValue = (process.env.JWT_EXPIRES_IN ?? '8h') as StringValue;
const EXTENDED_ACCESS_TTL: StringValue = '24h';

const EXTENDED_SESSION_ROLES = new Set<Rol>([
  Rol.ADMINISTRADOR,
  Rol.COORDINADOR,
  Rol.SUPERVISOR,
  Rol.CLIENTE,
  Rol.CLIENTE_ADMIN,
  Rol.CLIENTE_COOR,
  Rol.ARRASTRE_TORREON,
  Rol.COMERCIAL,
]);

const normalizeRol = (rol?: string | null): Rol | null => {
  const candidate = String(rol ?? '').toUpperCase();
  return Object.values(Rol).includes(candidate as Rol) ? (candidate as Rol) : null;
};

export const shouldSlideSessionByRole = (rol?: string | null): boolean => {
  const normalized = normalizeRol(rol);
  return normalized ? EXTENDED_SESSION_ROLES.has(normalized) : false;
};

export const getAccessTtlForRole = (rol?: string | null): StringValue => (
  shouldSlideSessionByRole(rol) ? EXTENDED_ACCESS_TTL : DEFAULT_ACCESS_TTL
);
