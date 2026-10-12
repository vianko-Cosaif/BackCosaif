import { normalizarMetaInstrucciones } from './movimiento.meta';

const META_TAG = /\[META\s+[^\]]*\]\s*/gi;
const AUTOMATIC_FRAGMENT = /Incidente\s+#\d+\s+no resuelto para movimiento\s+#\d+\.?|(?:Movimiento\s+)?reprogramado en ronda\s+\d+,\s*posici[oó]n\s+\d+\.?|Reprogramado (?:en movimiento|como)\s+#\d+\.?|Movimiento reprogramado\.?|No realizado por incidente\.?|Cancelado tras\s+\d+\s+incidentes en la misma solicitud(?:\s+para la locomotora\s+#\d+)?\.?|Cancelado por\s+\d+\s+incidentes\.?/gi;

function separarComentarios(value: string) {
  const operation: string[] = [];
  const outcomes: string[] = [];
  for (const part of value.split('|').map(segment => segment.trim()).filter(Boolean)) {
    // A generated segment consists entirely of known workflow sentences. Matching words
    // inside an operator's note must never delete their text or fabricate an outcome.
    if (!part.replace(AUTOMATIC_FRAGMENT, '').trim()) outcomes.push(part);
    else operation.push(part);
  }
  return { operation: operation.join(' | '), outcomes };
}

/** A retry inherits the operation and its metadata, without the previous attempt's outcome. */
export function instruccionesParaNuevoIntento(raw?: string | null): string | null {
  const normalized = normalizarMetaInstrucciones(raw ?? '');
  const tags = normalized.match(/\[META\s+[^\]]*\]/gi) ?? [];
  const { operation } = separarComentarios(normalized.replace(META_TAG, ''));
  return [...tags, operation].filter(Boolean).join(' ') || null;
}

/** Keep one short outcome on the historical attempt, replacing generated legacy comments. */
export function instruccionesConResultadoIncidente(raw: string | null | undefined, resultado: string): string {
  const operation = instruccionesParaNuevoIntento(raw);
  return operation ? `${operation} | ${resultado}` : resultado;
}

/** Public text has no machine tags or repeated incident history. */
export function instruccionesVisibles(raw?: string | null): string | null {
  if (!raw) return null;
  const { operation, outcomes } = separarComentarios(raw.replace(META_TAG, ''));
  const history = outcomes.join(' ');
  const links = [...history.matchAll(/Reprogramado (?:en movimiento|como)\s+#(\d+)\b/gi)];
  const cancellations = [...history.matchAll(/Cancelado (?:tras|por)\s+(\d+)\s+incidentes\b/gi)];
  const outcome = cancellations.length
    ? `Cancelado por ${cancellations[cancellations.length - 1][1]} incidentes.`
    : links.length
      ? `No realizado por incidente. Reprogramado como #${links[links.length - 1][1]}.`
      : '';
  return [operation, outcome].filter(Boolean).join(' | ') || null;
}
