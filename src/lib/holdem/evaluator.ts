/**
 * 5- to 7-card poker hand evaluator.
 *
 * Returns a single comparable score: higher is better, equal means a tie. The score packs the
 * category in the top digit and up to five tie-break ranks below it (base 16):
 *   score = category·16⁵ + r1·16⁴ + r2·16³ + r3·16² + r4·16 + r5   (ranks 0..12 = 2..A)
 * It works directly on rank counts and per-suit rank bitmasks (no lookup tables), so it
 * picks the best five of seven implicitly: e.g. a flush is checked only after quads / full
 * house, and straights are read off a 13-bit rank mask with the Ace also playing low.
 */

export const HIGH_CARD = 0;
export const PAIR = 1;
export const TWO_PAIR = 2;
export const TRIPS = 3;
export const STRAIGHT = 4;
export const FLUSH = 5;
export const FULL_HOUSE = 6;
export const QUADS = 7;
export const STRAIGHT_FLUSH = 8;

export const CATEGORY_NAME = [
  'High card',
  'Pair',
  'Two pair',
  'Three of a kind',
  'Straight',
  'Flush',
  'Full house',
  'Four of a kind',
  'Straight flush',
] as const;

const B = 16;
const B5 = B ** 5;

function pack(cat: number, r: readonly number[]): number {
  return cat * B5 + (r[0] ?? 0) * B ** 4 + (r[1] ?? 0) * B ** 3 + (r[2] ?? 0) * B ** 2 + (r[3] ?? 0) * B + (r[4] ?? 0);
}

/** Highest straight in a 13-bit rank mask (bit i = rank i), as the top rank; -1 if none. A-2-3-4-5 → 3 (the 5). */
export function straightHigh(mask: number): number {
  for (let h = 12; h >= 4; h--) {
    if (((mask >> (h - 4)) & 0x1f) === 0x1f) return h;
  }
  // Wheel: A,2,3,4,5 = bits 12,0,1,2,3.
  if ((mask & 0x100f) === 0x100f) return 3;
  return -1;
}

const counts = new Int8Array(13);
const suitMask = new Int32Array(4);
const suitCount = new Int8Array(4);

/** Evaluate 5–7 cards (engine ints). */
export function evaluate(cards: readonly number[]): number {
  counts.fill(0);
  suitMask.fill(0);
  suitCount.fill(0);
  let rankMask = 0;
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const r = c >> 2;
    const s = c & 3;
    counts[r]++;
    suitMask[s] |= 1 << r;
    suitCount[s]++;
    rankMask |= 1 << r;
  }

  let flushSuit = -1;
  for (let s = 0; s < 4; s++) if (suitCount[s] >= 5) flushSuit = s;
  if (flushSuit >= 0) {
    const sf = straightHigh(suitMask[flushSuit]);
    if (sf >= 0) return pack(STRAIGHT_FLUSH, [sf]);
  }

  // Ranks grouped by multiplicity, high to low.
  let quad = -1;
  const trips: number[] = [];
  const pairs: number[] = [];
  const singles: number[] = [];
  for (let r = 12; r >= 0; r--) {
    const n = counts[r];
    if (n === 4) quad = r;
    else if (n === 3) trips.push(r);
    else if (n === 2) pairs.push(r);
    else if (n === 1) singles.push(r);
  }

  if (quad >= 0) {
    let kicker = -1;
    for (let r = 12; r >= 0; r--) if (r !== quad && counts[r] > 0) { kicker = r; break; }
    return pack(QUADS, [quad, kicker]);
  }
  if (trips.length >= 1 && trips.length + pairs.length >= 2) {
    const pairRank = Math.max(trips[1] ?? -1, pairs[0] ?? -1);
    return pack(FULL_HOUSE, [trips[0], pairRank]);
  }
  if (flushSuit >= 0) {
    const top: number[] = [];
    const m = suitMask[flushSuit];
    for (let r = 12; r >= 0 && top.length < 5; r--) if (m & (1 << r)) top.push(r);
    return pack(FLUSH, top);
  }
  const st = straightHigh(rankMask);
  if (st >= 0) return pack(STRAIGHT, [st]);
  if (trips.length === 1) {
    const k = [...pairs, ...singles].sort((a, b) => b - a);
    return pack(TRIPS, [trips[0], k[0], k[1]]);
  }
  if (pairs.length >= 2) {
    // A third pair's rank can be the kicker.
    const rest = [...pairs.slice(2), ...singles].sort((a, b) => b - a);
    return pack(TWO_PAIR, [pairs[0], pairs[1], rest[0]]);
  }
  if (pairs.length === 1) return pack(PAIR, [pairs[0], singles[0], singles[1], singles[2]]);
  return pack(HIGH_CARD, singles.slice(0, 5));
}

export function category(score: number): number {
  return Math.floor(score / B5);
}

/** Tie-break ranks encoded in a score (0..12). */
function ranksOf(score: number): number[] {
  const out: number[] = [];
  for (let i = 4; i >= 0; i--) out.push(Math.floor(score / B ** i) % B);
  return out;
}

const RANK_WORD = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'];
const RANK_PLURAL = ['2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s', '10s', 'Jacks', 'Queens', 'Kings', 'Aces'];

/** "Full house, Kings full of 7s", "Straight, 5 high", "Royal flush". */
export function describeScore(score: number): string {
  const cat = category(score);
  const [a, b] = ranksOf(score);
  switch (cat) {
    case STRAIGHT_FLUSH:
      return a === 12 ? 'Royal flush' : `Straight flush, ${RANK_WORD[a]} high`;
    case QUADS:
      return `Four ${RANK_PLURAL[a]}`;
    case FULL_HOUSE:
      return `Full house, ${RANK_PLURAL[a]} full of ${RANK_PLURAL[b]}`;
    case FLUSH:
      return `Flush, ${RANK_WORD[a]} high`;
    case STRAIGHT:
      return `Straight, ${RANK_WORD[a]} high`;
    case TRIPS:
      return `Three ${RANK_PLURAL[a]}`;
    case TWO_PAIR:
      return `Two pair, ${RANK_PLURAL[a]} and ${RANK_PLURAL[b]}`;
    case PAIR:
      return `Pair of ${RANK_PLURAL[a]}`;
    default:
      return `${RANK_WORD[a]} high`;
  }
}

/** -1 / 0 / 1: does hand `a` lose to, tie, or beat hand `b`? */
export function compareHands(a: readonly number[], b: readonly number[]): -1 | 0 | 1 {
  const x = evaluate(a);
  const y = evaluate(b);
  return x > y ? 1 : x < y ? -1 : 0;
}
