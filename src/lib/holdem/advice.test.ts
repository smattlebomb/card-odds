import { describe, expect, it } from 'vitest';
import { holdemAdvice, potOddsRatio, requiredEquity } from './advice';

describe('requiredEquity / pot odds', () => {
  it('pot 100 before a 50 bet needs 25% equity to call (50 into 200)', () => {
    expect(requiredEquity(100, 50)).toBeCloseTo(0.25, 10);
    expect(potOddsRatio(100, 50)).toBe('3 : 1');
  });

  it('is 0 when there is nothing to call', () => {
    expect(requiredEquity(100, 0)).toBe(0);
    expect(potOddsRatio(100, 0)).toBe('—');
  });
});

describe('holdemAdvice', () => {
  it('recommends a call when equity is clearly above pot odds', () => {
    const a = holdemAdvice({ equity: 0.4, opponents: 1, pot: 100, toCall: 50 });
    expect(a.required).toBeCloseTo(0.25);
    expect(a.action).toBe('call');
    expect(a.reason).toMatch(/Call/i);
    expect(a.reason).toMatch(/40%/);
  });

  it('recommends a fold when equity is clearly below pot odds', () => {
    const a = holdemAdvice({ equity: 0.1, opponents: 1, pot: 100, toCall: 50 });
    expect(a.action).toBe('fold');
    expect(a.reason).toMatch(/Fold/i);
  });

  it('recommends a raise when well ahead of both pot odds and a fair share', () => {
    const a = holdemAdvice({ equity: 0.85, opponents: 1, pot: 100, toCall: 50 });
    expect(a.action).toBe('raise');
    expect(a.reason).toMatch(/Raise/i);
  });

  it('recommends a bet for value with no bet to call and a big equity lead, otherwise check', () => {
    expect(holdemAdvice({ equity: 0.8, opponents: 1, pot: 100, toCall: 0 }).action).toBe('bet');
    expect(holdemAdvice({ equity: 0.4, opponents: 1, pot: 100, toCall: 0 }).action).toBe('check');
    expect(holdemAdvice({ equity: 0.2, opponents: 1, pot: 100, toCall: 0 }).action).toBe('check');
  });

  it('mentions implied odds when folding a big draw', () => {
    const a = holdemAdvice({ equity: 0.1, opponents: 1, pot: 100, toCall: 50, outs: 12 });
    expect(a.action).toBe('fold');
    expect(a.notes.join(' ')).toMatch(/Implied odds/i);
  });
});
