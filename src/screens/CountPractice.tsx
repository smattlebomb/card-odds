import { useEffect, useRef, useState } from 'react';
import { RankCard } from '../components/PlayingCard';
import { Segmented } from '../components/Segmented';
import { parseCountInput, runningCount, shuffledShoe, trueCount } from '../lib/blackjack/hilo';
import type { Decks } from '../lib/blackjack/rules';
import type { Rank } from '../lib/cards';
import { accuracy, type DrillEvent } from '../lib/stats';
import { Scoreline } from './BlackjackPractice';

type Mode = 'running' | 'true';
type Speed = 'manual' | 'slow' | 'medium' | 'fast';

const SPEED_MS: Record<Exclude<Speed, 'manual'>, number> = { slow: 1600, medium: 900, fast: 450 };
const QUIZ_EVERY = 8;

interface Props {
  decks: Decks;
  drills: DrillEvent[];
  onGrade: (kind: 'hilo-running' | 'hilo-true', correct: boolean) => void;
}

export function CountPractice({ decks, drills, onGrade }: Props) {
  const [mode, setMode] = useState<Mode>('running');
  return (
    <div className="flex flex-col gap-5">
      <Segmented
        label="Drill"
        options={[
          { value: 'running', label: 'Running count' },
          { value: 'true', label: 'True count' },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'running' ? (
        <RunningDrill decks={decks} drills={drills} onGrade={(c) => onGrade('hilo-running', c)} />
      ) : (
        <TrueCountDrill decks={decks} drills={drills} onGrade={(c) => onGrade('hilo-true', c)} />
      )}
    </div>
  );
}

function RunningDrill({
  decks,
  drills,
  onGrade,
}: {
  decks: Decks;
  drills: DrillEvent[];
  onGrade: (correct: boolean) => void;
}) {
  const [speed, setSpeed] = useState<Speed>('medium');
  const [shoe, setShoe] = useState<Rank[]>(() => shuffledShoe(decks));
  const [dealt, setDealt] = useState<Rank[]>([]);
  const [quiz, setQuiz] = useState(false);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const score = accuracy(drills, 'hilo-running');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const remaining = shoe.length;
  const done = remaining === 0 && !quiz;

  const stopTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  const dealOne = () => {
    setShoe((sh) => {
      if (sh.length === 0) return sh;
      const next = sh[0]!;
      const rest = sh.slice(1);
      setDealt((d) => {
        const all = [...d, next];
        if (all.length % QUIZ_EVERY === 0 || rest.length === 0) setQuiz(true);
        return all;
      });
      return rest;
    });
  };

  useEffect(() => {
    stopTimer();
    if (quiz || done || speed === 'manual') return;
    timer.current = setInterval(dealOne, SPEED_MS[speed]);
    return stopTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, done, speed, shoe.length]);

  const reset = () => {
    stopTimer();
    setShoe(shuffledShoe(decks));
    setDealt([]);
    setQuiz(false);
    setGuess('');
    setFeedback(null);
  };

  const submit = () => {
    const n = parseCountInput(guess);
    if (n === null) return;
    const actual = runningCount(dealt);
    const correct = n === actual;
    onGrade(correct);
    setFeedback(correct ? `Correct: running count is ${fmt(actual)}.` : `The running count is ${fmt(actual)}.`);
  };

  const resume = () => {
    setQuiz(false);
    setGuess('');
    setFeedback(null);
  };

  const recent = dealt.slice(-8);

  return (
    <div className="flex flex-col gap-4">
      <Scoreline label="Running count" score={score} />
      <p className="text-sm text-chalk/70">
        Hi-Lo: 2–6 are +1, 7–9 are 0, 10 / face / Ace are −1. A {decks}-deck shoe. I'll pause every {QUIZ_EVERY} cards.
      </p>
      <Segmented
        label="Speed"
        options={[
          { value: 'manual', label: 'Tap' },
          { value: 'slow', label: 'Slow' },
          { value: 'medium', label: 'Medium' },
          { value: 'fast', label: 'Fast' },
        ]}
        value={speed}
        onChange={setSpeed}
      />
      <div className="flex min-h-28 flex-wrap items-center gap-2 rounded-3xl bg-felt-950/40 p-3">
        {recent.length === 0 ? (
          <p className="text-chalk/60">Cards will show here.</p>
        ) : (
          recent.map((r, i) => <RankCard key={`${dealt.length}-${i}`} rank={r} size="sm" />)
        )}
      </div>
      <p className="text-sm text-chalk/70">
        Dealt {dealt.length} · {remaining} left
      </p>
      {quiz && (
        <form
          className="flex flex-col gap-3 rounded-3xl bg-felt-950/40 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!feedback) submit();
          }}
        >
          <label htmlFor="rc-guess" className="font-bold">
            What's the running count?
          </label>
          <input
            id="rc-guess"
            inputMode="numeric"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            disabled={!!feedback}
            className="h-14 rounded-2xl bg-chalk px-4 text-center text-2xl font-bold text-felt-950"
            placeholder="e.g. +4"
            autoFocus
          />
          {feedback && <p className="text-xl font-bold">{feedback}</p>}
          {!feedback ? (
            <button type="submit" className="min-h-14 rounded-2xl bg-gold text-lg font-extrabold text-felt-950">
              Check
            </button>
          ) : remaining > 0 ? (
            <button type="button" onClick={resume} className="min-h-14 rounded-2xl bg-gold text-lg font-extrabold text-felt-950">
              Continue
            </button>
          ) : (
            <p className="text-chalk/80">End of the shoe. Start a new one when you're ready.</p>
          )}
        </form>
      )}
      <div className="flex gap-2">
        {speed === 'manual' && !quiz && !done && (
          <button type="button" onClick={dealOne} className="min-h-14 flex-1 rounded-2xl bg-felt-800 text-lg font-bold active:bg-felt-700">
            Deal one
          </button>
        )}
        <button type="button" onClick={reset} className="min-h-14 flex-1 rounded-2xl bg-felt-950/50 text-lg font-bold active:bg-felt-950">
          New shoe
        </button>
      </div>
    </div>
  );
}

function TrueCountDrill({
  decks,
  drills,
  onGrade,
}: {
  decks: Decks;
  drills: DrillEvent[];
  onGrade: (correct: boolean) => void;
}) {
  const make = () => makeTrueSpot(decks);
  const [spot, setSpot] = useState(make);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const score = accuracy(drills, 'hilo-true');

  const submit = () => {
    const n = parseCountInput(guess);
    if (n === null) return;
    const correct = n === spot.tc;
    onGrade(correct);
    setFeedback(
      correct
        ? `Correct: TC is ${fmt(spot.tc)}.`
        : `The true count is ${fmt(spot.tc)} (${fmt(spot.rc)} ÷ ${spot.decksLeft.toFixed(2)} decks, truncated toward zero).`,
    );
  };

  const next = () => {
    setSpot(make());
    setGuess('');
    setFeedback(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <Scoreline label="True count" score={score} />
      <p className="text-sm text-chalk/70">
        TC = running count ÷ remaining decks (cards left ÷ 52), then truncated toward zero. Example: +7 with 1.5 decks left is +4.
      </p>
      <div className="rounded-3xl bg-felt-950/40 p-5 text-xl">
        <p>
          Running count is <span className="font-extrabold text-gold">{fmt(spot.rc)}</span>
        </p>
        <p className="mt-2">
          {spot.remaining} cards left ({spot.decksLeft.toFixed(2)} decks) in a {decks}-deck shoe.
        </p>
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!feedback) submit();
        }}
      >
        <label htmlFor="tc-guess" className="font-bold">
          What's the true count (integer)?
        </label>
        <input
          id="tc-guess"
          inputMode="numeric"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          disabled={!!feedback}
          className="h-14 rounded-2xl bg-chalk px-4 text-center text-2xl font-bold text-felt-950"
          placeholder="e.g. +3"
        />
        {feedback && <p className="text-xl font-bold">{feedback}</p>}
        {!feedback ? (
          <button type="submit" className="min-h-14 rounded-2xl bg-gold text-lg font-extrabold text-felt-950">
            Check
          </button>
        ) : (
          <button type="button" onClick={next} className="min-h-14 rounded-2xl bg-gold text-lg font-extrabold text-felt-950">
            Next
          </button>
        )}
      </form>
    </div>
  );
}

function makeTrueSpot(decks: Decks) {
  const total = decks * 52;
  const remaining = Math.max(13, Math.floor(Math.random() * (total - 12)));
  const rc = Math.floor(Math.random() * 21) - 10; // −10..+10
  const decksLeft = remaining / 52;
  return { remaining, rc, decksLeft, tc: trueCount(rc, remaining) };
}

function fmt(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}
