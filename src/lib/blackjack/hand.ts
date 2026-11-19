/** Blackjack hand values. Suits don't matter in blackjack, so hands are lists of ranks. */
import type { Rank } from '../cards';

/** Point value with Ace = 1 (the engine's card index, 1..10). */
export function cardValue(rank: Rank): number {
  if (rank === 'A') return 1;
  if (rank === 'T' || rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return Number(rank);
}

/** Dealer upcard as it's written on strategy charts: 2..10, Ace = 11. */
export function upcardValue(rank: Rank): number {
  return rank === 'A' ? 11 : cardValue(rank);
}

export interface HandValue {
  /** Best total: an Ace counts 11 when that doesn't bust. */
  total: number;
  /** True when an Ace is being counted as 11. */
  soft: boolean;
  bust: boolean;
  /** Ace + ten-value card as the first two cards. */
  blackjack: boolean;
  /** The rank when the hand is exactly two cards of the same rank (T+K is not a pair). */
  pair: Rank | null;
  cards: number;
}

export function totalOf(values: readonly number[]): { total: number; soft: boolean } {
  let hard = 0;
  let ace = false;
  for (const v of values) {
    hard += v;
    if (v === 1) ace = true;
  }
  const soft = ace && hard + 10 <= 21;
  return { total: soft ? hard + 10 : hard, soft };
}

export function handValue(ranks: readonly Rank[]): HandValue {
  const { total, soft } = totalOf(ranks.map(cardValue));
  const two = ranks.length === 2;
  return {
    total,
    soft,
    bust: total > 21,
    blackjack: two && total === 21,
    pair: two && ranks[0] === ranks[1] ? ranks[0] : null,
    cards: ranks.length,
  };
}

/** "soft 18", "hard 16", "blackjack", "bust (24)". */
export function describeHand(h: HandValue): string {
  if (h.blackjack) return 'blackjack';
  if (h.bust) return `bust (${h.total})`;
  return `${h.soft ? 'soft' : 'hard'} ${h.total}`;
}
