import { describe, expect, it } from 'vitest';
import { rng } from './equity';
import { dealHoldemSpot, gradeHoldem } from './practice';
import { holdemAdvice } from './advice';

describe('holdem practice', () => {
  it('deals a turn heads-up spot with a clear fold or call', () => {
    const spot = dealHoldemSpot(rng(7));
    expect(spot.hole).toHaveLength(2);
    expect(spot.board).toHaveLength(4);
    expect(spot.equity).toBeGreaterThan(0);
    expect(spot.equity).toBeLessThan(1);
    expect(['fold', 'call', 'raise']).toContain(spot.advice.action);
  }, 20_000);

  it('grades fold when equity is well below pot odds, call when well above', () => {
    const base = dealHoldemSpot(rng(1));
    const foldSpot = {
      ...base,
      equity: 0.1,
      pot: 100,
      toCall: 50,
      advice: holdemAdvice({ equity: 0.1, opponents: 1, pot: 100, toCall: 50 }),
    };
    expect(gradeHoldem(foldSpot, 'fold').correct).toBe(true);
    expect(gradeHoldem(foldSpot, 'call').correct).toBe(false);
    const callSpot = {
      ...base,
      equity: 0.55,
      pot: 100,
      toCall: 50,
      advice: holdemAdvice({ equity: 0.55, opponents: 1, pot: 100, toCall: 50 }),
    };
    expect(gradeHoldem(callSpot, 'call').correct).toBe(true);
    expect(gradeHoldem(callSpot, 'fold').correct).toBe(false);
  });
});
