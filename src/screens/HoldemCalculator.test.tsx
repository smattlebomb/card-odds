// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { button, click, render, type Rendered } from '../test/render';
import { computeOnMain, RANGE_NOTE, type EquityInput, type EquityResult } from '../lib/holdem';
import { HoldemCalculator } from './HoldemCalculator';

let view: Rendered | null = null;
afterEach(() => {
  view?.unmount();
  view = null;
});

const fixed = (equity: number): EquityResult => ({
  equity,
  win: equity,
  tie: 0,
  lose: 1 - equity,
  samples: 1,
  exact: true,
  stdError: 0,
});

const mount = (equity = 0.4) =>
  (view = render(<HoldemCalculator compute={() => fixed(equity)} />)).container;

const tap = (c: Element, ...names: string[]) => names.forEach((n) => click(button(c, n)));

describe('HoldemCalculator', () => {
  it('asks for hole cards first', () => {
    const c = mount();
    expect(c.querySelector('section[aria-label="Advice"]')!.textContent).toMatch(/two hole cards/);
  });

  it('shows equity, pot odds, and a call when 40% equity faces 25% pot odds', () => {
    const c = mount(0.4);
    // Suited picker: rank then suit.
    tap(c, 'Ace', 'Spades', 'King', 'Hearts');
    expect(c.querySelector('[data-testid="equity"]')!.textContent).toMatch(/40/);
    expect(c.querySelector('[data-testid="action"]')!.textContent).toBe('Call');
    expect(c.querySelector('[data-testid="pot-odds"]')!.textContent).toMatch(/25%/);
    expect(c.querySelector('section[aria-label="Advice"]')!.textContent).toMatch(/Call/);
    expect(c.querySelector('[data-testid="range-call"]')!.textContent).toMatch(/AKo/);
  });

  it('recommends a fold when equity is clearly below pot odds', () => {
    const c = mount(0.1);
    tap(c, 'Seven', 'Hearts', 'Two', 'Diamonds');
    expect(c.querySelector('[data-testid="action"]')!.textContent).toBe('Fold');
  });

  it('counts 9 outs on a flush draw and uses the real engine when asked', () => {
    const c = (view = render(<HoldemCalculator compute={computeOnMain} />)).container;
    // Ah Kh on 9h 4h 2c
    tap(c, 'Ace', 'Hearts', 'King', 'Hearts');
    tap(c, 'Board');
    tap(c, 'Nine', 'Hearts', 'Four', 'Hearts', 'Two', 'Clubs');
    const outs = c.querySelector('[data-testid="outs"]')!.textContent ?? '';
    expect(outs).toMatch(/9 outs/);
    expect(outs).toMatch(/flush/i);
    // River-less flop vs 1 random opponent is exact or MC; either way a number shows.
    expect(c.querySelector('[data-testid="equity"]')!.textContent).toMatch(/%/);
  }, 20_000);
});

describe('opponent ranges', () => {
  /** Mount with a stub engine that records every input it's asked to compute. */
  function mountRecording(equity = 0.4) {
    const calls: EquityInput[] = [];
    const c = (view = render(
      <HoldemCalculator
        compute={(input) => {
          calls.push(input);
          return fixed(equity);
        }}
      />,
    )).container;
    return { c, calls, last: () => calls[calls.length - 1] };
  }
  const dialog = (c: Element) => c.querySelector('[role="dialog"]');
  const summary = (c: Element) => c.querySelector('[data-testid="range-summary"]')!.textContent ?? '';
  const row = (c: Element, n: number) => c.querySelector(`[data-testid="opponent-${n}"]`)!.textContent ?? '';

  it('every opponent starts on random hands', () => {
    const { c, last } = mountRecording();
    expect(c.textContent).toContain('Opponent ranges');
    expect(row(c, 1)).toContain('Random hands');
    tap(c, 'Ace', 'Spades', 'King', 'Hearts');
    expect(last().ranges).toEqual([null]);
    expect(c.querySelector('[data-testid="equity-basis"]')!.textContent).toMatch(/random hands/);
  });

  it('the picker has the grid, position, top-% and 3-bet presets', () => {
    const { c } = mountRecording();
    tap(c, 'Edit opponent 1 range');
    const d = dialog(c)!;
    expect(d.textContent).toContain('Opponent range');
    expect(d.textContent).toContain('3-bet');
    expect(d.querySelectorAll('[data-hand]')).toHaveLength(169);
    for (const p of ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB']) expect(button(d, `${p} tight range`)).toBeDefined();
    expect(d.querySelector('input[type="range"]')).not.toBeNull();
    tap(c, 'Cancel');
    expect(dialog(c)).toBeNull();
  });

  it('tapping grid cells toggles hands', () => {
    const { c } = mountRecording();
    tap(c, 'Edit opponent 1 range', 'AA');
    expect(summary(c)).toMatch(/Custom · 0\.5% · 6 combos/);
    expect(button(c, 'AA')!.getAttribute('aria-pressed')).toBe('true');
    tap(c, 'AKs');
    expect(summary(c)).toMatch(/10 combos/);
    tap(c, 'AA');
    expect(summary(c)).toMatch(/4 combos/);
  });

  it('a 3-bet preset becomes the opponent range and is sent to the engine', () => {
    const { c, last } = mountRecording(0.4);
    tap(c, 'Ace', 'Spades', 'King', 'Hearts');
    tap(c, 'Edit opponent 1 range');
    click(button(c, /^3-bet \(value\)/));
    expect(summary(c)).toMatch(/3-bet \(value\) · 2\.6% · 34 combos/);
    // Card removal is shown live: we hold the A♠ and K♥.
    expect(summary(c)).toMatch(/live after your cards/);
    tap(c, 'Use for Opponent 1');
    expect(dialog(c)).toBeNull();
    expect(row(c, 1)).toContain('3-bet (value)');
    expect(new Set(last().ranges![0])).toEqual(new Set(['AA', 'KK', 'QQ', 'AKs', 'AKo']));
    // The advice now speaks about ranges.
    expect(c.querySelector('[data-testid="equity-basis"]')!.textContent).toMatch(/vs ranges/);
    expect(c.querySelector('section[aria-label="Advice"]')!.textContent).toContain(RANGE_NOTE);
    // Back to random.
    tap(c, 'Random hands for opponent 1');
    expect(row(c, 1)).toContain('Random hands');
    expect(last().ranges).toEqual([null]);
  });

  it('position and top-% presets', () => {
    const { c } = mountRecording();
    tap(c, 'Edit opponent 1 range', 'UTG tight range');
    expect(summary(c)).toMatch(/^UTG open \(tight\)/);
    tap(c, 'Loose', 'BB loose range');
    expect(summary(c)).toMatch(/^BB defend \(loose\)/);
    tap(c, 'Top 10%');
    expect(summary(c)).toMatch(/^Top 10% · 1\d\.\d% · /);
  });

  it('each opponent has its own range, or one range for all', () => {
    const { c, last } = mountRecording();
    tap(c, 'Ace', 'Spades', 'King', 'Hearts');
    tap(c, 'Raise Opponents', 'Raise Opponents');
    expect(c.querySelector('[data-testid="opponent-3"]')).not.toBeNull();
    tap(c, 'Edit opponent 2 range', 'AA', 'Use for Opponent 2');
    expect(row(c, 1)).toContain('Random hands');
    expect(row(c, 2)).toContain('Custom');
    expect(last().ranges).toEqual([null, ['AA'], null]);
    tap(c, 'Edit opponent 1 range', 'KK', 'Use for all opponents');
    expect(last().ranges).toEqual([['KK'], ['KK'], ['KK']]);
  });

  it('runs the real engine against a range (main thread in tests)', () => {
    const c = (view = render(<HoldemCalculator compute={(i) => computeOnMain({ ...i, trials: 4000 })} />)).container;
    tap(c, 'Ace', 'Spades', 'Ace', 'Hearts');
    tap(c, 'Edit opponent 1 range', 'KK', 'Use for Opponent 1');
    const eq = Number((c.querySelector('[data-testid="equity"]')!.textContent ?? '').replace(/[^\d.]/g, ''));
    expect(eq).toBeGreaterThan(78);
    expect(eq).toBeLessThan(86);
  }, 20_000);
});
