import { isPatioStart, patioStartNotice } from './patioNotificationPolicy';
import { resolverAudienciaFcmNatural } from './naturalFcmRouting';
import { resolverAudienciaFcmTorreon } from './torreonFcmRouting';
import { resolverAudienciaFcmServicio, type TipoServicioFcm } from './serviceFcmRouting';
import { messaging } from '../config/firebase';
import { createHash, randomUUID } from 'crypto';
import { getDurableJobKey } from '../jobs/durableJobs';
import { claimFcmDelivery } from './fcmDelivery';

type MulticastMessageCompat = {
  tokens: string[];
  [key: string]: unknown;
};

type SendResponseCompat = {
  success: boolean;
  messageId?: string;
  error?: { code: string; message?: string };
};

export async function sendMulticastCompat(message: MulticastMessageCompat): Promise<{ successCount: number; failureCount: number; responses: SendResponseCompat[] }> {
  const { tokens, ...payload } = message;
  let notification = (payload.notification ?? {}) as { title?: unknown; body?: unknown; icon?: unknown };
  const dataInput = (payload.data ?? {}) as Record<string, unknown>;
  const data = Object.fromEntries(
    Object.entries({
      title: notification.title,
      body: notification.body,
      ...dataInput,
    })
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  );
  if (isPatioStart(data)) {
    data.notificationScope = 'patio';
    const notice = patioStartNotice(data);
    notification = { title: notice.notificationTitle, body: notice.notificationBody };
    data.title = notice.notificationTitle; data.body = notice.notificationBody;
  }
  if (!data.recipientRoles) {
    const service = ['TORNO', 'LAVADO', 'TORNO_LAVADO'].includes(data.servicio) ? data.servicio as TipoServicioFcm : null;
    const routing = data.source === 'torreon' ? resolverAudienciaFcmTorreon(data.tipo)
      : (service ? resolverAudienciaFcmServicio(data.tipo, service) : null) ?? resolverAudienciaFcmNatural(data.tipo);
    data.recipientRoles = (routing?.roles ?? []).join(',');
  }
  const jobKey = getDurableJobKey();
  const eventId = data.eventId || (jobKey
    ? createHash('sha256').update(JSON.stringify([jobKey, data.tipo, data.audience, data.movimientoId, data.incidenteId, data.arrastreId, data.servicio])).digest('hex')
    : randomUUID());
  data.eventId = eventId;
  const expiry = data.expiresAt ? Date.parse(data.expiresAt) : NaN;
  const ttl = Number.isFinite(expiry) ? Math.max(0, Math.floor((expiry - Date.now()) / 1000)) : 86400;
  if (Number.isFinite(expiry) && ttl <= 0) return { successCount: tokens.length, failureCount: 0, responses: tokens.map(() => ({ success: true })) };
  const link = data.url || data.click_action || '/';
  const tag = eventId;
  const sendPayload = {
    ...payload,
    notification,
    data,
    android: {
      ...((payload.android as any) ?? {}),
      priority: 'high',
      ttl: ttl * 1000,
      notification: {
        channelId: 'cosaif_operacion',
        sound: 'default',
        defaultSound: true,
        ...(payload.android as any)?.notification,
      },
    },
    apns: {
      headers: {
        'apns-priority': '10',
        'apns-expiration': String(Math.floor(Date.now() / 1000) + ttl),
        ...((payload.apns as any)?.headers ?? {}),
      },
      payload: {
        ...((payload.apns as any)?.payload ?? {}),
        aps: {
          ...((payload.apns as any)?.payload?.aps ?? {}),
          sound: 'default',
          badge: 1,
        },
      },
    },
    webpush: {
      ...((payload.webpush as any) ?? {}),
      headers: {
        // Conserva el push hasta 24 h si el dispositivo está temporalmente
        // sin conexión y solicita entrega inmediata al volver a conectarse.
        TTL: String(ttl),
        Urgency: 'high',
        ...((payload.webpush as any)?.headers ?? {}),
      },
      fcmOptions: {
        link,
        ...((payload.webpush as any)?.fcmOptions ?? {}),
      },
      notification: {
        icon: String(notification.icon ?? data.icon ?? '/icons/cosaif-192.png'),
        badge: String(data.badge ?? '/icons/cosaif-192.png'),
        silent: false,
        ...((payload.webpush as any)?.notification ?? {}),
        tag,
        renotify: false,
        requireInteraction: false,
      },
    },
  };

  const deliveries = new Map<string, Promise<SendResponseCompat>>();
  const responses: SendResponseCompat[] = await Promise.all(
    tokens.map((token) => {
      const existing = deliveries.get(token);
      if (existing) return existing;
      const delivery = (async (): Promise<SendResponseCompat> => {
        try {
          if (jobKey && !(await claimFcmDelivery(eventId, token))) return { success: true };
          const messageId = await messaging.send({ ...sendPayload, token } as any);
          return { success: true, messageId };
        } catch (error: any) {
          return {
            success: false,
            error: {
              code: error?.code ?? error?.errorInfo?.code ?? 'messaging/unknown-error',
              message: error?.message,
            },
          };
        }
      })();
      deliveries.set(token, delivery);
      return delivery;
    })
  );

  const failureDetails = responses
    .map((response, index) =>
      !response.success
        ? { index, code: response.error?.code, message: response.error?.message }
        : null
    )
    .filter(Boolean);

  console.info('FCM send result', {
    tipo: data.tipo ?? null,
    tokens: tokens.length,
    successCount: responses.filter((response) => response.success).length,
    failureCount: responses.filter((response) => !response.success).length,
    failures: failureDetails,
  });

  return {
    responses,
    successCount: responses.filter((response) => response.success).length,
    failureCount: responses.filter((response) => !response.success).length,
  };
}

