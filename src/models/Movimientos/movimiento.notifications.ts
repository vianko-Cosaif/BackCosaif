import '../../config/firebase';
import { prisma } from '../../lib/prisma';
import { movimientoError } from './movimiento.logger';
import { sendMulticastCompat } from '../../services/fcmCompat';
import { tokensAudienciaOperacion } from '../../services/fcmAudience';
import { resolverAudienciaFcmMovimiento, tipoServicioFcm } from '../../services/serviceFcmRouting';

function contextoMovimientoFcm(movimiento: { torno?: boolean | null; lavado?: boolean | null }) {
  const servicio = tipoServicioFcm(movimiento);
  return {
    servicio: servicio ?? '',
    source: 'natural',
    sujeto:
      servicio === 'TORNO' ? 'Movimiento para torno' :
      servicio === 'LAVADO' ? 'Movimiento para lavado' :
      servicio === 'TORNO_LAVADO' ? 'Movimiento para torno y lavado' :
      'Movimiento',
  };
}

function chunk<T>(items: T[], size = 500): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function enviarMulticastMovimiento(
  tokens: string[],
  payload: { notification: { title: string; body: string }; data: Record<string, string> },
  logCtx: Record<string, any>
) {
  if (!tokens.length) {
    movimientoError.warn('FCM movimiento: sin tokens', logCtx);
    console.warn('FCM movimiento: sin tokens', logCtx);
    return;
  }

  const invalidCodes = new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
  ]);

  const batches = chunk(tokens, 500);
  for (let index = 0; index < batches.length; index++) {
    const slice = batches[index];
    try {
      const response = await sendMulticastCompat({ ...payload, tokens: slice });
      const invalidTokens = response.responses
        .map((result, tokenIndex) =>
          !result.success && result.error && invalidCodes.has(result.error.code) ? slice[tokenIndex] : null
        )
        .filter(Boolean) as string[];

      if (invalidTokens.length) {
        await prisma.fcmToken.deleteMany({ where: { token: { in: invalidTokens } } });
      }

      const details = response.responses
        .map((result, tokenIndex) =>
          !result.success
            ? {
                tokenIndex,
                code: result.error?.code,
                message: result.error?.message,
              }
            : null
        )
        .filter(Boolean);

      movimientoError.info('FCM movimiento', {
        ...logCtx,
        lote: `${index + 1}/${batches.length}`,
        enviados: response.successCount,
        fallidos: response.failureCount,
        tokensInvalidos: invalidTokens.length,
        errores: details,
      });
      console.info('FCM movimiento', {
        ...logCtx,
        lote: `${index + 1}/${batches.length}`,
        enviados: response.successCount,
        fallidos: response.failureCount,
        tokensInvalidos: invalidTokens.length,
        errores: details,
      });
    } catch (error: any) {
      movimientoError.error('FCM movimiento error', {
        ...logCtx,
        lote: `${index + 1}/${batches.length}`,
        errName: error?.name,
        errMsg: error?.message,
        errCode: error?.errorInfo?.code,
      });
      console.error('FCM movimiento error', {
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

  const contexto = contextoMovimientoFcm(movimiento);
  const routing = resolverAudienciaFcmMovimiento('cambio_prioridad', movimiento);
  const { tokens, roleCounts } = await tokensAudienciaOperacion({
    empresaId: movimiento.empresaId,
    localidadId: movimiento.localidadId,
    usuarioIds: [
      movimiento.operadorId,
      movimiento.clienteId,
      movimiento.supervisorId,
      movimiento.coordinadorId,
      movimiento.creadoPorId,
    ],
    roles: routing?.roles,
  });

  if (!tokens.length) {
    movimientoError.warn('Sin tokens para cambio_prioridad', {
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
        title: `${contexto.sujeto}: prioridad ${nueva}`,
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
        empresaId: String(movimiento.empresaId),
        localidadId: String(movimiento.localidadId),
        audience: String(routing?.audience ?? ''),
        servicio: contexto.servicio,
        source: contexto.source,
        url: routing?.url ?? '/movimientos',
        tag: `movimiento:${movimiento.id}:prioridad:${nueva}`,
        timestamp: new Date().toISOString(),
      },
    },
    {
      evento: 'cambio_prioridad',
      movId: movimiento.id,
      localidadId: movimiento.localidadId,
      prioridad: nueva,
      tokens: tokens.length,
      roleCounts,
    }
  );
}

export async function notificarMovimientoIniciado(movId: number) {
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

  const contexto = contextoMovimientoFcm(movimiento);
  const routing = resolverAudienciaFcmMovimiento('movimiento_iniciado', movimiento);
  const { tokens, roleCounts } = await tokensAudienciaOperacion({
    empresaId: movimiento.empresaId,
    localidadId: movimiento.localidadId,
    usuarioIds: [
      movimiento.operadorId,
      movimiento.clienteId,
      movimiento.supervisorId,
      movimiento.coordinadorId,
      movimiento.creadoPorId,
    ],
    roles: routing?.roles,
  });

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
        title: `${contexto.sujeto} iniciado`,
        body:
          `#${movimiento.id} · ${movimiento.empresa?.nombre ?? 'Sin Empresa'} · Loco ${movimiento.locomotiveNumber} · ` +
          `${movimiento.viaOrigen?.nombre ?? 'N/D'} -> ${movimiento.viaDestino?.nombre ?? 'N/D'}`,
      },
      data: {
        tipo: 'movimiento_iniciado',
        movimientoId: String(movimiento.id),
        empresa: String(movimiento.empresa?.nombre ?? ''),
        empresaId: String(movimiento.empresaId),
        localidadId: String(movimiento.localidadId),
        locomotora: String(movimiento.locomotiveNumber),
        viaOrigen: String(movimiento.viaOrigen?.nombre ?? ''),
        viaDestino: String(movimiento.viaDestino?.nombre ?? ''),
        audience: String(routing?.audience ?? ''),
        servicio: contexto.servicio,
        source: contexto.source,
        url: routing?.url ?? '/movimientos',
        tag: `movimiento:${movimiento.id}:iniciado`,
        fecha: new Date().toISOString(),
        timestamp: new Date().toISOString(),
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
  const movimiento = await prisma.movimiento.findUnique({
    where: { id: movId },
    include: {
      empresa: { select: { nombre: true } },
      localidad: { select: { id: true, nombre: true } },
    },
  });
  if (!movimiento) return;

  const contexto = contextoMovimientoFcm(movimiento);
  const routing = resolverAudienciaFcmMovimiento('movimiento_concluido', movimiento);
  const { tokens, roleCounts } = await tokensAudienciaOperacion({
    empresaId: movimiento.empresaId,
    localidadId: movimiento.localidadId,
    usuarioIds: [
      movimiento.operadorId,
      movimiento.clienteId,
      movimiento.supervisorId,
      movimiento.coordinadorId,
      movimiento.creadoPorId,
    ],
    roles: routing?.roles,
  });

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
        title: `${contexto.sujeto} concluido`,
        body: `#${movimiento.id} · ${movimiento.empresa?.nombre ?? 'Sin Empresa'} · Loco ${movimiento.locomotiveNumber}`,
      },
      data: {
        tipo: 'movimiento_concluido',
        movimientoId: String(movimiento.id),
        empresa: String(movimiento.empresa?.nombre ?? ''),
        empresaId: String(movimiento.empresaId),
        localidadId: String(movimiento.localidadId),
        locomotora: String(movimiento.locomotiveNumber),
        audience: String(routing?.audience ?? ''),
        servicio: contexto.servicio,
        source: contexto.source,
        url: routing?.url ?? '/movimientos',
        tag: `movimiento:${movimiento.id}:concluido`,
        fecha: new Date().toISOString(),
        timestamp: new Date().toISOString(),
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

type ActualizacionMovimientoNatural =
  | 'movimiento_editado'
  | 'movimiento_reanudado'
  | 'movimiento_detenido'
  | 'movimiento_cancelado';

async function notificarActualizacionMovimientoNatural(params: {
  movId: number;
  tipo: ActualizacionMovimientoNatural;
  title: string;
  detalle?: string;
  campos?: string[];
}) {
  const movimiento = await prisma.movimiento.findUnique({
    where: { id: params.movId },
    include: {
      empresa: { select: { nombre: true } },
      viaOrigen: { select: { nombre: true } },
      viaDestino: { select: { nombre: true } },
    },
  });
  if (!movimiento) return;

  const contexto = contextoMovimientoFcm(movimiento);
  const routing = resolverAudienciaFcmMovimiento(params.tipo, movimiento);
  const { tokens, roleCounts } = await tokensAudienciaOperacion({
    empresaId: movimiento.empresaId,
    localidadId: movimiento.localidadId,
    usuarioIds: [
      movimiento.operadorId,
      movimiento.clienteId,
      movimiento.supervisorId,
      movimiento.coordinadorId,
      movimiento.creadoPorId,
    ],
    roles: routing?.roles,
  });

  const campos = (params.campos ?? []).filter(Boolean).join(', ');
  const detalle = params.detalle?.trim();
  const body = [
    `#${movimiento.id} · ${movimiento.empresa?.nombre ?? 'Sin Empresa'} · Loco ${movimiento.locomotiveNumber}`,
    detalle || null,
    campos ? `Cambios: ${campos}` : null,
  ].filter(Boolean).join(' · ');

  await enviarMulticastMovimiento(
    tokens,
    {
      notification: {
        title: contexto.servicio ? params.title.replace('Movimiento', contexto.sujeto) : params.title,
        body,
      },
      data: {
        tipo: params.tipo,
        movimientoId: String(movimiento.id),
        empresa: String(movimiento.empresa?.nombre ?? ''),
        empresaId: String(movimiento.empresaId),
        localidadId: String(movimiento.localidadId),
        locomotora: String(movimiento.locomotiveNumber),
        viaOrigen: String(movimiento.viaOrigen?.nombre ?? ''),
        viaDestino: String(movimiento.viaDestino?.nombre ?? ''),
        campos,
        detalle: detalle ?? '',
        audience: String(routing?.audience ?? ''),
        servicio: contexto.servicio,
        source: contexto.source,
        url: routing?.url ?? '/movimientos',
        tag: `movimiento:${movimiento.id}:${params.tipo}`,
        timestamp: new Date().toISOString(),
      },
    },
    {
      evento: params.tipo,
      movId: movimiento.id,
      localidadId: movimiento.localidadId,
      tokens: tokens.length,
      roleCounts,
    }
  );
}

export async function notificarMovimientoEditado(movId: number, campos: string[] = []) {
  return notificarActualizacionMovimientoNatural({
    movId,
    tipo: 'movimiento_editado',
    title: 'Movimiento editado',
    campos,
  });
}

export async function notificarMovimientoReanudado(movId: number) {
  return notificarActualizacionMovimientoNatural({
    movId,
    tipo: 'movimiento_reanudado',
    title: 'Movimiento reanudado',
  });
}

export async function notificarMovimientoDetenido(movId: number, razon?: string) {
  return notificarActualizacionMovimientoNatural({
    movId,
    tipo: 'movimiento_detenido',
    title: 'Movimiento detenido',
    detalle: razon,
  });
}

export async function notificarMovimientoCancelado(movId: number, razon?: string) {
  return notificarActualizacionMovimientoNatural({
    movId,
    tipo: 'movimiento_cancelado',
    title: 'Movimiento cancelado',
    detalle: razon,
  });
}

export async function notificarMovimientoEliminado(movimiento: {
  id: number;
  empresaId: number;
  localidadId: number;
  locomotiveNumber: number;
  operadorId?: number | null;
  clienteId?: number | null;
  supervisorId?: number | null;
  coordinadorId?: number | null;
  creadoPorId?: number | null;
  empresaNombre?: string | null;
  torno?: boolean | null;
  lavado?: boolean | null;
}) {
  const contexto = contextoMovimientoFcm(movimiento);
  const routing = resolverAudienciaFcmMovimiento('movimiento_cancelado', movimiento);
  const { tokens, roleCounts } = await tokensAudienciaOperacion({
    empresaId: movimiento.empresaId,
    localidadId: movimiento.localidadId,
    usuarioIds: [
      movimiento.operadorId,
      movimiento.clienteId,
      movimiento.supervisorId,
      movimiento.coordinadorId,
      movimiento.creadoPorId,
    ],
    roles: routing?.roles,
  });

  await enviarMulticastMovimiento(
    tokens,
    {
      notification: {
        title: contexto.servicio ? `${contexto.sujeto} eliminado` : 'Solicitud de movimiento eliminada',
        body: `#${movimiento.id} · ${movimiento.empresaNombre ?? 'Sin Empresa'} · Loco ${movimiento.locomotiveNumber}`,
      },
      data: {
        tipo: 'movimiento_cancelado',
        accion: 'eliminar',
        movimientoId: String(movimiento.id),
        empresa: String(movimiento.empresaNombre ?? ''),
        empresaId: String(movimiento.empresaId),
        localidadId: String(movimiento.localidadId),
        locomotora: String(movimiento.locomotiveNumber),
        audience: String(routing?.audience ?? ''),
        servicio: contexto.servicio,
        source: contexto.source,
        url: routing?.url ?? '/movimientos',
        tag: `movimiento:${movimiento.id}:eliminado`,
        timestamp: new Date().toISOString(),
      },
    },
    {
      evento: 'movimiento_eliminado',
      movId: movimiento.id,
      localidadId: movimiento.localidadId,
      tokens: tokens.length,
      roleCounts,
    }
  );
}
