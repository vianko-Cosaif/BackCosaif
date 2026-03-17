export type MovimientoMeta = {
  destinoId?: number;
  seccion?: number;
  liberar: boolean;
};

const META_RE = /\[META ([^\]]+)\]/i;

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
