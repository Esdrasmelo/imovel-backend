import * as cheerio from "cheerio";
import { BaseScraper, type PaginaResult, type PoliticaDeColeta } from "../BaseScraper.ts";
import type { ScraperParams } from "../../../../ports/outbound/ScraperPort.ts";
import type { AreaDeBusca } from "../../../../domain/busca/value-objects/AreaDeBusca.ts";
import { mapToImovelData, type MendesOrtegaRawItem } from "./mendesortega.mapper.ts";
import { slugify } from "../../../../shared/utils/slug.ts";
import { logger } from "../../../../shared/utils/logger.ts";

const BASE_URL = "https://www.mendesortega.com.br";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const MENOR_PAGINA_COMPLETA = 10;
const TIMEOUT_HEALTH_CHECK_MS = 10_000;
const TIMEOUT_PAGINA_MS = 30_000;

const POLITICA: PoliticaDeColeta = {
  intervaloEntreRequisicoesMs: 2500,
  tentativasMaximas: 3,
  paginasMaximas: 100,
};

export class MendesOrtegaScraper extends BaseScraper {
  readonly fonteNome = "mendesortega";

  constructor(private readonly area: AreaDeBusca) {
    super(POLITICA);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(BASE_URL, {
        method: "HEAD",
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_HEALTH_CHECK_MS),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  protected async scrapePagina(_params: ScraperParams, pagina: number): Promise<PaginaResult> {
    const url = this.urlDaPagina(pagina);

    logger.debug({ fonte: this.fonteNome, pagina, url }, "Buscando pagina");

    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(TIMEOUT_PAGINA_MS),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao buscar ${url}`);
    }

    const $ = cheerio.load(await response.text());
    const rawItems = this.parseCards($);

    logger.debug({ fonte: this.fonteNome, pagina, cardsEncontrados: rawItems.length }, "Cards extraidos da pagina");

    return {
      items: rawItems.map((raw) => mapToImovelData(raw, this.area)),
      hasMore: rawItems.length >= MENOR_PAGINA_COMPLETA,
    };
  }

  private urlDaPagina(pagina: number): string {
    const listagem = `${BASE_URL}/imoveis/a-venda/${slugify(this.area.cidade)}`;
    const numeroExibido = pagina + 1;
    return numeroExibido === 1 ? listagem : `${listagem}?pagina=${numeroExibido}`;
  }

  private parseCards($: cheerio.CheerioAPI): MendesOrtegaRawItem[] {
    const items: MendesOrtegaRawItem[] = [];

    $("a.card-with-buttons").each((_index, element) => {
      try {
        const item = this.parseCard($(element), $);
        if (item) items.push(item);
      } catch (error) {
        logger.warn({ fonte: this.fonteNome, error: String(error) }, "Erro ao parsear card individual, pulando");
      }
    });

    return items;
  }

  private parseCard(card: ReturnType<cheerio.CheerioAPI>, $: cheerio.CheerioAPI): MendesOrtegaRawItem | null {
    const codigo = card.find(".card-with-buttons__code").first().text().trim();
    if (!codigo) return null;

    const tipoTexto = card.find(".card-with-buttons__title").first().text().trim();
    const headingText = card
      .find(".card-with-buttons__heading")
      .first()
      .contents()
      .filter(function () {
        return this.type === "text";
      })
      .text()
      .trim();
    const condominio = card.find(".card-with-buttons__condo").first().text().trim() || null;
    const precoTexto = card.find(".card-with-buttons__value").first().text().trim();
    const href = card.attr("href") || "";

    const detalhes: string[] = [];
    card.find(".card-with-buttons__footer ul li").each((_i, li) => {
      const texto = $(li).text().trim();
      if (texto) detalhes.push(texto);
    });

    const imagens: string[] = [];
    card.find("img.cards_digital_carousel-image").each((_i, img) => {
      const src = $(img).attr("src") || "";
      if (src.startsWith("http")) imagens.push(src);
    });

    return {
      codigo,
      tipoTexto,
      bairro: bairroDoHeading(headingText),
      condominio,
      detalhes,
      precoTexto,
      url: href.startsWith("http") ? href : `${BASE_URL}${href}`,
      imagens,
    };
  }
}

export function bairroDoHeading(heading: string): string {
  const [primeiraParte] = heading.split(" - ");
  return (primeiraParte ?? heading).trim();
}
