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
        empresa:   { select: { nombre: true } },
        viaOrigen: { select: { nombre: true } },
        viaDestino:{ select: { nombre: true } },
      },
    });
    if (!mov) return;

    const ROLES_LOCALIDAD = ['MAQUINISTA','OPERADOR'] as const;
    const ROLES_STAFF     = ['SUPERVISOR','COORDINADOR','ADMINISTRADOR'] as const;

    const idsForzados = [mov.operadorId, mov.supervisorId, mov.coordinadorId]
      .filter(Boolean) as number[];

    const [uLocal, uStaffLocal, uClientesEmpLoc, uForz] = await Promise.all([
      // maquinistas/operadores de la localidad del movimiento
      prisma.usuario.findMany({
        where: { activo: true, localidadId: mov.localidadId, rol: { in: ROLES_LOCALIDAD as any } },
        select: { id: true, rol: true, fcmTokens: { select: { token: true } } },
      }),
      // staff de la MISMA empresa Y MISMA localidad (aunque no estén asignados)
      prisma.usuario.findMany({
        where: {
          activo: true,
          empresaId: mov.empresaId,
          localidadId: mov.localidadId,
          rol: { in: ROLES_STAFF as any },
        },
        select: { id: true, rol: true, fcmTokens: { select: { token: true } } },
      }),
      // usuarios CLIENTE de esa empresa en esa localidad
      prisma.usuario.findMany({
        where: {
          activo: true,
          empresaId: mov.empresaId,
          localidadId: mov.localidadId,
          rol: 'CLIENTE',
        },
        select: { id: true, rol: true, fcmTokens: { select: { token: true } } },
      }),
      // asignados explícitos (si existen), por si están en otra localidad
      idsForzados.length
        ? prisma.usuario.findMany({
            where: { id: { in: idsForzados }, activo: true },
            select: { id: true, rol: true, fcmTokens: { select: { token: true } } },
          })
        : Promise.resolve([]),
    ]);

    const tokens = [...new Set(
      [...uLocal, ...uStaffLocal, ...uClientesEmpLoc, ...uForz]
        .flatMap(u => u.fcmTokens.map(t => t.token).filter(Boolean) as string[])
    )];
    if (!tokens.length) {
      console.warn('FCM: sin tokens', { movId: mov.id, loc: mov.localidadId, emp: mov.empresaId });
      return;
    }

    if (!admin.apps.length) admin.initializeApp();

    const title = `🆕 Movimiento creado (${mov.prioridad ?? 'N/D'})`;
    const body  = `Loco ${mov.locomotiveNumber} · ${mov.viaOrigen?.nombre ?? 'N/D'} → ${mov.viaDestino?.nombre ?? 'N/D'} · ${mov.empresa?.nombre ?? 'N/D'}`;

    const resp = await admin.messaging().sendEachForMulticast({
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
        timestamp: new Date().toISOString(),
      },
      tokens,
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
        empresa:   { select: { nombre: true } },
        localidad: { select: { nombre: true } },
      },
    });
    if (!mov) return;

    // 1) Empresa en la misma localidad (todos) MENOS MAQUINISTA
    const empresaLocal = await prisma.usuario.findMany({
      where: {
        activo: true,
        empresaId: mov.empresaId,
        localidadId: mov.localidadId,
        NOT: { rol: 'MAQUINISTA' },           // excluye rol maquinista
      },
      select: { id: true, fcmTokens: { select: { token: true } } },
    });

    // 2) Staff de la misma localidad (si no estuvieran ya): SUPERVISOR/COORDINADOR
    const staffLocal = await prisma.usuario.findMany({
      where: {
        activo: true,
        localidadId: mov.localidadId,
        rol: { in: ['SUPERVISOR', 'COORDINADOR'] },
      },
      select: { id: true, fcmTokens: { select: { token: true } } },
    });

    // 3) Asignados explícitos (cliente/supervisor/coordinador/creador), excluye maquinista
    const idsAsignados = [
      mov.clienteId, mov.supervisorId, mov.coordinadorId, mov.creadoPorId
    ].filter((x): x is number => Boolean(x));
    const asignados = idsAsignados.length
      ? await prisma.usuario.findMany({
          where: { id: { in: idsAsignados }, activo: true },
          select: { id: true, fcmTokens: { select: { token: true } } },
        })
      : [];

    // 4) Fusiona, deduplica y excluye explícitamente al maquinista por ID
    const usuarios = [...empresaLocal, ...staffLocal, ...asignados]
      .filter(u => u.id !== mov.operadorId);
    const tokens = [...new Set(
      usuarios.flatMap(u => u.fcmTokens.map(t => t.token).filter(Boolean) as string[])
    )];
    if (!tokens.length) return;

    // 5) Mensaje limpio y con truncado correcto
    const empresa   = mov.empresa?.nombre   ?? 'Sin Empresa';
    const localidad = mov.localidad?.nombre ?? 'Sin Localidad';
    const corta     = inc.descripcion.length > 50 ? inc.descripcion.slice(0, 50) + '…' : inc.descripcion;
    const iso       = new Date().toISOString();
    const legible   = new Date().toLocaleString('es-MX', {
      year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
    });

    if (!admin.apps.length) admin.initializeApp();

    const resp = await admin.messaging().sendEachForMulticast({
      notification: {
        title: '🚨 Incidente reportado',
        body : `ID #${inc.id} • Loco ${mov.locomotiveNumber} • ${empresa}: ${corta}`
      },
      data: {
        pantalla    : 'Incidente',
        tipo        : 'nuevo_incidente',
        incidenteId : String(inc.id),
        movimientoId: String(mov.id),
        empresa,
        localidad,
        locomotora  : String(mov.locomotiveNumber),
        descripcion : inc.descripcion,
        estado      : inc.estado,
        fecha       : legible,
        timestamp   : iso
      },
      tokens
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
  estadoAnterior: string
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
        empresa:   { select: { nombre: true } },
        localidad: { select: { nombre: true } },
      },
    });
    if (!mov) return;

    // 1) Empresa + localidad: TODOS los usuarios (incluye MAQUINISTA)
    const empresaLocal = await prisma.usuario.findMany({
      where: {
        activo: true,
        empresaId: mov.empresaId,
        localidadId: mov.localidadId,
      },
      select: { id: true, fcmTokens: { select: { token: true } } },
    });

    // 2) Staff de la misma localidad (por si no pertenecen a esa empresa)
    const staffLocal = await prisma.usuario.findMany({
      where: {
        activo: true,
        localidadId: mov.localidadId,
        rol: { in: ['SUPERVISOR', 'COORDINADOR'] },
      },
      select: { id: true, fcmTokens: { select: { token: true } } },
    });

    // 3) Asignados explícitos (cliente, supervisor, coordinador, creador)
    const idsAsignados = [mov.clienteId, mov.supervisorId, mov.coordinadorId, mov.creadoPorId]
      .filter((x): x is number => Boolean(x));
    const asignados = idsAsignados.length
      ? await prisma.usuario.findMany({
          where: { id: { in: idsAsignados }, activo: true },
          select: { id: true, fcmTokens: { select: { token: true } } },
        })
      : [];

    // 4) Fusiona y deduplica (ahora SIN excluir al maquinista)
    const tokens = [...new Set(
      [...empresaLocal, ...staffLocal, ...asignados]
        .flatMap(u => u.fcmTokens.map(t => t.token).filter(Boolean) as string[])
    )];
    if (!tokens.length) return;

    if (!admin.apps.length) admin.initializeApp();

    const titulo =
      incidente.estado === 'RESUELTO' ? '✅ Incidente resuelto' :
      incidente.estado === 'CERRADO'  ? '❌ Incidente cerrado'  :
                                         'ℹ️ Incidente actualizado';

    const resp = await admin.messaging().sendEachForMulticast({
      notification: {
        title: titulo,
        body: `ID #${incidente.id} • Loco ${mov.locomotiveNumber} • ${mov.empresa?.nombre ?? 'Sin Empresa'}`,
      },
      data: {
        pantalla:     'Incidente',
        tipo:         'incidente_actualizado',
        incidenteId:  String(incidente.id),
        movimientoId: String(incidente.movimientoId),
        empresa:      String(mov.empresa?.nombre ?? ''),
        localidad:    String(mov.localidad?.nombre ?? ''),
        estadoAnterior,
        estadoNuevo:  incidente.estado,
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