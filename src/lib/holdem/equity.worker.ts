/**
 * Equity worker: runs computeEquity off the main thread. The input may carry opponent ranges
 * (arrays of hand keys like "AKs"); card removal against your cards, the board and other
 * opponents happens inside computeEquity, so the worker is a thin wrapper.
 */
import { computeEquity, type EquityInput, type EquityResult } from './equity';

export interface EquityWorkerRequest {
  id: number;
  input: EquityInput;
}

export type EquityWorkerMessage =
  | { id: number; type: 'progress' | 'done'; result: EquityResult }
  | { id: number; type: 'error'; error: string };

self.onmessage = (e: MessageEvent<EquityWorkerRequest>) => {
  const { id, input } = e.data;
  try {
    const result = computeEquity(input, (partial) => {
      post({ id, type: 'progress', result: partial });
    });
    post({ id, type: 'done', result });
  } catch (err) {
    // e.g. a range with no live combos: report it instead of failing silently.
    post({ id, type: 'error', error: err instanceof Error ? err.message : String(err) });
  }
};

function post(msg: EquityWorkerMessage) {
  (self as unknown as { postMessage: (m: EquityWorkerMessage) => void }).postMessage(msg);
}
