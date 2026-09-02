import { inject, injectable } from "tsyringe";
import type { BuscaServicePort, EstatisticasBusca } from "../../ports/inbound/BuscaService.port.ts";
import type { ImovelRepositoryPort } from "../../ports/outbound/ImovelRepository.port.ts";
import type { ImovelProps } from "../../domain/imovel/entities/Imovel.ts";
import type { FiltroBusca } from "../../domain/busca/value-objects/FiltroBusca.ts";
import type { ResultadoPaginado } from "../../domain/busca/value-objects/ResultadoPaginado.ts";
import { distribuirPorFaixa, media, mediana } from "../../domain/busca/estatisticas.ts";

@injectable()
export class BuscaService implements BuscaServicePort {
  constructor(
    @inject("ImovelRepository")
    private readonly imovelRepository: ImovelRepositoryPort,
  ) {}

  async buscar(filtros: FiltroBusca): Promise<ResultadoPaginado<ImovelProps>> {
    return this.imovelRepository.search(filtros);
  }

  async buscarPorId(id: string): Promise<ImovelProps | null> {
    return this.imovelRepository.findById(id);
  }

  async listarBairros(cidade?: string): Promise<string[]> {
    return this.imovelRepository.listarBairros(cidade);
  }

  async listarConstrutoras(): Promise<string[]> {
    return this.imovelRepository.listarConstrutoras();
  }

  async listarFontes(): Promise<string[]> {
    return this.imovelRepository.listarFontes();
  }

  async obterEstatisticas(): Promise<EstatisticasBusca> {
    const [totalImoveis, precos, porFonte, porTipo, porStatus] = await Promise.all([
      this.imovelRepository.contarAtivos(),
      this.imovelRepository.precosDosAtivos(),
      this.imovelRepository.contarAtivosPorFonte(),
      this.imovelRepository.contarAtivosPorTipo(),
      this.imovelRepository.contarAtivosPorStatus(),
    ]);

    return {
      totalImoveis,
      precoMedio: media(precos),
      precoMediano: mediana(precos),
      distribuicaoPreco: distribuirPorFaixa(precos),
      porFonte,
      porTipo,
      porStatus,
    };
  }
}
