import { describe, expect, it } from 'vitest';
import { actionEVs, bestAction, dealerOutcomes, shoeWithout, standEV, type EvInput } from './ev';

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const base: Omit<EvInput, 'player' | 'up'> = {
  decks: 6, hitSoft17: false, das: true, canDouble: true, canSplit: false, canSurrender: false,
};

describe('dealer outcomes', () => {
  it('probabilities sum to 1 for every upcard and both soft-17 rules', () => {
    for (const h17 of [false, true]) {
      for (let up = 1; up <= 10; up++) {
        expect(sum(dealerOutcomes(up, shoeWithout(6, [up]), h17))).toBeCloseTo(1, 10);
      }
    }
  });

  it('bust rates match published near-infinite-deck S17 figures', () => {
    const bust = (up: number) => dealerOutcomes(up, shoeWithout(1000, [up]), false)[5];
    expect(bust(2)).toBeCloseTo(0.3536, 2);
    expect(bust(6)).toBeCloseTo(0.4232, 2);
    // Given no dealer blackjack (peek): ten-up ≈ 23%, Ace-up ≈ 17%.
    expect(bust(10)).toBeCloseTo(0.2304, 2);
    expect(bust(1)).toBeCloseTo(0.1696, 2);
    expect(bust(6)).toBeGreaterThan(bust(2));
    expect(bust(2)).toBeGreaterThan(bust(10));
  });

  it('peek: with a ten up the dealer never has 21 from an Ace hole card', () => {
    // P(21) for ten-up comes only from three-plus card hands, so it's small.
    expect(dealerOutcomes(10, shoeWithout(6, [10]), false)[4]).toBeLessThan(0.05);
  });

  it('H17 makes the dealer finish on 17 less often with an Ace up', () => {
    const s17 = dealerOutcomes(1, shoeWithout(6, [1]), false);
    const h17 = dealerOutcomes(1, shoeWithout(6, [1]), true);
    expect(h17[0]).toBeLessThan(s17[0]);
  });
});

describe('player EVs', () => {
  it('standing on 20 vs 6 is strongly positive; 16 vs 10 is about -54%', () => {
    expect(actionEVs({ ...base, player: [10, 10], up: 6 }).stand).toBeGreaterThan(0.6);
    const e = actionEVs({ ...base, player: [10, 6], up: 10 });
    expect(e.stand).toBeCloseTo(-0.54, 1);
    expect(e.hit).toBeGreaterThan(e.stand!);
  });

  it('11 vs 6 is a clear double', () => {
    const e = actionEVs({ ...base, player: [5, 6], up: 6 });
    expect(bestAction(e)).toBe('double');
    expect(e.double!).toBeGreaterThan(0.6);
  });

  it('standEV handles busts and pushes', () => {
    const d = [0.2, 0.2, 0.2, 0.2, 0.2, 0];
    expect(standEV(22, d)).toBe(-1);
    expect(standEV(16, d)).toBeCloseTo(-1);
    expect(standEV(19, d)).toBeCloseTo(0.4 - 0.4);
    expect(standEV(21, d)).toBeCloseTo(0.8);
  });

  it('the speed cap stays within 0.1% of a fully exact recursion', () => {
    for (const [player, up] of [[[2, 3], 2], [[1, 2], 2], [[5, 6], 1], [[4, 4], 6]] as [number[], number][]) {
      const opts = { ...base, player, up, decks: 2, canSplit: player[0] === player[1] };
      const fast = actionEVs(opts);
      const exact = actionEVs({ ...opts, exactDepth: Infinity });
      for (const k of Object.keys(exact) as (keyof typeof exact)[]) expect(Math.abs(fast[k]! - exact[k]!)).toBeLessThan(0.001);
    }
  });

  it('refuses impossible hands', () => {
    expect(() => shoeWithout(1, [1, 1, 1, 1, 1])).toThrow();
  });
});
