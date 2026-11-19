import type { ReactNode } from 'react';
import { Disclaimer } from './Disclaimer';

interface ScreenProps {
  title: string;
  onBack?: () => void;
  /** Extra controls under the title bar (e.g. a game's tab bar). */
  nav?: ReactNode;
  children: ReactNode;
}

/** Standard screen frame: title bar with optional Back, scrolling body, disclaimer footer. */
export function Screen({ title, onBack, nav, children }: ScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <header className="flex min-h-16 items-center gap-3 px-4 pt-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-14 min-w-14 items-center justify-center rounded-2xl bg-felt-950/50 px-4 text-2xl font-bold active:bg-felt-950"
          >
            ‹
          </button>
        )}
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      </header>
      {nav}
      <main className="flex-1 px-4 py-4">{children}</main>
      <footer className="px-4 pb-4 pt-2 text-center">
        <Disclaimer />
      </footer>
    </div>
  );
}

/** "Coming in a later phase" body for screens that are only routed so far. */
export function Placeholder({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-felt-600 bg-felt-950/30 p-6 text-center text-xl text-chalk/80">
      {text}
    </div>
  );
}
