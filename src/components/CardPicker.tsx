import { useState } from 'react';
import {
  cardId,
  isRed,
  RANK_NAME,
  rankLabel,
  RANKS,
  SUIT_NAME,
  SUIT_SYMBOL,
  SUITS,
  type Card,
  type Rank,
  type Suit,
} from '../lib/cards';
import { PlayingCard } from './PlayingCard';

interface CardPickerProps {
  /** Called once both a rank and a suit are chosen (in either order). The picker then resets. */
  onPick: (card: Card) => void;
  /** Card ids (e.g. "As") that are already in play and can't be picked again. */
  used?: readonly string[];
  /** Heading shown above the picker, e.g. "Dealer upcard". */
  label?: string;
}

/**
 * Pick a card with big buttons: tap a rank and a suit, in either order.
 * Shared by the Blackjack and Hold'em screens.
 */
export function CardPicker({ onPick, used = [], label = 'Pick a card' }: CardPickerProps) {
  const [rank, setRank] = useState<Rank | null>(null);
  const [suit, setSuit] = useState<Suit | null>(null);
  const usedSet = new Set(used);

  const isUsed = (r: Rank, s: Suit) => usedSet.has(cardId({ rank: r, suit: s }));
  const rankDisabled = (r: Rank) => (suit ? isUsed(r, suit) : SUITS.every((s) => isUsed(r, s)));
  const suitDisabled = (s: Suit) => (rank ? isUsed(rank, s) : RANKS.every((r) => isUsed(r, s)));

  function choose(r: Rank | null, s: Suit | null) {
    if (r && s) {
      setRank(null);
      setSuit(null);
      onPick({ rank: r, suit: s });
    } else {
      setRank(r);
      setSuit(s);
    }
  }

  const base =
    'flex items-center justify-center rounded-2xl font-extrabold transition-colors disabled:opacity-25 aria-pressed:ring-4 aria-pressed:ring-gold';

  return (
    <section aria-label={label} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <PlayingCard card={rank && suit ? { rank, suit } : null} size="sm" />
        <div>
          <h2 className="text-xl font-bold">{label}</h2>
          <p className="text-chalk/70">
            {rank ? `${RANK_NAME[rank]} — now a suit` : suit ? `${SUIT_NAME[suit]} — now a rank` : 'Tap a rank and a suit'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 sm:grid-cols-13">
        {RANKS.map((r) => (
          <button
            key={r}
            type="button"
            aria-label={RANK_NAME[r]}
            aria-pressed={rank === r}
            disabled={rankDisabled(r)}
            onClick={() => choose(rank === r ? null : r, suit)}
            className={`${base} h-14 bg-chalk text-2xl text-card-black active:bg-gold`}
          >
            {rankLabel(r)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {SUITS.map((s) => (
          <button
            key={s}
            type="button"
            aria-label={SUIT_NAME[s]}
            aria-pressed={suit === s}
            disabled={suitDisabled(s)}
            onClick={() => choose(rank, suit === s ? null : s)}
            className={`${base} h-16 bg-chalk text-4xl active:bg-gold ${isRed(s) ? 'text-card-red' : 'text-card-black'}`}
          >
            {SUIT_SYMBOL[s]}
          </button>
        ))}
      </div>
    </section>
  );
}
