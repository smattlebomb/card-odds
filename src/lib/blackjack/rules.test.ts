import { describe, expect, it } from 'vitest';
import { blackjackPayout, DEFAULT_RULES, loadRules, RULES_KEY, rulesSummary, sanitizeRules, saveRules } from './rules';

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

describe('rules', () => {
  it('defaults: 6D, S17, DAS, no surrender, 3:2, double any two', () => {
    expect(DEFAULT_RULES).toEqual({ decks: 6, hitSoft17: false, das: true, surrender: false, blackjackPays: '3:2', doubleOn: 'any' });
    expect(rulesSummary(DEFAULT_RULES)).toBe('6D · S17 · DAS · no surrender · 3:2');
  });

  it('summarises other rule sets', () => {
    const r = { ...DEFAULT_RULES, decks: 2 as const, hitSoft17: true, das: false, surrender: true, blackjackPays: '6:5' as const, doubleOn: '10-11' as const };
    expect(rulesSummary(r)).toBe('2D · H17 · no DAS · late surrender · 6:5 · double 10–11 only');
  });

  it('payout', () => {
    expect(blackjackPayout(DEFAULT_RULES)).toBe(1.5);
    expect(blackjackPayout({ ...DEFAULT_RULES, blackjackPays: '6:5' })).toBe(1.2);
  });

  it('sanitizes bad input field by field', () => {
    expect(sanitizeRules(null)).toEqual(DEFAULT_RULES);
    expect(sanitizeRules({ decks: 4, hitSoft17: 'yes', surrender: true })).toEqual({ ...DEFAULT_RULES, surrender: true });
  });

  it('saves and loads under a namespaced key', () => {
    const s = memoryStorage();
    expect(loadRules(s)).toEqual(DEFAULT_RULES);
    const r = { ...DEFAULT_RULES, decks: 1 as const, hitSoft17: true };
    saveRules(r, s);
    expect(RULES_KEY).toBe('card-odds:rules:v1');
    expect(JSON.parse(s.m.get(RULES_KEY)!)).toEqual(r);
    expect(loadRules(s)).toEqual(r);
  });

  it('survives corrupt storage', () => {
    const s = memoryStorage();
    s.setItem(RULES_KEY, '{not json');
    expect(loadRules(s)).toEqual(DEFAULT_RULES);
  });
});
