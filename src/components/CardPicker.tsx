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
import { PlayingCard, RankCard } from './PlayingCard';

interface CommonProps {
  /** Heading shown above the picker, e.g. "Dealer upcard". */
  label?: string;
}

interface SuitedProps extends CommonProps {
  rankOnly?: false;
  /** Called once both a rank and a suit are chosen (in either order). The picker then resets. */
  onPick: (card: Card) => void;
  /** Card ids (e.g. "As") that are already in play and can't be picked again. */
  used?: readonly string[];
}

interface RankOnlyProps extends CommonProps {
  /** Rank-only mode (blackjack, where suits don't matter): one tap picks a rank. */
  rankOnly: true;
  onPick: (rank: Rank) => void;
  /** Ranks that can't be picked (e.g. none of that rank left in the shoe). */
  isRankDisabled?: (rank: Rank) => boolean;
}

export type CardPickerProps = SuitedProps | RankOnlyProps;

const BASE =
  'flex items-center justify-center rounded-2xl font-extrabold transition-colors disabled:opacity-25 aria-pressed:ring-4 aria-pressed:ring-gold';
const RANK_BTN = `${BASE} h-14 bg-chalk text-2xl text-card-black active:bg-gold`;
const RANK_GRID = 'grid grid-cols-7 gap-2 sm:grid-cols-13';

/**
 * Pick a card with big buttons. Suited mode: tap a rank and a suit, in either order (Hold'em).
 * Rank-only mode: one tap per card (blackjack).
 */
export function CardPicker(props: CardPickerProps) {
  return props.rankOnly ? <RankOnlyPicker {...props} /> : <SuitedPicker {...props} />;
}

function RankOnlyPicker({ onPick, isRankDisabled, label = 'Pick a card' }: RankOnlyProps) {
  return (
    <section aria-label={label} className="flex flex-col gap-3">
      <h2 className="text-xl font-bold">{label}</h2>
      <div className={RANK_GRID}>
        {RANKS.map((r) => (
          <button
            key={r}
            type="button"
            aria-label={RANK_NAME[r]}
            disabled={isRankDisabled?.(r) ?? false}
            onClick={() => onPick(r)}
            className={RANK_BTN}
          >
            {rankLabel(r)}
          </button>
        ))}
      </div>
    </section>
  );
}

function SuitedPicker({ onPick, used = [], label = 'Pick a card' }: SuitedProps) {
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

  return (
    <section aria-label={label} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {rank && !suit ? <RankCard rank={rank} size="sm" /> : <PlayingCard card={null} size="sm" />}
        <div>
          <h2 className="text-xl font-bold">{label}</h2>
          <p className="text-chalk/70">
            {rank ? `${RANK_NAME[rank]} — now a suit` : suit ? `${SUIT_NAME[suit]} — now a rank` : 'Tap a rank and a suit'}
          </p>
        </div>
      </div>

      <div className={RANK_GRID}>
        {RANKS.map((r) => (
          <button
            key={r}
            type="button"
            aria-label={RANK_NAME[r]}
            aria-pressed={rank === r}
            disabled={rankDisabled(r)}
            onClick={() => choose(rank === r ? null : r, suit)}
            className={RANK_BTN}
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
            className={`${BASE} h-16 bg-chalk text-4xl active:bg-gold ${isRed(s) ? 'text-card-red' : 'text-card-black'}`}
          >
            {SUIT_SYMBOL[s]}
          </button>
        ))}
      </div>
    </section>
  );
}
