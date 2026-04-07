import fs from 'fs';
import path from 'path';

type LifeLineSide = 'izquierdo' | 'derecho';

interface LifeLineRulesConfig {
  default: Record<string, LifeLineSide[]>;
  rp: Record<string, LifeLineSide[]>;
}

export interface ViaLifeLineInfo {
  aplica: true;
  lados: LifeLineSide[];
  descripcion: string;
  esRP: boolean;
}

const RULES_FILE_PATH = path.resolve(process.cwd(), 'data', 'vias-linea-vida.rules.json');
const EMPTY_RULES: LifeLineRulesConfig = { default: {}, rp: {} };

let rulesCache: LifeLineRulesConfig | null = null;

const toSide = (value: unknown): LifeLineSide | null => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'izquierdo') return 'izquierdo';
  if (normalized === 'derecho') return 'derecho';
  return null;
};

const normalizeRules = (raw: unknown): LifeLineRulesConfig => {
  const source = (raw && typeof raw === 'object' ? raw : {}) as {
    default?: Record<string, unknown>;
    rp?: Record<string, unknown>;
  };

  const normalizeRecord = (record: Record<string, unknown> | undefined): Record<string, LifeLineSide[]> => {
    const result: Record<string, LifeLineSide[]> = {};
    if (!record) return result;
    for (const [key, value] of Object.entries(record)) {
      const sides = Array.isArray(value)
        ? value.map(toSide).filter((side): side is LifeLineSide => Boolean(side))
        : [];
      result[String(key)] = [...new Set(sides)];
    }
    return result;
  };

  return {
    default: normalizeRecord(source.default),
    rp: normalizeRecord(source.rp),
  };
};

const getRules = (): LifeLineRulesConfig => {
  if (rulesCache) return rulesCache;
  try {
    const rawFile = fs.readFileSync(RULES_FILE_PATH, 'utf8');
    rulesCache = normalizeRules(JSON.parse(rawFile));
    return rulesCache;
  } catch (error) {
    console.warn('[via.lifeLineRules] No se pudieron cargar reglas de linea de vida.', error);
    rulesCache = EMPTY_RULES;
    return rulesCache;
  }
};

const extractTrackNumber = (trackName: string): string | null => {
  const match = trackName.match(/(\d{1,3})/);
  return match?.[1] ?? null;
};

const isRpTrack = (trackName: string): boolean => /\brp\b/i.test(trackName);

const formatDescription = (sides: LifeLineSide[]): string => {
  const labels = sides.map((side) => `lado ${side}`);
  if (labels.length === 1) return `Linea de vida en ${labels[0]}.`;
  if (labels.length === 2) return `Linea de vida en ${labels[0]} y ${labels[1]}.`;
  return `Linea de vida en ${labels.join(', ')}.`;
};

export const resolveViaLifeLine = (viaName: string | number | null | undefined): ViaLifeLineInfo | null => {
  const name = String(viaName ?? '').trim();
  if (!name) return null;

  const trackNumber = extractTrackNumber(name);
  if (!trackNumber) return null;

  const rpTrack = isRpTrack(name);
  const rules = getRules();
  const sides = (
    rpTrack
      ? (rules.rp[trackNumber] ?? rules.default[trackNumber])
      : rules.default[trackNumber]
  ) ?? [];

  if (!Array.isArray(sides) || sides.length === 0) return null;

  return {
    aplica: true,
    lados: sides,
    descripcion: formatDescription(sides),
    esRP: rpTrack,
  };
};

export const attachLifeLineRulesToVias = <T extends { nombre?: string | number | null }>(
  vias: T[]
): Array<T & { lineaDeVida: ViaLifeLineInfo | null }> =>
  vias.map((via) => ({
    ...via,
    lineaDeVida: resolveViaLifeLine(via.nombre),
  }));
