type Notice = { title?: unknown; body?: unknown; [key: string]: unknown };
const clean = (value: unknown) => typeof value === 'string' || typeof value === 'number'
  ? String(value).replace(/\s+/g, ' ').trim() : '';
const positiveId = (value: unknown) => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? String(value) : '';
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const bounded = (value: string, max: number) => max <= 0 ? '' : value.length <= max ? value : value.slice(0, max - 1).trimEnd() + '…';

/** Add missing public operation identity while preserving the action/detail supplied by its producer. */
export function operationalNotificationText(notice: Notice, data: Record<string, unknown>) {
  const title = bounded(clean(notice.title), 100);
  let body = clean(notice.body).replace(/\bLoco\s+/gi, 'Locomotora ');
  const movement = positiveId(data.movimientoId), arrastre = positiveId(data.arrastreId);
  const incident = positiveId(data.incidenteId), yard = positiveId(data.localidadId);
  if (!movement && !arrastre && !incident && !yard) return { ...notice, title, body: bounded(body, 240) };
  // Legacy incident text called its incident number simply "ID"; make that identifier explicit.
  if (incident) body = body.replace(new RegExp(`\\bID\\s*#?\\s*${escape(incident)}\\b`, 'gi'), `Incidente #${incident}`);
  const entityLabel = arrastre ? 'Arrastre' : 'Movimiento';
  const entityId = arrastre || movement;
  if (entityId) body = body.replace(new RegExp(`^#${escape(entityId)}(?=\\b)`, 'i'), `${entityLabel} #${entityId}`);
  const identities: Array<{ label: string; present: (value: string) => boolean }> = [];
  const locomotive = clean(data.locomotiveNumber ?? data.locomotora);
  if (locomotive && !['undefined', 'null', 'N/D'].includes(locomotive)
    ) identities.push({ label: `Locomotora ${bounded(locomotive, 40)}`, present: value => new RegExp(`\\bLocomotora\\s+${escape(locomotive)}(?=\\W|$)`, 'i').test(value) });
  if (entityId) identities.push({ label: `${entityLabel} #${entityId}`, present: value => new RegExp(`\\b${entityLabel}\\s*#?\\s*${escape(entityId)}\\b`, 'i').test(value) });
  if (incident) identities.push({ label: `Incidente #${incident}`, present: value => new RegExp(`\\bIncidente\\s*#?\\s*${escape(incident)}\\b`, 'i').test(value) });
  const yardName = clean(data.localidadNombre ?? data.localidad);
  const yardLabel = yardName ? `Patio ${bounded(yardName, 50)}` : yard ? `Patio ${yard}` : '';
  if (yardLabel) identities.push({ label: yardLabel, present: value =>
    value.toLocaleLowerCase('es').includes(yardLabel.toLocaleLowerCase('es'))
    || Boolean(yardName && value.toLocaleLowerCase('es').includes(yardName.toLocaleLowerCase('es'))) });
  // Re-evaluate the retained prefix after shortening. An identity previously present
  // near the end must be moved to the suffix if truncation would remove it.
  const originalBody = body, context = new Set<string>();
  let suffix = '';
  for (let pass = 0; pass <= identities.length; pass++) {
    for (const identity of identities) if (!identity.present(body)) context.add(identity.label);
    suffix = [...context].join(' · ');
    body = bounded(originalBody, Math.max(0, 240 - suffix.length - (originalBody && suffix ? 3 : 0)));
  }
  body = [body, suffix].filter(Boolean).join(' · ');
  return { ...notice, title, body };
}
