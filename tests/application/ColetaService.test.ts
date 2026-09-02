import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { ColetaService, resumoDosErros, statusDaColeta } from "../../src/application/services/ColetaService.ts";
import type { ParametrosDeColeta } from "../../src/application/ParametrosDeColeta.ts";
import { AreaDeBusca } from "../../src/domain/busca/value-objects/AreaDeBusca.ts";
import type { ExecucaoColetaProps } from "../../src/domain/coleta/entities/ExecucaoColeta.ts";
import type { FonteDadosProps } from "../../src/domain/coleta/entities/FonteDados.ts";
import type {
  AtualizacaoDeExecucao,
  ColetaRepositoryPort,
  ExecucaoColetaPersistida,
} from "../../src/ports/outbound/ColetaRepository.port.ts";
import type { FonteDadosRepositoryPort } from "../../src/ports/outbound/FonteDadosRepository.port.ts";
import type { ImovelRepositoryPort, UpsertResult } from "../../src/ports/outbound/ImovelRepository.port.ts";
import type { ImovelData, ScraperParams, ScraperPort, ScraperResult } from "../../src/ports/outbound/ScraperPort.ts";

class ColetaRepositoryEmMemoria implements ColetaRepositoryPort {
  private readonly execucoes = new Map<string, ExecucaoColetaPersistida>();
  private sequencia = 0;

  async criar(fonteId: string): Promise<ExecucaoColetaPersistida> {
    const execucao: ExecucaoColetaPersistida = {
      id: `exec-${++this.sequencia}`,
      fonteId,
      status: "PENDENTE",
      iniciadoEm: new Date(),
      finalizadoEm: null,
      totalEncontrados: 0,
      totalNovos: 0,
      totalAtualizados: 0,
      totalErros: 0,
      mensagemErro: null,
    };
    this.execucoes.set(execucao.id, execucao);
    return execucao;
  }

  async atualizar(id: string, dados: AtualizacaoDeExecucao): Promise<ExecucaoColetaPersistida> {
    const atual = this.execucoes.get(id)!;
    const atualizada = { ...atual, ...dados };
    this.execucoes.set(id, atualizada);
    return atualizada;
  }

  async listar(fonteId?: string, limite = 20): Promise<ExecucaoColetaProps[]> {
    return [...this.execucoes.values()]
      .filter((e) => !fonteId || e.fonteId === fonteId)
      .slice(0, limite);
  }

  async buscarPorId(id: string): Promise<ExecucaoColetaProps | null> {
    return this.execucoes.get(id) ?? null;
  }
}

class FontesFixas implements FonteDadosRepositoryPort {
  constructor(private readonly fontes: FonteDadosProps[]) {}

  async buscarPorNome(nome: string): Promise<FonteDadosProps | null> {
    return this.fontes.find((f) => f.nome === nome) ?? null;
  }

  async listarAtivas(): Promise<FonteDadosProps[]> {
    return this.fontes.filter((f) => f.ativo);
  }

  async listarTodas(): Promise<FonteDadosProps[]> {
    return this.fontes;
  }
}

class ImovelRepositoryQueSoContabiliza implements ImovelRepositoryPort {
  recebidos: ImovelData[] = [];

  async upsertMany(imoveis: ImovelData[]): Promise<UpsertResult> {
    this.recebidos.push(...imoveis);
    return { novos: imoveis.length, atualizados: 0, erros: 0 };
  }

  async countByFonte(): Promise<number> {
    return this.recebidos.length;
  }

  upsert(): never {
    throw new Error("nao usado neste teste");
  }
  findById(): never {
    throw new Error("nao usado neste teste");
  }
  search(): never {
    throw new Error("nao usado neste teste");
  }
  listarBairros(): never {
    throw new Error("nao usado neste teste");
  }
  listarConstrutoras(): never {
    throw new Error("nao usado neste teste");
  }
  listarFontes(): never {
    throw new Error("nao usado neste teste");
  }
  contarAtivos(): never {
    throw new Error("nao usado neste teste");
  }
  precosDosAtivos(): never {
    throw new Error("nao usado neste teste");
  }
  contarAtivosPorFonte(): never {
    throw new Error("nao usado neste teste");
  }
  contarAtivosPorTipo(): never {
    throw new Error("nao usado neste teste");
  }
  contarAtivosPorStatus(): never {
    throw new Error("nao usado neste teste");
  }
}

class ScraperControlado implements ScraperPort {
  parametrosRecebidos: ScraperParams | null = null;

  constructor(
    readonly fonteNome: string,
    private readonly comportamento: { saudavel?: boolean; resultado?: ScraperResult; erro?: Error },
  ) {}

  async healthCheck(): Promise<boolean> {
    return this.comportamento.saudavel ?? true;
  }

  async scrape(params: ScraperParams): Promise<ScraperResult> {
    this.parametrosRecebidos = params;
    if (this.comportamento.erro) throw this.comportamento.erro;
    return this.comportamento.resultado ?? { imoveis: [], totalEncontrados: 0, erros: [] };
  }
}

const fonteAtiva = (nome: string): FonteDadosProps => ({
  id: `id-${nome}`,
  nome,
  tipo: "API",
  urlBase: `https://${nome}.exemplo`,
  ativo: true,
  criadoEm: new Date("2026-01-01"),
});

const umImovel = (externalId: string): ImovelData => ({
  externalId,
  titulo: `Imovel ${externalId}`,
  url: `https://exemplo.com/${externalId}`,
  tipoImovel: "APARTAMENTO",
  tipoNegocio: "VENDA",
  cidade: "Sorocaba",
  estado: "SP",
});

const parametros: ParametrosDeColeta = {
  area: AreaDeBusca.criar("Sorocaba", "SP"),
  tipoNegocio: "VENDA",
  precoMaximo: 400_000,
};

function montarServico(fontes: FonteDadosProps[], scrapers: ScraperPort[]) {
  const coletaRepository = new ColetaRepositoryEmMemoria();
  const imovelRepository = new ImovelRepositoryQueSoContabiliza();
  const servico = new ColetaService(coletaRepository, new FontesFixas(fontes), imovelRepository, scrapers, parametros);
  return { servico, coletaRepository, imovelRepository };
}

describe("ColetaService.executarColeta", () => {
  it("ignora fonte sem scraper correspondente", async () => {
    const { servico } = montarServico([fonteAtiva("vivareal")], []);

    const execucoes = await servico.executarColeta();

    expect(execucoes).toEqual([]);
  });

  it("registra ERRO quando o health check falha, sem chamar o scraper", async () => {
    const scraper = new ScraperControlado("vivareal", { saudavel: false });
    const { servico } = montarServico([fonteAtiva("vivareal")], [scraper]);

    const [execucao] = await servico.executarColeta();

    expect(execucao!.status).toBe("ERRO");
    expect(execucao!.mensagemErro).toBe("Health check falhou");
    expect(scraper.parametrosRecebidos).toBeNull();
  });

  it("repassa a area e o preco maximo configurados ao scraper", async () => {
    const scraper = new ScraperControlado("vivareal", {});
    const { servico } = montarServico([fonteAtiva("vivareal")], [scraper]);

    await servico.executarColeta();

    expect(scraper.parametrosRecebidos).toEqual({
      cidade: "Sorocaba",
      estado: "SP",
      precoMaximo: 400_000,
      tipoNegocio: "VENDA",
    });
  });

  it("registra SUCESSO com os totais quando tudo corre bem", async () => {
    const scraper = new ScraperControlado("vivareal", {
      resultado: { imoveis: [umImovel("a"), umImovel("b")], totalEncontrados: 2, erros: [] },
    });
    const { servico, imovelRepository } = montarServico([fonteAtiva("vivareal")], [scraper]);

    const [execucao] = await servico.executarColeta();

    expect(execucao!.status).toBe("SUCESSO");
    expect(execucao!.totalEncontrados).toBe(2);
    expect(execucao!.totalNovos).toBe(2);
    expect(execucao!.finalizadoEm).toBeInstanceOf(Date);
    expect(imovelRepository.recebidos).toHaveLength(2);
  });

  it("registra PARCIAL quando ha imoveis e erros de pagina", async () => {
    const scraper = new ScraperControlado("vivareal", {
      resultado: { imoveis: [umImovel("a")], totalEncontrados: 1, erros: [{ pagina: 3, error: "HTTP 500" }] },
    });
    const { servico } = montarServico([fonteAtiva("vivareal")], [scraper]);

    const [execucao] = await servico.executarColeta();

    expect(execucao!.status).toBe("PARCIAL");
    expect(execucao!.totalErros).toBe(1);
    expect(execucao!.mensagemErro).toBe("HTTP 500");
  });

  it("registra ERRO com a mensagem quando o scraper lanca excecao", async () => {
    const scraper = new ScraperControlado("vivareal", { erro: new Error("timeout") });
    const { servico } = montarServico([fonteAtiva("vivareal")], [scraper]);

    const [execucao] = await servico.executarColeta();

    expect(execucao!.status).toBe("ERRO");
    expect(execucao!.mensagemErro).toBe("timeout");
  });

  it("coleta apenas a fonte pedida pelo nome", async () => {
    const vivareal = new ScraperControlado("vivareal", {});
    const zap = new ScraperControlado("zapimoveis", {});
    const { servico } = montarServico([fonteAtiva("vivareal"), fonteAtiva("zapimoveis")], [vivareal, zap]);

    const execucoes = await servico.executarColeta("zapimoveis");

    expect(execucoes).toHaveLength(1);
    expect(vivareal.parametrosRecebidos).toBeNull();
    expect(zap.parametrosRecebidos).not.toBeNull();
  });
});

describe("statusDaColeta", () => {
  const resultado = (imoveis: number, erros: number): ScraperResult => ({
    imoveis: Array.from({ length: imoveis }, (_, i) => umImovel(String(i))),
    totalEncontrados: imoveis,
    erros: Array.from({ length: erros }, (_, i) => ({ pagina: i, error: `erro ${i}` })),
  });

  it("e SUCESSO sem erros", () => {
    expect(statusDaColeta(resultado(3, 0))).toBe("SUCESSO");
  });

  it("e PARCIAL com erros e imoveis", () => {
    expect(statusDaColeta(resultado(3, 1))).toBe("PARCIAL");
  });

  it("e ERRO com erros e nenhum imovel", () => {
    expect(statusDaColeta(resultado(0, 1))).toBe("ERRO");
  });

  it("junta as mensagens de erro em uma so", () => {
    expect(resumoDosErros(resultado(0, 2))).toBe("erro 0; erro 1");
    expect(resumoDosErros(resultado(1, 0))).toBeNull();
  });
});
