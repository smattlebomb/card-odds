import { describe, expect, it } from 'vitest';
import { hiloValue, parseCountInput, remainingDecks, runningCount, shuffledShoe, trueCount } from './hilo';
import { mulberry } from './practice';

describe('Hi-Lo values', () => {
  it('assigns +1 / 0 / −1 to the usual groups', () => {
    for (const r of ['2', '3', '4', '5', '6'] as const) expect(hiloValue(r)).toBe(1);
    for (const r of ['7', '8', '9'] as const) expect(hiloValue(r)).toBe(0);
    for (const r of ['T', 'J', 'Q', 'K', 'A'] as const) expect(hiloValue(r)).toBe(-1);
  });

  it('running count of a full single deck is 0', () => {
    const shoe = shuffledShoe(1, mulberry(3));
    expect(shoe).toHaveLength(52);
    expect(runningCount(shoe)).toBe(0);
    expect(runningCount(shuffledShoe(6, mulberry(4)))).toBe(0);
  });
});

describe('true count (truncate toward zero)', () => {
  it('divides by remaining decks at full precision', () => {
    expect(remainingDecks(52)).toBe(1);
    expect(remainingDecks(26)).toBe(0.5);
    expect(trueCount(6, 52)).toBe(6);
    expect(trueCount(6, 26)).toBe(12);
    // 7 / 1.5 decks = 4.666… → 4
    expect(trueCount(7, 78)).toBe(4);
    // −7 / 1.5 = −4.666… → −4 (toward zero, not floor-to-−5)
    expect(trueCount(-7, 78)).toBe(-4);
  });

  it('parses integer count input, including a leading +', () => {
    expect(parseCountInput('+3')).toBe(3);
    expect(parseCountInput('-2')).toBe(-2);
    expect(parseCountInput('0')).toBe(0);
    expect(parseCountInput('1.5')).toBeNull();
    expect(parseCountInput('')).toBeNull();
  });
});
