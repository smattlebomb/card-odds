import { useRules } from './lib/blackjack/useRules';
import { useRoute } from './lib/route';
import { useStats } from './lib/useStats';
import { GameScreen } from './screens/GameScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { StatsScreen } from './screens/StatsScreen';

export default function App() {
  const [route, navigate] = useRoute();
  const [rules, setRules] = useRules();
  const { stats, addDrill, addHand, removeHand, reset } = useStats();
  switch (route.screen) {
    case 'game':
      return (
        <GameScreen
          game={route.game}
          tab={route.tab}
          navigate={navigate}
          rules={rules}
          drills={stats.drills}
          onGrade={addDrill}
        />
      );
    case 'stats':
      return (
        <StatsScreen navigate={navigate} stats={stats} onLog={addHand} onDelete={removeHand} onReset={reset} />
      );
    case 'settings':
      return <SettingsScreen navigate={navigate} rules={rules} onRulesChange={setRules} />;
    default:
      return <HomeScreen navigate={navigate} />;
  }
}
