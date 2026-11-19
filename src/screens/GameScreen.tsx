import { useState } from 'react';
import { CardPicker } from '../components/CardPicker';
import { Placeholder, Screen } from '../components/Layout';
import { PlayingCard } from '../components/PlayingCard';
import { cardId, type Card } from '../lib/cards';
import { GAME_TABS, type Game, type GameTab, type Route } from '../lib/route';

const GAME_TITLE: Record<Game, string> = { blackjack: 'Blackjack', holdem: "Hold'em" };
const TAB_LABEL: Record<GameTab, string> = { calculator: 'Calculator', practice: 'Practice', count: 'Count' };

const PLACEHOLDER: Record<Game, Record<GameTab, string>> = {
  blackjack: {
    calculator: 'Best-play calculator is coming in a later phase.',
    practice: 'Basic-strategy drills are coming in a later phase.',
    count: 'Hi-Lo counting practice is coming in a later phase.',
  },
  holdem: {
    calculator: 'Equity and pot-odds calculator is coming in a later phase.',
    practice: 'Call/fold drills are coming in a later phase.',
    count: '',
  },
};

interface Props {
  game: Game;
  tab: GameTab;
  navigate: (r: Route) => void;
}

export function GameScreen({ game, tab, navigate }: Props) {
  const tabs = GAME_TABS[game];
  const nav = (
    <nav aria-label={`${GAME_TITLE[game]} sections`} className="px-4 pt-3">
      <div className="flex gap-2 rounded-2xl bg-felt-950/50 p-1.5">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            aria-current={t === tab ? 'page' : undefined}
            onClick={() => navigate({ screen: 'game', game, tab: t })}
            className={`min-h-14 flex-1 rounded-xl text-lg font-bold ${
              t === tab ? 'bg-gold text-felt-950' : 'text-chalk/80 active:bg-felt-800'
            }`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>
    </nav>
  );

  return (
    <Screen title={GAME_TITLE[game]} onBack={() => navigate({ screen: 'home' })} nav={nav}>
      <div className="flex flex-col gap-6">
        <Placeholder text={PLACEHOLDER[game][tab]} />
        {tab === 'calculator' && <PickerPreview max={game === 'holdem' ? 7 : 6} />}
      </div>
    </Screen>
  );
}

/** Lets the card picker be tried on a device before the calculators exist. */
function PickerPreview({ max }: { max: number }) {
  const [cards, setCards] = useState<Card[]>([]);
  const full = cards.length >= max;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-24 flex-wrap items-center gap-2">
        {cards.length === 0 ? (
          <PlayingCard card={null} />
        ) : (
          cards.map((c) => <PlayingCard key={cardId(c)} card={c} />)
        )}
        {cards.length > 0 && (
          <button
            type="button"
            onClick={() => setCards([])}
            className="ml-auto min-h-14 rounded-2xl bg-felt-950/50 px-5 text-lg font-bold active:bg-felt-950"
          >
            Clear
          </button>
        )}
      </div>
      {!full && (
        <CardPicker
          label="Card picker preview"
          used={cards.map(cardId)}
          onPick={(c) => setCards((prev) => [...prev, c])}
        />
      )}
    </div>
  );
}
