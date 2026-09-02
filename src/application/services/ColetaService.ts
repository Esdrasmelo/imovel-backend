import { inject, injectable } from "tsyringe";
import type { ColetaServicePort, StatusFonte } from "../../ports/inbound/ColetaService.port.ts";
import type { ColetaRepositoryPort, ExecucaoColetaPersistida } from "../../ports/outbound/ColetaRepository.port.ts";
import type { FonteDadosRepositoryPort } from "../../ports/outbound/FonteDadosRepository.port.ts";
import type { ImovelRepositoryPort, UpsertResult } from "../../ports/outbound/ImovelRepository.port.ts";
import type { ScraperPort, ScraperResult } from "../../ports/outbound/ScraperPort.ts";
import type { ExecucaoColetaProps, StatusExecucao as StatusExecucaoTipo } from "../../domain/coleta/entities/ExecucaoColeta.ts";
import { StatusExecucao } from "../../domain/coleta/entities/ExecucaoColeta.ts";
import type { FonteDadosProps } from "../../domain/coleta/entities/FonteDados.ts";
import { PARAMETROS_DE_COLETA, type ParametrosDeColeta } from "../ParametrosDeColeta.ts";
import { logger } from "../../shared/utils/logger.ts";

const MENSAGEM_HEALTH_CHECK_FALHOU = "Health check falhou";

@injectable()
export class ColetaService implements ColetaServicePort {
  constructor(
    @inject("ColetaRepository")
    private readonly coletaRepository: ColetaRepositoryPort,
    @inject("FonteDadosRepository")
    private readonly fonteDadosRepository: FonteDadosRepositoryPort,
    @inject("ImovelRepository")
    private readonly imovelRepository: ImovelRepositoryPort,
    @inject("Scrapers")
    private readonly scrapers: ScraperPort[],
    @inject(PARAMETROS_DE_COLETA)
    private readonly parametros: ParametrosDeColeta,
  ) {}

  async executarColeta(fonteNome?: string): Promise<ExecucaoColetaProps[]> {
    const fontes = await this.fontesAlvo(fonteNome);
    const execucoes: ExecucaoColetaProps[] = [];

    for (const fonte of fontes) {
      const scraper = this.scrapers.find((s) => s.fonteNome === fonte.nome);
      if (!scraper) {
        logger.warn({ fonte: fonte.nome }, "Nenhum scraper encontrado para a fonte");
        continue;
      }
      execucoes.push(await this.coletarFonte(fonte, scraper));
    }

    return execucoes;
  }

  async listarExecucoes(fonteId?: string, limite?: number): Promise<ExecucaoColetaProps[]> {
    return this.coletaRepository.listar(fonteId, limite);
  }

  async obterStatusFontes(): Promise<StatusFonte[]> {
    const fontes = await this.fonteDadosRepository.listarTodas();
    const statusList: StatusFonte[] = [];

    for (const fonte of fontes) {
      const execucoes = await this.coletaRepository.listar(fonte.id, 1);
      const totalImoveis = await this.imovelRepository.countByFonte(fonte.id);
      statusList.push({ fonte, ultimaExecucao: execucoes[0] ?? null, totalImoveis });
    }

    return statusList;
  }

  private async fontesAlvo(fonteNome?: string): Promise<FonteDadosProps[]> {
    if (!fonteNome) return this.fonteDadosRepository.listarAtivas();
    const fonte = await this.fonteDadosRepository.buscarPorNome(fonteNome);
    return fonte ? [fonte] : [];
  }

  private async coletarFonte(
    fonte: FonteDadosProps,
    scraper: ScraperPort,
  ): Promise<ExecucaoColetaPersistida> {
    const execucao = await this.coletaRepository.criar(fonte.id);
    await this.coletaRepository.atualizar(execucao.id, { status: StatusExecucao.EM_ANDAMENTO });

    try {
      if (!(await scraper.healthCheck())) {
        return this.encerrarComErro(execucao.id, MENSAGEM_HEALTH_CHECK_FALHOU);
      }

      const resultado = await scraper.scrape({
        cidade: this.parametros.area.cidade,
        estado: this.parametros.area.estado,
        precoMaximo: this.parametros.precoMaximo,
        tipoNegocio: this.parametros.tipoNegocio,
      });
      const upsert = await this.imovelRepository.upsertMany(resultado.imoveis, fonte.id);

      logger.info(
        { fonte: fonte.nome, encontrados: resultado.totalEncontrados, novos: upsert.novos, atualizados: upsert.atualizados },
        "Coleta finalizada",
      );

      return this.coletaRepository.atualizar(execucao.id, {
        status: statusDaColeta(resultado),
        finalizadoEm: new Date(),
        totalEncontrados: resultado.totalEncontrados,
        totalNovos: upsert.novos,
        totalAtualizados: upsert.atualizados,
        totalErros: totalDeErros(resultado, upsert),
        mensagemErro: resumoDosErros(resultado),
      });
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : String(error);
      logger.error({ fonte: fonte.nome, error: mensagem }, "Erro na coleta");
      return this.encerrarComErro(execucao.id, mensagem);
    }
  }

  private encerrarComErro(execucaoId: string, mensagemErro: string): Promise<ExecucaoColetaPersistida> {
    return this.coletaRepository.atualizar(execucaoId, {
      status: StatusExecucao.ERRO,
      finalizadoEm: new Date(),
      mensagemErro,
    });
  }
}

export function statusDaColeta(resultado: ScraperResult): StatusExecucaoTipo {
  const houveErros = resultado.erros.length > 0;
  const houveImoveis = resultado.imoveis.length > 0;

  if (!houveErros) return StatusExecucao.SUCESSO;
  return houveImoveis ? StatusExecucao.PARCIAL : StatusExecucao.ERRO;
}

export function totalDeErros(resultado: ScraperResult, upsert: UpsertResult): number {
  return upsert.erros + resultado.erros.length;
}

export function resumoDosErros(resultado: ScraperResult): string | null {
  if (resultado.erros.length === 0) return null;
  return resultado.erros.map((erro) => erro.error).join("; ");
}
