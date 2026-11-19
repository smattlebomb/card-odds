import { describe, expect, it } from 'vitest';
import {
  accuracy,
  byDay,
  deleteHand,
  emptyStats,
  logHand,
  netAmount,
  recordDrill,
  sanitizeStats,
  STATS_KEY,
  loadStats,
  saveStats,
} from './stats';

describe('stats', () => {
  it('records accuracy by kind', () => {
    let s = emptyStats();
    s = recordDrill('blackjack', true, s, 1);
    s = recordDrill('blackjack', false, s, 2);
    s = recordDrill('holdem', true, s, 3);
    expect(accuracy(s.drills, 'blackjack')).toEqual({ correct: 1, total: 2, pct: 0.5 });
    expect(accuracy(s.drills, 'holdem')).toEqual({ correct: 1, total: 1, pct: 1 });
    expect(accuracy(s.drills).total).toBe(3);
  });

  it('logs hands and nets signed amounts', () => {
    let s = emptyStats();
    s = logHand({ t: 1, game: 'blackjack', result: 'win', amount: 50, note: 'BJ' }, s);
    s = logHand({ t: 2, game: 'holdem', result: 'loss', amount: -20, note: '' }, s);
    s = logHand({ t: 3, game: 'holdem', result: 'push', amount: 0, note: '' }, s);
    expect(netAmount(s.hands)).toBe(30);
    expect(s.hands).toHaveLength(3);
    s = deleteHand(s.hands[0].id, s);
    expect(netAmount(s.hands)).toBe(-20);
  });

  it('groups by UTC day and persists through JSON', () => {
    const s = recordDrill('hilo-running', true, emptyStats(), Date.UTC(2026, 0, 2, 12));
    expect(byDay(s.drills)[0].day).toBe('2026-01-02');
    const storage = new Map<string, string>();
    const sto = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => { storage.set(k, v); },
    };
    saveStats(s, sto);
    expect(storage.has(STATS_KEY)).toBe(true);
    expect(loadStats(sto).drills).toHaveLength(1);
  });

  it('drops malformed stored data', () => {
    expect(sanitizeStats({ drills: [{ t: 1 }], hands: 'nope' }).drills).toEqual([]);
  });
});
