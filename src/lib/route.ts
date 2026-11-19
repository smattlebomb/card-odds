/**
 * Tiny hash router. Hash URLs (#/blackjack/calculator) work on GitHub Pages under any
 * base path with no 404 fallback, and keep the PWA's start_url/scope simple.
 */
import { useCallback, useEffect, useState } from 'react';

export type Game = 'blackjack' | 'holdem';
export type GameTab = 'calculator' | 'practice' | 'count';

export type Route =
  | { screen: 'home' }
  | { screen: 'game'; game: Game; tab: GameTab }
  | { screen: 'stats' }
  | { screen: 'settings' };

export const GAME_TABS: Record<Game, GameTab[]> = {
  blackjack: ['calculator', 'practice', 'count'],
  holdem: ['calculator', 'practice'],
};

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [first, second] = parts;
  if (first === 'blackjack' || first === 'holdem') {
    const tabs = GAME_TABS[first];
    const tab = tabs.includes(second as GameTab) ? (second as GameTab) : tabs[0];
    return { screen: 'game', game: first, tab };
  }
  if (first === 'stats') return { screen: 'stats' };
  if (first === 'settings') return { screen: 'settings' };
  return { screen: 'home' };
}

export function routeToHash(route: Route): string {
  switch (route.screen) {
    case 'home':
      return '#/';
    case 'game':
      return `#/${route.game}/${route.tab}`;
    default:
      return `#/${route.screen}`;
  }
}

export function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const navigate = useCallback((r: Route) => {
    const hash = routeToHash(r);
    if (window.location.hash !== hash) window.location.hash = hash;
    setRoute(r);
    window.scrollTo?.(0, 0);
  }, []);
  return [route, navigate];
}
