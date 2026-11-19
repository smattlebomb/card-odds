import { useEffect, useMemo, useState } from 'react';
import { CardPicker } from '../components/CardPicker';
import { PlayingCard } from '../components/PlayingCard';
import { Segmented } from '../components/Segmented';
import { cardId, type Card } from '../lib/cards';
import {
  computeInWorker,
  countOuts,
  DEFAULT_TRIALS,
  GRID_RANKS,
  gridKey,
  handKey,
  HOLDEM_ACTION_LABEL,
  holdemAdvice,
  inOpeningRange,
  MAX_OPPONENTS,
  OPENING_RANGES,
  POSITION_NAME,
  POSITIONS,
  potOddsRatio,
  toInt,
  type ComputeFn,
  type EquityInput,
  type EquityResult,
  type Position,
} from '../lib/holdem';

export type PickTarget = 'hole' | 'board';

const slot = (active: boolean) =>
  `flex flex-col gap-2 rounded-3xl bg-felt-950/40 p-3 ${active ? 'ring-4 ring-gold' : ''}`;

function fmtPct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}

function stepper(value: number, set: (n: number) => void, opts: { min: number; max: number; step: number; id: string; label: string; wide?: boolean }) {
  const clamp = (n: number) => Math.min(opts.max, Math.max(opts.min, n));
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={opts.id} className="text-sm font-bold uppercase tracking-wide text-chalk/70">
        {opts.label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Lower ${opts.label}`}
          onClick={() => set(clamp(value - opts.step))}
          className="h-14 w-14 rounded-2xl bg-felt-950/50 text-2xl font-bold active:bg-felt-950"
        >
          −
        </button>
        <input
          id={opts.id}
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) set(clamp(n));
          }}
          className={`h-14 rounded-2xl bg-chalk px-3 text-center text-2xl font-bold text-felt-950 ${opts.wide ? 'w-28' : 'w-20'}`}
        />
        <button
          type="button"
          aria-label={`Raise ${opts.label}`}
          onClick={() => set(clamp(value + opts.step))}
          className="h-14 w-14 rounded-2xl bg-felt-950/50 text-2xl font-bold active:bg-felt-950"
        >
          +
        </button>
      </div>
    </div>
  );
}

interface Props {
  /** Override equity compute (tests inject a stub or a main-thread function). */
  compute?: ComputeFn;
}

export function HoldemCalculator({ compute = computeInWorker }: Props) {
  const [hole, setHole] = useState<Card[]>([]);
  const [board, setBoard] = useState<Card[]>([]);
  const [target, setTarget] = useState<PickTarget>('hole');
  const [opponents, setOpponents] = useState(1);
  const [pot, setPot] = useState(100);
  const [toCall, setToCall] = useState(50);
  const [equity, setEquity] = useState<EquityResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<Position>('BTN');

  const used = [...hole, ...board].map(cardId);
  const holeFull = hole.length >= 2;
  const boardReady = board.length === 0 || board.length === 3 || board.length === 4 || board.length === 5;
  const canCompute = holeFull && boardReady;

  const input: EquityInput | null = useMemo(() => {
    if (!canCompute) return null;
    return {
      hole: hole.map(toInt),
      board: board.map(toInt),
      opponents,
      trials: DEFAULT_TRIALS,
    };
  }, [hole, board, opponents, canCompute]);

  useEffect(() => {
    if (!input) {
      setEquity(null);
      setPending(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setError(null);
    const onPartial = (partial: EquityResult) => {
      if (!cancelled) setEquity(partial);
    };
    const fail = (err: unknown) => {
      if (!cancelled) {
        setPending(false);
        setError(err instanceof Error ? err.message : 'Could not compute equity.');
      }
    };
    const succeed = (r: EquityResult) => {
      if (!cancelled) {
        setEquity(r);
        setPending(false);
      }
    };
    try {
      const ret = compute(input, onPartial);
      if (ret && typeof (ret as Promise<EquityResult>).then === 'function') {
        setPending(true);
        (ret as Promise<EquityResult>).then(succeed, fail);
      } else {
        succeed(ret as EquityResult);
      }
    } catch (err) {
      fail(err);
    }
    return () => {
      cancelled = true;
    };
  }, [input, compute]);

  const outs = useMemo(() => {
    if (hole.length !== 2 || (board.length !== 3 && board.length !== 4)) return null;
    return countOuts(hole.map(toInt), board.map(toInt));
  }, [hole, board]);

  const advice = equity ? holdemAdvice({ equity: equity.equity, opponents, pot, toCall, outs: outs?.count }) : null;

  const removeHole = (i: number) => setHole((h) => h.filter((_, j) => j !== i));
  const removeBoard = (i: number) => setBoard((b) => b.filter((_, j) => j !== i));

  const onPick = (card: Card) => {
    if (target === 'hole') {
      if (hole.length >= 2) return;
      setHole((h) => [...h, card]);
      if (hole.length + 1 >= 2 && board.length < 5) setTarget('board');
    } else {
      if (board.length >= 5) return;
      setBoard((b) => [...b, card]);
    }
  };

  const clear = () => {
    setHole([]);
    setBoard([]);
    setTarget('hole');
    setEquity(null);
  };

  const pickerLabel =
    target === 'hole'
      ? hole.length === 0
        ? 'Your first hole card'
        : 'Your second hole card'
      : board.length < 3
        ? `Flop (${board.length + 1} of 3)`
        : board.length === 3
          ? 'Turn'
          : 'River';

  const rangeHand = hole.length === 2 ? handKey(hole[0], hole[1]) : null;
  const inRange = hole.length === 2 ? inOpeningRange(hole[0], hole[1], position) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div data-testid="hole-slot" onClick={() => setTarget('hole')} className={slot(target === 'hole')} role="button" tabIndex={0}>
          <span className="text-sm font-bold uppercase tracking-wide text-chalk/70">You</span>
          <div className="flex gap-2">
            {[0, 1].map((i) => (
              <button
                key={i}
                type="button"
                aria-label={hole[i] ? `Remove ${cardId(hole[i])}` : 'Empty hole card'}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hole[i]) removeHole(i);
                  else setTarget('hole');
                }}
              >
                <PlayingCard card={hole[i] ?? null} />
              </button>
            ))}
          </div>
        </div>
        <div data-testid="board-slot" onClick={() => setTarget('board')} className={`${slot(target === 'board')} min-w-0`} role="button" tabIndex={0}>
          <span className="text-sm font-bold uppercase tracking-wide text-chalk/70">Board</span>
          <div className="flex flex-wrap gap-2">
            {board.length === 0 ? (
              <PlayingCard card={null} />
            ) : (
              board.map((c, i) => (
                <button
                  key={cardId(c)}
                  type="button"
                  aria-label={`Remove ${cardId(c)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBoard(i);
                  }}
                >
                  <PlayingCard card={c} />
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div role="group" aria-label="Picking cards for" className="grid grid-cols-2 gap-2 rounded-2xl bg-felt-950/50 p-1.5">
        {(['hole', 'board'] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={target === t}
            onClick={() => setTarget(t)}
            className={`min-h-14 rounded-xl text-lg font-bold ${target === t ? 'bg-gold text-felt-950' : 'text-chalk/80 active:bg-felt-800'}`}
          >
            {t === 'hole' ? 'Hole cards' : 'Board'}
          </button>
        ))}
      </div>

      {((target === 'hole' && !holeFull) || (target === 'board' && board.length < 5)) && (
        <CardPicker label={pickerLabel} used={used} onPick={onPick} />
      )}

      <div className="flex flex-wrap items-end gap-4">
        {stepper(opponents, setOpponents, { min: 1, max: MAX_OPPONENTS, step: 1, id: 'opponents', label: 'Opponents' })}
        {stepper(pot, setPot, { min: 0, max: 1_000_000, step: 10, id: 'pot', label: 'Pot before bet', wide: true })}
        {stepper(toCall, setToCall, { min: 0, max: 1_000_000, step: 5, id: 'to-call', label: 'To call', wide: true })}
        <button type="button" onClick={clear} className="ml-auto h-14 rounded-2xl bg-felt-950/50 px-5 text-lg font-bold active:bg-felt-950">
          Clear
        </button>
      </div>

      <section aria-live="polite" aria-label="Advice" className="rounded-3xl bg-felt-950/40 p-5">
        {!holeFull ? (
          <p className="text-xl text-chalk/80">Pick your two hole cards to get started.</p>
        ) : !boardReady ? (
          <p className="text-xl text-chalk/80">Add the flop (three cards), or clear the partial board.</p>
        ) : error ? (
          <p className="text-xl text-rose-300">{error}</p>
        ) : !equity ? (
          <p className="text-xl text-chalk/80">Running the numbers…</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-sm font-bold uppercase tracking-wide text-chalk/70">Equity</div>
                <div data-testid="equity" className="text-4xl font-extrabold text-gold">
                  {equity.exact ? '' : '~'}
                  {fmtPct(equity.equity)}
                </div>
                <div className="text-sm text-chalk/70">
                  {equity.exact ? 'Exact' : `Estimate · ${equity.samples.toLocaleString()} deals`}
                  {pending ? ' · updating…' : ''}
                  {' · '}
                  win {fmtPct(equity.win)}
                  {equity.tie > 0.001 ? ` · tie ${fmtPct(equity.tie)}` : ''}
                </div>
              </div>
              {advice && (
                <div data-testid="action" className="rounded-2xl bg-gold px-5 py-3 text-3xl font-extrabold text-felt-950">
                  {HOLDEM_ACTION_LABEL[advice.action]}
                </div>
              )}
            </div>
            {outs && (
              <p data-testid="outs" className="text-lg">
                <span className="font-bold">{outs.count} outs</span>
                {outs.byHand.length > 0 ? ` (${outs.byHand.map((g) => `${g.count} ${g.hand.toLowerCase()}`).join(', ')})` : ''}
                . Rule of {board.length === 3 ? '4' : '2'}: about {fmtPct(outs.ruleOfThumb, 0)} to hit by the river.
              </p>
            )}
            {toCall > 0 && (
              <p data-testid="pot-odds" className="text-lg">
                Pot odds {potOddsRatio(pot, toCall)} · need {fmtPct(advice?.required ?? 0, 0)} equity to call.
              </p>
            )}
            {advice && <p className="text-xl">{advice.reason}</p>}
            {advice?.notes.map((n) => (
              <p key={n} className="text-base text-chalk/70">
                {n}
              </p>
            ))}
          </div>
        )}
      </section>

      {board.length === 0 && (
        <section aria-label="Preflop opening chart" className="flex flex-col gap-3 rounded-3xl bg-felt-950/40 p-4">
          <div>
            <h2 className="text-xl font-bold">Preflop opens</h2>
            <p className="text-sm text-chalk/70">
              Tight-ish 6-max cash opening guide (RFI), not a solver. The big blind already posted, so it has no opening range here.
            </p>
          </div>
          <Segmented
            label="Your position"
            options={POSITIONS.map((p) => ({ value: p, label: p }))}
            value={position}
            onChange={setPosition}
          />
          {rangeHand && (
            <p data-testid="range-call" className="text-lg">
              <span className="font-bold">{rangeHand}</span>
              {position === 'BB'
                ? ' — the big blind does not open in this chart.'
                : inRange
                  ? ` is an open from ${POSITION_NAME[position]}.`
                  : ` is a fold (or a call, not an open) from ${POSITION_NAME[position]} on this chart.`}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="mx-auto border-separate border-spacing-0.5 text-center text-[11px] font-bold leading-none sm:text-xs" aria-label="Opening range grid">
              <tbody>
                {GRID_RANKS.map((row) => (
                  <tr key={row}>
                    {GRID_RANKS.map((col) => {
                      const key = gridKey(row, col);
                      const on = OPENING_RANGES[position].has(key);
                      const isHero = rangeHand === key;
                      return (
                        <td key={key}>
                          <div
                            data-hand={key}
                            className={`flex h-7 w-7 items-center justify-center rounded-sm sm:h-8 sm:w-8 ${
                              isHero ? 'ring-2 ring-gold' : ''
                            } ${on ? 'bg-gold text-felt-950' : 'bg-felt-950/80 text-chalk/50'}`}
                          >
                            {key}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

