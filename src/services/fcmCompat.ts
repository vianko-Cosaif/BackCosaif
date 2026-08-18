import { messaging } from '../config/firebase';

type MulticastMessageCompat = {
  tokens: string[];
  [key: string]: unknown;
};

type SendResponseCompat = {
  success: boolean;
  messageId?: string;
  error?: { code: string; message?: string };
};

export async function sendMulticastCompat(message: MulticastMessageCompat) {
  const { tokens, ...payload } = message;
  const notification = (payload.notification ?? {}) as { title?: unknown; body?: unknown; icon?: unknown };
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
  const link = data.url || data.click_action || '/';
  const tag = data.tag || data.eventId || data.movimientoId || data.incidenteId || data.tipo || 'cosaif';
  const sendPayload = {
    ...payload,
    data,
    android: {
      ...((payload.android as any) ?? {}),
      priority: 'high',
      notification: {
        sound: 'default',
        defaultSound: true,
        ...(payload.android as any)?.notification,
      },
    },
    apns: {
      headers: {
        'apns-priority': '10',
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
        TTL: '86400',
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
        tag: String(tag),
        renotify: true,
        requireInteraction: true,
        silent: false,
        ...((payload.webpush as any)?.notification ?? {}),
      },
    },
  };

  const responses: SendResponseCompat[] = await Promise.all(
    tokens.map(async (token) => {
      try {
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

