/** One-stop blackjack advice: basic strategy + count deviations + EVs + a plain-English reason. */
import type { Rank } from '../cards';
import { actionEVs, bestAction, type Action, type ActionEVs } from './ev';
import { findDeviation, indexLabel, INSURANCE_INDEX, type Deviation } from './deviations';
import { cardValue, describeHand, handValue, upcardValue, type HandValue } from './hand';
import { blackjackPayout, type Rules } from './rules';
import { chartCode, doubleAllowed, type Code } from './strategy';

export type AdviceStatus = 'incomplete' | 'invalid' | 'bust' | 'blackjack' | 'play';

export interface Advice {
  status: AdviceStatus;
  hand: HandValue | null;
  /** The recommended play (basic strategy, or the count play when a deviation applies). */
  action: Action | null;
  /** What basic strategy alone says. */
  basicAction: Action | null;
  deviation: Deviation | null;
  legal: Action[];
  /** EVs per legal action, for a neutral shoe minus the cards on the table (ignores the count). */
  evs: ActionEVs;
  /** Highest-EV action for these exact cards (may differ from total-based basic strategy). */
  evBest: Action | null;
  reason: string;
  /** Extra one-liners: composition notes, assumptions. */
  notes: string[];
  /** Insurance / even-money advice when the dealer shows an Ace. */
  insurance: string | null;
}

export const ACTION_LABEL: Record<Action, string> = {
  hit: 'Hit',
  stand: 'Stand',
  double: 'Double',
  split: 'Split',
  surrender: 'Surrender',
};

const RESOLVE: Record<Code, [Action, Action | null]> = {
  H: ['hit', null],
  S: ['stand', null],
  P: ['split', null],
  Dh: ['double', 'hit'],
  Ds: ['double', 'stand'],
  Rh: ['surrender', 'hit'],
  Rs: ['surrender', 'stand'],
  Rp: ['surrender', 'split'],
};

/** Turn a chart code into a play that's legal right now (e.g. Dh on three cards = hit). */
export function resolveCode(code: Code, legal: readonly Action[]): Action {
  const [first, fallback] = RESOLVE[code];
  if (legal.includes(first)) return first;
  if (fallback && legal.includes(fallback)) return fallback;
  // Rp on a hand that can't split doesn't happen; hit is the safe default.
  return fallback === 'split' ? 'hit' : (fallback ?? 'hit');
}

function empty(status: AdviceStatus, reason: string, hand: HandValue | null = null): Advice {
  return {
    status,
    hand,
    action: null,
    basicAction: null,
    deviation: null,
    legal: [],
    evs: {},
    evBest: null,
    reason,
    notes: [],
    insurance: null,
  };
}

const upName = (up: number) => (up === 11 ? 'an Ace' : up === 8 ? 'an 8' : `a ${up}`);
const fmtTc = (tc: number) => (tc > 0 ? `+${tc}` : `${tc}`);

function insuranceNote(up: number, tc: number | null, blackjack: boolean): string | null {
  if (up !== 11) return null;
  const what = blackjack ? 'even money' : 'insurance';
  if (tc === null) return `No ${what}: basic strategy never takes it. Enter a true count to check.`;
  return tc >= INSURANCE_INDEX
    ? `Take ${what}: it's +EV at TC ≥ +${INSURANCE_INDEX} (count is ${fmtTc(tc)}).`
    : `No ${what}: it only pays at TC ≥ +${INSURANCE_INDEX} (count is ${fmtTc(tc)}).`;
}

interface ReasonCtx {
  hand: HandValue;
  up: number;
  pair: number | null;
}

/** Short plain-English reason for a basic-strategy play. */
export function basicReason(action: Action, { hand, up, pair }: ReasonCtx): string {
  const t = hand.total;
  const label = pair !== null ? `${pair === 11 ? 'A' : pair},${pair === 11 ? 'A' : pair}` : describeHand(hand);
  const vs = `vs ${upName(up)}`;
  const weakDealer = up >= 2 && up <= 6;
  switch (action) {
    case 'split':
      if (pair === 11) return 'Split: always split Aces — two hands starting with 11 beat one soft 12.';
      if (pair === 8) return 'Split: always split 8s — 16 is the worst total, and two hands starting with 8 do much better.';
      return `Split: two hands starting with ${pair} do better than ${t} ${vs}.`;
    case 'surrender':
      return `Surrender: ${label} ${vs} loses well over half the time, so giving up half the bet costs less.`;
    case 'double':
      return weakDealer
        ? `Double: ${label} ${vs} — the dealer is likely to bust or end low, so get more money out.`
        : `Double: ${label} ${vs} — you're the favourite to make a strong hand with one card.`;
    case 'stand':
      if (pair === 10) return 'Stand: never split 10s — 20 already wins most of the time.';
      if (hand.soft && t >= 18) return `Stand: ${label} is already a good hand ${vs}.`;
      if (t >= 17) return `Stand: ${t} is strong enough; hitting risks busting.`;
      if (weakDealer) return `Stand: ${t} ${vs} — that's a dealer bust card, so let the dealer take the risk.`;
      return `Stand: ${label} ${vs} — hitting busts too often to be worth it.`;
    case 'hit':
      if (hand.soft) return `Hit: ${label} can't bust with one card and isn't strong enough ${vs}.`;
      if (t <= 11) return `Hit: you can't bust with ${t}.`;
      if (t === 12 && (up === 2 || up === 3)) return `Hit: 12 ${vs} — only a 10-value card busts you, and ${upName(up)} isn't weak enough to stand on.`;
      if (up >= 7) return `Hit: ${t} ${vs} — the dealer will usually make 17 or more, so standing loses more often.`;
      return `Hit: ${label} ${vs} is too weak to stand on.`;
  }
}

/**
 * @param up dealer upcard (null until picked)
 * @param player player's cards so far
 * @param tc true count, or null when not entered (basic strategy only)
 */
export function advise(up: Rank | null, player: readonly Rank[], rules: Rules, tc: number | null = null): Advice {
  if (!up || player.length < 2) {
    return empty('incomplete', up ? 'Add at least two player cards.' : 'Pick the dealer upcard and your cards.');
  }
  const hand = handValue(player);
  const upV = upcardValue(up);
  const values = player.map(cardValue);

  // Not more of a card than the shoe holds (e.g. five Aces in one deck).
  const used = new Array(11).fill(0);
  for (const v of [...values, cardValue(up)]) used[v]++;
  for (let v = 1; v <= 10; v++) {
    if (used[v] > (v === 10 ? 16 : 4) * rules.decks) {
      return empty('invalid', `There aren't that many ${v === 1 ? 'Aces' : v === 10 ? 'ten-value cards' : `${v}s`} in ${rules.decks} deck${rules.decks > 1 ? 's' : ''}.`, hand);
    }
  }

  if (hand.bust) return empty('bust', `Bust with ${hand.total}.`, hand);

  if (hand.blackjack) {
    const pay = blackjackPayout(rules);
    return {
      ...empty('blackjack', `Blackjack! It pays ${rules.blackjackPays} (+${pay.toFixed(2)} bets).`, hand),
      action: 'stand',
      basicAction: 'stand',
      legal: ['stand'],
      evs: { stand: pay },
      evBest: 'stand',
      insurance: insuranceNote(upV, tc, true),
    };
  }

  const two = player.length === 2;
  const pairValue = hand.pair ? (hand.pair === 'A' ? 11 : cardValue(hand.pair)) : null;
  const legal: Action[] = ['stand'];
  if (hand.total < 21) legal.push('hit');
  if (two && doubleAllowed(hand.total, hand.soft, rules)) legal.push('double');
  if (pairValue !== null) legal.push('split');
  if (two && rules.surrender) legal.push('surrender');

  const evs = actionEVs({
    player: values,
    up: cardValue(up),
    decks: rules.decks,
    hitSoft17: rules.hitSoft17,
    das: rules.das,
    canDouble: legal.includes('double'),
    canSplit: legal.includes('split'),
    canSurrender: legal.includes('surrender'),
  });
  const evBest = bestAction(evs);

  const insurance = insuranceNote(upV, tc, false);
  if (hand.total === 21) {
    return { ...empty('play', 'Stand: 21 can only be tied.', hand), action: 'stand', basicAction: 'stand', legal, evs, evBest, insurance };
  }

  const code = chartCode({ total: hand.total, soft: hand.soft, pair: pairValue }, upV, rules);
  const basic = resolveCode(code, legal);
  const deviation =
    tc === null ? null : findDeviation({ total: hand.total, soft: hand.soft, pair: pairValue, up: upV, basic, legal }, tc);
  const action = deviation ? deviation.play : basic;

  const ctx = { hand, up: upV, pair: pairValue };
  const reason = deviation
    ? `${ACTION_LABEL[action]}: count play (${deviation.set}, ${indexLabel(deviation)}). At TC ${fmtTc(tc!)} this beats basic strategy's ${ACTION_LABEL[basic].toLowerCase()}.`
    : basicReason(action, ctx);

  const notes: string[] = [];
  if (!two && code.startsWith('D')) notes.push('Basic strategy would double here, but you can only double on your first two cards.');
  if (!two && code.startsWith('R')) notes.push('Basic strategy would surrender here, but only on your first two cards.');
  if (evBest !== action && evs[evBest] !== undefined && evs[action] !== undefined) {
    const diff = (evs[evBest]! - evs[action]!) * 100;
    notes.push(
      deviation
        ? `Off the top of a fresh shoe ${ACTION_LABEL[evBest].toLowerCase()} would be best; the count is what changes it.`
        : `For these exact cards, ${ACTION_LABEL[evBest].toLowerCase()} is ${diff < 0.05 ? 'a hair' : `${diff.toFixed(1)}% of a bet`} better than the chart play (a composition-dependent edge).`,
    );
  }

  return { status: 'play', hand, action, basicAction: basic, deviation, legal, evs, evBest, reason, notes, insurance };
}
