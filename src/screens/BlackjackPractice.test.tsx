// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { button, click, render, type Rendered } from '../test/render';
import { DEFAULT_RULES } from '../lib/blackjack/rules';
import { BlackjackPractice } from './BlackjackPractice';

let view: Rendered | null = null;
afterEach(() => {
  view?.unmount();
  view = null;
});

describe('BlackjackPractice', () => {
  it('shows a dealer and player hand, grades an action, and reports the result', () => {
    const grades: boolean[] = [];
    view = render(<BlackjackPractice rules={DEFAULT_RULES} drills={[]} onGrade={(c) => grades.push(c)} />);
    const c = view.container;
    expect(c.querySelector('[data-testid="score"]')!.textContent).toMatch(/No hands/);
    expect(c.textContent).toMatch(/Dealer/);
    const hit = button(c, 'Hit')!;
    click(hit);
    expect(grades).toHaveLength(1);
    expect(c.textContent).toMatch(/Correct|The play is/);
    click(button(c, 'Next hand'));
    expect(button(c, 'Hit')!.disabled).toBe(false);
  });
});
