import { Placeholder, Screen } from '../components/Layout';
import type { Rules } from '../lib/blackjack/rules';
import { BlackjackCalculator } from './BlackjackCalculator';
import { HoldemCalculator } from './HoldemCalculator';
import { GAME_TABS, type Game, type GameTab, type Route } from '../lib/route';

const GAME_TITLE: Record<Game, string> = { blackjack: 'Blackjack', holdem: "Hold'em" };
const TAB_LABEL: Record<GameTab, string> = { calculator: 'Calculator', practice: 'Practice', count: 'Count' };

const PLACEHOLDER: Record<Game, Record<GameTab, string>> = {
  blackjack: {
    calculator: '',
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
  rules: Rules;
}

export function GameScreen({ game, tab, navigate, rules }: Props) {
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
      {game === 'blackjack' && tab === 'calculator' ? (
        <BlackjackCalculator rules={rules} onEditRules={() => navigate({ screen: 'settings' })} />
      ) : game === 'holdem' && tab === 'calculator' ? (
        <HoldemCalculator />
      ) : (
        <div className="flex flex-col gap-6">
          <Placeholder text={PLACEHOLDER[game][tab]} />
        </div>
      )}
    </Screen>
  );
}

