// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { button, click, render, type Rendered } from '../test/render';
import { computeOnMain, type EquityResult } from '../lib/holdem';
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
