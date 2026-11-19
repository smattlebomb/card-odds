import { useCallback, useState } from 'react';
import { loadRules, saveRules, type Rules } from './rules';

/** Blackjack table rules, persisted in localStorage. */
export function useRules(): [Rules, (r: Rules) => void] {
  const [rules, setRules] = useState<Rules>(() => loadRules());
  const update = useCallback((r: Rules) => {
    saveRules(r);
    setRules(r);
  }, []);
  return [rules, update];
}
