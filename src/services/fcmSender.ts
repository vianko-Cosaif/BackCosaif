import type { Message } from 'firebase-admin/messaging';
import { messaging } from '../config/firebase';
import { claimFcmDelivery, releaseRejectedFcmDelivery } from './fcmDelivery';
import { prisma } from '../lib/prisma';

export type FcmResponse = {
  success: boolean;
  status: 'accepted' | 'skipped_duplicate' | 'expired' | 'failed' | 'uncertain';
  messageId?: string;
  error?: { code: string };
  retryAfterSeconds?: number;
};

// La lista es deliberadamente explícita: errores de red/desconocidos no
// demuestran que Firebase rechazó el aviso y no permiten liberar su reserva.
const retryableRejections = new Set([
  'messaging/server-unavailable', 'messaging/quota-exceeded',
  'messaging/message-rate-exceeded', 'messaging/device-message-rate-exceeded',
  'messaging/topics-message-rate-exceeded',
]);
const configurationRejections = new Set([
  'app/invalid-credential', 'messaging/authentication-error',
  'messaging/mismatched-credential', 'messaging/third-party-auth-error',
  'messaging/invalid-apns-credentials',
]);
const terminalRejections = new Set([
  'messaging/invalid-argument', 'messaging/invalid-recipient', 'messaging/invalid-payload',
  'messaging/invalid-data-payload-key', 'messaging/payload-size-limit-exceeded',
  'messaging/invalid-options', 'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered', 'messaging/invalid-package-name',
]);

function retryDelay(error: any, minimum: number): number {
  const headers = error?.httpResponse?.headers ?? error?.response?.headers;
  const header = headers?.get?.('retry-after') ?? headers?.['retry-after'];
  const seconds = header == null ? 0 : Number(header);
  const requested = Number.isFinite(seconds) ? seconds : (Date.parse(String(header)) - Date.now()) / 1000;
  return Math.ceil(Math.max(minimum, Number.isFinite(requested) ? requested : 0));
}

export async function sendFcmRecipients(
  tokens: string[], payload: Omit<Message, 'token'>, eventId: string, reserve: boolean,
): Promise<FcmResponse[]> {
  const deliveries = new Map<string, Promise<FcmResponse>>();
  return Promise.all(tokens.map(token => {
    if (deliveries.has(token)) return { success: false, status: 'skipped_duplicate' } as FcmResponse;
    const delivery = (async (): Promise<FcmResponse> => {
      let claimed = false;
      if (reserve) {
        try {
          claimed = await claimFcmDelivery(eventId, token);
          if (!claimed) return { success: false, status: 'skipped_duplicate' };
        } catch {
          return { success: false, status: 'failed', error: { code: 'fcm/reservation-failed' }, retryAfterSeconds: 60 };
        }
      }
      try {
        const messageId = await messaging.send({ ...payload, token } as Message);
        return { success: true, status: 'accepted', messageId };
      } catch (error: any) {
        const code = error?.code ?? error?.errorInfo?.code ?? 'messaging/unknown-error';
        const retryable = retryableRejections.has(code) || configurationRejections.has(code);
        if (retryable && claimed) {
          try { await releaseRejectedFcmDelivery(eventId, token); }
          catch {
            // No afirmar que el próximo intento podrá reservar si la liberación falló.
            return { success: false, status: 'failed', error: { code: 'fcm/release-failed' } };
          }
        }
        return {
          success: false,
          status: retryable || terminalRejections.has(code) ? 'failed' : 'uncertain',
          error: { code },
          ...(retryable ? { retryAfterSeconds: retryDelay(error, configurationRejections.has(code) ? 300 : 60) } : {}),
        };
      }
    })();
    deliveries.set(token, delivery);
    return delivery;
  }));
}

export function summarizeFcmResults(responses: FcmResponse[]) {
  return {
    responses,
    successCount: responses.filter(r => r.status === 'accepted').length,
    failureCount: responses.filter(r => r.status === 'failed' || r.status === 'uncertain').length,
    skippedCount: responses.filter(r => r.status === 'skipped_duplicate').length,
    expiredCount: responses.filter(r => r.status === 'expired').length,
    uncertainCount: responses.filter(r => r.status === 'uncertain').length,
    retryableCount: responses.filter(r => r.retryAfterSeconds !== undefined).length,
  };
}

export class FcmRetryError extends Error {
  readonly retryAfterSeconds: number;
  constructor(responses: FcmResponse[]) {
    super('FCM: hay destinatarios pendientes de reintento');
    this.name = 'FcmRetryError';
    this.retryAfterSeconds = Math.max(...responses.map(r => r.retryAfterSeconds ?? 0));
  }
}

export async function requestFcmRetry(tokens: string[], responses: FcmResponse[]): Promise<never> {
  // El llamador no recibirá el lote cuando se solicite reintento. Retirar aquí
  // los tokens definitivamente inválidos conserva su limpieza en lotes parciales.
  const invalid = tokens.filter((_token, i) => [
    'messaging/registration-token-not-registered', 'messaging/invalid-registration-token',
  ].includes(responses[i]?.error?.code ?? ''));
  if (invalid.length) {
    try { await prisma.fcmToken.deleteMany({ where: { token: { in: [...new Set(invalid)] } } }); }
    catch { console.warn('FCM: no se pudieron retirar tokens inválidos del lote pendiente'); }
  }
  throw new FcmRetryError(responses);
}
