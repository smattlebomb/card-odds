// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { button, click, render, type Rendered } from '../test/render';
import { CardPicker } from './CardPicker';

let view: Rendered | null = null;
afterEach(() => {
  view?.unmount();
  view = null;
});

describe('CardPicker', () => {
  it('shows 13 ranks and 4 suits', () => {
    view = render(<CardPicker onPick={() => {}} />);
    expect(view.container.querySelectorAll('button')).toHaveLength(17);
  });

  it('picks rank then suit, and resets after a pick', () => {
    const onPick = vi.fn();
    view = render(<CardPicker onPick={onPick} />);
    const c = view.container;
    click(button(c, 'Ace'));
    expect(onPick).not.toHaveBeenCalled();
    expect(button(c, 'Ace')!.getAttribute('aria-pressed')).toBe('true');
    click(button(c, 'Hearts'));
    expect(onPick).toHaveBeenCalledWith({ rank: 'A', suit: 'h' });
    expect(button(c, 'Ace')!.getAttribute('aria-pressed')).toBe('false');
  });

  it('picks suit then rank', () => {
    const onPick = vi.fn();
    view = render(<CardPicker onPick={onPick} />);
    click(button(view.container, 'Clubs'));
    click(button(view.container, 'Ten'));
    expect(onPick).toHaveBeenCalledWith({ rank: 'T', suit: 'c' });
  });

  it('disables cards already in play', () => {
    view = render(<CardPicker onPick={() => {}} used={['Ks', 'Kh', 'Kd', 'Kc', 'Qs']} />);
    const c = view.container;
    expect(button(c, 'King')!.disabled).toBe(true);
    click(button(c, 'Queen'));
    expect(button(c, 'Spades')!.disabled).toBe(true);
    expect(button(c, 'Hearts')!.disabled).toBe(false);
  });
});
