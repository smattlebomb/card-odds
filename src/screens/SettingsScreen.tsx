import { Disclaimer } from '../components/Disclaimer';
import { Placeholder, Screen } from '../components/Layout';
import type { Route } from '../lib/route';

export function SettingsScreen({ navigate }: { navigate: (r: Route) => void }) {
  return (
    <Screen title="Settings" onBack={() => navigate({ screen: 'home' })}>
      <div className="flex flex-col gap-6">
        <section className="rounded-3xl border-2 border-gold/60 bg-felt-950/40 p-5">
          <h2 className="mb-2 text-xl font-bold text-gold">Please note</h2>
          <Disclaimer className="text-lg text-chalk" />
        </section>
        <Placeholder text="Table rules, counting speed and other settings are coming in a later phase." />
        <section className="text-chalk/70">
          <h2 className="mb-1 text-lg font-bold text-chalk">Privacy</h2>
          <p>Card Odds has no accounts, no server and no analytics. Anything it saves stays in this browser.</p>
        </section>
      </div>
    </Screen>
  );
}
