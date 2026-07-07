import { Rol } from '@prisma/client';
import { prisma } from '../lib/prisma';

const CLIENT_ROLES: Rol[] = [Rol.CLIENTE, Rol.CLIENTE_ADMIN, Rol.ARRASTRE_TORREON];
const CLIENT_COORDINATION_ROLES: Rol[] = [Rol.CLIENTE_COOR];
const LOCAL_OPERATION_ROLES: Rol[] = [Rol.SUPERVISOR, Rol.OPERADOR, Rol.MAQUINISTA, Rol.MAQUINISTA_ARRASTRE];
const LOCATION_AWARE_ROLES: Rol[] = [Rol.COORDINADOR, Rol.ADMINISTRADOR];

type UserWithTokens = {
  id: number;
  rol: Rol;
  localidadId: number | null;
  fcmTokens: Array<{ token: string | null; localidadId: number | null }>;
};

const EMPTY_USERS: UserWithTokens[] = [];

function uniqueUsers(users: UserWithTokens[]) {
  const seen = new Set<number>();
  return users.filter((user) => {
    if (seen.has(user.id)) return false;
    seen.add(user.id);
    return true;
  });
}

function toPositiveInt(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

export function uniqueTokensFromUsers(
  users: Array<{
    localidadId?: number | null;
    fcmTokens?: Array<{ token: string | null; localidadId?: number | null }>;
  }>,
  localidadId?: number | null
) {
  const scopeLocalidadId = toPositiveInt(localidadId);

  return [
    ...new Set(
      users.flatMap((user) =>
        (user.fcmTokens ?? [])
          .filter((item) => {
            if (!scopeLocalidadId) return true;
            const tokenLocalidadId = toPositiveInt(item.localidadId);
            if (tokenLocalidadId) return tokenLocalidadId === scopeLocalidadId;

            const userLocalidadId = toPositiveInt(user.localidadId);
            return !userLocalidadId || userLocalidadId === scopeLocalidadId;
          })
          .map((item) => item.token)
          .filter(Boolean) as string[]
      )
    ),
  ];
}

export function countUsersByRole(users: Array<{ rol?: Rol | string | null }>) {
  return users.reduce<Record<string, number>>((acc, user) => {
    const rol = String(user.rol ?? 'SIN_ROL');
    acc[rol] = (acc[rol] ?? 0) + 1;
    return acc;
  }, {});
}

export async function usuariosAudienciaOperacion(params: {
  empresaId: number | null | undefined;
  localidadId: number | null | undefined;
  usuarioIds?: Array<number | null | undefined>;
}) {
  const { empresaId, localidadId } = params;
  const scopeLocalidadId = toPositiveInt(localidadId);
  const usuarioIds = [
    ...new Set((params.usuarioIds ?? []).map(toPositiveInt).filter(Boolean) as number[]),
  ];

  const select = {
    id: true,
    rol: true,
    localidadId: true,
    fcmTokens: { select: { token: true, localidadId: true } },
  } as const;

  const [clientes, clientesCoordinacion, locales, coordinacion, usuariosForzados]: UserWithTokens[][] = await Promise.all([
    empresaId && scopeLocalidadId
      ? prisma.usuario.findMany({
          where: {
            activo: true,
            empresaId,
            localidadId: scopeLocalidadId,
            rol: { in: CLIENT_ROLES },
          },
          select,
        })
      : Promise.resolve(EMPTY_USERS),
    empresaId && scopeLocalidadId
      ? prisma.usuario.findMany({
          where: {
            activo: true,
            empresaId,
            rol: { in: CLIENT_COORDINATION_ROLES },
            OR: [
              { fcmTokens: { some: { localidadId: scopeLocalidadId } } },
              { fcmTokens: { some: { localidadId: null } } },
            ],
          },
          select,
        })
      : Promise.resolve(EMPTY_USERS),
    scopeLocalidadId
      ? prisma.usuario.findMany({
          where: {
            activo: true,
            localidadId: scopeLocalidadId,
            rol: { in: LOCAL_OPERATION_ROLES },
          },
          select,
        })
      : Promise.resolve(EMPTY_USERS),
    scopeLocalidadId
      ? prisma.usuario.findMany({
          where: {
            activo: true,
            rol: { in: LOCATION_AWARE_ROLES },
            OR: [
              { localidadId: scopeLocalidadId },
              { fcmTokens: { some: {} } },
            ],
          },
          select,
        })
      : Promise.resolve(EMPTY_USERS),
    usuarioIds.length
      ? prisma.usuario.findMany({
          where: { id: { in: usuarioIds }, activo: true },
          select,
        })
      : Promise.resolve(EMPTY_USERS),
  ]);

  return uniqueUsers([...clientes, ...clientesCoordinacion, ...locales, ...coordinacion, ...usuariosForzados]);
}

export async function tokensAudienciaOperacion(params: {
  empresaId: number | null | undefined;
  localidadId: number | null | undefined;
  usuarioIds?: Array<number | null | undefined>;
}) {
  const usuarios = await usuariosAudienciaOperacion(params);
  return {
    usuarios,
    tokens: uniqueTokensFromUsers(usuarios, params.localidadId),
    roleCounts: countUsersByRole(usuarios),
  };
}
