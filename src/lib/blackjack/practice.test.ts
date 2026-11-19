import { describe, expect, it } from 'vitest';
import { advise } from './advise';
import { DEFAULT_RULES } from './rules';
import { dealBlackjackSpot, gradeBlackjack, mulberry } from './practice';

describe('blackjack practice', () => {
  it('deals a playable two-card spot against default rules', () => {
    const spot = dealBlackjackSpot(DEFAULT_RULES, mulberry(1));
    expect(spot.player).toHaveLength(2);
    expect(spot.advice.status).toBe('play');
    expect(spot.advice.basicAction).toBeTruthy();
    expect(spot.advice.legal).toContain(spot.advice.basicAction!);
  });

  it('grades a known 16 vs 10 as a hit, and a stand as wrong', () => {
    const spot = { up: 'T' as const, player: ['T' as const, '6' as const], advice: advise('T', ['T', '6'], DEFAULT_RULES, null) };
    expect(gradeBlackjack(spot, 'hit').correct).toBe(true);
    expect(gradeBlackjack(spot, 'stand').correct).toBe(false);
    expect(gradeBlackjack(spot, 'stand').expected).toBe('hit');
  });
});
