import { describe, expect, it } from 'vitest';
import type { Rank } from '../cards';
import { cardValue, describeHand, handValue, upcardValue } from './hand';

const h = (s: string) => handValue(s.split('') as Rank[]);

describe('card values', () => {
  it('ten-value cards are 10, Ace is 1 (11 as an upcard)', () => {
    for (const r of ['T', 'J', 'Q', 'K'] as Rank[]) expect(cardValue(r)).toBe(10);
    expect(cardValue('A')).toBe(1);
    expect(upcardValue('A')).toBe(11);
    expect(upcardValue('7')).toBe(7);
  });
});

describe('hand values', () => {
  it('hard totals 12–21', () => {
    const hands: [string, number][] = [
      ['T2', 12], ['94', 13], ['86', 14], ['78', 15], ['T6', 16], ['K7', 17], ['Q8', 18], ['T9', 19], ['JQ', 20], ['T56', 21],
    ];
    for (const [cards, total] of hands) {
      expect(h(cards)).toMatchObject({ total, soft: false, bust: false });
    }
  });

  it('soft totals 13–21', () => {
    for (let x = 2; x <= 9; x++) expect(h(`A${x}`)).toMatchObject({ total: 11 + x, soft: true });
    expect(h('A55')).toMatchObject({ total: 21, soft: true, blackjack: false });
  });

  it('A,A is soft 12; A,9 is soft 20; A,6,T is hard 17', () => {
    expect(h('AA')).toMatchObject({ total: 12, soft: true, pair: 'A' });
    expect(h('A9')).toMatchObject({ total: 20, soft: true });
    expect(h('A6T')).toMatchObject({ total: 17, soft: false });
    expect(h('AA9')).toMatchObject({ total: 21, soft: true });
    expect(h('AAT')).toMatchObject({ total: 12, soft: false });
  });

  it('natural blackjack is Ace + ten-value as the first two cards only', () => {
    for (const t of ['T', 'J', 'Q', 'K']) {
      expect(h(`A${t}`).blackjack).toBe(true);
      expect(h(`${t}A`).blackjack).toBe(true);
    }
    expect(h('A55').blackjack).toBe(false);
    expect(h('A9').blackjack).toBe(false);
    expect(describeHand(h('AK'))).toBe('blackjack');
  });

  it('bust over 21', () => {
    expect(h('T6K')).toMatchObject({ total: 26, bust: true });
    expect(h('T56')).toMatchObject({ total: 21, bust: false });
    expect(describeHand(h('T6K'))).toBe('bust (26)');
  });

  it('pairs are two cards of the same rank; T+K is not a pair', () => {
    expect(h('88').pair).toBe('8');
    expect(h('TT').pair).toBe('T');
    expect(h('KK').pair).toBe('K');
    expect(h('TK').pair).toBeNull();
    expect(h('TK').total).toBe(20);
    expect(h('888').pair).toBeNull();
  });

  it('describes hands', () => {
    expect(describeHand(h('T6'))).toBe('hard 16');
    expect(describeHand(h('A7'))).toBe('soft 18');
  });
});
