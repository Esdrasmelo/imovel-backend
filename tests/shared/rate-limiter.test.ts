import { describe, expect, it } from "bun:test";
import { RateLimiter, type Relogio } from "../../src/shared/utils/rate-limiter.ts";

function relogioControlado(inicio = 0) {
  let agora = inicio;
  const sonecas: number[] = [];
  const relogio: Relogio = {
    agora: () => agora,
    dormir: async (ms) => {
      sonecas.push(ms);
      agora += ms;
    },
  };
  const avancar = (ms: number) => {
    agora += ms;
  };
  return { relogio, sonecas, avancar };
}

describe("RateLimiter", () => {
  it("nao espera na primeira requisicao", async () => {
    const { relogio, sonecas } = relogioControlado(10_000);
    const limiter = new RateLimiter(2000, relogio);

    await limiter.wait();

    expect(sonecas).toEqual([]);
  });

  it("espera apenas o tempo que falta para completar o intervalo", async () => {
    const { relogio, sonecas, avancar } = relogioControlado(10_000);
    const limiter = new RateLimiter(2000, relogio);

    await limiter.wait();
    avancar(500);
    await limiter.wait();

    expect(sonecas).toEqual([1500]);
  });

  it("nao espera quando o intervalo ja passou", async () => {
    const { relogio, sonecas, avancar } = relogioControlado(10_000);
    const limiter = new RateLimiter(2000, relogio);

    await limiter.wait();
    avancar(5000);
    await limiter.wait();

    expect(sonecas).toEqual([]);
  });
});
