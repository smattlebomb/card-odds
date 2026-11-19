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
      const lo = plus ? idx(t[0]) : idx(t[0]);
      const start = plus ? lo : idx(t[0]);
      for (let i = start; i <= 12; i++) out.add(RANK_ORDER[i] + RANK_ORDER[i]);
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
