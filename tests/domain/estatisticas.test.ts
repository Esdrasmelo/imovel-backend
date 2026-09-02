import { describe, expect, it } from "bun:test";
import { distribuirPorFaixa, media, mediana } from "../../src/domain/busca/estatisticas.ts";

describe("media", () => {
  it("retorna nulo sem valores", () => {
    expect(media([])).toBeNull();
  });

  it("calcula a media aritmetica", () => {
    expect(media([100_000, 200_000, 300_000])).toBe(200_000);
  });
});

describe("mediana", () => {
  it("retorna nulo sem valores", () => {
    expect(mediana([])).toBeNull();
  });

  it("escolhe o valor central em quantidade impar", () => {
    expect(mediana([300_000, 100_000, 200_000])).toBe(200_000);
  });

  it("faz a media dos dois centrais em quantidade par", () => {
    expect(mediana([100_000, 400_000, 200_000, 300_000])).toBe(250_000);
  });

  it("nao e puxada por um valor extremo, ao contrario da media", () => {
    const precos = [200_000, 210_000, 220_000, 5_000_000];
    expect(mediana(precos)).toBe(215_000);
    expect(media(precos)).toBeGreaterThan(1_000_000);
  });
});

describe("distribuirPorFaixa", () => {
  it("conta cada valor em exatamente uma faixa", () => {
    const precos = [149_999, 150_000, 199_999, 250_000, 349_999, 350_000, 900_000];
    const distribuicao = distribuirPorFaixa(precos);

    const totalContado = distribuicao.reduce((soma, faixa) => soma + faixa.quantidade, 0);
    expect(totalContado).toBe(precos.length);
  });

  it("trata o limite superior como exclusivo", () => {
    const distribuicao = distribuirPorFaixa([150_000]);
    const ate150 = distribuicao.find((f) => f.faixa === "Ate R$ 150k")!;
    const de150a200 = distribuicao.find((f) => f.faixa === "R$ 150k - 200k")!;

    expect(ate150.quantidade).toBe(0);
    expect(de150a200.quantidade).toBe(1);
  });

  it("coloca valores altos na faixa aberta", () => {
    const distribuicao = distribuirPorFaixa([2_000_000]);
    expect(distribuicao.at(-1)).toEqual({ faixa: "Acima de R$ 350k", quantidade: 1 });
  });

  it("preserva a ordem das faixas mesmo sem valores", () => {
    expect(distribuirPorFaixa([]).map((f) => f.quantidade)).toEqual([0, 0, 0, 0, 0, 0]);
  });
});
