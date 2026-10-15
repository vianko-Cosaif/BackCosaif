// Immediate operational alerts expire five minutes after the server event.
// State reconciliation, transactional outbox records and delivery identities remain intact.
export const OPERATIONAL_NOTIFICATION_MAX_AGE_MS = 5 * 60_000;
export function operationalNotificationTiming(occurredAt: unknown, now = Date.now()) {
  // Compatibility for legacy jobs without a timestamp; newly imported events always carry one.
  if (occurredAt == null) return { notify: true, occurredAt: undefined, expiresAt: undefined };
  const time = new Date(occurredAt as string).getTime();
  if (!Number.isFinite(time)) return { notify: false, occurredAt: undefined, expiresAt: undefined };
  const expires = time + OPERATIONAL_NOTIFICATION_MAX_AGE_MS;
  return { notify: time <= now + 60_000 && now < expires,
    occurredAt: new Date(time).toISOString(), expiresAt: new Date(expires).toISOString() };
}
export function shouldNotifyIncidentTimeout(incident: { estado?: unknown; fechaFin?: unknown } | null, now = Date.now()) {
  return Boolean(incident && incident.estado === 'CERRADO' && incident.fechaFin
    && operationalNotificationTiming(incident.fechaFin, now).notify);
}
