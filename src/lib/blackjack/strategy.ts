/**
 * Total-dependent basic strategy, generated from rules.
 *
 * The 6/8-deck chart is the standard 4–8 deck basic strategy (Wizard of Odds charts) for S17 and
 * H17, with and without DAS and late surrender. The 1- and 2-deck variations started from the
 * published single/double-deck charts; where those disagreed with this app's own EV engine
 * (`ev.ts`, averaged over every two-card hand making each total), the engine won, so the chart
 * and the EVs shown in the calculator never contradict each other. strategy.test.ts checks
 * every cell of the 6-deck chart against a literal copy of the published chart, and checks the
 * chart against the engine for a sample of rule sets.
 *
 * Codes, as on printed charts:
 *   H  hit           S  stand          P  split
 *   Dh double, else hit                Ds double, else stand
 *   Rh surrender, else hit             Rs surrender, else stand    Rp surrender, else split
 */
import type { Rules } from './rules';

export type Code = 'H' | 'S' | 'P' | 'Dh' | 'Ds' | 'Rh' | 'Rs' | 'Rp';
type Group = 1 | 2 | 'multi';

function group(rules: Rules): Group {
  return rules.decks === 1 ? 1 : rules.decks === 2 ? 2 : 'multi';
}

const between = (up: number, lo: number, hi: number) => up >= lo && up <= hi;

/** Hard totals (no surrender). `up` is 2..11 (Ace = 11). */
export function hardCode(total: number, up: number, rules: Rules): Code {
  const g = group(rules);
  if (total <= 7) return 'H';
  if (total === 8) return g === 1 && between(up, 5, 6) ? 'Dh' : 'H';
  if (total === 9) return between(up, g === 'multi' ? 3 : 2, 6) ? 'Dh' : 'H';
  if (total === 10) return up <= 9 ? 'Dh' : 'H';
  if (total === 11) return up <= 10 || g === 1 || rules.hitSoft17 ? 'Dh' : 'H';
  if (total === 12) return between(up, 4, 6) ? 'S' : 'H';
  if (total <= 16) return up <= 6 ? 'S' : 'H';
  return 'S';
}

/** Soft totals 13..21 (A,2 .. A,10). Soft 12 only arises as A,A, which always splits. */
export function softCode(total: number, up: number, rules: Rules): Code {
  const g = group(rules);
  const h17 = rules.hitSoft17;
  switch (total) {
    case 13:
      return between(up, g === 1 ? 4 : 5, 6) ? 'Dh' : 'H';
    case 14:
      return between(up, g === 1 || (g === 2 && h17) ? 4 : 5, 6) ? 'Dh' : 'H';
    case 15:
    case 16:
      return between(up, 4, 6) ? 'Dh' : 'H';
    case 17:
      return between(up, g === 1 ? 2 : 3, 6) ? 'Dh' : 'H';
    case 18:
      if (between(up, h17 && g !== 1 ? 2 : 3, 6)) return 'Ds';
      if (up === 2 || up === 7 || up === 8) return 'S';
      if (up === 11) return g === 1 && !h17 ? 'S' : 'H';
      return 'H';
    case 19:
      return up === 6 && (g === 1 || h17) ? 'Ds' : 'S';
    default:
      return total < 13 ? 'H' : 'S';
  }
}

/**
 * Should this pair be split? `card` is the pair's value 2..11 (Ace = 11; any ten-value = 10).
 * Returns false when the pair should be played as its total instead.
 */
export function splitPair(card: number, up: number, rules: Rules): boolean {
  const g = group(rules);
  const das = rules.das;
  switch (card) {
    case 11:
    case 8:
      return true;
    case 10:
    case 5:
      return false;
    case 2:
      return between(up, das ? 2 : g === 1 ? 3 : 4, 7);
    case 3:
      return between(up, das ? 2 : 4, g === 1 && das ? 8 : 7);
    case 4:
      if (!das) return false;
      return between(up, g === 1 ? 4 : 5, 6);
    case 6:
      if (g === 'multi') return between(up, das ? 2 : 3, 6);
      return between(up, 2, das ? 7 : 6);
    case 7:
      return between(up, 2, g !== 'multi' && das ? 8 : 7);
    case 9:
      return between(up, 2, 9) && up !== 7;
    default:
      return false;
  }
}

/** Late-surrender spots (hard totals and 8,8). */
export function surrenderCode(kind: 'hard' | 'pair', total: number, up: number, rules: Rules): Code | null {
  if (!rules.surrender) return null;
  const g = group(rules);
  const h17 = rules.hitSoft17;
  if (kind === 'pair') {
    if (total === 16 && up === 11 && h17 && (g === 'multi' || (g === 2 && !rules.das))) return 'Rp';
    if (total === 14 && up === 10 && g === 1) return 'Rs';
    if (total === 14 && up === 11 && g === 1 && h17) return 'Rh';
    return null;
  }
  if (total === 17 && up === 11 && h17) return 'Rs';
  if (total === 16) {
    if (up === 10 || up === 11) return 'Rh';
    if (up === 9 && g === 'multi') return 'Rh';
  }
  if (total === 15) {
    if (up === 10 && g !== 1) return 'Rh';
    if (up === 11 && h17) return 'Rh';
  }
  return null;
}

export interface ChartHand {
  /** Best total of the hand. */
  total: number;
  soft: boolean;
  /** Pair card value 2..11 when the hand is a splittable pair; otherwise null. */
  pair: number | null;
}

/** The chart code for a hand, before checking which actions are legal right now. */
export function chartCode(hand: ChartHand, up: number, rules: Rules): Code {
  if (hand.pair !== null) {
    const sur = surrenderCode('pair', hand.pair * 2, up, rules);
    if (sur) return sur;
    if (splitPair(hand.pair, up, rules)) return 'P';
    if (hand.pair === 11) return 'P';
  }
  if (hand.soft) return softCode(hand.total, up, rules);
  // Single deck: with two 7s gone, 7,7 vs 10 stands rather than hitting hard 14.
  if (hand.pair === 7 && up === 10 && group(rules) === 1) return 'S';
  return surrenderCode('hard', hand.total, up, rules) ?? hardCode(hand.total, up, rules);
}

/** Whether the rules allow doubling this two-card total. */
export function doubleAllowed(total: number, soft: boolean, rules: Rules): boolean {
  if (rules.doubleOn === 'any') return true;
  if (soft) return false;
  return rules.doubleOn === '9-11' ? between(total, 9, 11) : between(total, 10, 11);
}
