import { describe, expect, it } from "bun:test";
import { parsePreco } from "../../src/shared/utils/price-parser.ts";

describe("parsePreco", () => {
  it("le o formato brasileiro completo", () => {
    expect(parsePreco("R$ 350.000,00")).toBe(350000);
  });

  it("le valor sem centavos", () => {
    expect(parsePreco("R$ 1.200")).toBe(1200);
  });

  it("le numero cru em texto", () => {
    expect(parsePreco("350000")).toBe(350000);
  });

  it("devolve numero recebido sem alterar", () => {
    expect(parsePreco(289990.5)).toBe(289990.5);
  });

  it("recusa texto sem numero", () => {
    expect(parsePreco("Sob consulta")).toBeNull();
  });

  it("recusa ausencia de valor", () => {
    expect(parsePreco(null)).toBeNull();
    expect(parsePreco(undefined)).toBeNull();
  });
});
