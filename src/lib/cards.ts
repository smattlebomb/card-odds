/** Card model shared by the Blackjack and Hold'em tools. */

export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
export const SUITS = ['s', 'h', 'd', 'c'] as const;

export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];

export interface Card {
  rank: Rank;
  suit: Suit;
}

export const SUIT_SYMBOL: Record<Suit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const SUIT_NAME: Record<Suit, string> = { s: 'Spades', h: 'Hearts', d: 'Diamonds', c: 'Clubs' };
export const RANK_NAME: Record<Rank, string> = {
  A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack', T: 'Ten',
  '9': 'Nine', '8': 'Eight', '7': 'Seven', '6': 'Six', '5': 'Five', '4': 'Four', '3': 'Three', '2': 'Two',
};

/** How a rank is printed on a card face: T shows as 10. */
export function rankLabel(rank: Rank): string {
  return rank === 'T' ? '10' : rank;
}

export function isRed(suit: Suit): boolean {
  return suit === 'h' || suit === 'd';
}

/** Short id, e.g. "As", "Th". */
export function cardId(card: Card): string {
  return card.rank + card.suit;
}

export function cardName(card: Card): string {
  return `${RANK_NAME[card.rank]} of ${SUIT_NAME[card.suit]}`;
}

/** Parse "As" / "10h" / "th" into a Card, or null if invalid. */
export function parseCard(text: string): Card | null {
  const m = /^(10|[2-9TJQKA])([shdc])$/i.exec(text.trim());
  if (!m) return null;
  const rank = (m[1] === '10' ? 'T' : m[1].toUpperCase()) as Rank;
  return { rank, suit: m[2].toLowerCase() as Suit };
}

export function fullDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));
}
