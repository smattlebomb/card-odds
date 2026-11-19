import { describe, expect, it } from 'vitest';
import { parseCards } from './cards';
import {
  computeEquity,
  exactDeals,
  exactEquity,
  monteCarloEquity,
  validateInput,
} from './equity';

const hole = (text: string) => parseCards(text);

describe('validateInput', () => {
  it('rejects the wrong number of hole or board cards and duplicate cards', () => {
    expect(validateInput({ hole: hole('Ah'), board: [], opponents: 1 })).toMatch(/two hole/i);
    expect(validateInput({ hole: hole('Ah Kd'), board: hole('2c 3d'), opponents: 1 })).toMatch(/0, 3, 4 or 5/);
    expect(validateInput({ hole: hole('Ah Kd'), board: [], opponents: 0 })).toMatch(/1–8/);
    expect(validateInput({ hole: hole('Ah Kd'), board: hole('Ah 2c 3d'), opponents: 1 })).toMatch(/twice/);
    expect(validateInput({ hole: hole('Ah Kd'), board: [], opponents: 1 })).toBeNull();
  });
});

describe('exact equities: known hands', () => {
  it('AA vs KK heads-up preflop is about 82% for AA', () => {
    // C(48,5) = 1,712,304 boards — exact is a few seconds, well worth a known number.
    const r = exactEquity({ hole: hole('Ah Ad'), board: [], opponents: 1, known: [hole('Kh Kd')] });
    expect(r.exact).toBe(true);
    expect(r.equity).toBeGreaterThan(0.81);
    expect(r.equity).toBeLessThan(0.83);
    // Exact enumeration here is ≈ 82.64% equity (win + half the ties), the usual published figure.
    expect(r.win + r.tie + r.lose).toBeCloseTo(1, 10);
    expect(r.equity).toBeCloseTo(r.win + r.tie / 2, 10);
  }, 30_000);

  it('AK vs QQ heads-up: QQ is ahead, AKs closer than AKo', () => {
    const aks = exactEquity({ hole: hole('Ah Kh'), board: [], opponents: 1, known: [hole('Qd Qc')] });
    const ako = exactEquity({ hole: hole('Ah Kd'), board: [], opponents: 1, known: [hole('Qs Qc')] });
    expect(aks.equity).toBeGreaterThan(0.43);
    expect(aks.equity).toBeLessThan(0.48);
    expect(ako.equity).toBeGreaterThan(0.41);
    expect(ako.equity).toBeLessThan(0.47);
    expect(aks.equity).toBeGreaterThan(ako.equity);
    // QQ therefore has the rest (ties split already in equity)
    expect(1 - aks.equity).toBeGreaterThan(0.52);
  }, 30_000);

  it('AKs is slightly ahead of AKo', () => {
    const r = exactEquity({ hole: hole('Ah Kh'), board: [], opponents: 1, known: [hole('Ad Kc')] });
    expect(r.equity).toBeGreaterThan(0.51);
    expect(r.equity).toBeLessThan(0.54);
  }, 30_000);

  it('22 vs AK heads-up is a classic coin-flip, pocket twos slightly ahead of AKo', () => {
    const r = exactEquity({ hole: hole('2h 2d'), board: [], opponents: 1, known: [hole('Ah Kd')] });
    expect(r.equity).toBeGreaterThan(0.50);
    expect(r.equity).toBeLessThan(0.54);
  }, 30_000);

  it('on the river, the nuts vs a missed draw is 100% (exact, bit-stable)', () => {
    // Board 2h 9h Td 3c 7s — hero has 22 (trips), villain has Ah Kh (missed flush/overcards)
    const r = exactEquity({
      hole: hole('2d 2c'),
      board: hole('2h 9h Td 3c 7s'),
      opponents: 1,
      known: [hole('Ah Kh')],
    });
    expect(r.exact).toBe(true);
    expect(r.samples).toBe(1);
    expect(r.equity).toBe(1);
    expect(r.win).toBe(1);
    expect(r.tie).toBe(0);
  });

  it('on the river, an exact chop is a 50/50 equity split', () => {
    // Both play the board: broadway on the board, hole cards are undercards
    const r = exactEquity({
      hole: hole('2d 3c'),
      board: hole('Ah Kh Qd Jc Ts'),
      opponents: 1,
      known: [hole('4h 5c')],
    });
    expect(r.exact).toBe(true);
    expect(r.equity).toBe(0.5);
    expect(r.tie).toBe(1);
  });
});

describe('Monte Carlo vs exact', () => {
  it('heads-up on the river with an unknown opponent uses exact enumeration', () => {
    const input = { hole: hole('Ah Kd'), board: hole('2c 9s 7h Jd 3c'), opponents: 1 };
    expect(exactDeals(input)).toBe(990); // C(45, 2)
    const r = computeEquity(input);
    expect(r.exact).toBe(true);
    expect(r.samples).toBe(990);
    expect(r.equity).toBeGreaterThan(0);
    expect(r.equity).toBeLessThan(1);
  });

  it('a Monte Carlo run of AA vs KK lands within 1.5 points of the exact figure', () => {
    const input = { hole: hole('Ah Ad'), board: [], opponents: 1, known: [hole('Kh Kd')], seed: 42 };
    const exact = exactEquity(input);
    const mc = monteCarloEquity({ ...input, trials: 80_000, forceMonteCarlo: true });
    expect(mc.exact).toBe(false);
    expect(Math.abs(mc.equity - exact.equity)).toBeLessThan(0.015);
  }, 30_000);
});
