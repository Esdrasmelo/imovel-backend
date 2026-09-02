import { logger } from "./logger.ts";

export type Sleep = (ms: number) => Promise<void>;

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay?: number;
  sleep?: Sleep;
}

const MAX_DELAY_PADRAO_MS = 30_000;

export const sleepReal: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function delayExponencial(baseDelay: number, tentativa: number, maxDelay: number): number {
  return Math.min(baseDelay * 2 ** tentativa, maxDelay);
}

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { maxRetries, baseDelay, maxDelay = MAX_DELAY_PADRAO_MS, sleep = sleepReal } = options;
  let ultimoErro: unknown;

  for (let tentativa = 0; tentativa <= maxRetries; tentativa++) {
    try {
      return await fn();
    } catch (error) {
      ultimoErro = error;
      if (tentativa === maxRetries) break;

      const delay = delayExponencial(baseDelay, tentativa, maxDelay);
      logger.warn({ attempt: tentativa + 1, maxRetries, delay, error: String(error) }, "Retry attempt");
      await sleep(delay);
    }
  }

  throw ultimoErro;
}
