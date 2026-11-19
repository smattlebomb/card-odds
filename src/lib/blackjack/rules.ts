/**
 * Table rules for the blackjack calculator.
 *
 * Fixed assumptions (not configurable): the dealer peeks for blackjack with an Ace or ten up
 * (US hole-card game), so every EV assumes the dealer does NOT have blackjack; a pair may be
 * split up to 4 hands; split Aces get one card each and can't be resplit; no doubling after
 * hitting; late surrender only (after the dealer peeks, first two cards only).
 */

export type Decks = 1 | 2 | 6 | 8;
export type DoubleOn = 'any' | '9-11' | '10-11';
export type BlackjackPays = '3:2' | '6:5';

export interface Rules {
  decks: Decks;
  /** Dealer hits soft 17 (H17). False = stands on soft 17 (S17). */
  hitSoft17: boolean;
  /** Double after split allowed. */
  das: boolean;
  /** Late surrender allowed. */
  surrender: boolean;
  blackjackPays: BlackjackPays;
  /** Which two-card hands may double. */
  doubleOn: DoubleOn;
}

export const DEFAULT_RULES: Rules = {
  decks: 6,
  hitSoft17: false,
  das: true,
  surrender: false,
  blackjackPays: '3:2',
  doubleOn: 'any',
};

export const RULES_KEY = 'card-odds:rules:v1';

export function blackjackPayout(rules: Rules): number {
  return rules.blackjackPays === '6:5' ? 1.2 : 1.5;
}

/** e.g. "6D · S17 · DAS · no surrender · 3:2" */
export function rulesSummary(r: Rules): string {
  const parts = [
    `${r.decks}D`,
    r.hitSoft17 ? 'H17' : 'S17',
    r.das ? 'DAS' : 'no DAS',
    r.surrender ? 'late surrender' : 'no surrender',
    r.blackjackPays,
  ];
  if (r.doubleOn !== 'any') parts.push(`double ${r.doubleOn.replace('-', '–')} only`);
  return parts.join(' · ');
}

/** Accepts anything (e.g. parsed localStorage) and returns valid rules, filling gaps with defaults. */
export function sanitizeRules(raw: unknown): Rules {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const pick = <T>(v: unknown, allowed: readonly T[], d: T): T => (allowed.includes(v as T) ? (v as T) : d);
  return {
    decks: pick(o.decks, [1, 2, 6, 8] as const, DEFAULT_RULES.decks),
    hitSoft17: pick(o.hitSoft17, [true, false], DEFAULT_RULES.hitSoft17),
    das: pick(o.das, [true, false], DEFAULT_RULES.das),
    surrender: pick(o.surrender, [true, false], DEFAULT_RULES.surrender),
    blackjackPays: pick(o.blackjackPays, ['3:2', '6:5'] as const, DEFAULT_RULES.blackjackPays),
    doubleOn: pick(o.doubleOn, ['any', '9-11', '10-11'] as const, DEFAULT_RULES.doubleOn),
  };
}

export function loadRules(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): Rules {
  try {
    const text = storage?.getItem(RULES_KEY);
    return sanitizeRules(text ? JSON.parse(text) : null);
  } catch {
    return { ...DEFAULT_RULES };
  }
}

export function saveRules(rules: Rules, storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage): void {
  try {
    storage?.setItem(RULES_KEY, JSON.stringify(rules));
  } catch {
    // Private mode / storage full: the rules still apply for this session.
  }
}
