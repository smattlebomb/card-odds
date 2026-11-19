import { useRoute } from './lib/route';
import { GameScreen } from './screens/GameScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { StatsScreen } from './screens/StatsScreen';

export default function App() {
  const [route, navigate] = useRoute();
  switch (route.screen) {
    case 'game':
      return <GameScreen game={route.game} tab={route.tab} navigate={navigate} />;
    case 'stats':
      return <StatsScreen navigate={navigate} />;
    case 'settings':
      return <SettingsScreen navigate={navigate} />;
    default:
      return <HomeScreen navigate={navigate} />;
  }
}
