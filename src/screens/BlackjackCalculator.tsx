import { useMemo, useState } from 'react';
import { CardPicker } from '../components/CardPicker';
import { PlayingCard, RankCard } from '../components/PlayingCard';
import { RANK_NAME, type Rank } from '../lib/cards';
import { ACTION_LABEL, advise, type Advice } from '../lib/blackjack/advise';
import type { Action } from '../lib/blackjack/ev';
import { describeHand } from '../lib/blackjack/hand';
import { rulesSummary, type Rules } from '../lib/blackjack/rules';

const MAX_PLAYER_CARDS = 10;

const ACTION_STYLE: Record<Action, string> = {
  hit: 'bg-sky-300 text-felt-950',
  stand: 'bg-gold text-felt-950',
  double: 'bg-emerald-300 text-felt-950',
  split: 'bg-violet-300 text-felt-950',
  surrender: 'bg-rose-300 text-felt-950',
};

/** EV as a percent of the starting bet, e.g. "+12.3%". */
export function formatEv(ev: number): string {
  const pct = ev * 100;
  const s = Math.abs(pct) < 0.05 ? '0.0' : Math.abs(pct).toFixed(1);
  return `${pct > 0.05 ? '+' : pct < -0.05 ? '−' : ''}${s}%`;
}

/** Parse the true-count field: empty → null (basic strategy only). */
export function parseTc(text: string): number | null | 'invalid' {
  const t = text.trim().replace('−', '-').replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && Math.abs(n) <= 30 ? Math.round(n * 10) / 10 : 'invalid';
}

interface Props {
  rules: Rules;
  onEditRules: () => void;
}

export function BlackjackCalculator({ rules, onEditRules }: Props) {
  const [dealer, setDealer] = useState<Rank | null>(null);
  const [player, setPlayer] = useState<Rank[]>([]);
  const [target, setTarget] = useState<'dealer' | 'player'>('dealer');
  const [tcText, setTcText] = useState('');

  const tc = parseTc(tcText);
  const advice = useMemo(
    () => advise(dealer, player, rules, tc === 'invalid' ? null : tc),
    [dealer, player, rules, tc],
  );

  const perRank = 4 * rules.decks;
  const usedOf = (r: Rank) => player.filter((p) => p === r).length + (dealer === r ? 1 : 0);
  const playerFull = player.length >= MAX_PLAYER_CARDS;

  function pick(r: Rank) {
    if (target === 'dealer') {
      setDealer(r);
      setTarget('player');
    } else if (!playerFull) {
      setPlayer((p) => [...p, r]);
    }
  }

  function clearHand() {
    setDealer(null);
    setPlayer([]);
    setTarget('dealer');
  }

  function stepTc(delta: number) {
    const cur = tc === null || tc === 'invalid' ? 0 : tc;
    setTcText(String(Math.round((cur + delta) * 10) / 10));
  }

  const slot = (active: boolean) =>
    `flex min-h-32 flex-col gap-2 rounded-3xl p-3 text-left ${active ? 'bg-felt-950/60 ring-4 ring-gold' : 'bg-felt-950/30'}`;

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onEditRules}
        className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-felt-950/40 px-4 text-left active:bg-felt-950"
      >
        <span>
          <span className="block text-sm text-chalk/60">Table rules</span>
          <span data-testid="rules-summary" className="text-lg font-bold">
            {rulesSummary(rules)}
          </span>
        </span>
        <span className="shrink-0 font-bold text-gold">Change ›</span>
      </button>

      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div data-testid="dealer-slot" onClick={() => setTarget('dealer')} className={slot(target === 'dealer')}>
          <span className="text-sm font-bold uppercase tracking-wide text-chalk/70">Dealer</span>
          {dealer ? <RankCard rank={dealer} /> : <PlayingCard card={null} />}
        </div>

        <div data-testid="player-slot" onClick={() => setTarget('player')} className={`${slot(target === 'player')} min-w-0`}>
          <span className="text-sm font-bold uppercase tracking-wide text-chalk/70">
            You{advice.hand ? ` · ${describeHand(advice.hand)}` : ''}
          </span>
          <div className="flex flex-wrap gap-2">
            {player.length === 0 && <PlayingCard card={null} />}
            {player.map((r, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Remove ${RANK_NAME[r]}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setPlayer((p) => p.filter((_, j) => j !== i));
                  setTarget('player');
                }}
                className="relative rounded-xl"
              >
                <RankCard rank={r} />
                <span aria-hidden className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-felt-950 text-sm font-bold text-chalk">
                  ×
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <QuickAnswer advice={advice} />

      <div role="group" aria-label="Picking cards for" className="grid grid-cols-2 gap-2 rounded-2xl bg-felt-950/50 p-1.5">
        {(['dealer', 'player'] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={target === t}
            onClick={() => setTarget(t)}
            className={`min-h-14 rounded-xl text-lg font-bold ${target === t ? 'bg-gold text-felt-950' : 'text-chalk/80 active:bg-felt-800'}`}
          >
            {t === 'dealer' ? 'Dealer card' : 'Your cards'}
          </button>
        ))}
      </div>

      <CardPicker
        rankOnly
        label={target === 'dealer' ? 'Dealer upcard' : playerFull ? 'Hand is full' : 'Add your cards'}
        onPick={pick}
        isRankDisabled={(r) => (target === 'player' && playerFull) || usedOf(r) >= perRank}
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="true-count" className="text-sm font-bold uppercase tracking-wide text-chalk/70">
            True count (optional)
          </label>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Lower true count" onClick={() => stepTc(-1)} className="h-14 w-14 rounded-2xl bg-felt-950/50 text-2xl font-bold active:bg-felt-950">
              −
            </button>
            <input
              id="true-count"
              type="text"
              inputMode="decimal"
              placeholder="none"
              value={tcText}
              onChange={(e) => setTcText(e.target.value)}
              className={`h-14 w-24 rounded-2xl bg-chalk px-3 text-center text-2xl font-bold text-felt-950 placeholder:text-felt-950/40 ${tc === 'invalid' ? 'ring-4 ring-rose-400' : ''}`}
            />
            <button type="button" aria-label="Raise true count" onClick={() => stepTc(1)} className="h-14 w-14 rounded-2xl bg-felt-950/50 text-2xl font-bold active:bg-felt-950">
              +
            </button>
            {tcText !== '' && (
              <button type="button" onClick={() => setTcText('')} className="h-14 rounded-2xl bg-felt-950/50 px-4 font-bold active:bg-felt-950">
                No count
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={clearHand}
          className="ml-auto h-14 rounded-2xl bg-felt-950/50 px-5 text-lg font-bold active:bg-felt-950"
        >
          Clear hand
        </button>
      </div>

      <Result advice={advice} />
    </div>
  );
}

function Result({ advice }: { advice: Advice }) {
  if (advice.status === 'incomplete' || advice.status === 'invalid' || advice.status === 'bust') {
    return (
      <section aria-live="polite" aria-label="Advice" className="rounded-3xl bg-felt-950/40 p-5 text-xl text-chalk/80">
        {advice.reason}
      </section>
    );
  }
  const action = advice.action!;
  const ev = advice.evs[action];
  const rows = advice.legal.filter((a) => advice.evs[a] !== undefined).sort((a, b) => advice.evs[b]! - advice.evs[a]!);

  return (
    <section aria-live="polite" aria-label="Advice" className="flex flex-col gap-4 rounded-3xl bg-felt-950/50 p-5">
      <div className="flex flex-wrap items-center gap-4">
        <span data-testid="action" className={`rounded-2xl px-6 py-3 text-4xl font-extrabold ${ACTION_STYLE[action]}`}>
          {advice.status === 'blackjack' ? 'Blackjack!' : ACTION_LABEL[action]}
        </span>
        {ev !== undefined && (
          <span className="text-xl">
            EV <strong className="font-extrabold">{formatEv(ev)}</strong>
            <span className="block text-sm text-chalk/60">of your starting bet</span>
          </span>
        )}
      </div>
      <p className="text-xl leading-snug">{advice.reason}</p>
      {advice.insurance && <p className="rounded-2xl bg-felt-800 p-3 text-lg">{advice.insurance}</p>}
      {advice.notes.map((n) => (
        <p key={n} className="text-chalk/80">
          {n}
        </p>
      ))}
      {rows.length > 1 && (
        <table className="w-full text-lg">
          <caption className="pb-1 text-left text-sm font-bold uppercase tracking-wide text-chalk/60">
            EV by action (fresh shoe minus these cards)
          </caption>
          <tbody>
            {rows.map((a) => (
              <tr key={a} className={a === action ? 'font-extrabold text-gold' : ''}>
                <td className="py-1">{ACTION_LABEL[a]}</td>
                <td className="py-1 text-right tabular-nums">{formatEv(advice.evs[a]!)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** One-line answer right under the hand, so it's visible on a phone without scrolling. */
function QuickAnswer({ advice }: { advice: Advice }) {
  const ready = advice.status === 'play' || advice.status === 'blackjack';
  const action = advice.action;
  const ev = action ? advice.evs[action] : undefined;
  return (
    <div
      data-testid="quick-answer"
      className={`flex min-h-16 items-center justify-between gap-3 rounded-2xl px-4 text-2xl font-extrabold ${
        ready && action ? ACTION_STYLE[action] : 'bg-felt-950/30 text-lg font-bold text-chalk/60'
      }`}
    >
      {ready && action ? (
        <>
          <span>
            {advice.status === 'blackjack' ? 'Blackjack!' : ACTION_LABEL[action]}
            {advice.deviation && <span className="ml-2 text-base font-bold">· count play</span>}
          </span>
          {ev !== undefined && <span className="tabular-nums">{formatEv(ev)}</span>}
        </>
      ) : (
        <span>{advice.reason}</span>
      )}
    </div>
  );
}
