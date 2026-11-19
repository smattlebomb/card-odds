import { describe, expect, it } from 'vitest';
import type { Rank } from '../cards';
import { advise } from './advise';
import { actionEVs, fullShoe, type Action } from './ev';
import { DEFAULT_RULES, type Rules } from './rules';
import { chartCode, doubleAllowed, type Code } from './strategy';

const R = (over: Partial<Rules> = {}): Rules => ({ ...DEFAULT_RULES, ...over });
const S17_6D = R();
const H17_6D = R({ hitSoft17: true });
const UPS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'A'] as Rank[];

/** Recommended play for e.g. play('T6', '9'). */
function play(cards: string, up: Rank, rules: Rules = S17_6D, tc: number | null = null): Action | null {
  return advise(up, cards.split('') as Rank[], rules, tc).action;
}

/**
 * The published 6-deck, dealer stands on soft 17, double after split, no surrender chart
 * (Wizard of Odds 4–8 deck basic strategy). Columns: dealer 2 3 4 5 6 7 8 9 T A.
 * D = double else hit, Ds = double else stand.
 */
const CHART_6D_S17_DAS: Record<string, string> = {
  // hard
  '5': 'H H H H H H H H H H',
  '6': 'H H H H H H H H H H',
  '7': 'H H H H H H H H H H',
  '8': 'H H H H H H H H H H',
  '9': 'H D D D D H H H H H',
  '10': 'D D D D D D D D H H',
  '11': 'D D D D D D D D D H',
  '12': 'H H S S S H H H H H',
  '13': 'S S S S S H H H H H',
  '14': 'S S S S S H H H H H',
  '15': 'S S S S S H H H H H',
  '16': 'S S S S S H H H H H',
  '17': 'S S S S S S S S S S',
  '18': 'S S S S S S S S S S',
  '19': 'S S S S S S S S S S',
  '20': 'S S S S S S S S S S',
  // soft
  A2: 'H H H D D H H H H H',
  A3: 'H H H D D H H H H H',
  A4: 'H H D D D H H H H H',
  A5: 'H H D D D H H H H H',
  A6: 'H D D D D H H H H H',
  A7: 'S Ds Ds Ds Ds S S H H H',
  A8: 'S S S S S S S S S S',
  A9: 'S S S S S S S S S S',
  // pairs
  '2,2': 'P P P P P P H H H H',
  '3,3': 'P P P P P P H H H H',
  '4,4': 'H H H P P H H H H H',
  '5,5': 'D D D D D D D D H H',
  '6,6': 'P P P P P H H H H H',
  '7,7': 'P P P P P P H H H H',
  '8,8': 'P P P P P P P P P P',
  '9,9': 'P P P P P S P P S S',
  'T,T': 'S S S S S S S S S S',
  'A,A': 'P P P P P P P P P P',
};

function rowHand(row: string) {
  if (row.includes(',')) {
    const v = row[0] === 'A' ? 11 : row[0] === 'T' ? 10 : Number(row[0]);
    return { total: v === 11 ? 12 : v * 2, soft: v === 11, pair: v };
  }
  if (row.startsWith('A')) return { total: 11 + Number(row[1]), soft: true, pair: null };
  return { total: Number(row), soft: false, pair: null };
}

describe('6-deck S17 DAS basic strategy matches the published chart cell for cell', () => {
  for (const [row, cells] of Object.entries(CHART_6D_S17_DAS)) {
    it(row, () => {
      const expected = cells.split(' ').map((c) => (c === 'D' ? 'Dh' : c)) as Code[];
      const actual = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((up) => chartCode(rowHand(row), up, S17_6D));
      expect(actual).toEqual(expected);
    });
  }
});

describe('basic strategy spot checks (6D S17 DAS, no surrender, 3:2)', () => {
  it('stiff hands', () => {
    expect(play('T6', 'T')).toBe('hit');
    expect(play('T6', '6')).toBe('stand');
    expect(play('T2', '3')).toBe('hit');
    expect(play('T2', '4')).toBe('stand');
    expect(play('T3', '2')).toBe('stand');
    expect(play('T5', '7')).toBe('hit');
  });

  it('doubles', () => {
    expect(play('65', 'T')).toBe('double');
    expect(play('65', 'A')).toBe('hit');
    expect(play('63', '3')).toBe('double');
    expect(play('63', '2')).toBe('hit');
    expect(play('64', 'T')).toBe('hit');
    expect(play('55', '9')).toBe('double');
  });

  it('soft hands', () => {
    expect(play('A7', '9')).toBe('hit');
    expect(play('A7', '9', H17_6D)).toBe('hit');
    expect(play('A7', '2')).toBe('stand');
    expect(play('A7', '2', H17_6D)).toBe('double');
    expect(play('A7', '7')).toBe('stand');
    expect(play('A6', '3')).toBe('double');
    expect(play('A2', '4')).toBe('hit');
    expect(play('A2', '5')).toBe('double');
    expect(play('A8', '6')).toBe('stand');
    expect(play('A8', '6', H17_6D)).toBe('double');
  });

  it('pairs', () => {
    expect(play('88', 'T')).toBe('split');
    for (const up of UPS) expect(play('AA', up)).toBe('split');
    expect(play('TT', '6')).toBe('stand');
    expect(play('KK', '5')).toBe('stand');
    expect(play('99', '7')).toBe('stand');
    expect(play('99', '6')).toBe('split');
    expect(play('99', 'A')).toBe('stand');
    expect(play('44', '6')).toBe('split');
    expect(play('22', '7')).toBe('split');
    expect(play('77', '8')).toBe('hit');
    expect(play('66', '2')).toBe('split');
  });

  it('16 vs 9 / 10 / A: surrender with late surrender, otherwise hit', () => {
    for (const up of ['9', 'T', 'A'] as Rank[]) {
      expect(play('T6', up)).toBe('hit');
      expect(play('T6', up, R({ surrender: true }))).toBe('surrender');
    }
    expect(play('T5', 'T', R({ surrender: true }))).toBe('surrender');
    expect(play('T5', '9', R({ surrender: true }))).toBe('hit');
    // 8,8 still splits vs 10 in S17.
    expect(play('88', 'T', R({ surrender: true }))).toBe('split');
  });

  it('no surrender or double after hitting', () => {
    expect(play('T33', 'T', R({ surrender: true }))).toBe('hit');
    expect(play('523', '6')).toBe('hit');
    // Soft 18 vs 3 is "double, else stand": on three cards it stands.
    expect(play('A25', '3')).toBe('stand');
    // Hard 11 on three cards: "double, else hit".
    expect(play('425', '6')).toBe('hit');
  });
});

describe('rule changes change the advice', () => {
  it('H17 vs S17', () => {
    expect(play('65', 'A')).toBe('hit');
    expect(play('65', 'A', H17_6D)).toBe('double');
    expect(play('A7', '2', H17_6D)).toBe('double');
    expect(play('A8', '6', H17_6D)).toBe('double');
    const h17ls = R({ hitSoft17: true, surrender: true });
    expect(play('T5', 'A', R({ surrender: true }))).toBe('hit');
    expect(play('T5', 'A', h17ls)).toBe('surrender');
    expect(play('T7', 'A', h17ls)).toBe('surrender');
    expect(play('88', 'A', h17ls)).toBe('surrender');
    expect(play('88', 'A', R({ surrender: true }))).toBe('split');
  });

  it('DAS on/off', () => {
    const noDas = R({ das: false });
    expect(play('44', '6')).toBe('split');
    expect(play('44', '6', noDas)).toBe('hit');
    expect(play('44', '5', noDas)).toBe('hit');
    expect(play('22', '2')).toBe('split');
    expect(play('22', '3', noDas)).toBe('hit');
    expect(play('22', '4', noDas)).toBe('split');
    expect(play('33', '3', noDas)).toBe('hit');
    expect(play('66', '2', noDas)).toBe('hit');
    expect(play('66', '3', noDas)).toBe('split');
  });

  it('deck count', () => {
    expect(play('63', '2')).toBe('hit');
    expect(play('63', '2', R({ decks: 2 }))).toBe('double');
    expect(play('63', '2', R({ decks: 1 }))).toBe('double');
    expect(play('65', 'A', R({ decks: 1 }))).toBe('double');
    expect(play('62', '6', R({ decks: 1 }))).toBe('double');
    expect(play('62', '6')).toBe('hit');
    expect(play('A2', '4', R({ decks: 1 }))).toBe('double');
    expect(play('77', 'T', R({ decks: 1 }))).toBe('stand');
    expect(play('77', 'T', R({ decks: 1, surrender: true }))).toBe('surrender');
    expect(play('8', 'T', R({ decks: 8 }))).toBe(null);
  });

  it('double restrictions', () => {
    expect(play('A6', '3', R({ doubleOn: '9-11' }))).toBe('hit');
    expect(play('A7', '4', R({ doubleOn: '9-11' }))).toBe('stand');
    expect(play('63', '4', R({ doubleOn: '9-11' }))).toBe('double');
    expect(play('63', '4', R({ doubleOn: '10-11' }))).toBe('hit');
    expect(doubleAllowed(10, false, R({ doubleOn: '10-11' }))).toBe(true);
  });

  it('6:5 blackjack does not change the play', () => {
    for (const [hand, up] of [['T6', 'T'], ['A7', '3'], ['99', '7'], ['65', 'T']] as [string, Rank][]) {
      expect(play(hand, up, R({ blackjackPays: '6:5' }))).toBe(play(hand, up));
    }
  });
});

/**
 * The chart agrees with the EV engine: for each two-card total, average the EV of every legal
 * action over all two-card hands making that total (weighted by how likely each hand is), and
 * the best action must equal the chart's play. Run here for a spread of rule sets; the full
 * 64-rule-set sweep was run while building the chart.
 */
describe('chart agrees with the EV engine (total-dependent EV)', () => {
  const CODE_ACTION: Record<Code, Action> = { H: 'hit', S: 'stand', P: 'split', Dh: 'double', Ds: 'double', Rh: 'surrender', Rs: 'surrender', Rp: 'surrender' };
  const ruleSets: Rules[] = [
    R(),
    R({ hitSoft17: true, surrender: true }),
    R({ decks: 2, das: false, surrender: true }),
    R({ decks: 1, hitSoft17: true }),
  ];
  for (const rules of ruleSets) {
    it(`${rules.decks}D ${rules.hitSoft17 ? 'H17' : 'S17'} ${rules.das ? 'DAS' : 'noDAS'} ${rules.surrender ? 'LS' : ''}`, () => {
      const mismatches: string[] = [];
      const rows: { label: string; combos: number[][]; total: number; soft: boolean; pair: number | null }[] = [];
      for (let t = 5; t <= 19; t++) {
        const combos: number[][] = [];
        for (let a = 2; a <= 10; a++) for (let b = a + 1; b <= 10; b++) if (a + b === t) combos.push([a, b]);
        rows.push({ label: `hard ${t}`, combos, total: t, soft: false, pair: null });
      }
      for (let x = 2; x <= 9; x++) rows.push({ label: `A,${x}`, combos: [[1, x]], total: 11 + x, soft: true, pair: null });
      for (let v = 1; v <= 10; v++) rows.push({ label: `pair ${v}`, combos: [[v, v]], total: v === 1 ? 12 : 2 * v, soft: v === 1, pair: v === 1 ? 11 : v });
      for (const row of rows) {
        for (let up = 1; up <= 10; up++) {
          const shoe = fullShoe(rules.decks);
          shoe[up]--;
          const avg: Partial<Record<Action, number>> = {};
          let W = 0;
          for (const [a, b] of row.combos) {
            const w = a === b ? shoe[a] * (shoe[a] - 1) : 2 * shoe[a] * shoe[b];
            W += w;
            const evs = actionEVs({
              player: [a, b], up, decks: rules.decks, hitSoft17: rules.hitSoft17, das: rules.das,
              canDouble: doubleAllowed(row.total, row.soft, rules), canSplit: row.pair !== null, canSurrender: rules.surrender,
            });
            for (const [k, v] of Object.entries(evs) as [Action, number][]) avg[k] = (avg[k] ?? 0) + w * v;
          }
          let best: Action = 'stand';
          for (const k of Object.keys(avg) as Action[]) if (avg[k]! / W > avg[best]! / W) best = k;
          const chart = CODE_ACTION[chartCode(row, up === 1 ? 11 : up, rules)];
          if (chart !== best) mismatches.push(`${row.label} vs ${up}: chart ${chart}, EV ${best}`);
        }
      }
      expect(mismatches).toEqual([]);
    }, 30_000);
  }
});
