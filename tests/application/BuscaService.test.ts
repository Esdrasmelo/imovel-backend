import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { BuscaService } from "../../src/application/services/BuscaService.ts";
import type { ImovelProps } from "../../src/domain/imovel/entities/Imovel.ts";
import type { FiltroBusca } from "../../src/domain/busca/value-objects/FiltroBusca.ts";
import type { ResultadoPaginado } from "../../src/domain/busca/value-objects/ResultadoPaginado.ts";
import type {
  ContagemPorFonte,
  ContagemPorStatus,
  ContagemPorTipo,
  ImovelRepositoryPort,
  UpsertResult,
} from "../../src/ports/outbound/ImovelRepository.port.ts";

class ImovelRepositoryComPrecosFixos implements ImovelRepositoryPort {
  ultimaCidadePedida: string | undefined;

  constructor(private readonly precos: number[]) {}

  async contarAtivos(): Promise<number> {
    return this.precos.length;
  }

  async precosDosAtivos(): Promise<number[]> {
    return this.precos;
  }

  async contarAtivosPorFonte(): Promise<ContagemPorFonte[]> {
    return [{ fonte: "vivareal", quantidade: this.precos.length }];
  }

  async contarAtivosPorTipo(): Promise<ContagemPorTipo[]> {
    return [{ tipo: "APARTAMENTO", quantidade: this.precos.length }];
  }

  async contarAtivosPorStatus(): Promise<ContagemPorStatus[]> {
    return [{ status: "PRONTO", quantidade: this.precos.length }];
  }

  async listarBairros(cidade?: string): Promise<string[]> {
    this.ultimaCidadePedida = cidade;
    return ["Centro"];
  }

  async search(_filtros: FiltroBusca): Promise<ResultadoPaginado<ImovelProps>> {
    return { data: [], meta: { total: 0, pagina: 1, tamanhoPagina: 20, totalPaginas: 0 } };
  }

  async findById(): Promise<ImovelProps | null> {
    return null;
  }

  async listarConstrutoras(): Promise<string[]> {
    return [];
  }

  async listarFontes(): Promise<string[]> {
    return [];
  }

  async countByFonte(): Promise<number> {
    return 0;
  }

  upsert(): never {
    throw new Error("nao usado neste teste");
  }

  async upsertMany(): Promise<UpsertResult> {
    return { novos: 0, atualizados: 0, erros: 0 };
  }
}

describe("BuscaService.obterEstatisticas", () => {
  it("compoe as estatisticas a partir dos precos ativos", async () => {
    const repositorio = new ImovelRepositoryComPrecosFixos([100_000, 200_000, 300_000, 400_000]);
    const servico = new BuscaService(repositorio);

    const estatisticas = await servico.obterEstatisticas();

    expect(estatisticas.totalImoveis).toBe(4);
    expect(estatisticas.precoMedio).toBe(250_000);
    expect(estatisticas.precoMediano).toBe(250_000);
    expect(estatisticas.porFonte).toEqual([{ fonte: "vivareal", quantidade: 4 }]);
  });

  it("distribui os precos nas faixas do dominio", async () => {
    const repositorio = new ImovelRepositoryComPrecosFixos([100_000, 200_000, 300_000, 400_000]);
    const servico = new BuscaService(repositorio);

    const { distribuicaoPreco } = await servico.obterEstatisticas();

    expect(distribuicaoPreco.map((f) => f.quantidade)).toEqual([1, 0, 1, 0, 1, 1]);
  });

  it("nao inventa media quando nao ha preco", async () => {
    const servico = new BuscaService(new ImovelRepositoryComPrecosFixos([]));

    const estatisticas = await servico.obterEstatisticas();

    expect(estatisticas.precoMedio).toBeNull();
    expect(estatisticas.precoMediano).toBeNull();
  });
});

describe("BuscaService.listarBairros", () => {
  it("repassa a cidade pedida ao repositorio", async () => {
    const repositorio = new ImovelRepositoryComPrecosFixos([]);
    const servico = new BuscaService(repositorio);

    await servico.listarBairros("Votorantim");

    expect(repositorio.ultimaCidadePedida).toBe("Votorantim");
  });

  it("lista de todas as cidades quando nenhuma e pedida", async () => {
    const repositorio = new ImovelRepositoryComPrecosFixos([]);
    const servico = new BuscaService(repositorio);

    await servico.listarBairros();

    expect(repositorio.ultimaCidadePedida).toBeUndefined();
  });
});
