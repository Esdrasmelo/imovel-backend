import { describe, expect, it } from "bun:test";
import { delayExponencial, retry } from "../../src/shared/utils/retry.ts";

function operacaoQueFalha(vezes: number) {
  let chamadas = 0;
  const fn = async () => {
    chamadas++;
    if (chamadas <= vezes) throw new Error(`falha ${chamadas}`);
    return `sucesso na chamada ${chamadas}`;
  };
  return { fn, chamadas: () => chamadas };
}

function relogioQueRegistra() {
  const esperas: number[] = [];
  const sleep = async (ms: number) => {
    esperas.push(ms);
  };
  return { sleep, esperas };
}

describe("retry", () => {
  it("devolve o resultado da primeira tentativa bem-sucedida", async () => {
    const { fn, chamadas } = operacaoQueFalha(0);
    const { sleep, esperas } = relogioQueRegistra();

    const resultado = await retry(fn, { maxRetries: 3, baseDelay: 100, sleep });

    expect(resultado).toBe("sucesso na chamada 1");
    expect(chamadas()).toBe(1);
    expect(esperas).toEqual([]);
  });

  it("espera com atraso exponencial entre as tentativas", async () => {
    const { fn } = operacaoQueFalha(2);
    const { sleep, esperas } = relogioQueRegistra();

    await retry(fn, { maxRetries: 3, baseDelay: 100, sleep });

    expect(esperas).toEqual([100, 200]);
  });

  it("propaga o ultimo erro quando esgota as tentativas", async () => {
    const { fn, chamadas } = operacaoQueFalha(10);
    const { sleep } = relogioQueRegistra();

    await expect(retry(fn, { maxRetries: 2, baseDelay: 10, sleep })).rejects.toThrow("falha 3");
    expect(chamadas()).toBe(3);
  });

  it("nao dorme depois da ultima falha", async () => {
    const { fn } = operacaoQueFalha(10);
    const { sleep, esperas } = relogioQueRegistra();

    await retry(fn, { maxRetries: 2, baseDelay: 10, sleep }).catch(() => undefined);

    expect(esperas).toHaveLength(2);
  });
});

describe("delayExponencial", () => {
  it("dobra a cada tentativa", () => {
    expect(delayExponencial(1000, 0, 30_000)).toBe(1000);
    expect(delayExponencial(1000, 1, 30_000)).toBe(2000);
    expect(delayExponencial(1000, 3, 30_000)).toBe(8000);
  });

  it("respeita o teto", () => {
    expect(delayExponencial(1000, 10, 30_000)).toBe(30_000);
  });
});
