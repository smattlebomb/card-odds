/**
 * Hold'em equity: exact enumeration when the number of deals is small, Monte Carlo otherwise.
 *
 * Equity = P(win outright) + Σ P(k-way tie at the top) / (k + 1).
 *
 * Each opponent is one of:
 * - known: a specific two-card hand (tests use this for classic matchups like AA vs KK);
 * - range: a set of starting hands ("QQ+, AKs" …). Every live combo of the range is equally
 *   likely. Card removal is exact: combos that use your hole cards, the board, a known hand or
 *   another opponent's cards in the same deal are impossible;
 * - random: any two cards from what's left.
 */
import { remainingDeck } from './cards';
import { evaluate } from './evaluator';
import { liveCombos } from './ranges';

export interface EquityInput {
  /** Hero's two hole cards (engine ints). */
  hole: readonly number[];
  /** 0, 3, 4 or 5 board cards. */
  board: readonly number[];
  /** Number of opponents, 1..MAX_OPPONENTS. */
  opponents: number;
  /** Optional known opponent hands; index i is opponent i, null = unknown. */
  known?: readonly (readonly number[] | null)[];
  /**
   * Optional opponent ranges as hand keys ("AA", "AKs", "KQo"); index i is opponent i,
   * null / missing = random cards. A known hand takes precedence over a range.
   */
  ranges?: readonly (readonly string[] | null)[];
  /** Monte Carlo deals to run (ignored when exact). */
  trials?: number;
  /** Enumerate exactly if it takes at most this many hand evaluations. */
  exactLimit?: number;
  /** Force Monte Carlo even when exact would be possible (tests). */
  forceMonteCarlo?: boolean;
  seed?: number;
}

export interface EquityResult {
  /** Hero equity 0..1. */
  equity: number;
  /** P(hero wins outright). */
  win: number;
  /** P(hero ties for best). */
  tie: number;
  lose: number;
  /** Deals evaluated. */
  samples: number;
  exact: boolean;
  /** Standard error of the equity estimate (0 when exact). */
  stdError: number;
}

export const MAX_OPPONENTS = 8;
/**
 * Enumerate exactly when that's at most this many hand evaluations (~0.1–0.2 s on a laptop).
 * In practice: heads-up on the turn or river is exact (also against a range, and a range on
 * the flop when it's small enough); preflop and multiway spots use Monte Carlo.
 */
export const DEFAULT_EXACT_LIMIT = 600_000;
export const DEFAULT_TRIALS = 200_000;

export const RANGE_CONFLICT_ERROR = "The opponents' ranges overlap too much to deal them all at once with these cards.";

export function validateInput(input: EquityInput): string | null {
  const { hole, board, opponents } = input;
  if (hole.length !== 2) return 'Pick two hole cards.';
  if (![0, 3, 4, 5].includes(board.length)) return 'The board needs 0, 3, 4 or 5 cards.';
  if (!Number.isInteger(opponents) || opponents < 1 || opponents > MAX_OPPONENTS) return `Opponents must be 1–${MAX_OPPONENTS}.`;
  const all = [...hole, ...board, ...(input.known ?? []).slice(0, opponents).flatMap((h) => h ?? [])];
  if (new Set(all).size !== all.length) return 'A card is used twice.';
  for (let i = 0; i < opponents; i++) {
    const r = input.ranges?.[i];
    if (r && r.length === 0 && !input.known?.[i]) return `Opponent ${i + 1}'s range is empty.`;
  }
  return null;
}

/** Small, fast, seedable PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
}

type Opp =
  | { kind: 'known'; hand: number[] }
  | { kind: 'range'; combos: [number, number][] }
  | { kind: 'random' };

interface Setup {
  hole: number[];
  board: number[];
  opps: Opp[];
  /** Cards not in hero's hand, on the board, or in a known opponent hand. */
  deck: number[];
  need: number;
}

function setup(input: EquityInput): Setup {
  const err = validateInput(input);
  if (err) throw new Error(err);
  const knownCards: number[] = [];
  for (let i = 0; i < input.opponents; i++) {
    const k = input.known?.[i];
    if (k) knownCards.push(...k);
  }
  const dead = [...input.hole, ...input.board, ...knownCards];
  const opps: Opp[] = [];
  for (let i = 0; i < input.opponents; i++) {
    const k = input.known?.[i];
    const r = input.ranges?.[i];
    if (k) opps.push({ kind: 'known', hand: [...k] });
    else if (r) {
      const combos = liveCombos(r, dead);
      if (combos.length === 0) throw new Error(`Opponent ${i + 1}'s range has no possible hands with these cards.`);
      opps.push({ kind: 'range', combos });
    } else opps.push({ kind: 'random' });
  }
  return {
    hole: [...input.hole],
    board: [...input.board],
    opps,
    deck: remainingDeck(dead),
    need: 5 - input.board.length,
  };
}

/**
 * Number of deals an exact enumeration would visit (an upper bound when ranges are involved,
 * since overlapping combos get skipped). Unknown opponents' hands are ordered.
 */
export function exactDeals(input: EquityInput): number {
  const s = setup(input);
  let n = 1;
  let left = s.deck.length;
  for (const o of s.opps) {
    if (o.kind === 'range') {
      n *= o.combos.length;
      left -= 2;
    }
  }
  for (const o of s.opps) {
    if (o.kind === 'random') {
      n *= choose(left, 2);
      left -= 2;
    }
  }
  return n * choose(left, s.need);
}

/** Accumulates win / tie / share over deals. */
class Tally {
  win = 0;
  tie = 0;
  share = 0;
  shareSq = 0;
  n = 0;
  add(hero: number, oppScores: readonly number[]) {
    let best = -1;
    let atBest = 0;
    for (const s of oppScores) {
      if (s > best) {
        best = s;
        atBest = 1;
      } else if (s === best) atBest++;
    }
    let sh = 0;
    if (hero > best) {
      this.win++;
      sh = 1;
    } else if (hero === best) {
      this.tie++;
      sh = 1 / (atBest + 1);
    }
    this.share += sh;
    this.shareSq += sh * sh;
    this.n++;
  }
  result(exact: boolean): EquityResult {
    if (this.n === 0) throw new Error(RANGE_CONFLICT_ERROR);
    const n = this.n;
    const eq = this.share / n;
    const variance = Math.max(0, this.shareSq / n - eq * eq);
    return {
      equity: eq,
      win: this.win / n,
      tie: this.tie / n,
      lose: (this.n - this.win - this.tie) / n,
      samples: this.n,
      exact,
      stdError: exact ? 0 : Math.sqrt(variance / n),
    };
  }
}

const heroBuf = new Array<number>(7);
const oppBuf = new Array<number>(7);
const oppScores: number[] = [];

function scoreDeal(s: Setup, boardCards: readonly number[], oppHands: readonly (readonly number[])[], tally: Tally) {
  heroBuf[0] = s.hole[0];
  heroBuf[1] = s.hole[1];
  for (let i = 0; i < 5; i++) {
    heroBuf[i + 2] = boardCards[i];
    oppBuf[i + 2] = boardCards[i];
  }
  const hero = evaluate(heroBuf);
  oppScores.length = oppHands.length;
  for (let o = 0; o < oppHands.length; o++) {
    oppBuf[0] = oppHands[o][0];
    oppBuf[1] = oppHands[o][1];
    oppScores[o] = evaluate(oppBuf);
  }
  tally.add(hero, oppScores);
}

export function exactEquity(input: EquityInput): EquityResult {
  const s = setup(input);
  const tally = new Tally();
  const deck = s.deck;
  const used = new Uint8Array(52);
  const boardCards = [...s.board];
  const oppHands: number[][] = s.opps.map((o) => (o.kind === 'known' ? o.hand : [0, 0]));

  const dealBoard = (start: number, left: number) => {
    if (left === 0) {
      scoreDeal(s, boardCards, oppHands, tally);
      return;
    }
    for (let i = start; i < deck.length; i++) {
      const c = deck[i];
      if (used[c]) continue;
      used[c] = 1;
      boardCards.push(c);
      dealBoard(i + 1, left - 1);
      boardCards.pop();
      used[c] = 0;
    }
  };

  const dealOpp = (o: number) => {
    if (o === s.opps.length) {
      dealBoard(0, s.need);
      return;
    }
    const opp = s.opps[o];
    if (opp.kind === 'known') {
      dealOpp(o + 1);
      return;
    }
    const h = oppHands[o];
    if (opp.kind === 'range') {
      for (const [a, b] of opp.combos) {
        if (used[a] || used[b]) continue;
        used[a] = used[b] = 1;
        h[0] = a;
        h[1] = b;
        dealOpp(o + 1);
        used[a] = used[b] = 0;
      }
      return;
    }
    for (let i = 0; i < deck.length; i++) {
      if (used[deck[i]]) continue;
      used[deck[i]] = 1;
      for (let j = i + 1; j < deck.length; j++) {
        if (used[deck[j]]) continue;
        used[deck[j]] = 1;
        h[0] = deck[i];
        h[1] = deck[j];
        dealOpp(o + 1);
        used[deck[j]] = 0;
      }
      used[deck[i]] = 0;
    }
  };

  dealOpp(0);
  return tally.result(true);
}

/** Give up on a deal after this many range draws that collide with each other. */
const MAX_RANGE_ATTEMPTS = 10_000;

export function monteCarloEquity(input: EquityInput, onProgress?: (r: EquityResult) => void): EquityResult {
  const s = setup(input);
  const trials = input.trials ?? DEFAULT_TRIALS;
  const random = rng(input.seed ?? 0x9e3779b9);
  const deck = s.deck.slice();
  const tally = new Tally();
  const randomOpps = s.opps.filter((o) => o.kind === 'random').length;
  const draw = s.need + 2 * randomOpps;
  const drawn = new Array<number>(draw);
  const boardCards = new Array<number>(5);
  const oppHands: number[][] = s.opps.map((o) => (o.kind === 'known' ? o.hand : [0, 0]));
  for (let i = 0; i < s.board.length; i++) boardCards[i] = s.board[i];
  const ranged = s.opps.map((o, i) => (o.kind === 'range' ? i : -1)).filter((i) => i >= 0);

  // Cards taken by range hands in the current deal.
  const mark = new Uint8Array(52);
  const marked: number[] = [];
  const unmarkAll = () => {
    for (const c of marked) mark[c] = 0;
    marked.length = 0;
  };

  /**
   * Draw one combo per ranged opponent, each uniformly from its live combos; if two collide,
   * redraw them all. That's rejection sampling, so the joint deal stays exactly uniform over
   * every non-overlapping assignment (card removal between opponents).
   */
  const dealRanges = () => {
    for (let attempt = 0; attempt < MAX_RANGE_ATTEMPTS; attempt++) {
      let ok = true;
      for (const o of ranged) {
        const combos = (s.opps[o] as { combos: [number, number][] }).combos;
        const [a, b] = combos[Math.floor(random() * combos.length)];
        if (mark[a] || mark[b]) {
          ok = false;
          break;
        }
        mark[a] = mark[b] = 1;
        marked.push(a, b);
        oppHands[o][0] = a;
        oppHands[o][1] = b;
      }
      if (ok) return;
      unmarkAll();
    }
    throw new Error(RANGE_CONFLICT_ERROR);
  };

  for (let t = 0; t < trials; t++) {
    if (ranged.length) dealRanges();
    // Partial Fisher–Yates over the deck, skipping cards the range hands took: the kept
    // cards are a uniform random sample of what's left.
    let k = 0;
    for (let i = 0; k < draw; i++) {
      const j = i + Math.floor(random() * (deck.length - i));
      const c = deck[j];
      deck[j] = deck[i];
      deck[i] = c;
      if (!mark[c]) drawn[k++] = c;
    }
    k = 0;
    for (let i = s.board.length; i < 5; i++) boardCards[i] = drawn[k++];
    for (let o = 0; o < oppHands.length; o++) {
      if (s.opps[o].kind !== 'random') continue;
      oppHands[o][0] = drawn[k++];
      oppHands[o][1] = drawn[k++];
    }
    scoreDeal(s, boardCards, oppHands, tally);
    unmarkAll();
    if (onProgress && (t + 1) % 20_000 === 0 && t + 1 < trials) onProgress(tally.result(false));
  }
  return tally.result(false);
}

/** Exact when cheap enough, otherwise Monte Carlo. */
export function computeEquity(input: EquityInput, onProgress?: (r: EquityResult) => void): EquityResult {
  const limit = input.exactLimit ?? DEFAULT_EXACT_LIMIT;
  if (!input.forceMonteCarlo && exactDeals(input) * (1 + input.opponents) <= limit) return exactEquity(input);
  return monteCarloEquity(input, onProgress);
}
