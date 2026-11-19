/**
 * Equity against opponent ranges, with card removal.
 *
 * Reference numbers (well-known preflop all-in equities):
 * - AA vs KK: 81.95% for AA averaged over every KK combo. For a specific AA against the whole
 *   KK range that average is exact (this app's exact enumeration gives 81.946%).
 * - AKs vs QQ: about 46% / 54%.
 * - AA vs one random hand: about 85.2%.
 * Monte Carlo runs use a fixed seed; tolerances are several standard errors wide.
 */
import { describe, expect, it } from 'vitest';
import { parseCards } from './cards';
import { computeEquity, exactEquity, monteCarloEquity, RANGE_CONFLICT_ERROR } from './equity';
import { ALL_HANDS, parseRange, topPercent } from './ranges';

const keys = (text: string) => [...parseRange(text)];
const MC = { trials: 60_000, seed: 12345 };

describe('range vs range preflop (Monte Carlo)', () => {
  it('AA vs the KK range ≈ 81.9 / 18.1', () => {
    const r = monteCarloEquity({ hole: parseCards('AsAh'), board: [], opponents: 1, ranges: [keys('KK')], ...MC });
    expect(Math.abs(r.equity - 0.8195)).toBeLessThan(0.01);
    expect(Math.abs(1 - r.equity - 0.1805)).toBeLessThan(0.01);
    expect(r.exact).toBe(false);
  });

  it('AKs vs the QQ range ≈ 46 / 54', () => {
    const r = monteCarloEquity({ hole: parseCards('AhKh'), board: [], opponents: 1, ranges: [keys('QQ')], ...MC });
    expect(Math.abs(r.equity - 0.46)).toBeLessThan(0.015);
  });

  it('AA vs random ≈ 85.2%, and "every hand" as a range equals random', () => {
    const random = monteCarloEquity({ hole: parseCards('AsAh'), board: [], opponents: 1, ...MC });
    const all = monteCarloEquity({ hole: parseCards('AsAh'), board: [], opponents: 1, ranges: [[...ALL_HANDS]], ...MC });
    expect(Math.abs(random.equity - 0.852)).toBeLessThan(0.01);
    expect(Math.abs(all.equity - random.equity)).toBeLessThan(0.01);
  });

  it('a tighter range is tougher: AQo does worse vs a 3-bet range than vs random', () => {
    const vsRandom = monteCarloEquity({ hole: parseCards('AdQc'), board: [], opponents: 1, ...MC });
    const vs3bet = monteCarloEquity({ hole: parseCards('AdQc'), board: [], opponents: 1, ranges: [keys('QQ+, AKs, AKo')], ...MC });
    expect(vs3bet.equity).toBeLessThan(vsRandom.equity - 0.2);
  });
});

describe('card removal', () => {
  it('holding two Aces leaves one AA combo: AA vs AA splits exactly in half', () => {
    // AsAh vs AdAc is symmetric under swapping suits, so the true equity is exactly 50%.
    const r = monteCarloEquity({ hole: parseCards('AsAh'), board: [], opponents: 1, ranges: [keys('AA')], ...MC });
    expect(Math.abs(r.equity - 0.5)).toBeLessThan(0.006);
    expect(r.tie).toBeGreaterThan(0.9);
  });

  it('board cards remove combos too (exact on the river)', () => {
    // Board Qd 7c 2h 9s 4d. Hero AsAd. Range QQ (3 live: Qd is out), 22 (3 live: 2h is out), KK (6).
    // Aces beat KK and lose to both sets: 6 wins out of 12 equally likely combos.
    const r = computeEquity({ hole: parseCards('AsAd'), board: parseCards('Qd7c2h9s4d'), opponents: 1, ranges: [keys('QQ, 22, KK')] });
    expect(r.exact).toBe(true);
    expect(r.samples).toBe(12);
    expect(r.equity).toBe(0.5);
  });

  it('a made nut flush vs a range on the river is 100%', () => {
    const r = computeEquity({ hole: parseCards('AhKh'), board: parseCards('Qh7h2h9s4d'), opponents: 1, ranges: [keys('QQ, 99, AQs, KQs')] });
    expect(r.exact).toBe(true);
    expect(r.equity).toBe(1);
  });

  it('opponents never share cards: two AA ranges get different Aces', () => {
    // Hero holds no Ace: 6 AA combos, but two opponents need four distinct Aces.
    const r = monteCarloEquity({ hole: parseCards('2c3d'), board: [], opponents: 2, ranges: [keys('AA'), keys('AA')], trials: 5000, seed: 7 });
    // 2-3 offsuit against two pairs of Aces (all four Aces dealt) is a big underdog.
    expect(r.equity).toBeGreaterThan(0.02);
    expect(r.equity).toBeLessThan(0.25);
    expect(r.samples).toBe(5000);
  });

  it('a range with no live hands is an error, not a silent 100%', () => {
    expect(() => computeEquity({ hole: parseCards('AsAh'), board: parseCards('Ad7c2h'), opponents: 1, ranges: [keys('AA')] })).toThrow(/no possible hands/);
  });

  it('ranges that cannot all be dealt at once are an error', () => {
    // Hero has the A♠: three Aces left, but two AA opponents need four.
    expect(() =>
      computeEquity({ hole: parseCards('As2c'), board: [], opponents: 2, ranges: [keys('AA'), keys('AA')] }),
    ).toThrow(RANGE_CONFLICT_ERROR);
  });
});

describe('exact and Monte Carlo agree with a range', () => {
  it('turn, flush draw vs the top 15%', () => {
    const input = { hole: parseCards('AhKh'), board: parseCards('Qh7h2c9d'), opponents: 1, ranges: [[...topPercent(15)]] };
    const exact = exactEquity(input);
    const mc = monteCarloEquity({ ...input, ...MC });
    expect(exact.exact).toBe(true);
    expect(Math.abs(exact.equity - mc.equity)).toBeLessThan(0.01);
  });

  it('mixes range, random and known opponents', () => {
    const r = monteCarloEquity({
      hole: parseCards('QsQd'),
      board: [],
      opponents: 3,
      ranges: [keys('AA, KK'), null, null],
      known: [null, null, parseCards('7c2d')],
      trials: 20_000,
      seed: 3,
    });
    expect(r.equity).toBeGreaterThan(0.05);
    expect(r.equity).toBeLessThan(0.4);
  });
});
