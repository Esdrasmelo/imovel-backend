import { describe, expect, it } from "bun:test";
import { AreaDeBusca } from "../../src/domain/busca/value-objects/AreaDeBusca.ts";
import {
  mapGlueListingToImovelData,
  type GlueApiListing,
} from "../../src/adapters/outbound/scrapers/zapimoveis/zapimoveis.mapper.ts";
import {
  mapToImovelData as mapMendesOrtega,
  parseDetalhes,
  type MendesOrtegaRawItem,
} from "../../src/adapters/outbound/scrapers/mendesortega/mendesortega.mapper.ts";
import { bairroDoHeading } from "../../src/adapters/outbound/scrapers/mendesortega/MendesOrtegaScraper.ts";
import {
  mapToImovelData as mapPlaneta,
  mapStatusConstrucao,
  parseCidade,
  type PlanetaEmpreendimento,
} from "../../src/adapters/outbound/scrapers/planeta/planeta.mapper.ts";
import {
  mapStatus,
  mapTipoImovel,
  mapToImovelData as mapMrv,
  vagasPorUnidade,
  type MrvRawEmpreendimento,
} from "../../src/adapters/outbound/scrapers/mrv/mrv.mapper.ts";

const AREA = AreaDeBusca.criar("Sorocaba", "SP");

describe("mapper da glue-api (ZapImoveis e VivaReal)", () => {
  const umListing = (sobrescrita: Partial<GlueApiListing["listing"]> = {}): GlueApiListing => ({
    listing: {
      id: "123",
      title: "Apartamento no Campolim",
      usableAreas: [68],
      bedrooms: [2],
      pricingInfos: [{ price: "450000", monthlyCondoFee: "520", businessType: "SALE" }],
      unitTypes: ["APARTMENT"],
      constructionStatus: "READY_TO_MOVE",
      address: { city: "Sorocaba", state: "SP", neighborhood: "Campolim", point: { lat: -23.52, lon: -47.47 } },
      acceptExchange: true,
      ...sobrescrita,
    },
    link: { href: "/imovel/123" },
  });

  it("prefixa o externalId com a fonte para nao colidir entre portais", () => {
    const imovel = mapGlueListingToImovelData(umListing(), "vivareal", "https://www.vivareal.com.br", AREA);
    expect(imovel.externalId).toBe("vivareal-123");
  });

  it("resolve link relativo contra o dominio do portal", () => {
    const imovel = mapGlueListingToImovelData(umListing(), "zapimoveis", "https://www.zapimoveis.com.br", AREA);
    expect(imovel.url).toBe("https://www.zapimoveis.com.br/imovel/123");
  });

  it("traduz os enums da API para o dominio", () => {
    const imovel = mapGlueListingToImovelData(umListing(), "vivareal", "https://x", AREA);
    expect(imovel.tipoImovel).toBe("APARTAMENTO");
    expect(imovel.statusConstrucao).toBe("PRONTO");
    expect(imovel.tipoNegocio).toBe("VENDA");
    expect(imovel.preco).toBe(450000);
    expect(imovel.valorCondominio).toBe(520);
  });

  it("nao confunde aceitar permuta com aceitar financiamento", () => {
    const imovel = mapGlueListingToImovelData(umListing({ acceptExchange: true }), "vivareal", "https://x", AREA);
    expect(imovel.aceitaFinanciamento).toBeNull();
  });

  it("usa a area configurada quando o anuncio nao traz cidade", () => {
    const imovel = mapGlueListingToImovelData(umListing({ address: undefined }), "vivareal", "https://x", AREA);
    expect(imovel.cidade).toBe("Sorocaba");
    expect(imovel.estado).toBe("SP");
  });

  it("cai no tipo padrao quando o unitType e desconhecido", () => {
    const imovel = mapGlueListingToImovelData(umListing({ unitTypes: ["HANGAR"] }), "vivareal", "https://x", AREA);
    expect(imovel.tipoImovel).toBe("CASA");
  });
});

describe("mapper da Mendes Ortega", () => {
  const umCard = (sobrescrita: Partial<MendesOrtegaRawItem> = {}): MendesOrtegaRawItem => ({
    codigo: "AP1754-MEOA",
    tipoTexto: "Apartamento",
    bairro: "Parque Campolim",
    condominio: "Residencial Jardins",
    detalhes: ["70 m²", "2 quartos", "1 suíte", "2 banheiros", "1 vaga"],
    precoTexto: "R$ 350.000,00",
    url: "https://www.mendesortega.com.br/imovel/AP1754",
    imagens: [],
    ...sobrescrita,
  });

  it("le cada detalhe do card pela palavra-chave", () => {
    expect(parseDetalhes(umCard().detalhes)).toEqual({
      areaUtil: 70,
      quartos: 2,
      suites: 1,
      banheiros: 2,
      vagas: 1,
    });
  });

  it("monta o titulo com tipo, quartos e bairro", () => {
    expect(mapMendesOrtega(umCard(), AREA).titulo).toBe("Apartamento - 2 quartos - Parque Campolim");
  });

  it("usa singular quando ha um quarto", () => {
    const card = umCard({ detalhes: ["1 quarto"] });
    expect(mapMendesOrtega(card, AREA).titulo).toBe("Apartamento - 1 quarto - Parque Campolim");
  });

  it("converte o preco em texto para numero", () => {
    expect(mapMendesOrtega(umCard(), AREA).preco).toBe(350000);
  });

  it("carimba a area configurada, ja que o site nao informa cidade por card", () => {
    const imovel = mapMendesOrtega(umCard(), AREA);
    expect(imovel.cidade).toBe("Sorocaba");
    expect(imovel.estado).toBe("SP");
  });

  it("extrai o bairro da primeira parte do heading", () => {
    expect(bairroDoHeading("Parque Campolim - Sorocaba - SP")).toBe("Parque Campolim");
    expect(bairroDoHeading("Centro")).toBe("Centro");
  });
});

describe("mapper da Construtora Planeta", () => {
  const umEmpreendimento = (sobrescrita: Partial<PlanetaEmpreendimento> = {}): PlanetaEmpreendimento => ({
    id: 77,
    title: "Residencial Aurora",
    link: "https://www.construtoraplaneta.com.br/aurora",
    featuredImageUrl: "https://img/capa.jpg",
    galleryImages: [],
    taxonomies: {
      tipos: ["Apartamento"],
      cidade: "Votorantim - SP",
      dormitorios: ["2 Dormitórios", "1 Suíte", "3 Dormitórios"],
      categorias: ["Em obras"],
    },
    pageData: {
      descricao: null,
      areaMin: 46,
      areaMax: 98,
      vagasMin: 1,
      bairro: "Jardim Europa",
      endereco: "Rua A – Jardim Europa",
      statusTexto: null,
    },
    ...sobrescrita,
  });

  it("separa cidade e UF da taxonomia do WordPress", () => {
    expect(parseCidade("Votorantim - SP", AREA)).toEqual({ cidade: "Votorantim", estado: "SP" });
  });

  it("recorre a area configurada quando a taxonomia falta", () => {
    expect(parseCidade(null, AREA)).toEqual({ cidade: "Sorocaba", estado: "SP" });
  });

  it("pega o maior numero de dormitorios e de suites", () => {
    const imovel = mapPlaneta(umEmpreendimento(), AREA);
    expect(imovel.quartos).toBe(3);
    expect(imovel.suites).toBe(1);
  });

  it("usa a menor area como area util e nao inventa area total", () => {
    const imovel = mapPlaneta(umEmpreendimento(), AREA);
    expect(imovel.areaUtil).toBe(46);
    expect(imovel.areaTotal).toBeNull();
  });

  it("usa a imagem de capa quando a galeria esta vazia", () => {
    expect(mapPlaneta(umEmpreendimento(), AREA).urlImagens).toEqual(["https://img/capa.jpg"]);
  });

  it("classifica o status pelas categorias e pelo texto da pagina", () => {
    expect(mapStatusConstrucao(["Pronto"], null)).toBe("PRONTO");
    expect(mapStatusConstrucao([], "Em obras")).toBe("EM_CONSTRUCAO");
    expect(mapStatusConstrucao(["Lançamentos"], null)).toBe("NA_PLANTA");
    expect(mapStatusConstrucao([], null)).toBeNull();
  });
});

describe("mapper da MRV", () => {
  const umEmpreendimento = (sobrescrita: Partial<MrvRawEmpreendimento> = {}): MrvRawEmpreendimento => ({
    nome: "Parque das Acacias",
    url: "https://www.mrv.com.br/imoveis/sao-paulo/sorocaba/parque-das-acacias/",
    tipo: "Apartamentos",
    status: "Em Construção",
    endereco: null,
    bairro: "jardim-brasil",
    cidade: "Sorocaba",
    estado: "SP",
    cep: null,
    latitude: null,
    longitude: null,
    areaMin: 41,
    areaMax: 41,
    quartos: 2,
    quartosMax: null,
    imagemUrl: null,
    imagens: [],
    totalUnidades: 200,
    totalGaragem: 250,
    ...sobrescrita,
  });

  it("usa o ultimo segmento da URL como identidade", () => {
    const imovel = mapMrv(umEmpreendimento());
    expect(imovel.externalId).toBe("mrv-parque-das-acacias");
    expect(imovel.codigoImovel).toBe("parque-das-acacias");
  });

  it("estima vagas por unidade a partir dos totais do empreendimento", () => {
    expect(vagasPorUnidade(250, 200)).toBe(1);
    expect(vagasPorUnidade(600, 200)).toBe(3);
    expect(vagasPorUnidade(null, 200)).toBeNull();
  });

  it("reconhece o tipo por correspondencia parcial", () => {
    expect(mapTipoImovel("Apartamentos")).toBe("APARTAMENTO");
    expect(mapTipoImovel("Casas")).toBe("CASA");
    expect(mapTipoImovel("Lotes")).toBe("LOTE");
  });

  it("assume em construcao quando o status e desconhecido", () => {
    expect(mapStatus("Novidade")).toBe("EM_CONSTRUCAO");
    expect(mapStatus("Pronto para morar")).toBe("PRONTO");
    expect(mapStatus("Lançamento")).toBe("NA_PLANTA");
  });

  it("devolve o bairro com espacos no lugar dos hifens do slug", () => {
    expect(mapMrv(umEmpreendimento()).bairro).toBe("jardim brasil");
  });
});
