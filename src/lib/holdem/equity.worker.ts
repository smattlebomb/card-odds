import { computeEquity, type EquityInput, type EquityResult } from './equity';

export interface EquityWorkerRequest {
  id: number;
  input: EquityInput;
}

export interface EquityWorkerMessage {
  id: number;
  type: 'progress' | 'done';
  result: EquityResult;
}

self.onmessage = (e: MessageEvent<EquityWorkerRequest>) => {
  const { id, input } = e.data;
  const result = computeEquity(input, (partial) => {
    post({ id, type: 'progress', result: partial });
  });
  post({ id, type: 'done', result });
};

function post(msg: EquityWorkerMessage) {
  (self as unknown as { postMessage: (m: EquityWorkerMessage) => void }).postMessage(msg);
}
