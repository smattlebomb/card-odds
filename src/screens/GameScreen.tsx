import { Placeholder, Screen } from '../components/Layout';
import type { Rules } from '../lib/blackjack/rules';
import type { DrillKind } from '../lib/stats';
import { GAME_TABS, type Game, type GameTab, type Route } from '../lib/route';
import type { DrillEvent } from '../lib/stats';
import { BlackjackCalculator } from './BlackjackCalculator';
import { BlackjackPractice } from './BlackjackPractice';
import { CountPractice } from './CountPractice';
import { HoldemCalculator } from './HoldemCalculator';
import { HoldemPractice } from './HoldemPractice';

const GAME_TITLE: Record<Game, string> = { blackjack: 'Blackjack', holdem: "Hold'em" };
const TAB_LABEL: Record<GameTab, string> = { calculator: 'Calculator', practice: 'Practice', count: 'Count' };

interface Props {
  game: Game;
  tab: GameTab;
  navigate: (r: Route) => void;
  rules: Rules;
  drills: DrillEvent[];
  onGrade: (kind: DrillKind, correct: boolean) => void;
}

export function GameScreen({ game, tab, navigate, rules, drills, onGrade }: Props) {
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

  let body;
  if (game === 'blackjack' && tab === 'calculator') {
    body = <BlackjackCalculator rules={rules} onEditRules={() => navigate({ screen: 'settings' })} />;
  } else if (game === 'blackjack' && tab === 'practice') {
    body = <BlackjackPractice rules={rules} drills={drills} onGrade={(c) => onGrade('blackjack', c)} />;
  } else if (game === 'blackjack' && tab === 'count') {
    body = <CountPractice decks={rules.decks} drills={drills} onGrade={onGrade} />;
  } else if (game === 'holdem' && tab === 'calculator') {
    body = <HoldemCalculator />;
  } else if (game === 'holdem' && tab === 'practice') {
    body = <HoldemPractice drills={drills} onGrade={(c) => onGrade('holdem', c)} />;
  } else {
    body = <Placeholder text="This section is not available." />;
  }

  return (
    <Screen title={GAME_TITLE[game]} onBack={() => navigate({ screen: 'home' })} nav={nav}>
      {body}
    </Screen>
  );
}
