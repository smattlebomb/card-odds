import { describe, expect, it } from 'vitest';
import { parseCards } from './cards';
import {
  CATEGORY_NAME,
  FLUSH,
  FULL_HOUSE,
  HIGH_CARD,
  PAIR,
  QUADS,
  STRAIGHT,
  STRAIGHT_FLUSH,
  TRIPS,
  TWO_PAIR,
  category,
  compareHands,
  describeScore,
  evaluate,
  straightHigh,
} from './evaluator';

const ev = (text: string) => evaluate(parseCards(text));
const cat = (text: string) => category(ev(text));

describe('straightHigh', () => {
  it('finds Broadway and mid straights in a rank mask', () => {
    // A,K,Q,J,T
    expect(straightHigh(0b1_1111_00000000)).toBe(12);
    // 9,8,7,6,5
    expect(straightHigh(0b0_0000_11111000)).toBe(7);
  });

  it('treats A-2-3-4-5 as a 5-high wheel, not a missed Broadway', () => {
    expect(straightHigh(0b1_0000_00001111)).toBe(3);
  });

  it('returns -1 when there is no straight', () => {
    // A,K,Q,J,4,3,2 — no Ten and no Five, so neither Broadway nor the wheel
    expect(straightHigh(0b1_1110_00000111)).toBe(-1);
    // A,K,Q,J plus 2,3,4,5 is the wheel (Five is bit 3)
    expect(straightHigh(0b1_1110_00001111)).toBe(3);
  });
});

describe('evaluate: categories', () => {
  it('high card', () => {
    expect(cat('Ah Kd 9c 7s 3d')).toBe(HIGH_CARD);
    expect(describeScore(ev('Ah Kd 9c 7s 3d'))).toBe('Ace high');
  });

  it('pair, two pair, trips, quads, full house', () => {
    expect(cat('Ah Ad 9c 7s 3d')).toBe(PAIR);
    expect(describeScore(ev('Ah Ad 9c 7s 3d'))).toBe('Pair of Aces');
    expect(cat('Ah Ad 9c 9s 3d')).toBe(TWO_PAIR);
    expect(describeScore(ev('Ah Ad 9c 9s 3d'))).toBe('Two pair, Aces and 9s');
    expect(cat('Ah Ad Ac 7s 3d')).toBe(TRIPS);
    expect(describeScore(ev('Ah Ad Ac 7s 3d'))).toBe('Three Aces');
    expect(cat('Ah Ad Ac As 3d')).toBe(QUADS);
    expect(describeScore(ev('Ah Ad Ac As 3d'))).toBe('Four Aces');
    expect(cat('Ah Ad Ac 7s 7d')).toBe(FULL_HOUSE);
    expect(describeScore(ev('Ah Ad Ac 7s 7d'))).toBe('Full house, Aces full of 7s');
  });

  it('flush vs a non-flush with the same ranks', () => {
    expect(cat('Ah Kh Qh 9h 3h')).toBe(FLUSH);
    expect(cat('Ah Kh Qh 9h 3d')).toBe(HIGH_CARD);
    expect(describeScore(ev('Ah Kh Qh 9h 3h'))).toBe('Flush, Ace high');
  });

  it('straight, including the wheel and Broadway', () => {
    expect(cat('Ah Kd Qc Js Td')).toBe(STRAIGHT);
    expect(describeScore(ev('Ah Kd Qc Js Td'))).toBe('Straight, Ace high');
    expect(cat('Ah 2d 3c 4s 5d')).toBe(STRAIGHT);
    expect(describeScore(ev('Ah 2d 3c 4s 5d'))).toBe('Straight, 5 high');
    expect(cat('2h 3d 4c 5s 6d')).toBe(STRAIGHT);
    expect(describeScore(ev('2h 3d 4c 5s 6d'))).toBe('Straight, 6 high');
  });

  it('a 6-high straight beats the wheel', () => {
    expect(compareHands(parseCards('2h 3d 4c 5s 6d'), parseCards('Ah 2d 3c 4s 5d'))).toBe(1);
  });

  it('straight flush and royal flush', () => {
    expect(cat('Ah Kh Qh Jh Th')).toBe(STRAIGHT_FLUSH);
    expect(describeScore(ev('Ah Kh Qh Jh Th'))).toBe('Royal flush');
    expect(cat('As 2s 3s 4s 5s')).toBe(STRAIGHT_FLUSH);
    expect(describeScore(ev('As 2s 3s 4s 5s'))).toBe('Straight flush, 5 high');
    expect(cat('9h Th Jh Qh Kh')).toBe(STRAIGHT_FLUSH);
    expect(describeScore(ev('9h Th Jh Qh Kh'))).toBe('Straight flush, King high');
  });
});

describe('evaluate: 7-card best five and kickers', () => {
  it('uses the Ace low for the wheel even when a King is also in the seven cards', () => {
    // A,2,3,4,5 plus K,9 — best hand is the wheel, not Ace-high
    expect(cat('Ah 2d 3c 4s 5d Kh 9c')).toBe(STRAIGHT);
    expect(describeScore(ev('Ah 2d 3c 4s 5d Kh 9c'))).toBe('Straight, 5 high');
  });

  it('prefers Broadway over the wheel when both are present', () => {
    // A,K,Q,J,T,5,4 — Broadway, not the wheel (wheel needs 2,3)
    expect(cat('Ah Kh Qd Jc Td 5s 4c')).toBe(STRAIGHT);
    expect(describeScore(ev('Ah Kh Qd Jc Td 5s 4c'))).toBe('Straight, Ace high');
  });

  it('a 7-card hand with a flush and a lower straight plays the flush (unless a straight flush)', () => {
    expect(cat('Ah Kh 9h 8h 2h 7d 6c')).toBe(FLUSH);
    // steel wheel: straight flush beats a higher flush in the other cards
    expect(cat('As 2s 3s 4s 5s Kh Qd')).toBe(STRAIGHT_FLUSH);
  });

  it('picks the best five: full house over trips, two pair + pair in hand makes a boat when the board pairs', () => {
    // Board 9s 9h 2c 3d 7s, hand 9d 2h → nines full of deuces
    expect(cat('9s 9h 2c 3d 7s 9d 2h')).toBe(FULL_HOUSE);
    expect(describeScore(ev('9s 9h 2c 3d 7s 9d 2h'))).toBe('Full house, 9s full of 2s');
    // Board Ks Kh 2c 3d 7s, hand Ad 9h → two pair, Kings and... no, just a pair of Kings
    expect(cat('Ks Kh 2c 3d 7s Ad 9h')).toBe(PAIR);
  });

  it('quads plus a pair uses the pair rank as the kicker when it is the highest leftover', () => {
    expect(compareHands(parseCards('Ah Ad Ac As Kh Kd 2c'), parseCards('Ah Ad Ac As Qh Qd 2c'))).toBe(1);
  });

  it('kickers: the better kicker wins, identical kickers tie', () => {
    // Two pair Aces and 9s, kicker King vs Queen
    expect(compareHands(parseCards('Ah Ad 9c 9s Kh'), parseCards('Ah Ad 9c 9s Qh'))).toBe(1);
    expect(compareHands(parseCards('Ah Ad 9c 9s Kh'), parseCards('As Ac 9h 9d Kd'))).toBe(0);
    // Pair of Aces, kickers K,9,7 vs K,9,6
    expect(compareHands(parseCards('Ah Ad Kc 9s 7d'), parseCards('As Ac Kh 9d 6c'))).toBe(1);
  });

  it('trips uses the two highest kickers from seven cards', () => {
    expect(compareHands(parseCards('Ah Ad Ac Kd 9s 8c 2h'), parseCards('Ah Ad Ac Qd 9s 8c 2h'))).toBe(1);
    expect(compareHands(parseCards('Ah Ad Ac Kd 9s 8c 2h'), parseCards('As Ac Ah Kh 8d 7c 3s'))).toBe(1);
  });
});

describe('compareHands', () => {
  it('royal flush beats everything, and equal royals tie', () => {
    expect(compareHands(parseCards('Ah Kh Qh Jh Th 2c 3d'), parseCards('As 2s 3s 4s 5s 9d 8c'))).toBe(1);
    expect(compareHands(parseCards('Ah Kh Qh Jh Th'), parseCards('As Ks Qs Js Ts'))).toBe(0);
  });

  it('CATEGORY_NAME covers every category', () => {
    expect(CATEGORY_NAME).toHaveLength(9);
  });
});
