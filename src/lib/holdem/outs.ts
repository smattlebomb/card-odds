/**
 * Outs on the flop or turn.
 *
 * Definition used here (deliberately conservative): an out is an unseen card that, if it comes
 * next, gives you
 *   1. a better hand category than you have now,
 *   2. at least two pair, and
 *   3. a hand at least two categories better than the board alone after that card
 *      (so a card that just pairs the board, "giving" everyone two pair, doesn't count,
 *      but a board-pairing card that fills your set into a full house does).
 * So straight and flush draws count their completing cards (8 for an open-ender, 9 for a
 * flush draw, 4 for a gutshot); a pair improving to two pair or trips counts; picking up a
 * single pair with overcards does not. Cards that also complete a bigger hand for an opponent
 * ("dirty" outs) are still counted — the equity number, not the outs count, is the real guide.
 */
import { intToString, remainingDeck } from './cards';
import { category, CATEGORY_NAME, evaluate, TWO_PAIR } from './evaluator';

export interface OutsResult {
  /** Number of outs. */
  count: number;
  /** Out cards as "Ah", "Td" … */
  cards: string[];
  /** Outs grouped by the hand they make, best first, e.g. [{ hand: 'Flush', count: 9 }]. */
  byHand: { hand: string; count: number }[];
  /** Cards still unseen. */
  unseen: number;
  /** Rule of 4 (flop, two cards to come) / rule of 2 (turn) estimate, 0..1. */
  ruleOfThumb: number;
}

/** Outs for hole + board (3 or 4 board cards); null on other streets. */
export function countOuts(hole: readonly number[], board: readonly number[]): OutsResult | null {
  if (hole.length !== 2 || (board.length !== 3 && board.length !== 4)) return null;
  const nowCat = category(evaluate([...hole, ...board]));
  const deck = remainingDeck([...hole, ...board]);
  const cards: string[] = [];
  const groups = new Map<number, number>();
  for (const c of deck) {
    const nextBoard = [...board, c];
    const heroCat = category(evaluate([...hole, ...nextBoard]));
    // The board alone (3–5 cards): with fewer than 5 cards just count matching ranks / suits.
    const boardCat = boardCategory(nextBoard);
    if (heroCat > nowCat && heroCat >= TWO_PAIR && heroCat >= boardCat + 2) {
      cards.push(intToString(c));
      groups.set(heroCat, (groups.get(heroCat) ?? 0) + 1);
    }
  }
  const byHand = [...groups.entries()].sort((a, b) => b[0] - a[0]).map(([cat, count]) => ({ hand: CATEGORY_NAME[cat], count }));
  const perCard = board.length === 3 ? 4 : 2;
  return {
    count: cards.length,
    cards,
    byHand,
    unseen: deck.length,
    ruleOfThumb: Math.min(1, (cards.length * perCard) / 100),
  };
}

/** Category of the board by itself; boards under five cards can only hold pairs / trips / quads. */
export function boardCategory(board: readonly number[]): number {
  if (board.length >= 5) return category(evaluate(board));
  const counts = new Map<number, number>();
  for (const c of board) counts.set(c >> 2, (counts.get(c >> 2) ?? 0) + 1);
  const n = [...counts.values()].sort((a, b) => b - a);
  if (n[0] === 4) return 7;
  if (n[0] === 3) return 3;
  if (n[0] === 2 && n[1] === 2) return 2;
  if (n[0] === 2) return 1;
  return 0;
}
