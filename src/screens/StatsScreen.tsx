import { useState } from 'react';
import { Screen } from '../components/Layout';
import { Segmented } from '../components/Segmented';
import type { Route } from '../lib/route';
import {
  accuracy,
  byDay,
  netAmount,
  type DrillKind,
  type GameKind,
  type HandResult,
  type Stats,
} from '../lib/stats';

const KIND_LABEL: Record<DrillKind, string> = {
  blackjack: 'Blackjack practice',
  holdem: "Hold'em practice",
  'hilo-running': 'Running count',
  'hilo-true': 'True count',
};

interface Props {
  navigate: (r: Route) => void;
  stats: Stats;
  onLog: (entry: { t: number; game: GameKind; result: HandResult; amount: number; note: string }) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
}

export function StatsScreen({ navigate, stats, onLog, onDelete, onReset }: Props) {
  const [game, setGame] = useState<GameKind>('blackjack');
  const [result, setResult] = useState<HandResult>('win');
  const [amount, setAmount] = useState('1');
  const [note, setNote] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const overall = accuracy(stats.drills);
  const net = netAmount(stats.hands);
  const days = byDay(stats.drills).slice(-14);
  const handDays = byDay(stats.hands).slice(-14);

  const submit = () => {
    const n = Number(amount);
    const signed = result === 'push' ? 0 : result === 'loss' ? -Math.abs(n || 0) : Math.abs(n || 0);
    onLog({ t: Date.now(), game, result, amount: signed, note: note.trim() });
    setNote('');
  };

  return (
    <Screen title="Hands & Stats" onBack={() => navigate({ screen: 'home' })}>
      <div className="flex flex-col gap-6">
        <section className="rounded-3xl bg-felt-950/40 p-4">
          <h2 className="text-xl font-bold">Practice accuracy</h2>
          <p data-testid="accuracy-overall" className="mt-1 text-3xl font-extrabold text-gold">
            {overall.total === 0 ? 'No drills yet' : `${overall.correct}/${overall.total} · ${Math.round(overall.pct * 100)}%`}
          </p>
          <ul className="mt-3 flex flex-col gap-1 text-lg">
            {(Object.keys(KIND_LABEL) as DrillKind[]).map((k) => {
              const a = accuracy(stats.drills, k);
              return (
                <li key={k} className="flex justify-between gap-2">
                  <span>{KIND_LABEL[k]}</span>
                  <span className="font-bold">{a.total === 0 ? '—' : `${a.correct}/${a.total}`}</span>
                </li>
              );
            })}
          </ul>
          {days.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-chalk/70">Last {days.length} days</h3>
              <AccuracyChart days={days} />
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-3xl bg-felt-950/40 p-4">
          <h2 className="text-xl font-bold">Log a hand</h2>
          <p className="text-sm text-chalk/70">Manual entry, stored only on this device.</p>
          <Segmented
            label="Game"
            options={[
              { value: 'blackjack', label: 'Blackjack' },
              { value: 'holdem', label: "Hold'em" },
            ]}
            value={game}
            onChange={setGame}
          />
          <Segmented
            label="Result"
            options={[
              { value: 'win', label: 'Win' },
              { value: 'loss', label: 'Loss' },
              { value: 'push', label: 'Push' },
            ]}
            value={result}
            onChange={setResult}
          />
          <label htmlFor="hand-amount" className="font-bold">
            Amount (units)
          </label>
          <input
            id="hand-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-14 rounded-2xl bg-chalk px-4 text-2xl font-bold text-felt-950"
          />
          <label htmlFor="hand-note" className="font-bold">
            Note (optional)
          </label>
          <input
            id="hand-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-14 rounded-2xl bg-chalk px-4 text-lg text-felt-950"
            placeholder="e.g. 16 vs 10, stood"
          />
          <button type="button" onClick={submit} className="min-h-16 rounded-2xl bg-gold text-xl font-extrabold text-felt-950">
            Save hand
          </button>
        </section>

        <section className="rounded-3xl bg-felt-950/40 p-4">
          <h2 className="text-xl font-bold">Results</h2>
          <p data-testid="net" className="mt-1 text-3xl font-extrabold text-gold">
            {stats.hands.length === 0 ? 'No hands logged' : `Net ${net > 0 ? '+' : ''}${net}`}
          </p>
          {handDays.length > 0 && <NetChart days={handDays} />}
          <ul className="mt-3 flex flex-col gap-2">
            {[...stats.hands].reverse().slice(0, 30).map((h) => (
              <li key={h.id} className="flex items-start justify-between gap-3 rounded-2xl bg-felt-950/50 px-3 py-3">
                <div>
                  <p className="font-bold capitalize">
                    {h.game === 'holdem' ? "Hold'em" : 'Blackjack'} · {h.result}
                    {h.amount !== 0 ? ` · ${h.amount > 0 ? '+' : ''}${h.amount}` : ''}
                  </p>
                  <p className="text-sm text-chalk/70">{new Date(h.t).toLocaleString()}</p>
                  {h.note && <p className="text-sm">{h.note}</p>}
                </div>
                <button
                  type="button"
                  aria-label="Delete hand"
                  onClick={() => onDelete(h.id)}
                  className="min-h-12 min-w-12 rounded-xl bg-felt-800 font-bold active:bg-felt-700"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div>
          {!confirmReset ? (
            <button type="button" onClick={() => setConfirmReset(true)} className="min-h-14 w-full rounded-2xl bg-felt-950/50 font-bold">
              Clear all stats
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onReset();
                setConfirmReset(false);
              }}
              className="min-h-14 w-full rounded-2xl bg-rose-600 font-bold"
            >
              Tap again to erase drills and hands
            </button>
          )}
        </div>
      </div>
    </Screen>
  );
}

function AccuracyChart({ days }: { days: { day: string; items: { correct: boolean }[] }[] }) {
  return (
    <div className="mt-2 flex h-24 items-end gap-1" role="img" aria-label="Accuracy by day">
      {days.map(({ day, items }) => {
        const tot = items.length;
        const pct = tot === 0 ? 0 : items.filter((i) => i.correct).length / tot;
        return (
          <div key={day} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-20 w-full items-end rounded-sm bg-felt-950/80">
              <div className="w-full rounded-sm bg-gold" style={{ height: `${Math.max(6, pct * 100)}%` }} title={`${day}: ${Math.round(pct * 100)}%`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NetChart({ days }: { days: { day: string; items: { amount: number }[] }[] }) {
  const nets = days.map((d) => d.items.reduce((s, i) => s + i.amount, 0));
  const max = Math.max(1, ...nets.map(Math.abs));
  return (
    <div className="mt-3 flex h-24 items-center gap-1" role="img" aria-label="Net by day">
      {nets.map((n, i) => (
        <div key={days[i]!.day} className="relative flex h-24 flex-1 items-center">
          <div
            className={`absolute left-0 w-full rounded-sm ${n >= 0 ? 'bottom-1/2 bg-gold' : 'top-1/2 bg-rose-400'}`}
            style={{ height: `${(Math.abs(n) / max) * 50}%` }}
          />
        </div>
      ))}
    </div>
  );
}
