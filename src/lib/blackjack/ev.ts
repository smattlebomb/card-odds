/**
 * Expected-value engine for one blackjack decision.
 *
 * Card values are indexed 1..10 (Ace = 1, all ten-value cards = 10). The shoe is the full
 * `decks` shoe minus the cards on the table (player's cards and the dealer's upcard), so the
 * numbers are composition-dependent: they know which cards are already gone.
 *
 * Method:
 * - Dealer: exact recursion over every drawing sequence from the remaining shoe, conditioned on
 *   the dealer NOT having blackjack (US peek rule). With an Ace up the hole card can't be a ten;
 *   with a ten up it can't be an Ace.
 * - Player: exact recursion over the player's draws, removing each card from the shoe as it's
 *   drawn and always taking the better of stand / hit after each card. The dealer's outcome
 *   probabilities are recomputed for each shoe the player can reach in up to EXACT_DEPTH
 *   draws, so hit, stand and double EVs are composition-dependent for this exact hand.
 * - Split (approximate): each hand gets one new card, then plays optimally (doubling only with
 *   DAS; split Aces get exactly one card). The two hands are valued independently (the other
 *   hand's cards aren't removed) and resplitting isn't modelled, so split EVs are slightly low.
 *
 * All EVs are in units of the original bet (double / split EVs include the extra bet).
 */

export type Action = 'hit' | 'stand' | 'double' | 'split' | 'surrender';
export type ActionEVs = Partial<Record<Action, number>>;

/** Index 1..10 = count of that value left in the shoe; index 0 unused. */
export type Shoe = number[];

export function fullShoe(decks: number): Shoe {
  const s = new Array(11).fill(0);
  for (let v = 1; v <= 9; v++) s[v] = 4 * decks;
  s[10] = 16 * decks;
  return s;
}

export function shoeWithout(decks: number, removed: readonly number[]): Shoe {
  const s = fullShoe(decks);
  for (const v of removed) {
    if (s[v] <= 0) throw new Error(`No ${v === 1 ? 'Ace' : v} left in a ${decks}-deck shoe`);
    s[v]--;
  }
  return s;
}

const shoeSize = (s: Shoe) => s.reduce((a, b) => a + b, 0);

/**
 * Dealer final totals given the upcard (1..10) and the shoe (upcard already removed).
 * Returns [P(17), P(18), P(19), P(20), P(21), P(bust)], conditioned on no dealer blackjack.
 */
export function dealerOutcomes(up: number, shoe: Shoe, hitSoft17: boolean): number[] {
  const out = [0, 0, 0, 0, 0, 0];
  const s = shoe.slice();
  let n = shoeSize(s);
  // The hole card can't complete a blackjack (the dealer has already peeked).
  const banned = up === 1 ? 10 : up === 10 ? 1 : 0;

  const rec = (hard: number, ace: boolean, cards: number, prob: number) => {
    const soft = ace && hard + 10 <= 21;
    const total = soft ? hard + 10 : hard;
    if (total > 21) {
      out[5] += prob;
      return;
    }
    if (total >= 17 && !(hitSoft17 && soft && total === 17)) {
      out[total - 17] += prob;
      return;
    }
    const denom = cards === 1 && banned ? n - s[banned] : n;
    for (let v = 1; v <= 10; v++) {
      const c = s[v];
      if (c === 0 || (cards === 1 && v === banned)) continue;
      s[v]--;
      n--;
      rec(hard + v, ace || v === 1, cards + 1, (prob * c) / denom);
      s[v]++;
      n++;
    }
  };
  rec(up, up === 1, 1, 1);
  return out;
}

/** EV of standing on `total` against the dealer's final-total distribution. */
export function standEV(total: number, dealer: readonly number[]): number {
  if (total > 21) return -1;
  let ev = dealer[5];
  for (let d = 17; d <= 21; d++) {
    const p = dealer[d - 17];
    if (total > d) ev += p;
    else if (total < d) ev -= p;
  }
  return ev;
}

function best(hard: number, ace: boolean): number {
  return ace && hard + 10 <= 21 ? hard + 10 : hard;
}

/**
 * Player-side recursion. `s` is the live shoe: cards are taken out as the player draws them,
 * and the dealer's outcome probabilities are recomputed (and cached) for each distinct shoe,
 * so stand EVs reflect every card the player has drawn.
 */
class PlayerSolver {
  private memo = new Map<string, number>();
  private dealerMemo = new Map<string, number[]>();
  private s: Shoe;
  private n: number;
  private up: number;
  private hitSoft17: boolean;
  private depth = 0;
  private exactDepth: number;
  private lastExact: number[] | null = null;
  constructor(shoe: Shoe, up: number, hitSoft17: boolean, exactDepth: number) {
    this.s = shoe.slice();
    this.n = shoeSize(shoe);
    this.up = up;
    this.hitSoft17 = hitSoft17;
    this.exactDepth = exactDepth;
  }

  /**
   * Dealer outcome probabilities for the shoe as it is right now. Below `exactDepth` player
   * draws, deeper shoes reuse the distribution of their nearest exact ancestor (speed).
   */
  dealer(): number[] {
    if (this.depth > this.exactDepth && this.lastExact) return this.lastExact;
    const key = this.s.join(',');
    let d = this.dealerMemo.get(key);
    if (!d) {
      d = dealerOutcomes(this.up, this.s, this.hitSoft17);
      this.dealerMemo.set(key, d);
    }
    this.lastExact = d;
    return d;
  }

  stand(hard: number, ace: boolean): number {
    const t = best(hard, ace);
    return t > 21 ? -1 : standEV(t, this.dealer());
  }

  /** Run `fn` with one card of value v taken out of the shoe. */
  private without<T>(v: number, fn: () => T): T {
    this.s[v]--;
    this.n--;
    this.depth++;
    try {
      return fn();
    } finally {
      this.s[v]++;
      this.n++;
      this.depth--;
    }
  }

  /** Take exactly one card, then stand. Returns EV per unit bet (caller doubles it). */
  oneCard(hard: number, ace: boolean): number {
    let ev = 0;
    const n = this.n;
    for (let v = 1; v <= 10; v++) {
      const c = this.s[v];
      if (c === 0) continue;
      const h = hard + v;
      const a = ace || v === 1;
      ev += (c / n) * (best(h, a) > 21 ? -1 : this.without(v, () => this.stand(h, a)));
    }
    return ev;
  }

  /** Hit once, then keep playing the better of stand / hit. */
  hit(hard: number, ace: boolean): number {
    const key = `${hard}|${ace ? 1 : 0}|${this.s.join(',')}`;
    const cached = this.memo.get(key);
    if (cached !== undefined) return cached;
    let ev = 0;
    const n = this.n;
    for (let v = 1; v <= 10; v++) {
      const c = this.s[v];
      if (c === 0) continue;
      const h = hard + v;
      const a = ace || v === 1;
      const t = best(h, a);
      const after =
        t > 21
          ? -1
          : this.without(v, () => (t === 21 ? this.stand(h, a) : Math.max(this.stand(h, a), this.hit(h, a))));
      ev += (c / n) * after;
    }
    this.memo.set(key, ev);
    return ev;
  }

  /** EV of one split hand starting from a single card of value `v` (per unit bet). */
  splitHand(v: number, das: boolean): number {
    let ev = 0;
    const n = this.n;
    for (let w = 1; w <= 10; w++) {
      const c = this.s[w];
      if (c === 0) continue;
      const hard = v + w;
      const ace = v === 1 || w === 1;
      const e = this.without(w, () => {
        if (v === 1) return this.stand(hard, ace);
        let x = Math.max(this.stand(hard, ace), best(hard, ace) < 21 ? this.hit(hard, ace) : -Infinity);
        if (das) x = Math.max(x, 2 * this.oneCard(hard, ace));
        return x;
      });
      ev += (c / n) * e;
    }
    return ev;
  }
}

export interface EvInput {
  /** Player card values, 1..10. */
  player: readonly number[];
  /** Dealer upcard value, 1..10. */
  up: number;
  decks: number;
  hitSoft17: boolean;
  das: boolean;
  /** Which actions are legal (stand and hit always are). */
  canDouble: boolean;
  canSplit: boolean;
  canSurrender: boolean;
  /** Player draws for which dealer odds are recomputed exactly (default EXACT_DEPTH). */
  exactDepth?: number;
}

/**
 * Dealer odds are recomputed exactly for the first two player draws (the double card and the
 * first two hit cards) and reused deeper down. Measured against fully exact recursion this
 * stays within 0.05% of a bet, and keeps the slowest spot (small hand vs 2) under ~20 ms
 * instead of ~500 ms.
 */
export const EXACT_DEPTH = 2;

export function actionEVs(input: EvInput): ActionEVs {
  const shoe = shoeWithout(input.decks, [...input.player, input.up]);
  const solver = new PlayerSolver(shoe, input.up, input.hitSoft17, input.exactDepth ?? EXACT_DEPTH);
  let hard = 0;
  let ace = false;
  for (const v of input.player) {
    hard += v;
    ace ||= v === 1;
  }
  const evs: ActionEVs = { stand: solver.stand(hard, ace) };
  if (best(hard, ace) < 21) evs.hit = solver.hit(hard, ace);
  if (input.canDouble) evs.double = 2 * solver.oneCard(hard, ace);
  if (input.canSplit) evs.split = 2 * solver.splitHand(input.player[0], input.das);
  if (input.canSurrender) evs.surrender = -0.5;
  return evs;
}

/** The action with the highest EV (ties go to the earlier action in `order`). */
export function bestAction(evs: ActionEVs, order: readonly Action[] = ['stand', 'hit', 'double', 'split', 'surrender']): Action {
  let bestA: Action = 'stand';
  let bestEv = -Infinity;
  for (const a of order) {
    const e = evs[a];
    if (e !== undefined && e > bestEv + 1e-12) {
      bestA = a;
      bestEv = e;
    }
  }
  return bestA;
}
