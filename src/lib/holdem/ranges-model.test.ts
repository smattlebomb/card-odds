import { describe, expect, it } from 'vitest';
import { parseCards } from './cards';
import {
  ALL_HANDS,
  chenScore,
  comboCount,
  combosFor,
  describeRange,
  HAND_RANKING,
  liveCombos,
  parseRange,
  POSITIONS,
  positionRange,
  positionRangeName,
  rangeComboCount,
  THREE_BET_RANGES,
  topPercent,
  TOTAL_COMBOS,
} from './ranges';

const subset = (a: Set<string>, b: Set<string>) => [...a].every((k) => b.has(k));

describe('hand keys and combos', () => {
  it('169 unique hands covering all 1326 combos', () => {
    expect(ALL_HANDS).toHaveLength(169);
    expect(new Set(ALL_HANDS).size).toBe(169);
    expect(rangeComboCount(ALL_HANDS)).toBe(TOTAL_COMBOS);
  });

  it('pairs have 6 combos, suited 4, offsuit 12', () => {
    for (const [k, n] of [['AA', 6], ['AKs', 4], ['AKo', 12], ['72o', 12]] as const) {
      expect(comboCount(k)).toBe(n);
      expect(combosFor(k)).toHaveLength(n);
    }
    // Suited combos share a suit; offsuit never do; no combo repeats a card.
    for (const [a, b] of combosFor('AKs')) expect(a & 3).toBe(b & 3);
    for (const [a, b] of combosFor('AKo')) expect(a & 3).not.toBe(b & 3);
    for (const [a, b] of combosFor('QQ')) expect(a).not.toBe(b);
  });
});

describe('parseRange', () => {
  it('reads pairs, plus ranges and single hands', () => {
    expect([...parseRange('77')]).toEqual(['77']);
    expect(parseRange('QQ+')).toEqual(new Set(['QQ', 'KK', 'AA']));
    expect(parseRange('A2s+').size).toBe(12);
    expect(parseRange('97s+')).toEqual(new Set(['97s', '98s']));
    expect(parseRange('QQ+, AKs, AKo')).toEqual(new Set(['QQ', 'KK', 'AA', 'AKs', 'AKo']));
  });

  it('rejects junk', () => {
    expect(() => parseRange('AXs')).toThrow();
    expect(() => parseRange('AKx')).toThrow();
  });
});

describe('card removal (live combos)', () => {
  it('your cards and the board remove combos from a range', () => {
    expect(liveCombos(['AA'], parseCards('AhAs'))).toHaveLength(1);
    expect(liveCombos(['AA'], parseCards('Ah'))).toHaveLength(3);
    expect(liveCombos(['AKs'], parseCards('Ks7d2c'))).toHaveLength(3);
    expect(liveCombos(['AKo'], parseCards('Ks'))).toHaveLength(9);
    expect(liveCombos(['AA'], parseCards('AhAsAd'))).toHaveLength(0);
    expect(liveCombos(['KQs'], parseCards('AhAs'))).toHaveLength(4);
  });
});

describe('Chen formula ranking and top X%', () => {
  it('scores classic hands', () => {
    expect(chenScore('AA')).toBe(20);
    expect(chenScore('KK')).toBe(16);
    expect(chenScore('22')).toBe(5);
    expect(chenScore('AKs')).toBe(12);
    expect(chenScore('AKo')).toBe(10);
    // J = 6, +2 suited, no gap, +1 straight bonus (both cards below a Queen) = 9.
    expect(chenScore('JTs')).toBe(9);
    expect(chenScore('72o')).toBe(-1);
  });

  it('ranks AA first and every hand once', () => {
    expect(HAND_RANKING[0]).toBe('AA');
    expect(HAND_RANKING[1]).toBe('KK');
    expect(new Set(HAND_RANKING).size).toBe(169);
    expect(HAND_RANKING.indexOf('AKs')).toBeLessThan(HAND_RANKING.indexOf('72o'));
  });

  it('top X% grows with X and lands near X% of combos', () => {
    let prev = new Set<string>();
    for (const p of [1, 5, 10, 20, 35, 50, 75]) {
      const r = topPercent(p);
      expect(subset(prev, r)).toBe(true);
      const pct = (rangeComboCount(r) / TOTAL_COMBOS) * 100;
      expect(pct).toBeGreaterThanOrEqual(p - 0.01);
      expect(pct).toBeLessThan(p + 1); // overshoots by at most one hand (≤12 combos)
      prev = r;
    }
    expect(topPercent(100).size).toBe(169);
    expect(topPercent(0).size).toBe(0);
    expect(topPercent(5).has('AA')).toBe(true);
    expect(topPercent(5).has('72o')).toBe(false);
  });
});

describe('position and 3-bet presets', () => {
  it('loose ranges contain the tight ones at every seat', () => {
    for (const p of POSITIONS) expect(subset(positionRange(p, 'tight'), positionRange(p, 'loose'))).toBe(true);
  });

  it('ranges widen from UTG to the button', () => {
    for (const style of ['tight', 'loose'] as const) {
      const [utg, mp, co, btn] = (['UTG', 'MP', 'CO', 'BTN'] as const).map((p) => positionRange(p, style));
      expect(subset(utg, mp)).toBe(true);
      expect(subset(mp, co)).toBe(true);
      expect(subset(co, btn)).toBe(true);
    }
  });

  it('BB is a defend range, not empty', () => {
    expect(positionRange('BB', 'tight').size).toBeGreaterThan(30);
    expect(positionRangeName('BB', 'loose')).toBe('BB defend (loose)');
    expect(positionRangeName('CO', 'tight')).toBe('CO open (tight)');
  });

  it('3-bet value range is QQ+ and AK (34 combos), inside the wide 3-bet range', () => {
    const value = parseRange(THREE_BET_RANGES.value.text);
    const wide = parseRange(THREE_BET_RANGES.wide.text);
    expect(rangeComboCount(value)).toBe(34);
    expect(describeRange(value)).toBe('2.6% · 34 combos');
    expect(subset(value, wide)).toBe(true);
    expect(THREE_BET_RANGES.value.name).toContain('3-bet');
  });
});
