import { describe, expect, it } from "bun:test";
import Fastify from "fastify";
import { buscaRoutes } from "../../src/adapters/inbound/http/routes/busca.routes.ts";
import type { BuscaServicePort, EstatisticasBusca } from "../../src/ports/inbound/BuscaService.port.ts";
import type { ImovelProps } from "../../src/domain/imovel/entities/Imovel.ts";
import type { FiltroBusca } from "../../src/domain/busca/value-objects/FiltroBusca.ts";
import type { ResultadoPaginado } from "../../src/domain/busca/value-objects/ResultadoPaginado.ts";

const TEMPO_DE_INICIALIZACAO_DO_FASTIFY_MS = 20_000;

class BuscaServiceGravador implements BuscaServicePort {
  ultimoFiltro: FiltroBusca | null = null;
  ultimaCidade: string | undefined;

  constructor(private readonly imoveis: Record<string, ImovelProps> = {}) {}

  async buscar(filtros: FiltroBusca): Promise<ResultadoPaginado<ImovelProps>> {
    this.ultimoFiltro = filtros;
    return { data: [], meta: { total: 0, pagina: 1, tamanhoPagina: 20, totalPaginas: 0 } };
  }

  async buscarPorId(id: string): Promise<ImovelProps | null> {
    return this.imoveis[id] ?? null;
  }

  async listarBairros(cidade?: string): Promise<string[]> {
    this.ultimaCidade = cidade;
    return ["Centro", "Campolim"];
  }

  async listarConstrutoras(): Promise<string[]> {
    return ["MRV"];
  }

  async listarFontes(): Promise<string[]> {
    return ["vivareal"];
  }

  async obterEstatisticas(): Promise<EstatisticasBusca> {
    return {
      totalImoveis: 0,
      precoMedio: null,
      precoMediano: null,
      distribuicaoPreco: [],
      porFonte: [],
      porTipo: [],
      porStatus: [],
    };
  }
}

async function aplicacaoCom(servico: BuscaServicePort) {
  const app = Fastify();
  await buscaRoutes(app, servico);
  await app.ready();
  return app;
}

const corpoDe = (resposta: { body: string }): unknown => JSON.parse(resposta.body);

const umImovel: ImovelProps = {
  id: "abc",
  externalId: "vivareal-1",
  fonteId: "f1",
  titulo: "Casa",
  url: "https://exemplo.com/1",
  tipoImovel: "CASA",
  tipoNegocio: "VENDA",
  cidade: "Sorocaba",
  estado: "SP",
};

describe("rotas de busca", () => {
  it(
    "responde 404 com corpo padronizado para imovel inexistente",
    async () => {
      const app = await aplicacaoCom(new BuscaServiceGravador());

      const resposta = await app.inject({ method: "GET", url: "/api/imoveis/nao-existe" });

      expect(resposta.statusCode).toBe(404);
      expect(corpoDe(resposta)).toEqual({ statusCode: 404, error: "NOT_FOUND", message: "Imovel nao encontrado" });
    },
    TEMPO_DE_INICIALIZACAO_DO_FASTIFY_MS,
  );

  it("devolve o imovel quando existe", async () => {
    const app = await aplicacaoCom(new BuscaServiceGravador({ abc: umImovel }));

    const resposta = await app.inject({ method: "GET", url: "/api/imoveis/abc" });

    expect(resposta.statusCode).toBe(200);
    expect(corpoDe(resposta)).toMatchObject({ externalId: "vivareal-1" });
  });

  it("separa listas em CSV, valida enums e converte numeros da query", async () => {
    const servico = new BuscaServiceGravador();
    const app = await aplicacaoCom(servico);

    await app.inject({
      method: "GET",
      url: "/api/imoveis?tipoImovel=CASA,APARTAMENTO&precoMax=350000&aceitaFinanciamento=true&pagina=2",
    });

    expect(servico.ultimoFiltro).toMatchObject({
      tipoImovel: ["CASA", "APARTAMENTO"],
      precoMax: 350000,
      aceitaFinanciamento: true,
      pagina: 2,
    });
  });

  it("passa a cidade opcional para a listagem de bairros", async () => {
    const servico = new BuscaServiceGravador();
    const app = await aplicacaoCom(servico);

    await app.inject({ method: "GET", url: "/api/imoveis/bairros?cidade=Votorantim" });

    expect(servico.ultimaCidade).toBe("Votorantim");
  });

  it("nao confunde a rota de bairros com a rota parametrica de id", async () => {
    const app = await aplicacaoCom(new BuscaServiceGravador());

    const resposta = await app.inject({ method: "GET", url: "/api/imoveis/bairros" });

    expect(resposta.statusCode).toBe(200);
    expect(corpoDe(resposta)).toEqual(["Centro", "Campolim"]);
  });
});
