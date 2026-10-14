export type MovimientoMeta = {
  destinoId?: number;
  seccion?: number;
  liberar: boolean;
};

const META_RE = /\[META\s+([^\]]+)\]/i;

export type MovimientoMetaInput = {
  viaDestinoId?: number | null;
  numeroSeccion?: number | null;
  liberarOrigen?: boolean;
};

export function buildMetaTag(opts: {
  viaDestinoId?: number;
  numeroSeccion?: number;
  liberarOrigen?: boolean;
}) {
  const parts: string[] = [];
  if (opts.viaDestinoId) parts.push(`DESTINO:${Number(opts.viaDestinoId)}`);
  if (opts.numeroSeccion != null) parts.push(`SECCION:${Number(opts.numeroSeccion)}`);
  if (opts.liberarOrigen) parts.push('LIBERAR');
  return parts.length ? `[META ${parts.join('|')}] ` : '';
}

export function parseMetaFromInstrucciones(instr?: string): MovimientoMeta {
  const meta: MovimientoMeta = { destinoId: undefined, seccion: undefined, liberar: false };
  if (!instr) return meta;

  const match = instr.match(META_RE);
  if (!match) return meta;

  const tokens = match[1].split('|').map((token) => token.trim().toUpperCase());
  for (const token of tokens) {
    if (token === 'LIBERAR') meta.liberar = true;
    if (token.startsWith('DESTINO:')) {
      const destinoId = Number(token.split(':')[1]);
      if (!Number.isNaN(destinoId)) meta.destinoId = destinoId;
    }
    if (token.startsWith('SECCION:')) {
      const seccion = Number(token.split(':')[1]);
      if (!Number.isNaN(seccion)) meta.seccion = seccion;
    }
  }

  return meta;
}

function conservarMetadatosAdicionales(text: string, fallback?: string | null): string[] {
  const tokens = new Map<string, string>();
  for (const source of [text, fallback ?? '']) {
    for (const tag of source.matchAll(/\[META\s+([^\]]*)\]/gi)) {
      for (const raw of tag[1].split('|')) {
        const token = raw.trim();
        if (!token || /^(?:(?:DESTINO|SECCION):|LIBERAR$)/i.test(token)) continue;
        const key = token.split(':', 1)[0].trim().toUpperCase();
        if (!tokens.has(key)) tokens.set(key, token);
      }
    }
  }
  return [...tokens.values()].map(token => `[META ${token}]`);
}

/** Keep one execution tag; form edits may contain only the visible instructions. */
export function normalizarMetaInstrucciones(
  instrucciones?: string | null,
  opts: MovimientoMetaInput = {},
  fallback?: string | null
): string {
  const text = String(instrucciones ?? '');
  // The first tag is authoritative, matching the execution parser. Later tags can be stale.
  const meta = parseMetaFromInstrucciones(META_RE.test(text) ? text : fallback ?? undefined);
  // Shared forms can resend a partial tag. Omitted fields retain their stored intention.
  const previous = parseMetaFromInstrucciones(fallback ?? undefined);
  meta.destinoId ??= previous.destinoId;
  meta.seccion ??= previous.seccion;
  meta.liberar ||= previous.liberar;
  if (opts.viaDestinoId !== undefined) meta.destinoId = opts.viaDestinoId ?? undefined;
  if (opts.numeroSeccion !== undefined) meta.seccion = opts.numeroSeccion ?? undefined;
  if (opts.liberarOrigen !== undefined) meta.liberar = opts.liberarOrigen;

  const operation = text.replace(/\[META\s+[^\]]*\]\s*/gi, ' ').replace(/[ \t]{2,}/g, ' ').trim();
  const executionTag = buildMetaTag({
    viaDestinoId: meta.destinoId,
    numeroSeccion: meta.seccion,
    liberarOrigen: meta.liberar,
  }).trim();
  // ORIGEN and extension tokens belong to clients; do not discard them while deduplicating.
  return [executionTag, ...conservarMetadatosAdicionales(text, fallback), operation].filter(Boolean).join(' ');
}
