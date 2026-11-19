/**
 * Hi-Lo count deviations: the Illustrious 18 and the Fab 4 surrenders.
 *
 * Source: Don Schlesinger, "Blackjack Attack" (3rd ed.) — the Illustrious 18 and Fab 4 indexes
 * for multi-deck shoes, dealer stands on soft 17, with late surrender for the Fab 4. Indexes are
 * Hi-Lo true counts.
 *
 * Conventions used here:
 * - "Deviate at TC >= index" for plays that kick in as the count rises (e.g. 16 vs 10: stand at
 *   0 or higher), and "deviate at TC < index" for plays that kick in as it falls (e.g. 12 vs 4:
 *   hit below 0). The true count is used exactly as entered; most players floor it first.
 * - A deviation only applies when the current basic play (for the current rules and hand) is
 *   the play the index was written against. So under rules where basic strategy already makes
 *   the deviation's play (e.g. 11 vs A doubles under H17; 9 vs 2 doubles in 1–2 decks), the
 *   index is skipped instead of being applied backwards. These are 6/8-deck indexes; with 1–2
 *   decks they're applied as an approximation.
 * - Hand totals are hard totals; pair hands that basic strategy splits are left alone
 *   (except 10,10, whose split indexes are part of the Illustrious 18).
 */
import type { Action } from './ev';

export interface Deviation {
  set: 'Illustrious 18' | 'Fab 4';
  /** Hard total, or 20 for the 10,10 split plays. */
  total: number;
  /** Dealer upcard 2..11 (Ace = 11). */
  up: number;
  /** Only for the pair of tens. */
  tens?: boolean;
  /** The basic-strategy play this index was written against. */
  basic: Action;
  /** The count play. */
  play: Action;
  index: number;
  /** 'up': play when TC >= index. 'down': play when TC < index. */
  when: 'up' | 'down';
}

const d = (
  set: Deviation['set'],
  total: number,
  up: number,
  basic: Action,
  play: Action,
  index: number,
  when: Deviation['when'] = 'up',
  tens = false,
): Deviation => ({ set, total, up, basic, play, index, when, tens });

export const INSURANCE_INDEX = 3;

/** Illustrious 18 without insurance (handled separately) — 17 plays. */
export const ILLUSTRIOUS_18: Deviation[] = [
  d('Illustrious 18', 16, 10, 'hit', 'stand', 0),
  d('Illustrious 18', 15, 10, 'hit', 'stand', 4),
  d('Illustrious 18', 20, 5, 'stand', 'split', 5, 'up', true),
  d('Illustrious 18', 20, 6, 'stand', 'split', 4, 'up', true),
  d('Illustrious 18', 10, 10, 'hit', 'double', 4),
  d('Illustrious 18', 12, 3, 'hit', 'stand', 2),
  d('Illustrious 18', 12, 2, 'hit', 'stand', 3),
  d('Illustrious 18', 11, 11, 'hit', 'double', 1),
  d('Illustrious 18', 9, 2, 'hit', 'double', 1),
  d('Illustrious 18', 10, 11, 'hit', 'double', 4),
  d('Illustrious 18', 9, 7, 'hit', 'double', 3),
  d('Illustrious 18', 16, 9, 'hit', 'stand', 5),
  d('Illustrious 18', 13, 2, 'stand', 'hit', -1, 'down'),
  d('Illustrious 18', 12, 4, 'stand', 'hit', 0, 'down'),
  d('Illustrious 18', 12, 5, 'stand', 'hit', -2, 'down'),
  d('Illustrious 18', 12, 6, 'stand', 'hit', -1, 'down'),
  d('Illustrious 18', 13, 3, 'stand', 'hit', -2, 'down'),
];

/** Fab 4 late-surrender plays (only when surrender is allowed). */
export const FAB_4: Deviation[] = [
  d('Fab 4', 14, 10, 'hit', 'surrender', 3),
  d('Fab 4', 15, 10, 'surrender', 'hit', 0, 'down'),
  d('Fab 4', 15, 9, 'hit', 'surrender', 2),
  d('Fab 4', 15, 11, 'hit', 'surrender', 1),
];

export interface DeviationSpot {
  total: number;
  soft: boolean;
  /** Pair card value 2..11, or null. */
  pair: number | null;
  up: number;
  /** The basic-strategy play for this spot under the current rules. */
  basic: Action;
  legal: readonly Action[];
}

export function triggered(dev: Deviation, tc: number): boolean {
  return dev.when === 'up' ? tc >= dev.index : tc < dev.index;
}

/** The index play that changes this spot at this true count, if any. Fab 4 is checked first. */
export function findDeviation(spot: DeviationSpot, tc: number): Deviation | null {
  if (spot.soft) return null;
  for (const dev of [...FAB_4, ...ILLUSTRIOUS_18]) {
    if (dev.up !== spot.up || dev.total !== spot.total) continue;
    if (dev.tens ? spot.pair !== 10 : spot.basic === 'split') continue;
    if (dev.basic !== spot.basic || !spot.legal.includes(dev.play)) continue;
    if (triggered(dev, tc)) return dev;
  }
  return null;
}

/** "TC ≥ +3", "TC < 0". */
export function indexLabel(dev: Pick<Deviation, 'index' | 'when'>): string {
  const n = dev.index > 0 ? `+${dev.index}` : `${dev.index}`;
  return `TC ${dev.when === 'up' ? '≥' : '<'} ${n}`;
}
