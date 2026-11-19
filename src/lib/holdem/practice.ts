/** Random fold/call spots graded against equity vs pot odds. */
import type { Card } from '../cards';
import { holdemAdvice, CLOSE_MARGIN, type HoldemAdvice } from './advice';
import { remainingDeck, fromInt, toInt } from './cards';
import { computeEquity } from './equity';

export interface HoldemSpot {
  hole: Card[];
  board: Card[];
  opponents: number;
  pot: number;
  toCall: number;
  equity: number;
  advice: HoldemAdvice;
}

export type FoldOrCall = 'fold' | 'call';

function take(deck: number[], n: number, rand: () => number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const j = Math.floor(rand() * deck.length);
    out.push(deck.splice(j, 1)[0]!);
  }
  return out;
}

const POTS = [60, 80, 100, 120, 150, 200];
const BETS = [20, 25, 40, 50, 75, 100];

/**
 * Deal a turn (4-board) heads-up spot whose equity is clearly above or below pot odds,
 * so the drill has a definite fold or call answer.
 */
export function dealHoldemSpot(rand: () => number = Math.random, maxTries = 25): HoldemSpot {
  for (let i = 0; i < maxTries; i++) {
    const deck = remainingDeck([]);
    const hole = take(deck, 2, rand).map(fromInt);
    const board = take(deck, 4, rand).map(fromInt);
    const pot = POTS[Math.floor(rand() * POTS.length)]!;
    const toCall = BETS[Math.floor(rand() * BETS.length)]!;
    const eq = computeEquity({
      hole: hole.map(toInt),
      board: board.map(toInt),
      opponents: 1,
      trials: 8_000,
    });
    const advice = holdemAdvice({ equity: eq.equity, opponents: 1, pot, toCall });
    if (Math.abs(eq.equity - advice.required) < CLOSE_MARGIN + 0.02) continue;
    if (advice.action === 'fold' || advice.action === 'call' || advice.action === 'raise') {
      return { hole, board, opponents: 1, pot, toCall, equity: eq.equity, advice };
    }
  }
  // Fallback: a made set on a dry turn, short price — a clear call/raise.
  const hole = [fromInt(0), fromInt(1)]; // 2s 2h
  const board = [fromInt(2), fromInt(16), fromInt(20), fromInt(32)]; // 2d, 6s, 7s, Ts — trips, not a scary board
  const pot = 100;
  const toCall = 25;
  const eq = computeEquity({ hole: hole.map(toInt), board: board.map(toInt), opponents: 1 });
  return { hole, board, opponents: 1, pot, toCall, equity: eq.equity, advice: holdemAdvice({ equity: eq.equity, opponents: 1, pot, toCall }) };
}

export function expectedCall(spot: HoldemSpot): FoldOrCall {
  return spot.advice.action === 'fold' ? 'fold' : 'call';
}

export function gradeHoldem(spot: HoldemSpot, action: FoldOrCall): { correct: boolean; expected: FoldOrCall; reason: string } {
  const expected = expectedCall(spot);
  return { correct: action === expected, expected, reason: spot.advice.reason };
}
