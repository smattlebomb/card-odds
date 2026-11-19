import { describe, expect, it } from 'vitest';
import { parseCards } from './cards';
import { countOuts } from './outs';

describe('countOuts', () => {
  it('is null preflop and on the river', () => {
    expect(countOuts(parseCards('Ah Kd'), [])).toBeNull();
    expect(countOuts(parseCards('Ah Kd'), parseCards('2c 9s 7h Jd 3c'))).toBeNull();
  });

  it('an open-ended straight draw on the flop has 8 outs', () => {
    // 9s 8s on 7h 6d 2c: 5s and Ts (any suit) = 8
    const r = countOuts(parseCards('9s 8s'), parseCards('7h 6d 2c'))!;
    expect(r.count).toBe(8);
    expect(r.cards).toHaveLength(8);
    expect(r.byHand.some((g) => g.hand === 'Straight' && g.count === 8)).toBe(true);
  });

  it('a flush draw has 9 outs', () => {
    // Ah Kh on 9h 4h 2c: 11 hearts left minus the two we hold? We hold 2 hearts, board 2, 9 remain.
    const r = countOuts(parseCards('Ah Kh'), parseCards('9h 4h 2c'))!;
    expect(r.count).toBe(9);
    expect(r.byHand.some((g) => g.hand === 'Flush' && g.count === 9)).toBe(true);
  });

  it('a combo draw (flush + OESD) has more than 9 outs', () => {
    // 9h 8h on 7h 6d 2h: flush hearts (9 left? board has 2 hearts, we have 2, 9 remain)
    // plus 5s and Ts that are not hearts already counted... Ts/5s off-suit: 3+3=6 extra? 
    // 9 hearts + 6 non-heart tens/fives = 15, minus any that pair the board without improving category enough.
    const r = countOuts(parseCards('9h 8h'), parseCards('7h 6d 2h'))!;
    expect(r.count).toBeGreaterThanOrEqual(12);
    expect(r.count).toBeLessThanOrEqual(15);
  });

  it('does not invent outs when the hand is already strong and a pair card is on the board', () => {
    const r = countOuts(parseCards('Ah Ad'), parseCards('Kh Kd 2c'));
    // Overcards to a lower pair already have two pair; further aces would make a full house and should count.
    expect(r).not.toBeNull();
    expect(r!.count).toBeGreaterThan(0);
  });
});
