import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  describeRange,
  GRID_RANKS,
  gridKey,
  liveCombos,
  parseRange,
  POSITIONS,
  positionRange,
  positionRangeName,
  rangeComboCount,
  THREE_BET_RANGES,
  topPercent,
  type Position,
  type RangeStyle,
} from '../lib/holdem/ranges';

export interface RangeChoice {
  /** Hand keys, or null for random hands. */
  keys: string[] | null;
  /** Preset name, "Custom", or null for random. */
  name: string | null;
}

interface Props {
  /** "Opponent 2" etc. */
  who: string;
  initial: RangeChoice;
  /** Cards already out (your hole cards, the board): used to show live combos. */
  dead: readonly number[];
  /** Show "Use for all opponents" (more than one opponent). */
  canApplyAll: boolean;
  onApply: (choice: RangeChoice) => void;
  onApplyAll: (choice: RangeChoice) => void;
  onCancel: () => void;
}

const QUICK_PERCENTS = [5, 10, 15, 20, 30, 50];

const btn = 'min-h-12 rounded-xl px-3 text-base font-bold active:bg-felt-800';
const pressed = (on: boolean) => (on ? 'bg-gold text-felt-950' : 'bg-felt-950/50 text-chalk/90');

/**
 * Full-screen opponent-range editor. Tap a cell to toggle a hand; drag across cells to paint
 * (the first cell decides add or remove). Presets replace the whole range.
 */
export function RangeEditor({ who, initial, dead, canApplyAll, onApply, onApplyAll, onCancel }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial.keys ?? []));
  const [name, setName] = useState<string>(initial.name ?? 'Custom');
  const [style, setStyle] = useState<RangeStyle>('tight');
  const [percent, setPercent] = useState(15);

  // Drag-paint state. A drag that crosses cells suppresses the click that follows it.
  const drag = useRef<{ mode: boolean; start: string; moved: boolean; seen: Set<string> } | null>(null);
  const suppressClick = useRef(false);

  const setKey = (key: string, on: boolean) =>
    setSelected((prev) => {
      if (prev.has(key) === on) return prev;
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  const toggle = (key: string) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setKey(key, !selected.has(key));
    setName('Custom');
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const key = (e.target as HTMLElement).closest<HTMLElement>('[data-hand]')?.dataset.hand;
    if (!key) return;
    drag.current = { mode: !selected.has(key), start: key, moved: false, seen: new Set([key]) };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const el = document.elementFromPoint?.(e.clientX, e.clientY) as HTMLElement | null;
    const key = el?.closest<HTMLElement>('[data-hand]')?.dataset.hand;
    if (!key || d.seen.has(key)) return;
    if (!d.moved) {
      d.moved = true;
      setKey(d.start, d.mode);
    }
    d.seen.add(key);
    setKey(key, d.mode);
    setName('Custom');
  };

  const endDrag = () => {
    if (drag.current?.moved) suppressClick.current = true;
    drag.current = null;
  };

  const apply = (keys: Set<string>, presetName: string) => {
    setSelected(keys);
    setName(presetName);
  };

  const keys = [...selected];
  const combos = rangeComboCount(keys);
  const live = liveCombos(keys, dead).length;
  const choice = (): RangeChoice => ({ keys: keys.length ? keys : null, name: keys.length ? name : null });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Opponent range for ${who}`}
      className="fixed inset-0 z-50 overflow-y-auto bg-felt-900"
      style={{ padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)' }}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold">Opponent range</h2>
            <p className="text-chalk/70">{who}</p>
          </div>
          <button type="button" onClick={onCancel} className={`${btn} min-h-14 bg-felt-950/50 px-5`}>
            Cancel
          </button>
        </header>

        <p data-testid="range-summary" className="text-lg">
          <span className="font-bold">{keys.length ? name : 'No hands selected'}</span>
          {keys.length > 0 && (
            <>
              {' · '}
              {describeRange(keys)}
              {live !== combos && <span className="text-chalk/70"> ({live} live after your cards and the board)</span>}
            </>
          )}
        </p>

        <div
          role="grid"
          aria-label="Range grid: tap or drag to select hands"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
          className="grid select-none grid-cols-13 gap-px rounded-xl bg-felt-950 p-px"
          style={{ touchAction: 'none' }}
        >
          {GRID_RANKS.map((row) =>
            GRID_RANKS.map((col) => {
              const key = gridKey(row, col);
              const on = selected.has(key);
              const pair = row === col;
              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  data-hand={key}
                  aria-label={key}
                  aria-pressed={on}
                  onClick={() => toggle(key)}
                  className={`flex aspect-square items-center justify-center rounded-[3px] text-[9px] font-bold leading-none sm:text-xs ${
                    on ? 'bg-gold text-felt-950' : pair ? 'bg-felt-800 text-chalk/70' : 'bg-felt-900 text-chalk/50'
                  }`}
                >
                  {key}
                </button>
              );
            }),
          )}
        </div>

        <section aria-label="Position presets" className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold">By position</h3>
            <div role="group" aria-label="Range style" className="flex gap-1 rounded-xl bg-felt-950/50 p-1">
              {(['tight', 'loose'] as const).map((s) => (
                <button key={s} type="button" aria-pressed={style === s} onClick={() => setStyle(s)} className={`${btn} min-w-20 ${pressed(style === s)}`}>
                  {s === 'tight' ? 'Tight' : 'Loose'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {POSITIONS.map((p: Position) => (
              <button
                key={p}
                type="button"
                aria-label={`${p} ${style} range`}
                onClick={() => apply(positionRange(p, style), positionRangeName(p, style))}
                className={`${btn} min-h-14 bg-felt-950/50`}
              >
                {p}
              </button>
            ))}
          </div>
          <p className="text-sm text-chalk/60">
            UTG–SB are opening ranges, BB is a defend range. Typical 6-max cash styles, not solver output.
          </p>
        </section>

        <section aria-label="3-bet presets" className="flex flex-col gap-2">
          <h3 className="text-lg font-bold">3-bet ranges</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(THREE_BET_RANGES).map((r) => (
              <button key={r.name} type="button" onClick={() => apply(parseRange(r.text), r.name)} className={`${btn} min-h-14 bg-felt-950/50`}>
                {r.name}
                <span className="block text-xs font-normal text-chalk/60">{r.text}</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-label="Top percent of hands" className="flex flex-col gap-2">
          <label htmlFor="top-percent" className="text-lg font-bold">
            Top {percent}% of hands
          </label>
          <input
            id="top-percent"
            type="range"
            min={1}
            max={100}
            value={percent}
            onChange={(e) => {
              const p = Number(e.target.value);
              setPercent(p);
              apply(topPercent(p), `Top ${p}%`);
            }}
            className="h-12 w-full accent-gold"
          />
          <div className="grid grid-cols-6 gap-2">
            {QUICK_PERCENTS.map((p) => (
              <button
                key={p}
                type="button"
                aria-label={`Top ${p}%`}
                onClick={() => {
                  setPercent(p);
                  apply(topPercent(p), `Top ${p}%`);
                }}
                className={`${btn} min-h-12 ${pressed(name === `Top ${p}%`)}`}
              >
                {p}%
              </button>
            ))}
          </div>
          <p className="text-sm text-chalk/60">Hands ordered by the Chen formula, a classic hand-strength rule of thumb.</p>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => apply(new Set(), 'Custom')} className={`${btn} min-h-14 bg-felt-950/50`}>
            Clear grid
          </button>
          <button type="button" onClick={() => onApply({ keys: null, name: null })} className={`${btn} min-h-14 bg-felt-950/50`}>
            Random hands
          </button>
        </div>

        <div className="sticky bottom-0 -mx-4 grid gap-2 bg-felt-900/95 p-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onApply(choice())}
            className="min-h-14 rounded-2xl bg-gold px-5 text-lg font-extrabold text-felt-950"
          >
            {keys.length ? `Use for ${who}` : `Use random hands for ${who}`}
          </button>
          {canApplyAll && (
            <button type="button" onClick={() => onApplyAll(choice())} className="min-h-14 rounded-2xl bg-felt-950/60 px-5 text-lg font-bold">
              Use for all opponents
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
