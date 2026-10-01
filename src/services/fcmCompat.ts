import { logicalNotificationId } from './logicalNotificationId';
import { isPatioStart, patioStartNotice } from './patioNotificationPolicy';
import { resolverAudienciaFcmNatural } from './naturalFcmRouting';
import { resolverAudienciaFcmTorreon } from './torreonFcmRouting';
import { resolverAudienciaFcmServicio, type TipoServicioFcm } from './serviceFcmRouting';
import { createHash, randomUUID } from 'crypto';
import { getDurableJobKey } from '../jobs/durableJobs';
import { sendFcmRecipients, summarizeFcmResults, requestFcmRetry, type FcmResponse } from './fcmSender';

type MulticastMessageCompat = {
  tokens: string[];
  [key: string]: unknown;
};

export async function sendMulticastCompat(message: MulticastMessageCompat) {
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
  if (['nuevo_movimiento', 'torreon_movimiento_creado'].includes(data.tipo)) {
    const title = 'Nueva solicitud de movimiento';
    const body = [data.locomotiveNumber || data.locomotora ? `Locomotora ${data.locomotiveNumber || data.locomotora}` : '',
      `Movimiento #${data.movimientoId}`, data.localidadNombre || (data.localidadId ? `Patio ${data.localidadId}` : '')].filter(Boolean).join(' · ');
    notification = { title, body }; data.title = title; data.body = body;
  }
  const jobKey = getDurableJobKey();
  const logicalId = logicalNotificationId(data);
  const eventId = logicalId || data.eventId || (jobKey
    ? createHash('sha256').update(JSON.stringify([jobKey, data.tipo, data.audience, data.movimientoId, data.incidenteId, data.arrastreId, data.servicio])).digest('hex')
    : randomUUID());
  data.eventId = eventId;
  const expiry = data.expiresAt ? Date.parse(data.expiresAt) : NaN;
  const ttl = Number.isFinite(expiry) ? Math.max(0, Math.floor((expiry - Date.now()) / 1000)) : 86400;
  if (Number.isFinite(expiry) && ttl <= 0) {
    return logResults(data, tokens.length, tokens.map((): FcmResponse => ({ success: false, status: 'expired' })));
  }
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
        tag,
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

  const responses = await sendFcmRecipients(tokens, sendPayload as any, eventId,
    Boolean(jobKey || logicalId || dataInput.eventId));
  const result = logResults(data, tokens.length, responses);
  // El worker conserva el trabajo pendiente. Al ejecutarlo otra vez, los
  // destinatarios ya aceptados siguen protegidos por sus reservas persistentes.
  if (jobKey && result.retryableCount > 0) await requestFcmRetry(tokens, responses);
  return result;
}

function logResults(data: Record<string, string>, tokens: number, responses: FcmResponse[]) {
  const result = summarizeFcmResults(responses);
  const { responses: _responses, ...counts } = result;
  console.info('FCM send result', {
    tipo: data.tipo ?? null,
    eventId: data.eventId,
    localidadId: data.localidadId ?? null,
    tokens,
    ...counts,
    failures: responses.flatMap((r, index) => r.error ? [{ index, status: r.status, code: r.error.code }] : []),
  });
  return result;
}
