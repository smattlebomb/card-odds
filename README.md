# Card Odds

A Blackjack and Texas Hold'em odds trainer for iPhone and iPad. It's an installable web app (PWA): open it in Safari, choose **Share → Add to Home Screen**, and it works offline after the first visit.

> **For training and home use. Using a phone or other device at a casino table is illegal in many places.**

All the math runs on the device. There's no server, no account, no analytics and nothing to pay for.

## What's in it (planned)

- **Blackjack:** best-play calculator for your table rules, basic-strategy practice, Hi-Lo counting practice.
- **Hold'em:** equity, outs and pot odds for your hole cards and the board, plus call/fold practice.
- **Hands & Stats:** an optional log of hands and practice accuracy, kept in this browser only.

Phase 1 (this version) has the app shell: the home screen, navigation to every section, the felt-green theme and a reusable card picker. The calculators and drills come in later phases (see `.grokbot/PLAN.md`).

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

### Hosting under a sub-path (GitHub Pages)

The base path comes from `VITE_BASE_PATH` and defaults to `/`:

```sh
VITE_BASE_PATH=/card-odds/ npm run build
```

Screens use hash URLs (`#/blackjack/count`), so deep links work on GitHub Pages without a 404 fallback.

## Privacy

If this is hosted on public GitHub Pages, the site is public, but it contains no personal data and needs none: it's a trainer. Any settings, hand logs and stats you create stay in your browser's local storage on your own device and are never uploaded.
