import { useState } from 'react';
import { RankCard } from '../components/PlayingCard';
import { ACTION_LABEL } from '../lib/blackjack/advise';
import type { Action } from '../lib/blackjack/ev';
import { dealBlackjackSpot, gradeBlackjack, type BlackjackSpot } from '../lib/blackjack/practice';
import type { Rules } from '../lib/blackjack/rules';
import { describeHand, handValue } from '../lib/blackjack/hand';
import { accuracy, type DrillEvent } from '../lib/stats';

const ACTIONS: Action[] = ['hit', 'stand', 'double', 'split', 'surrender'];

interface Props {
  rules: Rules;
  drills: DrillEvent[];
  onGrade: (correct: boolean) => void;
}

export function BlackjackPractice({ rules, drills, onGrade }: Props) {
  const [spot, setSpot] = useState<BlackjackSpot>(() => dealBlackjackSpot(rules));
  const [picked, setPicked] = useState<Action | null>(null);

  const deal = () => {
    setSpot(dealBlackjackSpot(rules));
    setPicked(null);
  };

  const choose = (action: Action) => {
    if (picked) return;
    const { correct } = gradeBlackjack(spot, action);
    setPicked(action);
    onGrade(correct);
  };

  const grade = picked ? gradeBlackjack(spot, picked) : null;
  const score = accuracy(drills, 'blackjack');
  const hand = handValue(spot.player);

  return (
    <div className="flex flex-col gap-5">
      <Scoreline label="Basic strategy" score={score} />
      <p className="text-sm text-chalk/70">Current table rules. No count — just the basic-strategy play.</p>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div className="flex flex-col gap-2 rounded-3xl bg-felt-950/40 p-3">
          <span className="text-sm font-bold uppercase tracking-wide text-chalk/70">Dealer</span>
          <RankCard rank={spot.up} />
        </div>
        <div className="flex flex-col gap-2 rounded-3xl bg-felt-950/40 p-3">
          <span className="text-sm font-bold uppercase tracking-wide text-chalk/70">You · {describeHand(hand)}</span>
          <div className="flex gap-2">
            {spot.player.map((r, i) => (
              <RankCard key={`${r}-${i}`} rank={r} />
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ACTIONS.map((a) => {
          const legal = spot.advice.legal.includes(a);
          const isPick = picked === a;
          const isRight = grade?.expected === a;
          return (
            <button
              key={a}
              type="button"
              disabled={!legal || !!picked}
              aria-label={ACTION_LABEL[a]}
              onClick={() => choose(a)}
              className={`min-h-16 rounded-2xl text-xl font-bold ${
                picked
                  ? isRight
                    ? 'bg-gold text-felt-950'
                    : isPick
                      ? 'bg-rose-500 text-white'
                      : 'bg-felt-950/40 text-chalk/50'
                  : legal
                    ? 'bg-felt-800 text-chalk active:bg-felt-700'
                    : 'bg-felt-950/30 text-chalk/30'
              }`}
            >
              {ACTION_LABEL[a]}
            </button>
          );
        })}
      </div>
      {grade && (
        <section aria-live="polite" className="rounded-3xl bg-felt-950/40 p-5 text-xl">
          <p className="font-extrabold">{grade.correct ? 'Correct' : `The play is ${ACTION_LABEL[grade.expected]}`}</p>
          <p className="mt-2 text-chalk/80">{grade.reason}</p>
        </section>
      )}
      <button type="button" onClick={deal} className="min-h-16 rounded-2xl bg-gold text-xl font-extrabold text-felt-950 active:bg-gold/90">
        {picked ? 'Next hand' : 'Skip'}
      </button>
    </div>
  );
}

export function Scoreline({ label, score }: { label: string; score: { correct: number; total: number; pct: number } }) {
  return (
    <div data-testid="score" className="flex items-center justify-between rounded-2xl bg-felt-950/40 px-4 py-3">
      <span className="font-bold">{label}</span>
      <span className="text-lg font-extrabold text-gold">
        {score.total === 0 ? 'No hands yet' : `${score.correct}/${score.total} · ${Math.round(score.pct * 100)}%`}
      </span>
    </div>
  );
}
