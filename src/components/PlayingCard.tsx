import { cardName, isRed, RANK_NAME, rankLabel, SUIT_SYMBOL, type Card, type Rank } from '../lib/cards';

const SIZES = {
  sm: 'h-16 w-12 text-xl',
  md: 'h-24 w-[4.5rem] text-3xl',
  lg: 'h-32 w-24 text-4xl',
};

/** A face-up card. Pass `card={null}` for an empty slot. */
export function PlayingCard({ card, size = 'md' }: { card: Card | null; size?: keyof typeof SIZES }) {
  if (!card) {
    return (
      <div
        aria-label="Empty card slot"
        className={`${SIZES[size]} flex items-center justify-center rounded-xl border-2 border-dashed border-felt-400/60 text-chalk/40`}
      >
        ?
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={cardName(card)}
      className={`${SIZES[size]} flex flex-col items-center justify-center rounded-xl bg-chalk font-extrabold leading-none shadow-lg shadow-black/40 ${
        isRed(card.suit) ? 'text-card-red' : 'text-card-black'
      }`}
    >
      <span>{rankLabel(card.rank)}</span>
      <span>{SUIT_SYMBOL[card.suit]}</span>
    </div>
  );
}

/** A card shown by rank only (blackjack: suits don't matter). */
export function RankCard({ rank, size = 'md' }: { rank: Rank; size?: keyof typeof SIZES }) {
  return (
    <div
      role="img"
      aria-label={RANK_NAME[rank]}
      className={`${SIZES[size]} flex items-center justify-center rounded-xl bg-chalk font-extrabold leading-none text-card-black shadow-lg shadow-black/40`}
    >
      {rankLabel(rank)}
    </div>
  );
}
