import { useState } from 'react';
import { PlayingCard } from '../components/PlayingCard';
import { cardId } from '../lib/cards';
import { potOddsRatio } from '../lib/holdem';
import { dealHoldemSpot, gradeHoldem, type FoldOrCall, type HoldemSpot } from '../lib/holdem/practice';
import { accuracy, type DrillEvent } from '../lib/stats';
import { Scoreline } from './BlackjackPractice';

interface Props {
  drills: DrillEvent[];
  onGrade: (correct: boolean) => void;
}

export function HoldemPractice({ drills, onGrade }: Props) {
  const [spot, setSpot] = useState<HoldemSpot>(() => dealHoldemSpot());
  const [picked, setPicked] = useState<FoldOrCall | null>(null);
  const [busy, setBusy] = useState(false);

  const deal = () => {
    setBusy(true);
    setPicked(null);
    // Yield so the button can show "Dealing…" before a heavier compute.
    setTimeout(() => {
      setSpot(dealHoldemSpot());
      setBusy(false);
    }, 0);
  };

  const choose = (action: FoldOrCall) => {
    if (picked) return;
    const { correct } = gradeHoldem(spot, action);
    setPicked(action);
    onGrade(correct);
  };

  const grade = picked ? gradeHoldem(spot, picked) : null;
  const score = accuracy(drills, 'holdem');

  return (
    <div className="flex flex-col gap-5">
      <Scoreline label="Pot-odds drills" score={score} />
      <p className="text-sm text-chalk/70">Heads-up on the turn against a random hand. Call if a call is +EV (a raise counts as a call here).</p>
      <div className="flex flex-col gap-3">
        <div>
          <span className="text-sm font-bold uppercase tracking-wide text-chalk/70">You</span>
          <div className="mt-2 flex gap-2">
            {spot.hole.map((c) => (
              <PlayingCard key={cardId(c)} card={c} />
            ))}
          </div>
        </div>
        <div>
          <span className="text-sm font-bold uppercase tracking-wide text-chalk/70">Board</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {spot.board.map((c) => (
              <PlayingCard key={cardId(c)} card={c} />
            ))}
          </div>
        </div>
      </div>
      <p className="text-lg">
        Pot {spot.pot} before the bet · <span className="font-bold">{spot.toCall} to call</span> · pot odds {potOddsRatio(spot.pot, spot.toCall)}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {(['fold', 'call'] as const).map((a) => {
          const isPick = picked === a;
          const isRight = grade?.expected === a;
          return (
            <button
              key={a}
              type="button"
              disabled={!!picked || busy}
              aria-label={a === 'fold' ? 'Fold' : 'Call'}
              onClick={() => choose(a)}
              className={`min-h-16 rounded-2xl text-2xl font-extrabold capitalize ${
                picked
                  ? isRight
                    ? 'bg-gold text-felt-950'
                    : isPick
                      ? 'bg-rose-500 text-white'
                      : 'bg-felt-950/40 text-chalk/50'
                  : 'bg-felt-800 text-chalk active:bg-felt-700'
              }`}
            >
              {a}
            </button>
          );
        })}
      </div>
      {grade && (
        <section aria-live="polite" className="rounded-3xl bg-felt-950/40 p-5 text-xl">
          <p className="font-extrabold">{grade.correct ? 'Correct' : `The play is ${grade.expected}`}</p>
          <p className="mt-2 text-chalk/80">{grade.reason}</p>
          <p className="mt-2 text-base text-chalk/70">Equity was {(spot.equity * 100).toFixed(1)}% · you needed {(spot.advice.required * 100).toFixed(0)}% to call.</p>
        </section>
      )}
      <button type="button" onClick={deal} disabled={busy} className="min-h-16 rounded-2xl bg-gold text-xl font-extrabold text-felt-950 active:bg-gold/90 disabled:opacity-60">
        {busy ? 'Dealing…' : picked ? 'Next spot' : 'Skip'}
      </button>
    </div>
  );
}
