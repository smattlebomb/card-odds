import { Disclaimer } from '../components/Disclaimer';
import type { Route } from '../lib/route';

export function HomeScreen({ navigate }: { navigate: (r: Route) => void }) {
  const big =
    'flex min-h-36 flex-col items-center justify-center gap-1 rounded-3xl border-2 border-felt-400/40 bg-felt-800 p-6 shadow-xl shadow-black/30 active:bg-felt-700';
  const small =
    'flex min-h-16 items-center justify-center rounded-2xl bg-felt-950/50 px-4 text-xl font-bold active:bg-felt-950';

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
      <header className="mb-8 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight">Card Odds</h1>
        <p className="mt-2 text-xl text-chalk/80">Blackjack &amp; Hold'em trainer</p>
      </header>

      <main className="flex flex-1 flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <button type="button" className={big} onClick={() => navigate({ screen: 'game', game: 'blackjack', tab: 'calculator' })}>
            <span aria-hidden className="text-5xl">🂡</span>
            <span className="text-3xl font-extrabold">Blackjack</span>
            <span className="text-chalk/70">Best play · Practice · Count</span>
          </button>
          <button type="button" className={big} onClick={() => navigate({ screen: 'game', game: 'holdem', tab: 'calculator' })}>
            <span aria-hidden className="text-5xl">♠♥</span>
            <span className="text-3xl font-extrabold">Hold'em</span>
            <span className="text-chalk/70">Equity · Pot odds · Practice</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button type="button" className={small} onClick={() => navigate({ screen: 'stats' })}>
            Hands &amp; Stats
          </button>
          <button type="button" className={small} onClick={() => navigate({ screen: 'settings' })}>
            Settings
          </button>
        </div>
      </main>

      <footer className="pt-8 text-center">
        <Disclaimer />
      </footer>
    </div>
  );
}
