import { Rol } from '@prisma/client';
import { prisma } from '../lib/prisma';

const CLIENT_ROLES: Rol[] = [Rol.CLIENTE];
const GLOBAL_ROLES: Rol[] = [Rol.COORDINADOR, Rol.ADMINISTRADOR];

type UserWithTokens = {
  id: number;
  rol: Rol;
  fcmTokens: Array<{ token: string | null }>;
};

function uniqueUsers(users: UserWithTokens[]) {
  const seen = new Set<number>();
  return users.filter((user) => {
    if (seen.has(user.id)) return false;
    seen.add(user.id);
    return true;
  });
}

export function uniqueTokensFromUsers(users: Array<{ fcmTokens?: Array<{ token: string | null }> }>) {
  return [
    ...new Set(
      users.flatMap((user) => (user.fcmTokens ?? []).map((item) => item.token).filter(Boolean) as string[])
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
}) {
  const { empresaId, localidadId } = params;

  const [clientes, globales] = await Promise.all([
    empresaId && localidadId
      ? prisma.usuario.findMany({
          where: {
            activo: true,
            empresaId,
            localidadId,
            rol: { in: CLIENT_ROLES },
          },
          select: { id: true, rol: true, fcmTokens: { select: { token: true } } },
        })
      : Promise.resolve([]),
    prisma.usuario.findMany({
      where: {
        activo: true,
        rol: { in: GLOBAL_ROLES },
      },
      select: { id: true, rol: true, fcmTokens: { select: { token: true } } },
    }),
  ]);

  return uniqueUsers([...clientes, ...globales]);
}

export async function tokensAudienciaOperacion(params: {
  empresaId: number | null | undefined;
  localidadId: number | null | undefined;
}) {
  const usuarios = await usuariosAudienciaOperacion(params);
  return {
    usuarios,
    tokens: uniqueTokensFromUsers(usuarios),
    roleCounts: countUsersByRole(usuarios),
  };
}
