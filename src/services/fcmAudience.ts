import { Rol } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { isPatioStart, PATIO_CLIENT_ROLES } from './patioNotificationPolicy';

const CLIENT_ROLES: Rol[] = [Rol.CLIENTE, Rol.CLIENTE_ADMIN, Rol.CLIENTE_COOR, Rol.ARRASTRE_TORREON];
const SELECTABLE_YARD_ROLES: Rol[] = [Rol.ADMINISTRADOR, Rol.CLIENTE_ADMIN, Rol.CLIENTE_COOR];

type UserWithTokens = {
  id: number;
  rol: Rol;
  empresaId: number | null;
  localidadId: number | null;
  fcmTokens: Array<{ token: string | null; localidadId: number | null }>;
};

function toPositiveInt(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function uniqueTokensFromUsers(
  users: Array<{ localidadId?: number | null; fcmTokens?: Array<{ token: string | null; localidadId?: number | null }> }>,
  localidadId?: number | null
) {
  const yard = toPositiveInt(localidadId);
  if (!yard) return [];
  return [...new Set(users.flatMap(user => (user.fcmTokens ?? [])
    .filter(item => (toPositiveInt(item.localidadId) ?? toPositiveInt(user.localidadId)) === yard)
    .map(item => item.token).filter((token): token is string => Boolean(token))))];
}

export function countUsersByRole(users: Array<{ rol?: Rol | string | null }>) {
  return users.reduce<Record<string, number>>((acc, user) => {
    const role = String(user.rol ?? 'SIN_ROL');
    acc[role] = (acc[role] ?? 0) + 1;
    return acc;
  }, {});
}

type AudienceParams = {
  tipo?: string;
  empresaId: number | null | undefined;
  localidadId: number | null | undefined;
  usuarioIds?: Array<number | null | undefined>;
  roles?: Rol[];
};

export async function usuariosAudienciaOperacion(params: AudienceParams) {
  const yard = toPositiveInt(params.localidadId);
  const company = toPositiveInt(params.empresaId);
  if (!yard || !company || !params.roles?.length) return [];
  const roles = params.roles;
  const patioStart = isPatioStart({ tipo: params.tipo });
  const companyScopedRoles = patioStart ? CLIENT_ROLES.filter(role => !PATIO_CLIENT_ROLES.includes(role)) : CLIENT_ROLES;
  const users: UserWithTokens[] = await prisma.usuario.findMany({
    where: {
      activo: true,
      rol: { in: roles },
      AND: [
        // An assigned/creating user never bypasses company or yard boundaries.
        { OR: [{ rol: { notIn: companyScopedRoles } }, { empresaId: company }] },
        { OR: [
          { localidadId: yard },
          { rol: { in: SELECTABLE_YARD_ROLES }, fcmTokens: { some: { localidadId: yard } } },
        ] },
      ],
    },
    select: { id: true, rol: true, empresaId: true, localidadId: true, fcmTokens: { select: { token: true, localidadId: true } } },
  });
  // Defense in depth: stale assignments and stale device scope must not widen delivery.
  return users.filter(user => roles.includes(user.rol)
    && (!companyScopedRoles.includes(user.rol) || user.empresaId === company)
    && (user.localidadId === yard || SELECTABLE_YARD_ROLES.includes(user.rol))
    && uniqueTokensFromUsers([user], yard).length > 0);
}

export async function tokensAudienciaOperacion(params: AudienceParams) {
  const usuarios = await usuariosAudienciaOperacion(params);
  return { usuarios, tokens: uniqueTokensFromUsers(usuarios, params.localidadId), roleCounts: countUsersByRole(usuarios) };
}
