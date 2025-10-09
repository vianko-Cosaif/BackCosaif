import admin from 'firebase-admin';
import { PrismaClient, Incidente } from '@prisma/client';
import { messaging } from '../config/firebase';

const prisma = new PrismaClient();

type NotificacionFCM = {
  titulo: string;
  cuerpo: string;
  datos: Record<string, string>;
  tokens?: string[];
  topico?: string;
};

export class NotificadorFCM {
  /**
   * Notificar sobre nuevo movimiento con notificacion mejorada
   */
  /* ------------------------------------------------------------------ */
/* 1. Nuevo Movimiento                                                */
/* ------------------------------------------------------------------ */
// NotificadorFCM.notificarNuevoMovimiento
static async notificarNuevoMovimiento(movimiento: { id?: number } | number): Promise<void> {
  try {
    const mov = await prisma.movimiento.findUnique({
      where: { id: (movimiento as any).id ?? movimiento },
      select: {
        id: true,
        prioridad: true,
        locomotiveNumber: true,
        localidadId: true,
        operadorId: true, // <- NECESARIO
        empresa:   { select: { nombre: true } },
        viaOrigen: { select: { nombre: true } },
        viaDestino:{ select: { nombre: true } },
      },
    });
    if (!mov) return;

    // Incluye por localidad + SIEMPRE al operador asignado
    const usuarios = await prisma.usuario.findMany({
      where: {
        activo: true,
        OR: [
          {
            localidadId: mov.localidadId,
            rol: { in: ['MAQUINISTA','OPERADOR','SUPERVISOR','COORDINADOR','ADMINISTRADOR'] },
          },
          // operador asignado aunque esté en otra localidad
          ...(mov.operadorId ? [{ id: mov.operadorId }] : []),
        ],
      },
      select: { id: true, rol: true, localidadId: true, fcmTokens: { select: { token: true } } },
    });

    const tokens = [...new Set(usuarios.flatMap(u => u.fcmTokens.map(t => t.token).filter(Boolean)))];
    if (!tokens.length) {
      console.warn('FCM: sin tokens', { movId: mov.id, usuarios: usuarios.map(u => u.id) });
      return;
    }

    if (!admin.apps.length) admin.initializeApp();

    const title = `🆕 Movimiento creado (${mov.prioridad})`;
    const body  = `Loco ${mov.locomotiveNumber} · ${mov.viaOrigen?.nombre ?? 'N/D'} → ${mov.viaDestino?.nombre ?? 'N/D'} · ${mov.empresa?.nombre ?? 'N/D'}`;

    const resp = await admin.messaging().sendEachForMulticast({
      notification: { title, body },
      data: {
        tipo: 'nuevo_movimiento',
        movimientoId: String(mov.id),
        prioridad: String(mov.prioridad ?? ''),
        empresa: String(mov.empresa?.nombre ?? ''),
        localidadId: String(mov.localidadId),
        viaOrigen: String(mov.viaOrigen?.nombre ?? ''),
        viaDestino: String(mov.viaDestino?.nombre ?? ''),
        locomotora: String(mov.locomotiveNumber),
        timestamp: new Date().toISOString(),
      },
      tokens,
    });

    // Limpieza y diagnóstico
    const failed = resp.responses
      .map((r, i) => ({ ok: r.success, token: tokens[i], code: r.error?.code }))
      .filter(x => !x.ok);

    if (failed.length) {
      console.warn('FCM: fallos por token', { movId: mov.id, failed });
      const toDelete = failed
        .filter(f => f.code === 'messaging/registration-token-not-registered' || f.code === 'messaging/invalid-registration-token')
        .map(f => f.token);
      if (toDelete.length) {
        await prisma.fcmToken.deleteMany({ where: { token: { in: toDelete } } });
        console.info('FCM: tokens inválidos eliminados', { count: toDelete.length });
      }
    }
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
      include: { empresa: true, localidad: true }
    });
    if (!mov) return;

    /* usuarios a notificar */
    const ids = [
      mov.clienteId, mov.supervisorId, mov.coordinadorId,
      mov.operadorId, mov.creadoPorId, 
    ].filter(Boolean) as number[];

    const usuarios = await prisma.usuario.findMany({
      where: { id: { in: ids }, activo: true },
      include: { fcmTokens: true }
    });
    const tokens = usuarios.flatMap(u => u.fcmTokens.map(t => t.token));
    if (tokens.length === 0) return;

    /* auxiliares */
    const empresa   = mov.empresa?.nombre   ?? 'Sin Empresa';
    const localidad = mov.localidad?.nombre ?? 'Sin Localidad';
    const corta     = inc.descripcion.length > 50
      ? inc.descripcion.slice(0, 50) + '�'
      : inc.descripcion;
    const iso       = new Date().toISOString();
    const legible   = new Date().toLocaleString('es-MX', {
      year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', second:'2-digit',
      hour12:false
    });

    await admin.messaging().sendEachForMulticast({
      notification: {
        title: '?? INCIDENTE REPORTADO',
        body : `ID #${inc.id} � Loco ${mov.locomotiveNumber} � ${empresa}: ${corta}`
      },
      data: {
        pantalla    : 'Incidente',
        incidenteId : String(inc.id),
        movimientoId: String(inc.movimientoId),
        empresa,
        localidad,
        locomotora  : String(mov.locomotiveNumber),
        descripcion : inc.descripcion,
        estado      : inc.estado,
        tipo        : 'nuevo_incidente',
        prioridad   : 'ALTA',
        fecha       : legible,     // legible al usuario
        timestamp   : iso          // base para countdown
      },
      tokens
    });
  } catch (e) {
    console.error('? Error enviando notificaci�n de nuevo incidente:', e);
    throw e;
  }
}
/* ----------------------------------------------
   CAMBIO DE ESTADO DEL INCIDENTE
   ---------------------------------------------- */
static async notificarCambioEstado(
    incidente: Incidente,
    estadoAnterior: string
  ): Promise<void> {
    // 1) buscamos el movimiento
    const mov = await prisma.movimiento.findUnique({
      where: { id: incidente.movimientoId },
      include: { empresa: true, localidad: true }
    });
    if (!mov) return;

    // 2) armamos la lista de IDs, incluyendo ahora al maquinista si lo necesitas
    const ids = [
      mov.clienteId,
      mov.supervisorId,
      mov.coordinadorId,
      mov.operadorId,
      mov.creadoPorId
    ].filter(Boolean) as number[];




    
    // 3) traemos tokens FCM
    const usuarios = await prisma.usuario.findMany({
      where: { id: { in: ids }, activo: true },
      include: { fcmTokens: true }
    });
    const tokens = usuarios.flatMap(u => u.fcmTokens.map(t => t.token));
    if (!tokens.length) return;

    // 4) enviamos la notificación
    const titulo = incidente.estado === 'RESUELTO' as any
      ? '✅ Incidente resuelto'
      : incidente.estado === 'CERRADO' as any
        ? '❌ Incidente cerrado'
        : 'ℹ️ Incidente actualizado';

    await admin.messaging().sendEachForMulticast({
      notification: {
        title: titulo,
        body: `ID #${incidente.id} • Loco ${mov.locomotiveNumber}`
      },
      data: {
        pantalla:     'Incidente',
        incidenteId:  String(incidente.id),
        movimientoId: String(incidente.movimientoId),
        estadoAnterior,
        estadoNuevo:  incidente.estado,
        timestamp:    new Date().toISOString()
      },
      tokens
    });
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

      await admin.messaging().sendEachForMulticast(mensaje_config);
      
    } catch (error) {
      console.error('Error enviando notificacion personalizada:', error);
      throw error;
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
        await admin.messaging().sendEachForMulticast(message);
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

    // 1. Obtener usuarios internos de la localidad (SUPERVISOR, COORDINADOR, MAQUINISTA, OPERADOR)
    const internos = await prisma.usuario.findMany({
      where: {
        localidadId: movimiento.localidadId,
        rol: { in: ['SUPERVISOR', 'COORDINADOR', 'MAQUINISTA', 'OPERADOR'] },
        activo: true
      },
      include: { fcmTokens: true }
    });

    // 2. Obtener todos los CLIENTES de la empresa (de cualquier localidad)
    const clientes = await prisma.usuario.findMany({
      where: {
        empresaId: movimiento.empresaId,
        rol: 'CLIENTE',
        activo: true
      },
      include: { fcmTokens: true }
    });

    // Combinar todos los usuarios
    const usuarios = [...internos, ...clientes];
    const tokens = usuarios.flatMap(u => u.fcmTokens.map(t => t.token));
    if (tokens.length === 0) return;

    const empresaNombre = movimiento.empresa?.nombre || 'Empresa';
    const loco = movimiento.locomotiveNumber;

    await admin.messaging().sendEachForMulticast({
      notification: {
        title: '? Incidente resuelto con comentario',
        body: `Loco ${loco} � ${empresaNombre}: "${comentario.slice(0, 80)}�"`
      },
      data: {
        pantalla: 'Incidente',
        incidenteId: String(incidente.id),
        movimientoId: String(movimiento.id),
        empresa: empresaNombre,
        locomotora: String(loco),
        tipo: 'incidente_continuado',
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

  /* Personal interno de la localidad + administradores */
  const internos = await prisma.usuario.findMany({
    where: {
      localidadId: mov.localidadId,
      rol: {
        in: [
          'SUPERVISOR',
          'COORDINADOR',
          'MAQUINISTA',
          'OPERADOR',
          'ADMINISTRADOR'
        ]
      },
      activo: true
    },
    include: { fcmTokens: true }
  });

  /* Clientes de la empresa */
  const clientes = await prisma.usuario.findMany({
    where: {
      empresaId: mov.empresaId,
      rol: 'CLIENTE',
      activo: true
    },
    include: { fcmTokens: true }
  });

  const tokens = [
    ...internos.flatMap(u  => u.fcmTokens.map(t => t.token)),
    ...clientes.flatMap(u => u.fcmTokens.map(t => t.token))
  ];
  if (tokens.length === 0) return;

  await admin.messaging().sendEachForMulticast({
    notification: {
      title: 'Incidente pospuesto por cliente',
      body : `Incidente #${incidente.id} — Locomotora ${mov.locomotiveNumber}`
    },
    data: {
      pantalla    : 'Incidente',
      incidenteId : String(incidente.id),
      movimientoId: String(mov.id),
      empresa     : mov.empresa?.nombre   ?? 'Empresa',
      localidad   : mov.localidad?.nombre ?? 'Localidad',
      tipo        : 'incidente_omitido',
      comentario,
      timestamp   : new Date().toISOString()
    },
    tokens
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

  const cliente = movimiento.clienteId
    ? await prisma.usuario.findUnique({
        where  : { id: movimiento.clienteId },
        include: { fcmTokens: true }
      })
    : null;

  const internos = await prisma.usuario.findMany({
    where: {
      localidadId: movimiento.localidadId,
      rol: {
        in: [
          'SUPERVISOR',
          'COORDINADOR',
          'MAQUINISTA',
          'OPERADOR',
          'ADMINISTRADOR'
        ]
      },
      activo: true
    },
    include: { fcmTokens: true }
  });

  const tokens = [
    ...(cliente?.fcmTokens.map(t => t.token) ?? []),
    ...internos.flatMap(u => u.fcmTokens.map(t => t.token))
  ];
  if (tokens.length === 0) return;

  await admin.messaging().sendEachForMulticast({
    notification: {
      title: 'Movimiento cancelado',
      body : `Locomotora ${movimiento.locomotiveNumber} — ${motivoExtra || 'Por reincidencia de incidentes'}`
    },
    data: {
      pantalla    : 'Movimiento',
      movimientoId: String(movimiento.id),
      empresa     : movimiento.empresa?.nombre   ?? 'Empresa',
      localidad   : movimiento.localidad?.nombre ?? 'Localidad',
      tipo        : 'movimiento_cancelado',
      timestamp   : new Date().toISOString()
    },
    tokens
  });
}




}