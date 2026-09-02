import { describe, expect, it } from "bun:test";
import { Preco } from "../../src/domain/imovel/value-objects/Preco.ts";
import { Metragem } from "../../src/domain/imovel/value-objects/Metragem.ts";
import { Coordenadas } from "../../src/domain/imovel/value-objects/Coordenadas.ts";
import { Endereco } from "../../src/domain/imovel/entities/Endereco.ts";
import { Imovel } from "../../src/domain/imovel/entities/Imovel.ts";
import { AreaDeBusca } from "../../src/domain/busca/value-objects/AreaDeBusca.ts";

describe("Preco", () => {
  it("recusa valor negativo", () => {
    expect(Preco.criar(-1)).toBeNull();
  });

  it("recusa ausencia de valor", () => {
    expect(Preco.criar(null)).toBeNull();
    expect(Preco.criar(undefined)).toBeNull();
  });

  it("formata em reais", () => {
    const formatado = Preco.criar(350000)!.formatado.replace(/ /g, " ");
    expect(formatado).toBe("R$ 350.000,00");
  });

  it("calcula preco por metro quadrado", () => {
    expect(Preco.criar(300000)!.calcularPorM2(60)!.valor).toBe(5000);
  });

  it("nao divide por area invalida", () => {
    expect(Preco.criar(300000)!.calcularPorM2(0)).toBeNull();
  });
});

describe("Metragem", () => {
  it("formata as areas informadas", () => {
    const metragem = Metragem.criar(52, 70);
    expect(metragem.formatadoUtil).toBe("52 m²");
    expect(metragem.formatadoTotal).toBe("70 m²");
  });

  it("omite area desconhecida", () => {
    expect(Metragem.criar(null, undefined).formatadoUtil).toBeNull();
  });
});

describe("Coordenadas", () => {
  it("aceita coordenadas dentro dos limites", () => {
    const ponto = Coordenadas.criar(-23.5, -47.45)!;
    expect(ponto.latitude).toBe(-23.5);
    expect(ponto.longitude).toBe(-47.45);
  });

  it("recusa latitude fora do intervalo", () => {
    expect(Coordenadas.criar(91, 0)).toBeNull();
  });

  it("recusa longitude fora do intervalo", () => {
    expect(Coordenadas.criar(0, -181)).toBeNull();
  });

  it("recusa par incompleto", () => {
    expect(Coordenadas.criar(-23.5, null)).toBeNull();
  });
});

describe("Endereco", () => {
  it("monta o endereco legivel ignorando partes ausentes", () => {
    const endereco = new Endereco({
      logradouro: "Rua das Flores",
      numero: "100",
      bairro: "Centro",
      cidade: "Sorocaba",
      estado: "SP",
    });
    expect(endereco.formatado).toBe("Rua das Flores, 100, Centro, Sorocaba/SP");
  });
});

describe("Imovel", () => {
  it("preenche os opcionais com valores neutros", () => {
    const imovel = new Imovel({
      externalId: "x-1",
      fonteId: "fonte",
      titulo: "Apartamento",
      url: "https://exemplo.com/1",
      tipoImovel: "APARTAMENTO",
      tipoNegocio: "VENDA",
      cidade: "Votorantim",
      estado: "SP",
    });
    expect(imovel.urlImagens).toEqual([]);
    expect(imovel.preco).toBeNull();
    expect(imovel.ativo).toBe(true);
    expect(imovel.cidade).toBe("Votorantim");
  });
});

describe("AreaDeBusca", () => {
  it("normaliza a UF para maiusculas e limpa espacos", () => {
    const area = AreaDeBusca.criar(" Sorocaba ", "sp");
    expect(area.cidade).toBe("Sorocaba");
    expect(area.estado).toBe("SP");
  });

  it("recusa cidade vazia", () => {
    expect(() => AreaDeBusca.criar("   ", "SP")).toThrow();
  });

  it("recusa UF que nao tem duas letras", () => {
    expect(() => AreaDeBusca.criar("Sorocaba", "Sao Paulo")).toThrow();
  });
});
