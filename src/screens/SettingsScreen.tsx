import { Disclaimer } from '../components/Disclaimer';
import { Placeholder, Screen } from '../components/Layout';
import { Segmented } from '../components/Segmented';
import { DEFAULT_RULES, rulesSummary, type Rules } from '../lib/blackjack/rules';
import type { Route } from '../lib/route';

interface Props {
  navigate: (r: Route) => void;
  rules: Rules;
  onRulesChange: (r: Rules) => void;
}

const ON_OFF = [
  { value: true, label: 'On' },
  { value: false, label: 'Off' },
] as const;

export function SettingsScreen({ navigate, rules, onRulesChange }: Props) {
  const set = <K extends keyof Rules>(k: K) => (v: Rules[K]) => onRulesChange({ ...rules, [k]: v });

  return (
    <Screen title="Settings" onBack={() => navigate({ screen: 'home' })}>
      <div className="flex flex-col gap-6">
        <section className="rounded-3xl border-2 border-gold/60 bg-felt-950/40 p-5">
          <h2 className="mb-2 text-xl font-bold text-gold">Please note</h2>
          <Disclaimer className="text-lg text-chalk" />
        </section>

        <section aria-labelledby="bj-rules" className="flex flex-col gap-5 rounded-3xl bg-felt-950/30 p-5">
          <div>
            <h2 id="bj-rules" className="text-2xl font-extrabold">
              Blackjack table rules
            </h2>
            <p className="text-chalk/70">{rulesSummary(rules)}</p>
          </div>
          <Segmented
            label="Decks"
            options={[1, 2, 6, 8].map((d) => ({ value: d as Rules['decks'], label: String(d) }))}
            value={rules.decks}
            onChange={set('decks')}
          />
          <Segmented
            label="Soft 17"
            options={[
              { value: false, label: 'Dealer stands (S17)' },
              { value: true, label: 'Dealer hits (H17)' },
            ]}
            value={rules.hitSoft17}
            onChange={set('hitSoft17')}
          />
          <Segmented label="Double after split" options={ON_OFF} value={rules.das} onChange={set('das')} />
          <Segmented
            label="Late surrender"
            hint="Give up half your bet after the dealer checks for blackjack."
            options={ON_OFF}
            value={rules.surrender}
            onChange={set('surrender')}
          />
          <Segmented
            label="Blackjack pays"
            options={[
              { value: '3:2', label: '3:2' },
              { value: '6:5', label: '6:5' },
            ]}
            value={rules.blackjackPays}
            onChange={set('blackjackPays')}
          />
          <Segmented
            label="Double down on"
            options={[
              { value: 'any', label: 'Any two' },
              { value: '9-11', label: '9–11' },
              { value: '10-11', label: '10–11' },
            ]}
            value={rules.doubleOn}
            onChange={set('doubleOn')}
          />
          <p className="text-sm text-chalk/60">
            Always assumed: the dealer peeks for blackjack with an Ace or 10 up; pairs split up to four hands; split
            Aces get one card each; no doubling after hitting; surrender is late (first two cards only).
          </p>
          <button
            type="button"
            onClick={() => onRulesChange({ ...DEFAULT_RULES })}
            className="min-h-14 self-start rounded-2xl bg-felt-950/50 px-5 text-lg font-bold active:bg-felt-950"
          >
            Reset to defaults
          </button>
        </section>

        <Placeholder text="Counting speed and other settings are coming in a later phase." />
        <section className="text-chalk/70">
          <h2 className="mb-1 text-lg font-bold text-chalk">Privacy</h2>
          <p>Card Odds has no accounts, no server and no analytics. Anything it saves stays in this browser.</p>
        </section>
      </div>
    </Screen>
  );
}
