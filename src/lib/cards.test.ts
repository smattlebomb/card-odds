import { describe, expect, it } from 'vitest';
import { cardId, cardName, fullDeck, isRed, parseCard, rankLabel } from './cards';

describe('cards', () => {
  it('a full deck has 52 unique cards', () => {
    const deck = fullDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map(cardId)).size).toBe(52);
  });

  it('parses and names cards', () => {
    expect(parseCard('As')).toEqual({ rank: 'A', suit: 's' });
    expect(parseCard('10h')).toEqual({ rank: 'T', suit: 'h' });
    expect(parseCard('td')).toEqual({ rank: 'T', suit: 'd' });
    expect(parseCard('1x')).toBeNull();
    expect(cardName({ rank: 'Q', suit: 'c' })).toBe('Queen of Clubs');
    expect(rankLabel('T')).toBe('10');
  });

  it('knows red suits', () => {
    expect(isRed('h')).toBe(true);
    expect(isRed('d')).toBe(true);
    expect(isRed('s')).toBe(false);
    expect(isRed('c')).toBe(false);
  });
});
