import { describe, expect, it } from "bun:test";
import { BaseScraper, type PaginaResult, type PoliticaDeColeta } from "../../src/adapters/outbound/scrapers/BaseScraper.ts";
import type { ImovelData, ScraperParams } from "../../src/ports/outbound/ScraperPort.ts";

const SEM_ESPERA: PoliticaDeColeta = {
  intervaloEntreRequisicoesMs: 0,
  tentativasMaximas: 0,
  paginasMaximas: 50,
};

const PARAMS: ScraperParams = { cidade: "Sorocaba", estado: "SP" };

const item = (id: string): ImovelData => ({
  externalId: id,
  titulo: id,
  url: `https://exemplo.com/${id}`,
  tipoImovel: "CASA",
  tipoNegocio: "VENDA",
  cidade: "Sorocaba",
  estado: "SP",
});

type Roteiro = Array<PaginaResult | Error>;

class ScraperComRoteiro extends BaseScraper {
  readonly fonteNome = "roteiro";
  paginasVisitadas: number[] = [];

  constructor(
    private readonly roteiro: Roteiro,
    politica: PoliticaDeColeta = SEM_ESPERA,
  ) {
    super(politica);
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  protected async scrapePagina(_params: ScraperParams, pagina: number): Promise<PaginaResult> {
    this.paginasVisitadas.push(pagina);
    const passo = this.roteiro[pagina] ?? { items: [], hasMore: false };
    if (passo instanceof Error) throw passo;
    return passo;
  }
}

describe("BaseScraper.scrape", () => {
  it("acumula os itens de todas as paginas ate a ultima", async () => {
    const scraper = new ScraperComRoteiro([
      { items: [item("a"), item("b")], hasMore: true },
      { items: [item("c")], hasMore: false },
    ]);

    const resultado = await scraper.scrape(PARAMS);

    expect(resultado.imoveis.map((i) => i.externalId)).toEqual(["a", "b", "c"]);
    expect(resultado.totalEncontrados).toBe(3);
    expect(scraper.paginasVisitadas).toEqual([0, 1]);
  });

  it("para na primeira pagina que falha e registra em que pagina foi", async () => {
    const scraper = new ScraperComRoteiro([
      { items: [item("a")], hasMore: true },
      new Error("HTTP 500"),
      { items: [item("nunca-lido")], hasMore: false },
    ]);

    const resultado = await scraper.scrape(PARAMS);

    expect(resultado.imoveis).toHaveLength(1);
    expect(resultado.erros).toEqual([{ pagina: 1, error: "HTTP 500" }]);
    expect(scraper.paginasVisitadas).toEqual([0, 1]);
  });

  it("respeita o teto de paginas mesmo quando a fonte diz que ha mais", async () => {
    const semFim = Array.from({ length: 10 }, (_, i) => ({ items: [item(String(i))], hasMore: true }));
    const scraper = new ScraperComRoteiro(semFim, { ...SEM_ESPERA, paginasMaximas: 3 });

    const resultado = await scraper.scrape(PARAMS);

    expect(resultado.imoveis).toHaveLength(3);
    expect(scraper.paginasVisitadas).toEqual([0, 1, 2]);
  });

  it("devolve resultado vazio e sem erro quando a fonte nao tem nada", async () => {
    const scraper = new ScraperComRoteiro([{ items: [], hasMore: false }]);

    const resultado = await scraper.scrape(PARAMS);

    expect(resultado).toEqual({ imoveis: [], totalEncontrados: 0, erros: [] });
  });
});
