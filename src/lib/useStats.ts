import { useCallback, useState } from 'react';
import {
  loadStats,
  recordDrill,
  saveStats,
  type DrillKind,
  type HandEntry,
  type Stats,
  logHand,
  deleteHand,
  emptyStats,
} from './stats';

export function useStats() {
  const [stats, setStats] = useState<Stats>(() => loadStats());

  const commit = useCallback((next: Stats) => {
    saveStats(next);
    setStats(next);
  }, []);

  const addDrill = useCallback((kind: DrillKind, correct: boolean) => {
    setStats((prev) => {
      const next = recordDrill(kind, correct, prev);
      saveStats(next);
      return next;
    });
  }, []);

  const addHand = useCallback((entry: Omit<HandEntry, 'id'>) => {
    setStats((prev) => {
      const next = logHand(entry, prev);
      saveStats(next);
      return next;
    });
  }, []);

  const removeHand = useCallback((id: string) => {
    setStats((prev) => {
      const next = deleteHand(id, prev);
      saveStats(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => commit(emptyStats()), [commit]);

  return { stats, addDrill, addHand, removeHand, reset };
}
