import admin from 'firebase-admin';
import type { Incidente, Rol } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { messaging } from '../config/firebase';
import { sendMulticastCompat } from './fcmCompat';
import { tokensAudienciaOperacion } from './fcmAudience';
import {
  resolverAudienciaFcmMovimiento,
  resolverAudienciaFcmServicio,
  tipoServicioFcm,
} from './serviceFcmRouting';

function contextoMovimientoFcm(movimiento: { torno?: boolean | null; lavado?: boolean | null }) {
  const servicio = tipoServicioFcm(movimiento);
  return {
    servicio,
    source: 'natural',
    nombre:
      servicio === 'TORNO' ? 'movimiento para torno' :
      servicio === 'LAVADO' ? 'movimiento para lavado' :
      servicio === 'TORNO_LAVADO' ? 'movimiento para torno y lavado' :
      'movimiento',
  };
}

type NotificacionFCM = {
  titulo: string;
  cuerpo: string;
  datos: Record<string, string>;
  tokens?: string[];
  topico?: string;
};

type OperacionTorreonFCM = {
  tipo: string;
  titulo: string;
  mensaje: string;
  empresaId?: number | null;
  localidadId?: number | null;
  usuarioIds?: Array<number | null | undefined>;
  roles?: Rol[];
  data?: Record<string, unknown>;
  url?: string;
  tag?: string;
};

type OperacionServicioFCM = {
  tipo: string;
  servicio: 'TORNO' | 'LAVADO';
  titulo: string;
  mensaje: string;
  empresaId?: number | null;
  localidadId?: number | null;
  movimientoId?: number | null;
  usuarioIds?: Array<number | null | undefined>;
  roles: Rol[];
  audience: string;
  data?: Record<string, unknown>;
  url?: string;
  tag?: string;
};

const INVALID_FCM_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

function stringifyFcmData(data: Record<string, unknown> = {}) {
  return Object.entries(data).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === undefined || value === null) return acc;
    acc[key] = String(value);
    return acc;
  }, {});
}

async function deleteInvalidFcmTokens(tokens: string[], responses: Array<{ success: boolean; error?: { code?: string } | null }>) {
  const toDelete = responses
    .map((result, index) => (!result.success && result.error?.code && INVALID_FCM_CODES.has(result.error.code) ? tokens[index] : null))
    .filter(Boolean) as string[];

  if (toDelete.length) {
    await prisma.fcmToken.deleteMany({ where: { token: { in: toDelete } } });
  }
}

export class NotificadorFCM {
  /**
   * Notificar sobre nuevo movimiento con notificacion mejorada
   */
  /* ------------------------------------------------------------------ */
/* 1. Nuevo Movimiento                                                */
/* ------------------------------------------------------------------ */
static async notificarNuevoMovimiento(movimiento: { id?: number } | number): Promise<void> {
  try {
    const mov = await prisma.movimiento.findUnique({
      where: { id: (movimiento as any).id ?? movimiento },
      select: {
        id: true,
        prioridad: true,
        locomotiveNumber: true,
        empresaId: true,
        localidadId: true,
        operadorId: true,
        supervisorId: true,
        coordinadorId: true,
        torno: true,
        lavado: true,
        empresa:   { select: { nombre: true } },
        viaOrigen: { select: { nombre: true } },
        viaDestino:{ select: { nombre: true } },
      },
    });
    if (!mov) return;

    const contexto = contextoMovimientoFcm(mov);
    const routing = resolverAudienciaFcmMovimiento('nuevo_movimiento', mov);
    const { tokens, roleCounts } = await tokensAudienciaOperacion({
      empresaId: mov.empresaId,
      localidadId: mov.localidadId,
      usuarioIds: [mov.operadorId, mov.supervisorId, mov.coordinadorId],
      roles: routing?.roles,
    });
    if (!tokens.length) {
      console.warn('FCM: sin tokens', {
        evento: 'nuevo_movimiento',
        movId: mov.id,
        loc: mov.localidadId,
        emp: mov.empresaId,
        roleCounts,
      });
      return;
    }

    if (!admin.apps.length) admin.initializeApp();

    const title = `🆕 Nuevo ${contexto.nombre} (${mov.prioridad ?? 'N/D'})`;
    const body  = `Loco ${mov.locomotiveNumber} · ${mov.viaOrigen?.nombre ?? 'N/D'} → ${mov.viaDestino?.nombre ?? 'N/D'} · ${mov.empresa?.nombre ?? 'N/D'}`;

    const resp = await sendMulticastCompat({
      notification: { title, body },
      data: {
        tipo: 'nuevo_movimiento',
        movimientoId: String(mov.id),
        empresaId: String(mov.empresaId),
        localidadId: String(mov.localidadId),
        prioridad: String(mov.prioridad ?? ''),
        empresa: String(mov.empresa?.nombre ?? ''),
        viaOrigen: String(mov.viaOrigen?.nombre ?? ''),
        viaDestino: String(mov.viaDestino?.nombre ?? ''),
        locomotora: String(mov.locomotiveNumber),
        audience: String(routing?.audience ?? ''),
        servicio: String(contexto.servicio ?? ''),
        source: contexto.source,
        url: routing?.url ?? '/movimientos',
        tag: `movimiento:${mov.id}:nuevo`,
        timestamp: new Date().toISOString(),
      },
      tokens,
    });

    console.info('FCM nuevo movimiento', {
      movimientoId: mov.id,
      localidadId: mov.localidadId,
      audience: routing?.audience,
      roleCounts,
      tokens: tokens.length,
      enviados: resp.successCount,
      fallidos: resp.failureCount,
    });

    const invalid = new Set([
      'messaging/registration-token-not-registered',
      'messaging/invalid-registration-token',
    ]);
    const toDelete = resp.responses
      .map((r, i) => (!r.success && r.error && invalid.has(r.error.code) ? tokens[i] : null))
      .filter(Boolean) as string[];
    if (toDelete.length) await prisma.fcmToken.deleteMany({ where: { token: { in: toDelete } } });
  } catch (e) {
    console.error('Error notificarNuevoMovimiento:', e);
  }
}


/* ----------------------------------------------
   NUEVO INCIDENTE
   ---------------------------------------------- */
static async notificarNuevoIncidente(inc: Incidente): Promise<void> {
  try {
    const mov = await prisma.movimiento.findUnique({
      where: { id: inc.movimientoId },
      select: {
        id: true,
        empresaId: true,
        localidadId: true,
        locomotiveNumber: true,
        operadorId: true,        // maquinista/operador asignado
        clienteId: true,
        supervisorId: true,
        coordinadorId: true,
        creadoPorId: true,
        torno: true,
        lavado: true,
        empresa:   { select: { nombre: true } },
        localidad: { select: { nombre: true } },
      },
    });
    if (!mov) return;

    const contexto = contextoMovimientoFcm(mov);
    const routing = resolverAudienciaFcmMovimiento('nuevo_incidente', mov);
    const { tokens, roleCounts } = await tokensAudienciaOperacion({
      empresaId: mov.empresaId,
      localidadId: mov.localidadId,
      usuarioIds: [mov.operadorId, mov.clienteId, mov.supervisorId, mov.coordinadorId, mov.creadoPorId],
      roles: routing?.roles,
    });
    if (!tokens.length) {
      console.warn('FCM: sin tokens', {
        evento: 'nuevo_incidente',
        incidenteId: inc.id,
        movId: mov.id,
        loc: mov.localidadId,
        emp: mov.empresaId,
        roleCounts,
      });
      return;
    }

    // Mensaje limpio y con truncado correcto
    const empresa   = mov.empresa?.nombre   ?? 'Sin Empresa';
    const localidad = mov.localidad?.nombre ?? 'Sin Localidad';
    const corta     = inc.descripcion.length > 50 ? inc.descripcion.slice(0, 50) + '…' : inc.descripcion;
    const iso       = new Date().toISOString();
    const legible   = new Date().toLocaleString('es-MX', {
      year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
    });

    if (!admin.apps.length) admin.initializeApp();

    const resp = await sendMulticastCompat({
      notification: {
        title: '🚨 Incidente reportado',
        body : `ID #${inc.id} • Loco ${mov.locomotiveNumber} • ${empresa}: ${corta}`
      },
      data: {
        pantalla    : 'Incidente',
        tipo        : 'nuevo_incidente',
        incidenteId : String(inc.id),
        movimientoId: String(mov.id),
        empresaId   : String(mov.empresaId),
        localidadId : String(mov.localidadId),
        empresa,
        localidad,
        locomotora  : String(mov.locomotiveNumber),
        descripcion : inc.descripcion,
        estado      : inc.estado,
        fecha       : legible,
        audience    : String(routing?.audience ?? ''),
        servicio    : String(contexto.servicio ?? ''),
        source      : contexto.source,
        url         : routing?.url ?? '/incidentes',
        tag         : `incidente:${inc.id}:nuevo`,
        timestamp   : iso
      },
      tokens
    });

    console.info('FCM nuevo incidente', {
      incidenteId: inc.id,
      movimientoId: mov.id,
      localidadId: mov.localidadId,
      audience: routing?.audience,
      roleCounts,
      tokens: tokens.length,
      enviados: resp.successCount,
      fallidos: resp.failureCount,
    });

    // 6) Limpieza de tokens inválidos
    const invalid = new Set([
      'messaging/registration-token-not-registered',
      'messaging/invalid-registration-token',
    ]);
    const toDelete = resp.responses
      .map((r, i) => (!r.success && r.error && invalid.has(r.error.code) ? tokens[i] : null))
      .filter(Boolean) as string[];
    if (toDelete.length) {
      await prisma.fcmToken.deleteMany({ where: { token: { in: toDelete } } });
    }
  } catch (e) {
    console.error('Error notificarNuevoIncidente:', e);
    throw e;
  }
}

/* ----------------------------------------------
   CAMBIO DE ESTADO DEL INCIDENTE
   ---------------------------------------------- */
static async notificarCambioEstado(
  incidente: Incidente,
  estadoAnterior: string,
  tipoForzado?: 'incidente_resuelto_cliente' | 'incidente_cerrado_manual' | 'incidente_timeout'
): Promise<void> {
  try {
    const mov = await prisma.movimiento.findUnique({
      where: { id: incidente.movimientoId },
      select: {
        id: true,
        empresaId: true,
        localidadId: true,
        locomotiveNumber: true,
        operadorId: true,       // maquinista/operador asignado
        clienteId: true,
        supervisorId: true,
        coordinadorId: true,
        creadoPorId: true,
        torno: true,
        lavado: true,
        empresa:   { select: { nombre: true } },
        localidad: { select: { nombre: true } },
      },
    });
    if (!mov) return;

    const contexto = contextoMovimientoFcm(mov);
    const tipo = tipoForzado ?? (
      incidente.estado === 'RESUELTO' ? 'incidente_resuelto_cliente' :
      incidente.estado === 'CERRADO' ? 'incidente_cerrado_manual' :
      'incidente_actualizado'
    );
    const routing = resolverAudienciaFcmMovimiento(tipo, mov);
    const { tokens } = await tokensAudienciaOperacion({
      empresaId: mov.empresaId,
      localidadId: mov.localidadId,
      usuarioIds: [mov.operadorId, mov.clienteId, mov.supervisorId, mov.coordinadorId, mov.creadoPorId],
      roles: routing?.roles,
    });
    if (!tokens.length) return;

    if (!admin.apps.length) admin.initializeApp();

    const titulo =
      tipo === 'incidente_timeout' ? '⏱️ Incidente cerrado por tiempo' :
      incidente.estado === 'RESUELTO' ? '✅ Incidente resuelto' :
      incidente.estado === 'CERRADO'  ? '❌ Incidente cerrado'  :
                                         'ℹ️ Incidente actualizado';

    const resp = await sendMulticastCompat({
      notification: {
        title: titulo,
        body: `ID #${incidente.id} • Loco ${mov.locomotiveNumber} • ${mov.empresa?.nombre ?? 'Sin Empresa'}`,
      },
      data: {
        pantalla:     'Incidente',
        tipo,
        incidenteId:  String(incidente.id),
        movimientoId: String(incidente.movimientoId),
        empresaId:    String(mov.empresaId),
        localidadId:  String(mov.localidadId),
        empresa:      String(mov.empresa?.nombre ?? ''),
        localidad:    String(mov.localidad?.nombre ?? ''),
        estadoAnterior,
        estadoNuevo:  incidente.estado,
        audience:     String(routing?.audience ?? ''),
        servicio:     String(contexto.servicio ?? ''),
        source:       contexto.source,
        url:          routing?.url ?? '/incidentes',
        tag:          `incidente:${incidente.id}:estado:${incidente.estado}`,
        timestamp:    new Date().toISOString(),
      },
      tokens,
    });

    // 5) Limpieza de tokens inválidos
    const invalid = new Set([
      'messaging/registration-token-not-registered',
      'messaging/invalid-registration-token',
    ]);
    const toDelete = resp.responses
      .map((r, i) => (!r.success && r.error && invalid.has(r.error.code) ? tokens[i] : null))
      .filter(Boolean) as string[];
    if (toDelete.length) {
      await prisma.fcmToken.deleteMany({ where: { token: { in: toDelete } } });
    }
  } catch (e) {
    console.error('Error notificarCambioEstado:', e);
  }
}
  /**
   * Metodo mejorado para enviar notificaciones personalizadas
   */
  static async enviarNotificacionPersonalizada(params: {
    usuarioId?: number;
    usuarioIds?: number[];
    titulo: string;
    mensaje: string;
    data: Record<string, string>;
    prioridad?: 'alta' | 'normal';
  }): Promise<void> {
    try {
      const { usuarioId, usuarioIds, titulo, mensaje, data, prioridad = 'normal' } = params;
      
      // Determinar que usuarios notificar
      const idsANotificar = usuarioIds || (usuarioId ? [usuarioId] : []);
      
      if (idsANotificar.length === 0) {
        console.warn('No se especificaron usuarios para notificar');
        return;
      }

      // Obtener tokens FCM de los usuarios
      const usuariosConTokens = await prisma.usuario.findMany({
        where: {
          id: { in: idsANotificar },
          activo: true
        },
        include: {
          fcmTokens: true
        }
      });

      const tokens = usuariosConTokens.flatMap(u => u.fcmTokens.map(t => t.token));
      
      if (tokens.length === 0) {
        console.warn('No se encontraron tokens FCM para los usuarios especificados');
        return;
      }

      // Configurar mensaje segun prioridad
      const mensaje_config: any = {
        notification: {
          title: titulo,
          body: mensaje
        },
        data: {
          ...data,
          timestamp: new Date().toISOString()
        },
        tokens
      };

      // Configuracion adicional para alta prioridad
      if (prioridad === 'alta') {
        mensaje_config.android = {
          priority: 'high',
          notification: {
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true
          }
        };
        mensaje_config.apns = {
          headers: {
            'apns-priority': '10'
          },
          payload: {
            aps: {
              sound: 'default'
            }
          }
        };
      }

      await sendMulticastCompat(mensaje_config);
      
    } catch (error) {
      console.error('Error enviando notificacion personalizada:', error);
      throw error;
    }
  }

  static async notificarOperacionTorreon(params: OperacionTorreonFCM): Promise<void> {
    try {
      const { tokens, roleCounts } = await tokensAudienciaOperacion({
        empresaId: params.empresaId,
        localidadId: params.localidadId,
        usuarioIds: params.usuarioIds,
        roles: params.roles,
      });

      if (!tokens.length) {
        console.warn('FCM Torreon: sin tokens', {
          tipo: params.tipo,
          empresaId: params.empresaId,
          localidadId: params.localidadId,
          roles: params.roles,
          roleCounts,
        });
        return;
      }

      const data = stringifyFcmData({
        ...(params.data ?? {}),
        tipo: params.tipo,
        source: 'torreon',
        url: params.url ?? '/cliente/torreon',
        tag: params.tag ?? `torreon:${params.tipo}:${Date.now()}`,
        timestamp: new Date().toISOString(),
      });

      const response = await sendMulticastCompat({
        notification: {
          title: params.titulo,
          body: params.mensaje,
        },
        data,
        android: {
          priority: 'high',
          notification: {
            channelId: 'cosaif_operacion',
            sound: 'default',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
            visibility: 'public',
          },
        },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: {
            aps: {
              sound: 'default',
              contentAvailable: true,
            },
          },
        },
        tokens,
      } as any);

      await deleteInvalidFcmTokens(tokens, response.responses);
    } catch (error) {
      console.error('Error notificarOperacionTorreon:', error);
    }
  }

  static async notificarOperacionServicio(params: OperacionServicioFCM): Promise<void> {
    try {
      const { tokens, roleCounts } = await tokensAudienciaOperacion({
        empresaId: params.empresaId,
        localidadId: params.localidadId,
        usuarioIds: params.usuarioIds,
        roles: params.roles,
      });

      if (!tokens.length) {
        console.warn('FCM servicio: sin tokens', {
          tipo: params.tipo,
          servicio: params.servicio,
          empresaId: params.empresaId,
          localidadId: params.localidadId,
          roles: params.roles,
          roleCounts,
        });
        return;
      }

      const data = stringifyFcmData({
        ...(params.data ?? {}),
        tipo: params.tipo,
        servicio: params.servicio,
        source: params.servicio.toLowerCase(),
        audience: params.audience,
        empresaId: params.empresaId,
        localidadId: params.localidadId,
        movimientoId: params.movimientoId,
        url: params.url ?? '/movimientos',
        tag: params.tag ?? `servicio:${params.servicio}:${params.tipo}:${Date.now()}`,
        timestamp: new Date().toISOString(),
      });

      const response = await sendMulticastCompat({
        notification: { title: params.titulo, body: params.mensaje },
        data,
        android: {
          priority: 'high',
          notification: {
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: { aps: { sound: 'default', contentAvailable: true } },
        },
        tokens,
      } as any);

      await deleteInvalidFcmTokens(tokens, response.responses);
    } catch (error) {
      console.error('Error notificarOperacionServicio:', error);
    }
  }

  /**
   * Metodo privado mejorado para enviar notificaciones
   */
  private static async enviarNotificacion(notificacion: NotificacionFCM): Promise<void> {
    try {
      const message: any = {
        notification: {
          title: notificacion.titulo,
          body: notificacion.cuerpo
        },
        data: notificacion.datos
      };

      if (notificacion.tokens && notificacion.tokens.length > 0) {
        message.tokens = notificacion.tokens;
        await sendMulticastCompat(message);
      } else if (notificacion.topico) {
        message.topic = notificacion.topico;
        await admin.messaging().send(message);
      } else {
        throw new Error('No se especificaron tokens ni topico para la notificacion');
      }
    } catch (error: any) {
      console.error('Error enviando notificacion FCM:', error);
      throw new Error('Failed to send FCM notification: ' + (error.message || 'Error desconocido'));
    }
  }

  /**
   * Suscribir usuarios a un topico
   */
  static async suscribirATopico(tokens: string[], topico: string): Promise<void> {
    try {
      if (tokens.length === 0) {
        console.warn('No hay tokens para suscribir al topico:', topico);
        return;
      }
      await admin.messaging().subscribeToTopic(tokens, topico);
    } catch (error) {
      console.error('Error suscribiendo a topico:', error);
      throw error;
    }
  }

  /**
   * Desuscribir usuarios de un topico
   */
  static async desuscribirDeTopico(tokens: string[], topico: string): Promise<void> {
    try {
      if (tokens.length === 0) {
        console.warn('No hay tokens para desuscribir del topico:', topico);
        return;
      }
      await admin.messaging().unsubscribeFromTopic(tokens, topico);
    } catch (error) {
      console.error('Error desuscribiendo de topico:', error);
      throw error;
    }
  }



static async notificarContinuarMovimiento(
  incidente: Incidente,
  comentario: string
): Promise<void> {
  try {
    const movimiento = await prisma.movimiento.findUnique({
      where: { id: incidente.movimientoId },
      include: { empresa: true, localidad: true }
    });
    if (!movimiento || !movimiento.empresaId || !movimiento.localidadId) return;

    const contexto = contextoMovimientoFcm(movimiento);
    const routing = resolverAudienciaFcmMovimiento('incidente_continuado', movimiento);
    const { tokens } = await tokensAudienciaOperacion({
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
    if (tokens.length === 0) return;

    const empresaNombre = movimiento.empresa?.nombre || 'Empresa';
    const loco = movimiento.locomotiveNumber;

    await sendMulticastCompat({
      notification: {
        title: '✅ Incidente resuelto con comentario',
        body: `Loco ${loco} · ${empresaNombre}: "${comentario.slice(0, 80)}"`
      },
      data: {
        pantalla: 'Incidente',
        incidenteId: String(incidente.id),
        movimientoId: String(movimiento.id),
        empresaId: String(movimiento.empresaId),
        empresa: empresaNombre,
        locomotora: String(loco),
        tipo: 'incidente_continuado',
        localidadId: String(movimiento.localidadId),
        audience: String(routing?.audience ?? ''),
        servicio: String(contexto.servicio ?? ''),
        source: contexto.source,
        url: routing?.url ?? '/incidentes',
        tag: `incidente:${incidente.id}:continuado`,
        timestamp: new Date().toISOString()
      },
      tokens
    });

  } catch (error) {
    console.error('Error en notificarContinuarMovimiento:', error);
    throw error;
  }
}


/* ----------------------------------------------------------- */
/*  INCIDENTE OMITIDO / POSPUESTO                              */
/* ----------------------------------------------------------- */
static async notificarIncidenteOmitido(
  incidente: Incidente,
  comentario = ''
): Promise<void> {
  const mov = await prisma.movimiento.findUnique({
    where  : { id: incidente.movimientoId },
    include: { empresa: true, localidad: true }
  });
  if (!mov) return;

  const contexto = contextoMovimientoFcm(mov);
  const routing = resolverAudienciaFcmMovimiento('incidente_omitido', mov);
  const { tokens } = await tokensAudienciaOperacion({
    empresaId: mov.empresaId,
    localidadId: mov.localidadId,
    usuarioIds: [mov.operadorId, mov.clienteId, mov.supervisorId, mov.coordinadorId, mov.creadoPorId],
    roles: routing?.roles,
  });
  if (tokens.length === 0) return;

  await sendMulticastCompat({
    notification: {
      title: 'Incidente pospuesto por cliente',
      body : `Incidente #${incidente.id} — Locomotora ${mov.locomotiveNumber}`
    },
    data: {
      pantalla    : 'Incidente',
      incidenteId : String(incidente.id),
      movimientoId: String(mov.id),
      empresaId   : String(mov.empresaId),
      localidadId : String(mov.localidadId),
      empresa     : mov.empresa?.nombre   ?? 'Empresa',
      localidad   : mov.localidad?.nombre ?? 'Localidad',
      tipo        : 'incidente_omitido',
      comentario,
      audience    : String(routing?.audience ?? ''),
      servicio    : String(contexto.servicio ?? ''),
      source      : contexto.source,
      url         : routing?.url ?? '/incidentes',
      tag         : `incidente:${incidente.id}:omitido`,
      timestamp   : new Date().toISOString()
    },
    tokens
  });
}

/* ----------------------------------------------------------- */
/*  INCIDENTE DE TORNO RELACIONADO A MOVIMIENTO                 */
/* ----------------------------------------------------------- */
static async notificarIncidenteTornoPorMovimiento(params: {
  movimientoId: number;
  incidenteId?: number | string | null;
  incidenteHijoId?: number | string | null;
  status?: string | null;
  tipoFalla?: string | null;
  comentario?: string | null;
  resuelto?: boolean | null;
  numeroLocomotora?: number | null;
}): Promise<void> {
  const movimiento = await prisma.movimiento.findUnique({
    where: { id: params.movimientoId },
    include: { empresa: true, localidad: true },
  });
  if (!movimiento?.empresaId || !movimiento.localidadId) return;

  const status = String(params.status ?? (params.resuelto ? 'RESUELTO' : 'EN_PROCESO')).toUpperCase();
  const resuelto = params.resuelto === true || status === 'RESUELTO';
  const evento = resuelto ? 'incidente_torno_resuelto' : 'incidente_torno_reportado';
  const routing = resolverAudienciaFcmServicio(evento, 'TORNO');
  const { tokens } = await tokensAudienciaOperacion({
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
  if (tokens.length === 0) return;

  const tipoFalla = String(params.tipoFalla ?? 'TORNO');
  const comentario = String(params.comentario ?? '').trim();
  const locomotora = params.numeroLocomotora ?? movimiento.locomotiveNumber;

  await sendMulticastCompat({
    notification: {
      title: resuelto ? 'Incidente de torno resuelto' : 'Incidente de torno reportado',
      body: `Movimiento #${movimiento.id} · Loco ${locomotora} · ${movimiento.empresa?.nombre ?? 'Empresa'}${comentario ? `: ${comentario.slice(0, 80)}` : ''}`,
    },
    data: {
      pantalla: 'Torno',
      tipo: evento,
      incidenteTornoId: String(params.incidenteId ?? ''),
      incidenteTornoHijoId: String(params.incidenteHijoId ?? ''),
      movimientoId: String(movimiento.id),
      empresaId   : String(movimiento.empresaId),
      empresa: movimiento.empresa?.nombre ?? 'Empresa',
      localidad: movimiento.localidad?.nombre ?? 'Localidad',
      localidadId: String(movimiento.localidadId),
      locomotora: String(locomotora ?? ''),
      tipoFalla,
      estado: status,
      audience: String(routing?.audience ?? ''),
      source: 'torno',
      url: '/torno/incidentes',
      tag: `incidente-torno:${params.incidenteId ?? movimiento.id}:${params.incidenteHijoId ?? 'padre'}:${status}`,
      timestamp: new Date().toISOString(),
    },
    tokens,
  });
}

/* ----------------------------------------------------------- */
/*  CANCELACIÓN DE MOVIMIENTO (tres incidentes)                 */
/* ----------------------------------------------------------- */
static async notificarCancelacionMovimiento(
  movimiento: any,
  motivoExtra = ''
): Promise<void> {
  if (!movimiento.localidadId || !movimiento.empresaId) return;

  const contexto = contextoMovimientoFcm(movimiento);
  const routing = resolverAudienciaFcmMovimiento('movimiento_cancelado_incidentes', movimiento);
  const { tokens } = await tokensAudienciaOperacion({
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
  if (tokens.length === 0) return;

  await sendMulticastCompat({
    notification: {
      title: 'Movimiento cancelado',
      body : `Locomotora ${movimiento.locomotiveNumber} — ${motivoExtra || 'Por reincidencia de incidentes'}`
    },
    data: {
      pantalla    : 'Movimiento',
      movimientoId: String(movimiento.id),
      empresaId   : String(movimiento.empresaId),
      empresa     : movimiento.empresa?.nombre   ?? 'Empresa',
      localidad   : movimiento.localidad?.nombre ?? 'Localidad',
      localidadId : String(movimiento.localidadId),
      tipo        : 'movimiento_cancelado_incidentes',
      audience    : String(routing?.audience ?? ''),
      servicio    : String(contexto.servicio ?? ''),
      source      : contexto.source,
      url         : routing?.url ?? '/movimientos',
      tag         : `movimiento:${movimiento.id}:cancelado`,
      timestamp   : new Date().toISOString()
    },
    tokens
  });
}




}
