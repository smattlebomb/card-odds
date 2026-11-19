/**
 * Hold'em equity: exact enumeration when the number of deals is small, Monte Carlo otherwise.
 *
 * Equity = P(win outright) + Σ P(k-way tie at the top) / (k + 1). Opponents with unknown cards
 * get random cards from what's left (no range model). Known opponent hands are supported, which
 * the tests use for classic matchups like AA vs KK.
 */
import { remainingDeck } from './cards';
import { evaluate } from './evaluator';

export interface EquityInput {
  /** Hero's two hole cards (engine ints). */
  hole: readonly number[];
  /** 0, 3, 4 or 5 board cards. */
  board: readonly number[];
  /** Number of opponents, 1..MAX_OPPONENTS. */
  opponents: number;
  /** Optional known opponent hands; index i is opponent i, null = unknown. */
  known?: readonly (readonly number[] | null)[];
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
 * In practice: heads-up on the turn or river is exact; preflop, the flop and multiway turns /
 * rivers use Monte Carlo.
 */
export const DEFAULT_EXACT_LIMIT = 600_000;
export const DEFAULT_TRIALS = 200_000;

export function validateInput(input: EquityInput): string | null {
  const { hole, board, opponents } = input;
  if (hole.length !== 2) return 'Pick two hole cards.';
  if (![0, 3, 4, 5].includes(board.length)) return 'The board needs 0, 3, 4 or 5 cards.';
  if (!Number.isInteger(opponents) || opponents < 1 || opponents > MAX_OPPONENTS) return `Opponents must be 1–${MAX_OPPONENTS}.`;
  const all = [...hole, ...board, ...(input.known ?? []).flatMap((h) => h ?? [])];
  if (new Set(all).size !== all.length) return 'A card is used twice.';
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

interface Setup {
  hole: number[];
  board: number[];
  known: (number[] | null)[];
  unknownOpps: number;
  deck: number[];
  need: number;
}

function setup(input: EquityInput): Setup {
  const err = validateInput(input);
  if (err) throw new Error(err);
  const known: (number[] | null)[] = [];
  for (let i = 0; i < input.opponents; i++) {
    const k = input.known?.[i];
    known.push(k ? [...k] : null);
  }
  const used = [...input.hole, ...input.board, ...known.flatMap((h) => h ?? [])];
  return {
    hole: [...input.hole],
    board: [...input.board],
    known,
    unknownOpps: known.filter((k) => !k).length,
    deck: remainingDeck(used),
    need: 5 - input.board.length,
  };
}

/** Number of deals an exact enumeration would visit (unknown opponents' hands are ordered). */
export function exactDeals(input: EquityInput): number {
  const s = setup(input);
  let n = choose(s.deck.length, s.need);
  let left = s.deck.length - s.need;
  for (let i = 0; i < s.unknownOpps; i++) {
    n *= choose(left, 2);
    left -= 2;
  }
  return n;
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
    const n = this.n || 1;
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
  const oppHands: number[][] = s.known.map((k) => (k ? k : [0, 0]));
  const unknownIdx = s.known.map((k, i) => (k ? -1 : i)).filter((i) => i >= 0);

  const dealOpps = (u: number) => {
    if (u === unknownIdx.length) {
      scoreDeal(s, boardCards, oppHands, tally);
      return;
    }
    const h = oppHands[unknownIdx[u]];
    for (let i = 0; i < deck.length; i++) {
      if (used[deck[i]]) continue;
      used[deck[i]] = 1;
      for (let j = i + 1; j < deck.length; j++) {
        if (used[deck[j]]) continue;
        used[deck[j]] = 1;
        h[0] = deck[i];
        h[1] = deck[j];
        dealOpps(u + 1);
        used[deck[j]] = 0;
      }
      used[deck[i]] = 0;
    }
  };

  const dealBoard = (start: number, left: number) => {
    if (left === 0) {
      dealOpps(0);
      return;
    }
    for (let i = start; i <= deck.length - left; i++) {
      used[deck[i]] = 1;
      boardCards.push(deck[i]);
      dealBoard(i + 1, left - 1);
      boardCards.pop();
      used[deck[i]] = 0;
    }
  };
  dealBoard(0, s.need);
  return tally.result(true);
}

export function monteCarloEquity(input: EquityInput, onProgress?: (r: EquityResult) => void): EquityResult {
  const s = setup(input);
  const trials = input.trials ?? DEFAULT_TRIALS;
  const random = rng(input.seed ?? 0x9e3779b9);
  const deck = s.deck.slice();
  const tally = new Tally();
  const draw = s.need + 2 * s.unknownOpps;
  const boardCards = new Array<number>(5);
  const oppHands: number[][] = s.known.map((k) => (k ? k : [0, 0]));
  for (let i = 0; i < s.board.length; i++) boardCards[i] = s.board[i];

  for (let t = 0; t < trials; t++) {
    // Partial Fisher–Yates: the first `draw` cards of `deck` become a random sample.
    for (let i = 0; i < draw; i++) {
      const j = i + Math.floor(random() * (deck.length - i));
      const tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }
    let k = 0;
    for (let i = s.board.length; i < 5; i++) boardCards[i] = deck[k++];
    for (let o = 0; o < oppHands.length; o++) {
      if (s.known[o]) continue;
      oppHands[o][0] = deck[k++];
      oppHands[o][1] = deck[k++];
    }
    scoreDeal(s, boardCards, oppHands, tally);
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
