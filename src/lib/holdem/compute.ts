/**
 * Run equity in a Web Worker so the UI stays smooth. Falls back to the main thread
 * if Workers are unavailable (tests, older WebViews).
 *
 * Only the latest request matters: if a new one arrives while the worker is still busy
 * (e.g. while you drag across the range grid), the busy worker is terminated and a fresh one
 * starts, instead of queueing stale 200k-deal jobs. The superseded promise rejects with
 * SUPERSEDED, which callers that already moved on simply ignore.
 */
import { computeEquity, type EquityInput, type EquityResult } from './equity';
import type { EquityWorkerMessage, EquityWorkerRequest } from './equity.worker';

export const SUPERSEDED = 'superseded';

let worker: Worker | null | undefined;
let nextId = 1;
let running: { cancel: () => void } | null = null;

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
  if (running) {
    running.cancel();
    running = null;
  }
  const w = getWorker();
  if (!w) return Promise.resolve(computeOnMain(input, onProgress));
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
      if (running === job) running = null;
    };
    const onMessage = (e: MessageEvent<EquityWorkerMessage>) => {
      if (e.data.id !== id) return;
      if (e.data.type === 'progress') {
        onProgress?.(e.data.result);
        return;
      }
      cleanup();
      if (e.data.type === 'error') reject(new Error(e.data.error));
      else resolve(e.data.result);
    };
    const onError = (err: Event) => {
      cleanup();
      reject(err);
    };
    const job = {
      cancel: () => {
        cleanup();
        w.terminate();
        if (worker === w) worker = undefined;
        reject(new Error(SUPERSEDED));
      },
    };
    running = job;
    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);
    const req: EquityWorkerRequest = { id, input };
    w.postMessage(req);
  });
}
