/**
 * Hi-Lo count: 2–6 = +1, 7–9 = 0, 10 / face / Ace = −1.
 *
 * True count convention used here: TC = running count ÷ remaining decks,
 * then **truncated toward zero** (3.9 → 3, −3.9 → −3). Remaining decks are
 * remainingCards / 52 at full precision (not rounded to a half-deck).
 */
import { RANKS, type Rank } from '../cards';

export const HILO_VALUE: Record<Rank, number> = {
  A: -1, K: -1, Q: -1, J: -1, T: -1,
  '9': 0, '8': 0, '7': 0,
  '6': 1, '5': 1, '4': 1, '3': 1, '2': 1,
};

export function hiloValue(rank: Rank): number {
  return HILO_VALUE[rank];
}

export function runningCount(ranks: readonly Rank[]): number {
  return ranks.reduce((s, r) => s + HILO_VALUE[r], 0);
}

/** Remaining decks at full precision. */
export function remainingDecks(remainingCards: number): number {
  return remainingCards / 52;
}

/**
 * True count truncated toward zero. If no cards remain, returns the running count.
 */
export function trueCount(rc: number, remainingCards: number): number {
  if (remainingCards <= 0) return rc;
  const tc = rc / remainingDecks(remainingCards);
  return tc < 0 ? Math.ceil(tc) : Math.floor(tc);
}

/** A shuffled shoe of `decks` ranks (suits ignored for counting). */
export function shuffledShoe(decks: 1 | 2 | 6 | 8, rand: () => number = Math.random): Rank[] {
  const shoe: Rank[] = [];
  for (let d = 0; d < decks; d++) {
    for (let i = 0; i < 4; i++) shoe.push(...RANKS);
  }
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = shoe[i]!;
    shoe[i] = shoe[j]!;
    shoe[j] = tmp;
  }
  return shoe;
}

export function parseCountInput(text: string): number | null {
  const t = text.trim();
  if (t === '' || t === '+' || t === '-') return null;
  if (!/^[+-]?\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isInteger(n) ? n : null;
}
