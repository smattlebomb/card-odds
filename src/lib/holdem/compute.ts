/**
 * Run equity in a Web Worker so the UI stays smooth. Falls back to the main thread
 * if Workers are unavailable (tests, older WebViews).
 */
import { computeEquity, type EquityInput, type EquityResult } from './equity';
import type { EquityWorkerMessage, EquityWorkerRequest } from './equity.worker';

let worker: Worker | null | undefined;
let nextId = 1;

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    if (typeof Worker === 'undefined') {
      worker = null;
      return null;
    }
    worker = new Worker(new URL('./equity.worker.ts', import.meta.url), { type: 'module' });
    return worker;
  } catch {
    worker = null;
    return null;
  }
}

export type ComputeFn = (
  input: EquityInput,
  onProgress?: (r: EquityResult) => void,
) => EquityResult | Promise<EquityResult>;

/** Main-thread compute (used by tests and as a fallback). */
export const computeOnMain: ComputeFn = (input, onProgress) => computeEquity(input, onProgress);

export function computeInWorker(
  input: EquityInput,
  onProgress?: (r: EquityResult) => void,
): Promise<EquityResult> {
  const w = getWorker();
  if (!w) return Promise.resolve(computeOnMain(input, onProgress));
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const onMessage = (e: MessageEvent<EquityWorkerMessage>) => {
      if (e.data.id !== id) return;
      if (e.data.type === 'progress') {
        onProgress?.(e.data.result);
        return;
      }
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
      resolve(e.data.result);
    };
    const onError = (err: Event) => {
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
      reject(err);
    };
    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);
    const req: EquityWorkerRequest = { id, input };
    w.postMessage(req);
  });
}
