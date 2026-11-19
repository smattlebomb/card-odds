# Card Odds

A Blackjack and Texas Hold'em odds trainer for iPhone and iPad. It's an installable web app (PWA): open it in Safari, choose **Share → Add to Home Screen**, and it works offline after the first visit.

> **For training and home use. Using a phone or other device at a casino table is illegal in many places.**

All the math runs on the device. There's no server, no account, no analytics and nothing to pay for.

## What's in it

- **Blackjack calculator (done):** pick the dealer's upcard and your cards, optionally enter a Hi-Lo true count, and get the best play (hit / stand / double / split / surrender) with its EV, the EV of every other legal play, and a one-line reason. Table rules are set in Settings.
- **Hold'em calculator (done):** pick hole cards and an optional board, the number of opponents, pot and bet size. Equity is computed in a Web Worker (exact enumeration when it's cheap, Monte Carlo otherwise). The screen also shows outs, pot odds, a fold/call/raise (or check/bet) suggestion, and a tight 6-max preflop opening chart by position.
- **Practice drills:** random blackjack spots graded against basic strategy for your current rules; Hold'em turn spots graded fold/call against equity vs pot odds. A running accuracy score is saved on the device.
- **Hi-Lo counting practice:** deal through a shoe (speed settings, or tap to deal) and quiz the running count every 8 cards; separate true-count conversion drills (TC = RC ÷ remaining decks, truncated toward zero).
- **Hands & Stats:** manual hand log (win/loss/push and an amount), practice accuracy by type, and simple daily charts. Everything stays in `localStorage` on this device (`card-odds:stats:v1`).

See `.grokbot/PLAN.md` for the phase plan.

## Blackjack: how the advice works

**Rules (Settings, saved in `localStorage` under `card-odds:rules:v1`).** Decks 1 / 2 / 6 / 8, dealer stands or hits soft 17, double after split, late surrender, blackjack pays 3:2 or 6:5, double on any two cards / 9–11 / 10–11. Defaults: **6 decks, S17, DAS, no surrender, 3:2, double on any two.** Always assumed: the dealer peeks for blackjack with an Ace or ten up (US hole-card game), pairs split up to four hands, split Aces get one card each, no doubling after hitting, surrender only on the first two cards.

**The recommended play** comes from total-dependent basic strategy for the current rules (`src/lib/blackjack/strategy.ts`), the same thing a printed chart gives you, so it's what you'd memorise.
- 6 and 8 decks: the standard 4–8 deck charts (Wizard of Odds) for S17/H17, DAS/no DAS, surrender/no surrender. A test checks every cell of the 6-deck S17 DAS chart against a literal copy of the published chart.
- 1 and 2 decks: start from the published single/double-deck charts. Where a close cell disagreed with the app's own EV engine, the engine's answer was used, so the chart and the EVs shown never contradict each other.
- Every chart cell for all 64 rule combinations (4 deck counts × S17/H17 × DAS × surrender) was checked against the EV engine, averaged over all two-card hands for each total. Four representative rule sets are re-checked in the test suite.

**The EVs** come from a recursive expected-value engine (`src/lib/blackjack/ev.ts`), not a table. It uses the actual shoe minus the cards on the table, works through every dealer drawing sequence (given the dealer has no blackjack) and every player draw, and reports EV per starting bet. To keep a phone fast (the slowest spot is about 20 ms on a Mac), the dealer's odds are recomputed exactly only for the first two player draws; tests check this stays within 0.1% of a fully exact run. Split EVs don't model resplitting, so they read slightly low. When your exact cards favour a different play than the chart, for example a three-card 16 vs 10 where standing is a hair better, the calculator says so in a note.

**Count plays.** With a true count entered, the calculator applies the **Illustrious 18** and **Fab 4** surrender indexes for Hi-Lo, multi-deck, S17, from Don Schlesinger's *Blackjack Attack* (`src/lib/blackjack/deviations.ts`).
- The count is used exactly as typed, and the play changes at **TC ≥ index**. For the "hit below" plays (12 vs 4, 12 vs 5, 12 vs 6, 13 vs 2, 13 vs 3) it changes at TC < index. Most players floor the true count first; do that before typing it in if that's your convention.
- An index is used only when basic strategy for your rules makes the play the index was written against. For example, under H17 basic strategy already doubles 11 vs A, so the "+1" index is skipped rather than applied backwards.
- The indexes are for 6–8 decks; with 1–2 decks they're an approximation.
- Insurance and even money: take them at TC ≥ +3, never without a count.
- The EVs shown are for a neutral shoe and don't include the count.


## Hold'em: how the numbers work

**Equity** is P(win) plus a fair share of ties. Each opponent plays either random cards (the default) or a **range** you give them. When the number of deals is small enough the result is an exact enumeration: typically heads-up on the turn or river, including against a range. Otherwise it runs 200,000 Monte Carlo deals in a Web Worker so the UI stays smooth, and labels the result as an estimate. If you change the inputs while a run is still going, that run is stopped and a new one starts, so the result always matches what's on screen.

**Opponent ranges.** Tap **Set range** next to an opponent to open the range picker, a 13×13 grid. Tap a hand to toggle it, or drag across cells to paint several. The first cell you touch decides whether the drag adds or removes. Presets:
- **By position:** opening ranges for UTG / MP / CO / BTN / SB, and a defend range for the BB, each in a tight and a loose version. These are typical 6-max cash-game styles, not solver output.
- **Top X%:** a slider plus 5 / 10 / 15 / 20 / 30 / 50% buttons. Hands are ordered by Bill Chen's formula, a classic rule-of-thumb hand ranking rather than an equity ranking.
- **3-bet:** a value range (QQ+, AK) and a wider one (TT+, AJs+, KQs, AQo+, A5s, A4s).

Each opponent keeps their own range, and **Use for all opponents** copies one range to everyone. **Random hands** puts an opponent back on random cards.

**Card removal** is exact. A range's combos that use your hole cards, the board or another opponent's cards in the same deal are impossible. The Monte Carlo draws each ranged opponent's combo uniformly and redraws whenever two opponents collide, so every possible deal is equally likely. A range with no hands left (say AA when you hold two Aces and a third is on the board) shows an error instead of a fake 100%. Against ranges, the advice compares range equity to pot odds and drops the "random hands" warning. In its place it reminds you the answer is only as good as the range you entered.

**Outs** on the flop or turn are cards that raise the hand's category to at least two pair and clearly ahead of the board (so a flush draw is 9, an open-ended straight draw is 8). Overcards to a mere pair are ignored on purpose; dirty outs that mostly make the board are filtered out.

**Pot odds:** enter the pot *before* the bet you're facing, and the amount to call. A $50 bet into a $100 pot needs 25% equity (50 into 200). Advice is educational. With random opponents it reminds you that a real player who bets usually has a stronger range than that; set an opponent range to get advice based on range equity.

**Preflop chart:** a tight-ish 6-max cash opening (RFI) guide for UTG / MP / CO / BTN / SB. It is not a solver and the big blind has no opening range here (it already posted).

The evaluator and known matchups are unit-tested, including AA vs KK heads-up ≈ 82.6% equity, AKs vs AKo, 22 vs AK, wheel straights, and river chops. Range tests cover:
- AA vs the KK range ≈ 81.9 / 18.1
- AKs vs QQ ≈ 46 / 54
- AA vs a random hand ≈ 85.2%, and a range of every hand gives the same answer as random
- exact range equities on the river
- card removal between your cards, the board and other opponents

## Run it

Needs Node 22.

```sh
npm install       # install dependencies
npm test          # run unit and component tests (Vitest)
npm run dev       # dev server at http://localhost:5173
npm run build     # type-check and build to dist/
npm run preview   # serve the production build locally
```

To try it on a phone on the same Wi-Fi, run `npm run dev -- --host` and open the printed network address.

`npm run icons` regenerates the placeholder icons in `public/`.

If this repo is public on GitHub Pages, that's fine: the app is a trainer and does not collect or require personal data. Settings and the hand log never leave the device.

### Hosting under a sub-path (GitHub Pages)

The base path comes from `VITE_BASE_PATH` and defaults to `/`:

```sh
VITE_BASE_PATH=/card-odds/ npm run build
```

Screens use hash URLs (`#/blackjack/count`), so deep links work on GitHub Pages without a 404 fallback.

## Privacy

If this is hosted on public GitHub Pages, the site is public, but it contains no personal data and needs none: it's a trainer. Any settings, hand logs and stats you create stay in your browser's local storage on your own device and are never uploaded.
