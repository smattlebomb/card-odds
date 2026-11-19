/**
 * Tight-ish 6-max cash opening (RFI) guide, for a preflop reference chart.
 *
 * This is a coaching shorthand, not a solver output and not a frequency mix. The big blind
 * does not open in this chart (it already posted); use it for UTG / MP / CO / BTN / SB.
 *
 * Notation: "AKs" suited, "AKo" offsuit, "AA" a pair. The higher rank is always first.
 */
import type { Card, Rank } from '../cards';
import { RANK_ORDER } from './cards';

export const POSITIONS = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_NAME: Record<Position, string> = {
  UTG: 'Under the gun',
  MP: 'Middle position',
  CO: 'Cutoff',
  BTN: 'Button',
  SB: 'Small blind',
  BB: 'Big blind',
};

/** Expand "77+" / "ATs+" / "KQo" style tokens into a set of hand keys. */
function expand(tokens: string[]): Set<string> {
  const out = new Set<string>();
  const idx = (r: string) => RANK_ORDER.indexOf(r);
  for (const raw of tokens) {
    const plus = raw.endsWith('+');
    const t = plus ? raw.slice(0, -1) : raw;
    if (t.length === 2 && t[0] === t[1]) {
      // "77+" = 77 through AA; plain "77" is just 77.
      const start = idx(t[0]);
      const end = plus ? 12 : start;
      for (let i = start; i <= end; i++) out.add(RANK_ORDER[i] + RANK_ORDER[i]);
      continue;
    }
    const suited = t.endsWith('s');
    const off = t.endsWith('o');
    const a = t[0];
    const b = t[1];
    if (plus) {
      for (let i = idx(b); i < idx(a); i++) {
        out.add(a + RANK_ORDER[i] + (suited ? 's' : off ? 'o' : ''));
      }
    } else {
      out.add(a + b + (suited ? 's' : off ? 'o' : ''));
    }
  }
  return out;
}

/**
 * Opening ranges by seat. Inclusive "+" tokens follow the usual poker-chart reading
 * (ATs+ = AT, AJ, AQ, AK suited; 77+ = 77 through AA).
 */
export const OPENING_RANGES: Record<Position, Set<string>> = {
  UTG: expand(['77+', 'ATs+', 'AJo+', 'KQs', 'KQo', 'QJs']),
  MP: expand(['66+', 'ATs+', 'ATo+', 'KJs+', 'KQo', 'QJs', 'JTs']),
  CO: expand(['22+', 'A7s+', 'ATo+', 'K9s+', 'KJo+', 'QTs+', 'QJo', 'JTs', 'T9s', '98s']),
  BTN: expand([
    '22+', 'A2s+', 'A8o+', 'K5s+', 'KTo+', 'Q8s+', 'QTo+', 'J8s+', 'JTo',
    'T8s+', 'T9o', '97s+', '87s', '76s', '65s',
  ]),
  SB: expand([
    '22+', 'A2s+', 'A7o+', 'K7s+', 'KTo+', 'Q8s+', 'QTo+', 'J8s+', 'JTo',
    'T8s+', 'T9o', '97s+', '87s', '76s', '65s',
  ]),
  BB: new Set(), // already in the pot; this chart is for opening, not a defend range
};

/** "AKs", "AKo", or "AA" for two hole cards. */
export function handKey(a: Card, b: Card): string {
  const ia = RANK_ORDER.indexOf(a.rank);
  const ib = RANK_ORDER.indexOf(b.rank);
  const [hi, lo] = ia >= ib ? [a, b] : [b, a];
  if (hi.rank === lo.rank) return hi.rank + lo.rank;
  return hi.rank + lo.rank + (hi.suit === lo.suit ? 's' : 'o');
}

export function inOpeningRange(a: Card, b: Card, position: Position): boolean {
  return OPENING_RANGES[position].has(handKey(a, b));
}

/** Every combo key in a 13×13 grid, row = high rank (A..2), column = second rank (A..2). */
export function gridKey(row: Rank, col: Rank): string {
  if (row === col) return row + col;
  const ir = RANK_ORDER.indexOf(row);
  const ic = RANK_ORDER.indexOf(col);
  // Upper triangle (row rank visually left / "higher" in A..2 display) is suited when
  // the first displayed rank is the higher one. We display ranks A→2, so column > row
  // in display order means the column is a lower rank: that's the suited side if we
  // put suited in the upper-right. Standard grid: rows A..2, cols A..2, suited above
  // the diagonal (column rank lower than row rank), offsuit below.
  const hi = ir > ic ? row : col;
  const lo = ir > ic ? col : row;
  const suited = ir > ic; // row is the higher rank → upper triangle if ranks decrease down/right? 
  // Ranks displayed A,K,Q,... left to right and top to bottom.
  // Cell (row A, col K) is above-diagonal if we consider A at 0 visually.
  // Visual row index 0 = A, visual col 1 = K: this is suited AKs (upper triangle).
  // RANK_ORDER index: A=12, K=11. row A (12) > col K (11) → suited. Yes, ir > ic means suited.
  return hi + lo + (suited ? 's' : 'o');
}

export const GRID_RANKS = [...RANK_ORDER].reverse() as Rank[]; // A..2

// ---------------------------------------------------------------------------
// Opponent ranges
// ---------------------------------------------------------------------------

/** All 169 starting-hand keys in grid order (rows A..2, columns A..2). */
export const ALL_HANDS: readonly string[] = GRID_RANKS.flatMap((row) => GRID_RANKS.map((col) => gridKey(row, col)));

export const TOTAL_COMBOS = 1326;

/** Parse range tokens like "QQ+, AKs, A5s, KQo" (comma/space separated) into hand keys. */
export function parseRange(text: string | readonly string[]): Set<string> {
  const tokens = typeof text === 'string' ? text.split(/[\s,]+/).filter(Boolean) : [...text];
  for (const t of tokens) {
    if (!/^([2-9TJQKA])([2-9TJQKA])([so])?\+?$/.test(t)) throw new Error(`Bad range token: ${t}`);
  }
  return expand(tokens);
}

/** Number of card combinations for a hand key: pair 6, suited 4, offsuit 12. */
export function comboCount(key: string): number {
  return key.length === 2 ? 6 : key[2] === 's' ? 4 : 12;
}

export function rangeComboCount(keys: Iterable<string>): number {
  let n = 0;
  for (const k of keys) n += comboCount(k);
  return n;
}

/** Fraction (0..1) of all 1326 starting hands. */
export function rangeFraction(keys: Iterable<string>): number {
  return rangeComboCount(keys) / TOTAL_COMBOS;
}

/** Every specific two-card combo (engine ints, see ./cards) for a hand key. */
export function combosFor(key: string): [number, number][] {
  const a = RANK_ORDER.indexOf(key[0]);
  const b = RANK_ORDER.indexOf(key[1]);
  if (a < 0 || b < 0) throw new Error(`Bad hand key: ${key}`);
  const out: [number, number][] = [];
  for (let s1 = 0; s1 < 4; s1++) {
    for (let s2 = 0; s2 < 4; s2++) {
      if (a === b) {
        if (s2 > s1) out.push([a * 4 + s1, b * 4 + s2]);
      } else if (key[2] === 's' ? s1 === s2 : s1 !== s2) {
        out.push([a * 4 + s1, b * 4 + s2]);
      }
    }
  }
  return out;
}

/**
 * The combos of a range that are still possible given dead cards (your hole cards, the
 * board, any known hands). This is card removal: e.g. holding the A♠ leaves 3 AA combos.
 */
export function liveCombos(keys: Iterable<string>, dead: readonly number[]): [number, number][] {
  const d = new Set(dead);
  const out: [number, number][] = [];
  for (const k of keys) for (const c of combosFor(k)) if (!d.has(c[0]) && !d.has(c[1])) out.push(c);
  return out;
}

/**
 * Bill Chen's widely published starting-hand formula ("Chen formula"): high card
 * A=10 K=8 Q=7 J=6, else rank/2; pairs double it (minimum 5); +2 suited;
 * gap penalty 0/−1/−2/−4/−5; +1 for 0–1 gap below a Queen; round half points up.
 * Used only to order hands for the "top X%" presets.
 */
export function chenScore(key: string): number {
  const card = (r: string) => (r === 'A' ? 10 : r === 'K' ? 8 : r === 'Q' ? 7 : r === 'J' ? 6 : (RANK_ORDER.indexOf(r) + 2) / 2);
  const hi = key[0];
  const lo = key[1];
  if (hi === lo) return Math.ceil(Math.max(5, card(hi) * 2));
  let s = card(hi);
  if (key[2] === 's') s += 2;
  const gap = RANK_ORDER.indexOf(hi) - RANK_ORDER.indexOf(lo) - 1;
  s += gap === 0 ? 0 : gap === 1 ? -1 : gap === 2 ? -2 : gap === 3 ? -4 : -5;
  if (gap <= 1 && RANK_ORDER.indexOf(hi) < RANK_ORDER.indexOf('Q')) s += 1;
  return Math.ceil(s);
}

/** All 169 hands, strongest first by Chen score (ties: pairs, then suited, then higher cards). */
export const HAND_RANKING: readonly string[] = [...ALL_HANDS].sort((x, y) => {
  const d = chenScore(y) - chenScore(x);
  if (d) return d;
  const kind = (k: string) => (k.length === 2 ? 0 : k[2] === 's' ? 1 : 2);
  if (kind(x) !== kind(y)) return kind(x) - kind(y);
  const hi = RANK_ORDER.indexOf(y[0]) - RANK_ORDER.indexOf(x[0]);
  if (hi) return hi;
  return RANK_ORDER.indexOf(y[1]) - RANK_ORDER.indexOf(x[1]);
});

/** The top `percent` (0..100) of starting hands by combos, in HAND_RANKING order. */
export function topPercent(percent: number): Set<string> {
  const target = (Math.min(100, Math.max(0, percent)) / 100) * TOTAL_COMBOS;
  const out = new Set<string>();
  let n = 0;
  for (const k of HAND_RANKING) {
    if (n >= target - 1e-9) break;
    out.add(k);
    n += comboCount(k);
  }
  return out;
}

export type RangeStyle = 'tight' | 'loose';

/**
 * Opponent range presets. "Tight" opens are the RFI chart above; "loose" opens and the big
 * blind defends are typical wider 6-max cash ranges. Coaching shorthand, not solver output.
 */
const LOOSE_OPENS: Record<Exclude<Position, 'BB'>, string> = {
  UTG: '55+, A9s+, A5s, KTs+, QTs+, JTs, T9s, ATo+, KJo+, KQo',
  MP: '44+, A7s+, A5s, A4s, A3s, K9s+, Q9s+, J9s+, T9s, 98s, ATo+, KJo+, QJo',
  CO: '22+, A2s+, K8s+, Q9s+, J9s+, T8s+, 97s+, 87s, 76s, A8o+, KTo+, QTo+, JTo',
  BTN: '22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 96s+, 85s+, 75s+, 64s+, 54s, A2o+, K8o+, Q9o+, J9o+, T9o, 98o',
  SB: '22+, A2s+, K5s+, Q7s+, J8s+, T8s+, 97s+, 86s+, 75s+, 65s, 54s, A5o+, K9o+, QTo+, JTo, T9o',
};

const BB_DEFEND: Record<RangeStyle, string> = {
  tight: '22+, A2s+, K8s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, 65s, A9o+, KTo+, QTo+, JTo',
  loose: '22+, A2s+, K2s+, Q5s+, J6s+, T6s+, 96s+, 85s+, 74s+, 64s+, 53s+, 43s, A2o+, K7o+, Q8o+, J8o+, T8o+, 98o, 87o',
};

/** Range an opponent plays from a seat: their open (UTG–SB) or, for the big blind, a defend. */
export function positionRange(position: Position, style: RangeStyle): Set<string> {
  if (position === 'BB') return parseRange(BB_DEFEND[style]);
  return style === 'tight' ? new Set(OPENING_RANGES[position]) : parseRange(LOOSE_OPENS[position]);
}

export function positionRangeName(position: Position, style: RangeStyle): string {
  return `${position} ${position === 'BB' ? 'defend' : 'open'} (${style})`;
}

/** 3-bet presets: a value-only range and a wider one with some suited-Ace bluffs. */
export const THREE_BET_RANGES = {
  value: { name: '3-bet (value)', text: 'QQ+, AKs, AKo' },
  wide: { name: '3-bet (wide)', text: 'TT+, AJs+, KQs, AQo+, A5s, A4s' },
} as const;

/** Short summary for a range: "12.4% · 164 combos". */
export function describeRange(keys: Iterable<string>): string {
  const combos = rangeComboCount(keys);
  return `${((combos / TOTAL_COMBOS) * 100).toFixed(1)}% · ${combos} combos`;
}
