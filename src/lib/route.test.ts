import { describe, expect, it } from 'vitest';
import { parseRoute, routeToHash, type Route } from './route';

describe('route', () => {
  it('parses known screens', () => {
    expect(parseRoute('')).toEqual({ screen: 'home' });
    expect(parseRoute('#/')).toEqual({ screen: 'home' });
    expect(parseRoute('#/stats')).toEqual({ screen: 'stats' });
    expect(parseRoute('#/settings')).toEqual({ screen: 'settings' });
    expect(parseRoute('#/holdem/practice')).toEqual({ screen: 'game', game: 'holdem', tab: 'practice' });
  });

  it('defaults a game to its calculator and rejects tabs the game lacks', () => {
    expect(parseRoute('#/blackjack')).toEqual({ screen: 'game', game: 'blackjack', tab: 'calculator' });
    expect(parseRoute('#/holdem/count')).toEqual({ screen: 'game', game: 'holdem', tab: 'calculator' });
    expect(parseRoute('#/nonsense')).toEqual({ screen: 'home' });
  });

  it('round-trips', () => {
    const routes: Route[] = [
      { screen: 'home' },
      { screen: 'stats' },
      { screen: 'settings' },
      { screen: 'game', game: 'blackjack', tab: 'count' },
      { screen: 'game', game: 'holdem', tab: 'calculator' },
    ];
    for (const r of routes) expect(parseRoute(routeToHash(r))).toEqual(r);
  });
});
