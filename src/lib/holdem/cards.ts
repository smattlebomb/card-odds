/**
 * Hold'em engine card encoding: an int 0..51 = rankIndex * 4 + suitIndex,
 * rankIndex 0..12 = 2..A, suitIndex 0..3 = s, h, d, c.
 */
import type { Card, Rank, Suit } from '../cards';

export const RANK_ORDER = '23456789TJQKA';
export const SUIT_ORDER = 'shdc';

export function toInt(card: Card): number {
  return RANK_ORDER.indexOf(card.rank) * 4 + SUIT_ORDER.indexOf(card.suit);
}

export function fromInt(c: number): Card {
  return { rank: RANK_ORDER[c >> 2] as Rank, suit: SUIT_ORDER[c & 3] as Suit };
}

/** Parse "AhKd" / "Ah Kd 7c" into engine ints (for tests and fixtures). */
export function parseCards(text: string): number[] {
  const t = text.replace(/\s+/g, '');
  if (t.length % 2) throw new Error(`Bad cards: ${text}`);
  const out: number[] = [];
  for (let i = 0; i < t.length; i += 2) {
    const r = RANK_ORDER.indexOf(t[i].toUpperCase());
    const s = SUIT_ORDER.indexOf(t[i + 1].toLowerCase());
    if (r < 0 || s < 0) throw new Error(`Bad card: ${t.slice(i, i + 2)}`);
    out.push(r * 4 + s);
  }
  if (new Set(out).size !== out.length) throw new Error(`Duplicate card in ${text}`);
  return out;
}

export function intToString(c: number): string {
  return RANK_ORDER[c >> 2] + SUIT_ORDER[c & 3];
}

/** All 52 cards minus `used`. */
export function remainingDeck(used: readonly number[]): number[] {
  const u = new Set(used);
  const out: number[] = [];
  for (let c = 0; c < 52; c++) if (!u.has(c)) out.push(c);
  return out;
}
