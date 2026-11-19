// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { button, click, render, typeInto, type Rendered } from '../test/render';
import { emptyStats, recordDrill, type Stats } from '../lib/stats';
import { StatsScreen } from './StatsScreen';

let view: Rendered | null = null;
afterEach(() => {
  view?.unmount();
  view = null;
});

describe('StatsScreen', () => {
  it('shows practice accuracy and logs a hand into the net', () => {
    let stats: Stats = recordDrill('blackjack', true, emptyStats(), 1);
    stats = recordDrill('blackjack', false, stats, 2);
    const logs: unknown[] = [];
    view = render(
      <StatsScreen
        navigate={() => {}}
        stats={stats}
        onLog={(e) => logs.push(e)}
        onDelete={() => {}}
        onReset={() => {}}
      />,
    );
    const c = view.container;
    expect(c.querySelector('[data-testid="accuracy-overall"]')!.textContent).toMatch(/1\/2/);
    click(button(c, 'Win'));
    typeInto(c.querySelector('#hand-amount'), '25');
    click(button(c, 'Save hand'));
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ game: 'blackjack', result: 'win', amount: 25 });
  });
});
