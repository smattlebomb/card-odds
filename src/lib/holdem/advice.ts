/**
 * Pot odds and a simple, educational fold / call / raise (or check / bet) suggestion.
 *
 * Conventions:
 * - `pot` is the pot BEFORE the bet you're facing (include any calls made before you).
 * - `toCall` is the bet you're facing. After you call the pot will be pot + toCall + toCall,
 *   so the equity you need to break even is toCall / (pot + 2·toCall).
 *   Example: pot 100, bet 50 → 50 / 200 = 25%.
 * - Equity is either against random hands or against the opponent ranges you set. Against
 *   random hands the advice warns that real bettors are usually stronger; against ranges it
 *   says the result is only as good as the ranges entered.
 */

export type HoldemAction = 'fold' | 'call' | 'raise' | 'check' | 'bet';

export const HOLDEM_ACTION_LABEL: Record<HoldemAction, string> = {
  fold: 'Fold',
  call: 'Call',
  raise: 'Raise',
  check: 'Check',
  bet: 'Bet',
};

/** Equity needed to call profitably (0..1). 0 when there's nothing to call. */
export function requiredEquity(pot: number, toCall: number): number {
  if (!(toCall > 0)) return 0;
  return toCall / (Math.max(0, pot) + 2 * toCall);
}

/** Pot odds as "3 : 1" (what the pot pays vs what you put in). */
export function potOddsRatio(pot: number, toCall: number): string {
  if (!(toCall > 0)) return '—';
  const r = (Math.max(0, pot) + toCall) / toCall;
  return `${r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)} : 1`;
}

/** Your "fair share" against n random opponents. */
export const fairShare = (opponents: number) => 1 / (opponents + 1);

/** Equity margin over fair share that counts as a value hand. */
export const VALUE_MARGIN = 0.15;
/** Within this much of the break-even equity a spot is a close call. */
export const CLOSE_MARGIN = 0.03;

export interface HoldemAdviceInput {
  equity: number;
  opponents: number;
  pot: number;
  toCall: number;
  /** Outs on the flop/turn, if known (for an implied-odds note). */
  outs?: number | null;
  /** True when equity was computed against opponent ranges (at least one opponent has one). */
  vsRanges?: boolean;
}

export interface HoldemAdvice {
  action: HoldemAction;
  required: number;
  reason: string;
  /** Extra notes (close call, implied odds, random-hands caveat). */
  notes: string[];
}

const pct = (x: number) => `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;

export const RANDOM_HANDS_NOTE = 'Equity here is against random hands; a player who bets usually has a stronger range.';
export const RANGE_NOTE = "Equity here is against the opponent ranges you set, so it's only as good as those ranges.";

export function holdemAdvice({ equity, opponents, pot, toCall, outs, vsRanges = false }: HoldemAdviceInput): HoldemAdvice {
  const fair = fairShare(opponents);
  const valueLine = fair + VALUE_MARGIN;
  const vs = vsRanges
    ? opponents === 1
      ? "your opponent's range"
      : `your ${opponents} opponents' ranges`
    : opponents === 1
      ? '1 opponent'
      : `${opponents} opponents`;
  const notes: string[] = [];

  if (!(toCall > 0)) {
    if (equity >= valueLine) {
      return {
        action: 'bet',
        required: 0,
        reason: `Bet: you have ${pct(equity)} equity against ${vs} (an even share is ${pct(fair)}), so you're well ahead — bet for value.`,
        notes,
      };
    }
    const reason =
      equity >= fair
        ? `Check: ${pct(equity)} equity is a bit better than an even share (${pct(fair)}) against ${vs}, but not far enough ahead to build the pot.`
        : `Check: ${pct(equity)} equity is below an even share (${pct(fair)}) against ${vs}, so don't put more money in.`;
    return { action: 'check', required: 0, reason, notes };
  }

  const required = requiredEquity(pot, toCall);
  const need = `need ${pct(required)} to call (${toCall} into a pot of ${pot + toCall})`;
  if (equity >= required) {
    if (equity >= valueLine && equity >= required + 0.1) {
      notes.push(
        vsRanges
          ? RANGE_NOTE
          : 'Real opponents who bet are usually stronger than a random hand, so be a little more careful than these numbers suggest.',
      );
      return {
        action: 'raise',
        required,
        reason: `Raise: you have ${pct(equity)} equity and ${need} — well ahead of ${vs}, so raise for value.`,
        notes,
      };
    }
    if (equity - required < CLOSE_MARGIN) notes.push('Close to break-even: small mistakes in the read swing this either way.');
    notes.push(vsRanges ? RANGE_NOTE : RANDOM_HANDS_NOTE);
    return {
      action: 'call',
      required,
      reason: `Call: you have ${pct(equity)} equity against ${vs} and ${need}, so a call is +EV.`,
      notes,
    };
  }
  if (required - equity < CLOSE_MARGIN) notes.push('Close to break-even: a slightly bigger pot or a weaker opponent range would make this a call.');
  if (outs && outs >= 8) {
    notes.push(`Implied odds: with ${outs} outs, calling can still pay if you'll win a lot more when you hit.`);
  }
  return {
    action: 'fold',
    required,
    reason: `Fold: you have ${pct(equity)} equity but ${need}, so calling loses money in the long run.`,
    notes,
  };
}
