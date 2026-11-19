import { Placeholder, Screen } from '../components/Layout';
import type { Route } from '../lib/route';

export function StatsScreen({ navigate }: { navigate: (r: Route) => void }) {
  return (
    <Screen title="Hands & Stats" onBack={() => navigate({ screen: 'home' })}>
      <Placeholder text="Hand log and practice stats are coming in a later phase. They will stay on this device only." />
    </Screen>
  );
}
