/**
 * Practice accuracy and a manual hand log, kept in this browser only
 * (`card-odds:stats:v1`). Nothing is uploaded.
 */
export const STATS_KEY = 'card-odds:stats:v1';

export type DrillKind = 'blackjack' | 'holdem' | 'hilo-running' | 'hilo-true';
export type GameKind = 'blackjack' | 'holdem';
export type HandResult = 'win' | 'loss' | 'push';

export interface DrillEvent {
  t: number;
  kind: DrillKind;
  correct: boolean;
}

export interface HandEntry {
  id: string;
  t: number;
  game: GameKind;
  result: HandResult;
  /** Signed units (positive = win). Push should be 0. */
  amount: number;
  note: string;
}

export interface Stats {
  drills: DrillEvent[];
  hands: HandEntry[];
}

const MAX_DRILLS = 500;
const MAX_HANDS = 200;

export function emptyStats(): Stats {
  return { drills: [], hands: [] };
}

export function sanitizeStats(raw: unknown): Stats {
  const s = emptyStats();
  if (!raw || typeof raw !== 'object') return s;
  const o = raw as Partial<Stats>;
  if (Array.isArray(o.drills)) {
    s.drills = o.drills.filter((d): d is DrillEvent =>
      !!d && typeof d.t === 'number' && typeof d.correct === 'boolean' &&
      (d.kind === 'blackjack' || d.kind === 'holdem' || d.kind === 'hilo-running' || d.kind === 'hilo-true'),
    ).slice(-MAX_DRILLS);
  }
  if (Array.isArray(o.hands)) {
    s.hands = o.hands.filter((h): h is HandEntry =>
      !!h && typeof h.id === 'string' && typeof h.t === 'number' &&
      (h.game === 'blackjack' || h.game === 'holdem') &&
      (h.result === 'win' || h.result === 'loss' || h.result === 'push') &&
      typeof h.amount === 'number' && typeof h.note === 'string',
    ).slice(-MAX_HANDS);
  }
  return s;
}

export function loadStats(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): Stats {
  try {
    const raw = storage?.getItem(STATS_KEY);
    return raw ? sanitizeStats(JSON.parse(raw)) : emptyStats();
  } catch {
    return emptyStats();
  }
}

export function saveStats(stats: Stats, storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage): void {
  storage?.setItem(STATS_KEY, JSON.stringify(stats));
}

export function recordDrill(kind: DrillKind, correct: boolean, stats: Stats, now = Date.now()): Stats {
  return { ...stats, drills: [...stats.drills, { t: now, kind, correct }].slice(-MAX_DRILLS) };
}

export function logHand(entry: Omit<HandEntry, 'id'>, stats: Stats): Stats {
  const id = `h-${entry.t}-${Math.random().toString(36).slice(2, 8)}`;
  return { ...stats, hands: [...stats.hands, { ...entry, id }].slice(-MAX_HANDS) };
}

export function deleteHand(id: string, stats: Stats): Stats {
  return { ...stats, hands: stats.hands.filter((h) => h.id !== id) };
}

export interface Accuracy {
  correct: number;
  total: number;
  /** 0..1, or 0 when there are no attempts. */
  pct: number;
}

export function accuracy(drills: readonly DrillEvent[], kind?: DrillKind): Accuracy {
  const list = kind ? drills.filter((d) => d.kind === kind) : drills;
  const correct = list.filter((d) => d.correct).length;
  const total = list.length;
  return { correct, total, pct: total === 0 ? 0 : correct / total };
}

export function netAmount(hands: readonly HandEntry[]): number {
  return hands.reduce((s, h) => s + h.amount, 0);
}

/** Group events into UTC days (YYYY-MM-DD) for simple charts. */
export function byDay<T extends { t: number }>(items: readonly T[]): { day: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const day = new Date(it.t).toISOString().slice(0, 10);
    const list = map.get(day) ?? [];
    list.push(it);
    map.set(day, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, items]) => ({ day, items }));
}

export function newId(): string {
  return `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
