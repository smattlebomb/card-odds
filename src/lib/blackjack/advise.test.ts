import { describe, expect, it } from 'vitest';
import type { Rank } from '../cards';
import { advise } from './advise';
import { FAB_4, ILLUSTRIOUS_18 } from './deviations';
import { DEFAULT_RULES, type Rules } from './rules';

const R = (over: Partial<Rules> = {}): Rules => ({ ...DEFAULT_RULES, ...over });
const LS = R({ surrender: true });
const adv = (cards: string, up: Rank, rules: Rules = DEFAULT_RULES, tc: number | null = null) =>
  advise(up, cards.split('') as Rank[], rules, tc);
const play = (cards: string, up: Rank, rules: Rules = DEFAULT_RULES, tc: number | null = null) => adv(cards, up, rules, tc).action;

describe('deviation tables', () => {
  it('Illustrious 18 has 17 plays plus insurance; Fab 4 has 4', () => {
    expect(ILLUSTRIOUS_18).toHaveLength(17);
    expect(FAB_4).toHaveLength(4);
  });
});

describe('Illustrious 18', () => {
  it('16 vs 10: stand at TC >= 0, hit below', () => {
    expect(play('T6', 'T', DEFAULT_RULES, 0)).toBe('stand');
    expect(play('T6', 'T', DEFAULT_RULES, 2)).toBe('stand');
    expect(play('T6', 'T', DEFAULT_RULES, -1)).toBe('hit');
    const a = adv('T6', 'T', DEFAULT_RULES, 0);
    expect(a.basicAction).toBe('hit');
    expect(a.deviation?.set).toBe('Illustrious 18');
    expect(a.reason).toMatch(/count play/i);
  });

  it('applies to multi-card 16 too', () => {
    expect(play('556', 'T', DEFAULT_RULES, 1)).toBe('stand');
    expect(play('556', 'T')).toBe('hit');
  });

  it('15 vs 10: stand at TC >= +4', () => {
    expect(play('T5', 'T', DEFAULT_RULES, 4)).toBe('stand');
    expect(play('T5', 'T', DEFAULT_RULES, 3)).toBe('hit');
  });

  it('12 vs 3 at +2, 12 vs 2 at +3, 12 vs 4 hits below 0', () => {
    expect(play('T2', '3', DEFAULT_RULES, 2)).toBe('stand');
    expect(play('T2', '3', DEFAULT_RULES, 1)).toBe('hit');
    expect(play('T2', '2', DEFAULT_RULES, 3)).toBe('stand');
    expect(play('T2', '4', DEFAULT_RULES, -1)).toBe('hit');
    expect(play('T2', '4', DEFAULT_RULES, 0)).toBe('stand');
    expect(play('T3', '2', DEFAULT_RULES, -2)).toBe('hit');
    expect(play('T3', '2', DEFAULT_RULES, -1)).toBe('stand');
  });

  it('doubling indexes: 10 vs 10 at +4, 11 vs A at +1, 9 vs 2 at +1, 9 vs 7 at +3', () => {
    expect(play('64', 'T', DEFAULT_RULES, 4)).toBe('double');
    expect(play('64', 'T', DEFAULT_RULES, 3)).toBe('hit');
    expect(play('65', 'A', DEFAULT_RULES, 1)).toBe('double');
    expect(play('65', 'A', DEFAULT_RULES, 0)).toBe('hit');
    expect(play('54', '2', DEFAULT_RULES, 1)).toBe('double');
    expect(play('54', '7', DEFAULT_RULES, 3)).toBe('double');
    // Can't double three cards, so the index doesn't apply.
    expect(play('442', 'T', DEFAULT_RULES, 6)).toBe('hit');
  });

  it('10,10 split vs 6 at +4 and vs 5 at +5', () => {
    expect(play('TT', '6', DEFAULT_RULES, 4)).toBe('split');
    expect(play('TT', '6', DEFAULT_RULES, 3.9)).toBe('stand');
    expect(play('TT', '5', DEFAULT_RULES, 5)).toBe('split');
    expect(play('TT', '5', DEFAULT_RULES, 4)).toBe('stand');
    // T+K is not a pair here, so it can't be split.
    expect(play('TK', '6', DEFAULT_RULES, 6)).toBe('stand');
  });

  it('skips an index when basic strategy for these rules already makes the play', () => {
    // H17: 11 vs A is already a double, so a low count doesn't turn it into a hit.
    expect(play('65', 'A', R({ hitSoft17: true }), -2)).toBe('double');
    // 1 deck: 9 vs 2 is already a double.
    expect(play('54', '2', R({ decks: 1 }), -3)).toBe('double');
    // A pair that basic strategy splits stays split.
    expect(play('88', 'T', DEFAULT_RULES, 6)).toBe('split');
  });

  it('with no true count, those spots follow basic strategy', () => {
    for (const [hand, up] of [['T6', 'T'], ['T5', 'T'], ['T2', '3'], ['65', 'A'], ['TT', '6']] as [string, Rank][]) {
      const a = adv(hand, up);
      expect(a.deviation).toBeNull();
      expect(a.action).toBe(a.basicAction);
    }
    expect(play('T6', 'T')).toBe('hit');
    expect(play('TT', '6')).toBe('stand');
  });
});

describe('Fab 4 surrenders (late surrender on)', () => {
  it('14 vs 10: surrender at TC >= +3', () => {
    expect(play('T4', 'T', LS, 3)).toBe('surrender');
    expect(play('T4', 'T', LS, 2)).toBe('hit');
    expect(adv('T4', 'T', LS, 3).deviation?.set).toBe('Fab 4');
  });

  it('15 vs 10: surrender at TC >= 0, hit below', () => {
    expect(play('T5', 'T', LS, 0)).toBe('surrender');
    expect(play('T5', 'T', LS, -1)).toBe('hit');
    expect(play('T5', 'T', LS, 5)).toBe('surrender');
  });

  it('15 vs 9 at +2 and 15 vs A at +1', () => {
    expect(play('T5', '9', LS, 2)).toBe('surrender');
    expect(play('T5', '9', LS, 1)).toBe('hit');
    expect(play('T5', 'A', LS, 1)).toBe('surrender');
    expect(play('T5', 'A', LS, 0)).toBe('hit');
  });

  it('surrender wins over the 16 vs 10 stand index when surrender is allowed', () => {
    expect(play('T6', 'T', LS, 2)).toBe('surrender');
  });

  it('no surrender plays when surrender is off', () => {
    expect(play('T4', 'T', DEFAULT_RULES, 5)).toBe('hit');
    expect(play('T5', '9', DEFAULT_RULES, 5)).toBe('hit');
  });
});

describe('insurance and even money', () => {
  it('take insurance at TC >= +3 only', () => {
    expect(adv('T6', 'A', DEFAULT_RULES, 3).insurance).toMatch(/^Take insurance/);
    expect(adv('T6', 'A', DEFAULT_RULES, 2.9).insurance).toMatch(/^No insurance/);
    expect(adv('T6', 'A').insurance).toMatch(/^No insurance/);
    expect(adv('T6', 'T', DEFAULT_RULES, 5).insurance).toBeNull();
  });

  it('even money with a blackjack follows the same index', () => {
    expect(adv('AK', 'A', DEFAULT_RULES, 3).insurance).toMatch(/^Take even money/);
    expect(adv('AK', 'A', DEFAULT_RULES, 0).insurance).toMatch(/^No even money/);
  });
});

describe('advice results', () => {
  it('blackjack EV depends on the payout: 3:2 vs 6:5', () => {
    const a32 = adv('AK', '9');
    const a65 = adv('AK', '9', R({ blackjackPays: '6:5' }));
    expect(a32.status).toBe('blackjack');
    expect(a32.evs.stand).toBe(1.5);
    expect(a65.evs.stand).toBe(1.2);
    expect(a32.reason).toContain('3:2');
    expect(a65.reason).toContain('6:5');
  });

  it('incomplete, bust, invalid', () => {
    expect(advise(null, ['T', '6'], DEFAULT_RULES).status).toBe('incomplete');
    expect(advise('T', ['T'], DEFAULT_RULES).status).toBe('incomplete');
    expect(adv('T6K', '9').status).toBe('bust');
    expect(adv('AAAA', 'A', R({ decks: 1 })).status).toBe('invalid');
  });

  it('only offers legal actions', () => {
    expect(adv('T6', 'T').legal.sort()).toEqual(['double', 'hit', 'stand']);
    expect(adv('88', 'T', LS).legal.sort()).toEqual(['double', 'hit', 'split', 'stand', 'surrender']);
    expect(adv('T33', 'T', LS).legal.sort()).toEqual(['hit', 'stand']);
    expect(adv('T56', '9').legal).toEqual(['stand']);
    expect(adv('T56', '9').action).toBe('stand');
  });

  it('reports EVs for every legal action, best one matching the chart in clear spots', () => {
    const a = adv('65', '6');
    expect(Object.keys(a.evs).sort()).toEqual(['double', 'hit', 'stand']);
    expect(a.action).toBe('double');
    expect(a.evBest).toBe('double');
    expect(a.evs.double!).toBeGreaterThan(a.evs.hit!);
  });

  it('gives plain-English reasons', () => {
    expect(adv('T6', '6').reason).toMatch(/^Stand: 16 vs a 6/);
    expect(adv('T6', 'T').reason).toMatch(/^Hit: 16 vs a 10/);
    expect(adv('88', 'T').reason).toMatch(/always split 8s/);
    expect(adv('TT', '6').reason).toMatch(/never split 10s/);
    expect(adv('T6', 'T', LS).reason).toMatch(/^Surrender/);
  });

  it('notes when the exact cards favour a different play than the chart', () => {
    // 6D: hard 16 of three or more cards vs 10 slightly favours standing.
    const a = adv('T42', 'T');
    expect(a.action).toBe('hit');
    expect(a.evBest).toBe('stand');
    expect(a.notes.join(' ')).toMatch(/these exact cards/);
  });
});
