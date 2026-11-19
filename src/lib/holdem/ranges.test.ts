import { describe, expect, it } from 'vitest';
import { parseCard } from '../cards';
import { GRID_RANKS, gridKey, handKey, inOpeningRange, OPENING_RANGES } from './ranges';

const c = (t: string) => parseCard(t)!;

describe('handKey / gridKey', () => {
  it('names pairs, suited, and offsuit with the higher rank first', () => {
    expect(handKey(c('Ah'), c('Ad'))).toBe('AA');
    expect(handKey(c('Ah'), c('Kh'))).toBe('AKs');
    expect(handKey(c('Kd'), c('Ah'))).toBe('AKo');
    expect(handKey(c('9s'), c('8s'))).toBe('98s');
  });

  it('builds a 13×13 grid whose diagonal is pairs, upper triangle suited', () => {
    expect(gridKey('A', 'A')).toBe('AA');
    expect(gridKey('A', 'K')).toBe('AKs');
    expect(gridKey('K', 'A')).toBe('AKo');
    expect(GRID_RANKS[0]).toBe('A');
    expect(GRID_RANKS[12]).toBe('2');
  });
});

describe('opening ranges (tight 6-max RFI)', () => {
  it('AKs opens from every seat except the big blind', () => {
    expect(inOpeningRange(c('Ah'), c('Kh'), 'UTG')).toBe(true);
    expect(inOpeningRange(c('Ah'), c('Kh'), 'BTN')).toBe(true);
    expect(inOpeningRange(c('Ah'), c('Kh'), 'BB')).toBe(false);
    expect(OPENING_RANGES.BB.size).toBe(0);
  });

  it('72o never opens; 22 opens on the button but not UTG', () => {
    expect(inOpeningRange(c('7h'), c('2d'), 'BTN')).toBe(false);
    expect(inOpeningRange(c('2h'), c('2d'), 'UTG')).toBe(false);
    expect(inOpeningRange(c('2h'), c('2d'), 'CO')).toBe(true);
    expect(inOpeningRange(c('2h'), c('2d'), 'BTN')).toBe(true);
  });

  it('ATs opens UTG; ATo does not, but ATo opens from MP', () => {
    expect(inOpeningRange(c('Ah'), c('Th'), 'UTG')).toBe(true);
    expect(inOpeningRange(c('Ah'), c('Td'), 'UTG')).toBe(false);
    expect(inOpeningRange(c('Ah'), c('Td'), 'MP')).toBe(true);
  });
});
