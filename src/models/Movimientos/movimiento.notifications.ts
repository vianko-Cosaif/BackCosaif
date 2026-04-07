import { Rol } from '@prisma/client';
import admin from 'firebase-admin';
import { prisma } from '../../lib/prisma';
import { movimientoError } from './movimiento.logger';

function ensureAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
}

function chunk<T>(items: T[], size = 500): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function uniqueTokensFromUsers(
  users: Array<{ fcmTokens?: Array<{ token: string | null }> }>
) {
  return [
    ...new Set(
      users.flatMap((user) => (user.fcmTokens ?? []).map((token) => token.token).filter(Boolean) as string[])
    ),
  ];
}

async function usuariosPorRolesLocalidadEmpresa(
  localidadId: number,
  empresaId?: number,
  roles?: Rol[]
) {
  const rolesBase: Rol[] = roles?.length
    ? roles
    : [Rol.SUPERVISOR, Rol.COORDINADOR, Rol.OPERADOR, Rol.CLIENTE];

  const where: any = { activo: true, localidadId, rol: { in: rolesBase } };
  if (empresaId) where.empresaId = empresaId;

  return prisma.usuario.findMany({ where, include: { fcmTokens: true } });
}

async function enviarMulticastMovimiento(
  tokens: string[],
  payload: { notification: { title: string; body: string }; data: Record<string, string> },
  logCtx: Record<string, any>
) {
  ensureAdmin();

  if (!tokens.length) {
    movimientoError.warn('FCM movimiento: sin tokens', logCtx);
    return;
  }

  const batches = chunk(tokens, 500);
  for (let index = 0; index < batches.length; index++) {
    const slice = batches[index];
    try {
      const response = await admin.messaging().sendEachForMulticast({ ...payload, tokens: slice });
      movimientoError.info('FCM movimiento', {
        ...logCtx,
        lote: `${index + 1}/${batches.length}`,
        enviados: response.successCount,
        fallidos: response.failureCount,
      });
    } catch (error: any) {
      movimientoError.error('FCM movimiento error', {
        ...logCtx,
        lote: `${index + 1}/${batches.length}`,
        errName: error?.name,
        errMsg: error?.message,
        errCode: error?.errorInfo?.code,
      });
    }
  }
}

export async function notificarCambioPrioridad(movId: number, nueva: 'ALTA' | 'BAJA') {
  ensureAdmin();

  const movimiento = await prisma.movimiento.findUnique({
    where: { id: movId },
    include: {
      empresa: { select: { nombre: true } },
      localidad: { select: { id: true, nombre: true } },
      viaOrigen: { select: { nombre: true } },
      viaDestino: { select: { nombre: true } },
      creadoPor: { select: { nombre: true } },
    },
  });
  if (!movimiento) return;

  const admins = await prisma.usuario.findMany({
    where: {
      localidadId: movimiento.localidadId,
      activo: true,
      rol: { in: [Rol.ADMINISTRADOR, Rol.COORDINADOR, Rol.SUPERVISOR] },
      ...(movimiento.empresaId ? { empresaId: movimiento.empresaId } : {}),
    },
    include: { fcmTokens: true },
  });

  const tokens = uniqueTokensFromUsers(admins);
  if (!tokens.length) {
    movimientoError.warn('Sin tokens para cambio_prioridad', {
      movId: movimiento.id,
      localidadId: movimiento.localidadId,
    });
    return;
  }

  await enviarMulticastMovimiento(
    tokens,
    {
      notification: {
        title: `Cambio de prioridad -> ${nueva}`,
        body:
          `Movimiento #${movimiento.id} · Empresa: ${movimiento.empresa?.nombre ?? 'N/D'} · ` +
          `Origen: ${movimiento.viaOrigen?.nombre ?? 'N/D'} -> Destino: ${movimiento.viaDestino?.nombre ?? 'N/D'}`,
      },
      data: {
        tipo: 'cambio_prioridad',
        movimientoId: String(movimiento.id),
        prioridad: nueva,
        creadoPor: String(movimiento.creadoPor?.nombre ?? ''),
        fecha: new Date().toISOString(),
        empresa: String(movimiento.empresa?.nombre ?? ''),
        localidadId: String(movimiento.localidadId),
      },
    },
    {
      evento: 'cambio_prioridad',
      movId: movimiento.id,
      localidadId: movimiento.localidadId,
      prioridad: nueva,
      tokens: tokens.length,
    }
  );
}

export async function notificarMovimientoIniciado(movId: number) {
  ensureAdmin();

  const movimiento = await prisma.movimiento.findUnique({
    where: { id: movId },
    include: {
      empresa: { select: { nombre: true } },
      localidad: { select: { id: true, nombre: true } },
      viaOrigen: { select: { nombre: true } },
      viaDestino: { select: { nombre: true } },
    },
  });
  if (!movimiento) return;

  const roles: Rol[] = [Rol.SUPERVISOR, Rol.CLIENTE, Rol.COORDINADOR, Rol.OPERADOR];
  const usuarios = await usuariosPorRolesLocalidadEmpresa(movimiento.localidadId, movimiento.empresaId, roles);
  const tokens = uniqueTokensFromUsers(usuarios);

  const roleCounts = roles.reduce<Record<string, number>>((acc, rol) => {
    acc[rol] = usuarios.filter((usuario) => usuario.rol === rol).length;
    return acc;
  }, {});

  if (!tokens.length) {
    movimientoError.warn('Sin tokens para movimiento_iniciado', {
      movId: movimiento.id,
      localidadId: movimiento.localidadId,
      roleCounts,
    });
    return;
  }

  await enviarMulticastMovimiento(
    tokens,
    {
      notification: {
        title: 'Movimiento iniciado',
        body:
          `#${movimiento.id} · ${movimiento.empresa?.nombre ?? 'Sin Empresa'} · Loco ${movimiento.locomotiveNumber} · ` +
          `${movimiento.viaOrigen?.nombre ?? 'N/D'} -> ${movimiento.viaDestino?.nombre ?? 'N/D'}`,
      },
      data: {
        tipo: 'movimiento_iniciado',
        movimientoId: String(movimiento.id),
        empresa: String(movimiento.empresa?.nombre ?? ''),
        localidadId: String(movimiento.localidadId),
        viaOrigen: String(movimiento.viaOrigen?.nombre ?? ''),
        viaDestino: String(movimiento.viaDestino?.nombre ?? ''),
        fecha: new Date().toISOString(),
      },
    },
    {
      evento: 'iniciado',
      movId: movimiento.id,
      localidadId: movimiento.localidadId,
      tokens: tokens.length,
      roleCounts,
    }
  );
}

export async function notificarMovimientoFinalizado(movId: number) {
  ensureAdmin();

  const movimiento = await prisma.movimiento.findUnique({
    where: { id: movId },
    include: {
      empresa: { select: { nombre: true } },
      localidad: { select: { id: true, nombre: true } },
    },
  });
  if (!movimiento) return;

  const roles: Rol[] = [Rol.CLIENTE, Rol.COORDINADOR, Rol.SUPERVISOR];
  const usuarios = await usuariosPorRolesLocalidadEmpresa(movimiento.localidadId, movimiento.empresaId, roles);
  const tokens = uniqueTokensFromUsers(usuarios);

  const roleCounts = roles.reduce<Record<string, number>>((acc, rol) => {
    acc[rol] = usuarios.filter((usuario) => usuario.rol === rol).length;
    return acc;
  }, {});

  if (!tokens.length) {
    movimientoError.warn('Sin tokens para movimiento_concluido', {
      movId: movimiento.id,
      localidadId: movimiento.localidadId,
      roleCounts,
    });
    return;
  }

  await enviarMulticastMovimiento(
    tokens,
    {
      notification: {
        title: 'Movimiento concluido',
        body: `#${movimiento.id} · ${movimiento.empresa?.nombre ?? 'Sin Empresa'} · Loco ${movimiento.locomotiveNumber}`,
      },
      data: {
        tipo: 'movimiento_concluido',
        movimientoId: String(movimiento.id),
        empresa: String(movimiento.empresa?.nombre ?? ''),
        localidadId: String(movimiento.localidadId),
        fecha: new Date().toISOString(),
      },
    },
    {
      evento: 'concluido',
      movId: movimiento.id,
      localidadId: movimiento.localidadId,
      tokens: tokens.length,
      roleCounts,
    }
  );
}
