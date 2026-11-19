// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { button, click, render, type Rendered } from './test/render';
import App from './App';
import { DISCLAIMER } from './components/Disclaimer';

let view: Rendered | null = null;
beforeEach(() => {
  window.location.hash = '';
  localStorage.clear();
});
afterEach(() => {
  view?.unmount();
  view = null;
});

const title = (c: Element) => c.querySelector('h1')!.textContent;
const tabs = (c: Element) => [...c.querySelectorAll('nav button')].map((b) => b.textContent);
const current = (c: Element) => c.querySelector('nav [aria-current="page"]')?.textContent;

describe('App shell', () => {
  it('home shows both games, Stats, Settings and the disclaimer', () => {
    view = render(<App />);
    const c = view.container;
    expect(title(c)).toBe('Card Odds');
    for (const name of [/Blackjack/, /Hold'em/, 'Hands & Stats', 'Settings']) expect(button(c, name)).toBeDefined();
    expect(c.textContent).toContain(DISCLAIMER);
  });

  it('Blackjack has Calculator / Practice / Count and they navigate', () => {
    view = render(<App />);
    const c = view.container;
    click(button(c, /Blackjack/));
    expect(title(c)).toBe('Blackjack');
    expect(tabs(c)).toEqual(['Calculator', 'Practice', 'Count']);
    expect(current(c)).toBe('Calculator');
    expect(window.location.hash).toBe('#/blackjack/calculator');
    click(button(c, 'Count'));
    expect(current(c)).toBe('Count');
    expect(c.textContent).toContain('Running count');
    expect(window.location.hash).toBe('#/blackjack/count');
    click(button(c, 'Back'));
    expect(title(c)).toBe('Card Odds');
  });

  it("Hold'em has Calculator / Practice only, with a working card picker", () => {
    view = render(<App />);
    const c = view.container;
    click(button(c, /Hold'em/));
    expect(tabs(c)).toEqual(['Calculator', 'Practice']);
    click(button(c, 'Ace'));
    click(button(c, 'Spades'));
    expect(c.querySelector('[aria-label="Ace of Spades"]')).not.toBeNull();
  });

  it('Settings shows the disclaimer; deep links open the right screen', () => {
    window.location.hash = '#/settings';
    view = render(<App />);
    expect(title(view.container)).toBe('Settings');
    expect(view.container.textContent).toContain(DISCLAIMER);
    view.unmount();
    window.location.hash = '#/holdem/practice';
    view = render(<App />);
    expect(current(view.container)).toBe('Practice');
  });

  it('rule changes in Settings persist and reach the Blackjack calculator', () => {
    window.location.hash = '#/settings';
    view = render(<App />);
    const c = view.container;
    const group = (label: string) => c.querySelector(`[role="group"][aria-label="${label}"]`)!;
    click(button(group('Decks'), '2'));
    click(button(group('Soft 17'), 'Dealer hits (H17)'));
    click(button(group('Late surrender'), 'On'));
    expect(JSON.parse(localStorage.getItem('card-odds:rules:v1')!)).toMatchObject({ decks: 2, hitSoft17: true, surrender: true });
    view.unmount();

    window.location.hash = '#/blackjack/calculator';
    view = render(<App />);
    const v = view.container;
    expect(v.querySelector('[data-testid="rules-summary"]')!.textContent).toBe('2D · H17 · DAS · late surrender · 3:2');
    // 11 vs A doubles under H17 (it's a hit in 6D S17).
    for (const n of ['Ace', 'Six', 'Five']) click(button(v, n));
    expect(v.querySelector('[data-testid="action"]')!.textContent).toBe('Double');
    click(v.querySelector('[data-testid="rules-summary"]')!.closest('button'));
    expect(title(v)).toBe('Settings');
    click(button(v, 'Reset to defaults'));
    expect(v.textContent).toContain('6D · S17 · DAS · no surrender · 3:2');
  });
});
