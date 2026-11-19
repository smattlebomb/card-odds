// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { button, click, render, typeInto, type Rendered } from '../test/render';
import { BlackjackCalculator, formatEv, parseTc } from './BlackjackCalculator';
import { DEFAULT_RULES, type Rules } from '../lib/blackjack/rules';

let view: Rendered | null = null;
afterEach(() => {
  view?.unmount();
  view = null;
});

const mount = (rules: Rules = DEFAULT_RULES, onEditRules = () => {}) =>
  (view = render(<BlackjackCalculator rules={rules} onEditRules={onEditRules} />)).container;
const action = (c: Element) => c.querySelector('[data-testid="action"]')?.textContent;
const advice = (c: Element) => c.querySelector('section[aria-label="Advice"]')!.textContent ?? '';
const tap = (c: Element, ...names: string[]) => names.forEach((n) => click(button(c, n)));

describe('BlackjackCalculator', () => {
  it('shows the rules summary and asks for cards first', () => {
    const c = mount();
    expect(c.querySelector('[data-testid="rules-summary"]')!.textContent).toBe('6D · S17 · DAS · no surrender · 3:2');
    expect(advice(c)).toMatch(/Pick the dealer upcard/);
  });

  it('dealer first, then player cards; 16 vs 10 is a hit, 16 vs 6 a stand', () => {
    const c = mount();
    tap(c, 'Ten', 'Ten', 'Six');
    expect(action(c)).toBe('Hit');
    expect(advice(c)).toMatch(/EV/);
    // Re-pick the dealer card.
    tap(c, 'Dealer card', 'Six');
    expect(action(c)).toBe('Stand');
    expect(advice(c)).toMatch(/dealer bust card/);
  });

  it('a true count changes 16 vs 10 to a stand; clearing it goes back to basic', () => {
    const c = mount();
    tap(c, 'Ten', 'Ten', 'Six');
    const tc = c.querySelector<HTMLInputElement>('#true-count')!;
    typeInto(tc, '1');
    expect(action(c)).toBe('Stand');
    expect(advice(c)).toMatch(/Illustrious 18/);
    tap(c, 'Lower true count', 'Lower true count');
    expect(tc.value).toBe('-1');
    expect(action(c)).toBe('Hit');
    tap(c, 'No count');
    expect(tc.value).toBe('');
    expect(action(c)).toBe('Hit');
  });

  it('cards can be removed; three-card hands get hit/stand advice', () => {
    const c = mount();
    tap(c, 'Ten', 'Five', 'Six');
    expect(action(c)).toBe('Double');
    tap(c, 'Five'); // 5,6,5 = three-card 16 vs 10
    expect(action(c)).toBe('Hit');
    expect(c.querySelectorAll('button[aria-label^="Remove"]')).toHaveLength(3);
    tap(c, 'Remove Five'); // back to 6,5 = 11
    expect(c.querySelectorAll('button[aria-label^="Remove"]')).toHaveLength(2);
    expect(action(c)).toBe('Double');
  });

  it('clear hand resets everything', () => {
    const c = mount();
    tap(c, 'Six', 'Ace', 'King');
    expect(action(c)).toBe('Blackjack!');
    expect(advice(c)).toMatch(/3:2/);
    tap(c, 'Clear hand');
    expect(advice(c)).toMatch(/Pick the dealer upcard/);
    expect(button(c, 'Dealer card')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('greys out ranks the shoe has run out of (1 deck)', () => {
    const c = mount({ ...DEFAULT_RULES, decks: 1 });
    tap(c, 'Ace', 'Ace', 'Ace');
    expect(button(c, 'Ace')!.disabled).toBe(false);
    tap(c, 'Ace');
    expect(button(c, 'Ace')!.disabled).toBe(true);
  });

  it('"Change" opens the rules', () => {
    const onEdit = vi.fn();
    const c = mount(DEFAULT_RULES, onEdit);
    click(c.querySelector('[data-testid="rules-summary"]')!.closest('button'));
    expect(onEdit).toHaveBeenCalled();
  });
});

describe('calculator helpers', () => {
  it('formats EV as a percent of the bet', () => {
    expect(formatEv(0.1234)).toBe('+12.3%');
    expect(formatEv(-0.5)).toBe('−50.0%');
    expect(formatEv(0.0001)).toBe('0.0%');
  });

  it('parses the true count', () => {
    expect(parseTc('')).toBeNull();
    expect(parseTc(' 2 ')).toBe(2);
    expect(parseTc('-1.5')).toBe(-1.5);
    expect(parseTc('−3')).toBe(-3);
    expect(parseTc('2,5')).toBe(2.5);
    expect(parseTc('abc')).toBe('invalid');
  });
});

describe('quick answer strip', () => {
  it('shows the action and EV right under the hand', () => {
    const c = mount();
    const strip = () => c.querySelector('[data-testid="quick-answer"]')!.textContent;
    expect(strip()).toMatch(/Pick the dealer upcard/);
    tap(c, 'Six', 'Ten', 'Six');
    expect(strip()).toMatch(/^Stand[+−]?\d/);
    typeInto(c.querySelector<HTMLInputElement>('#true-count'), '-2');
    tap(c, 'Dealer card', 'Four'); // 16 vs 4 stays a stand
    expect(strip()).toMatch(/^Stand/);
    tap(c, 'Dealer card', 'Ten');
    expect(strip()).toMatch(/^Hit/);
    typeInto(c.querySelector<HTMLInputElement>('#true-count'), '0');
    expect(strip()).toMatch(/^Stand· count play/);
  });
});
