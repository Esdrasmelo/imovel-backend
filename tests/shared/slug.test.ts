import { describe, expect, it } from "bun:test";
import { slugify } from "../../src/shared/utils/slug.ts";
import { nomeDaUf, slugDaUf } from "../../src/shared/geo/unidades-federativas.ts";

describe("slugify", () => {
  it("remove acentos e baixa a caixa", () => {
    expect(slugify("São Paulo")).toBe("sao-paulo");
  });

  it("troca separadores por hifen unico", () => {
    expect(slugify("Rio  Grande do   Sul")).toBe("rio-grande-do-sul");
  });

  it("descarta pontuacao nas pontas", () => {
    expect(slugify("  Votorantim! ")).toBe("votorantim");
  });
});

describe("unidades federativas", () => {
  it("resolve o nome sem acento a partir da sigla", () => {
    expect(nomeDaUf("sp")).toBe("Sao Paulo");
    expect(nomeDaUf("ES")).toBe("Espirito Santo");
  });

  it("devolve a entrada quando a sigla e desconhecida", () => {
    expect(nomeDaUf("XX")).toBe("XX");
  });

  it("gera o slug usado em URLs de portais", () => {
    expect(slugDaUf("SP")).toBe("sao-paulo");
    expect(slugDaUf("RJ")).toBe("rio-de-janeiro");
    expect(slugDaUf("DF")).toBe("distrito-federal");
  });
});
