/** Random basic-strategy spots, graded against the current rule chart (no count). */
import { RANKS, type Rank } from '../cards';
import { advise, type Advice } from './advise';
import type { Action } from './ev';
import type { Rules } from './rules';

export interface BlackjackSpot {
  up: Rank;
  player: Rank[];
  advice: Advice;
}

export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRank(rand: () => number): Rank {
  return RANKS[Math.floor(rand() * RANKS.length)]!;
}

/** Deal a two-card spot that actually needs a decision (not a natural or a bust). */
export function dealBlackjackSpot(rules: Rules, rand: () => number = Math.random, maxTries = 80): BlackjackSpot {
  for (let i = 0; i < maxTries; i++) {
    const up = pickRank(rand);
    const player: Rank[] = [pickRank(rand), pickRank(rand)];
    const advice = advise(up, player, rules, null);
    if (advice.status === 'play' && advice.basicAction) return { up, player, advice };
  }
  // Deterministic fallback that always needs a play: 16 vs 10.
  const up: Rank = 'T';
  const player: Rank[] = ['T', '6'];
  return { up, player, advice: advise(up, player, rules, null) };
}

export function gradeBlackjack(spot: BlackjackSpot, action: Action): { correct: boolean; expected: Action; reason: string } {
  const expected = spot.advice.basicAction ?? 'hit';
  return {
    correct: action === expected,
    expected,
    reason: spot.advice.reason,
  };
}
