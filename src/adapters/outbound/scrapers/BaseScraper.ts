import type { ScraperPort, ScraperParams, ScraperResult, ImovelData } from "../../../ports/outbound/ScraperPort.ts";
import { RateLimiter } from "../../../shared/utils/rate-limiter.ts";
import { retry } from "../../../shared/utils/retry.ts";
import { logger } from "../../../shared/utils/logger.ts";

export interface PaginaResult {
  items: ImovelData[];
  hasMore: boolean;
}

export interface PoliticaDeColeta {
  intervaloEntreRequisicoesMs: number;
  tentativasMaximas: number;
  paginasMaximas: number;
}

const ATRASO_BASE_ENTRE_TENTATIVAS_MS = 1000;

export abstract class BaseScraper implements ScraperPort {
  abstract readonly fonteNome: string;

  protected readonly rateLimiter: RateLimiter;
  private readonly politica: PoliticaDeColeta;

  constructor(politica: PoliticaDeColeta) {
    this.politica = politica;
    this.rateLimiter = new RateLimiter(politica.intervaloEntreRequisicoesMs);
  }

  async scrape(params: ScraperParams): Promise<ScraperResult> {
    const imoveis: ImovelData[] = [];
    const erros: Array<{ pagina?: number; error: string }> = [];
    let pagina = 0;
    let hasMore = true;

    logger.info({ fonte: this.fonteNome, params }, "Iniciando scraping");

    while (hasMore && pagina < this.politica.paginasMaximas) {
      try {
        const resultado = await retry(
          () => this.scrapePagina(params, pagina),
          { maxRetries: this.politica.tentativasMaximas, baseDelay: ATRASO_BASE_ENTRE_TENTATIVAS_MS },
        );

        imoveis.push(...resultado.items);
        hasMore = resultado.hasMore;
        pagina++;

        logger.debug(
          { fonte: this.fonteNome, pagina, itemsNaPagina: resultado.items.length, totalAcumulado: imoveis.length },
          "Pagina processada",
        );

        if (hasMore) {
          await this.rateLimiter.wait();
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        erros.push({ pagina, error: errorMsg });
        logger.error({ fonte: this.fonteNome, pagina, error: errorMsg }, "Erro ao processar pagina");
        hasMore = false;
      }
    }

    logger.info(
      { fonte: this.fonteNome, totalEncontrados: imoveis.length, totalErros: erros.length },
      "Scraping finalizado",
    );

    return { imoveis, totalEncontrados: imoveis.length, erros };
  }

  protected abstract scrapePagina(params: ScraperParams, pagina: number): Promise<PaginaResult>;

  abstract healthCheck(): Promise<boolean>;
}
