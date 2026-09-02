import * as cheerio from "cheerio";
import { BaseScraper, type PaginaResult, type PoliticaDeColeta } from "../BaseScraper.ts";
import type { ScraperParams } from "../../../../ports/outbound/ScraperPort.ts";
import type { AreaDeBusca } from "../../../../domain/busca/value-objects/AreaDeBusca.ts";
import { mapToImovelData, type PlanetaEmpreendimento } from "./planeta.mapper.ts";
import { logger } from "../../../../shared/utils/logger.ts";

const BASE_URL = "https://www.construtoraplaneta.com.br";
const API_URL = `${BASE_URL}/wp-json/wp/v2/empreendimentos`;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const POSTS_POR_PAGINA = 10;
const CATEGORIA_PORTFOLIO_ENTREGUE = 62;
const TIMEOUT_HEALTH_CHECK_MS = 10_000;
const TIMEOUT_LISTAGEM_MS = 30_000;
const TIMEOUT_DETALHE_MS = 15_000;

const POLITICA: PoliticaDeColeta = {
  intervaloEntreRequisicoesMs: 2000,
  tentativasMaximas: 3,
  paginasMaximas: 10,
};

export class PlanetaScraper extends BaseScraper {
  readonly fonteNome = "planeta";

  constructor(private readonly area: AreaDeBusca) {
    super(POLITICA);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}?per_page=1`, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_HEALTH_CHECK_MS),
      });
      if (!response.ok) return false;

      const total = parseInt(response.headers.get("X-WP-Total") || "0", 10);
      return total > 0;
    } catch {
      return false;
    }
  }

  protected async scrapePagina(_params: ScraperParams, pagina: number): Promise<PaginaResult> {
    const wpPage = pagina + 1;
    const url = `${API_URL}?per_page=${POSTS_POR_PAGINA}&page=${wpPage}&_embed&categorias_exclude=${CATEGORIA_PORTFOLIO_ENTREGUE}`;

    logger.debug({ fonte: this.fonteNome, pagina, url }, "Buscando empreendimentos via WP REST API");

    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_LISTAGEM_MS),
    });

    if (this.paginaAlemDoFim(response)) {
      return { items: [], hasMore: false };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao buscar ${url}`);
    }

    const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "1", 10);
    const posts = (await response.json()) as WpEmpreendimento[];

    logger.debug({ fonte: this.fonteNome, pagina, postsNaPagina: posts.length, totalPages }, "Empreendimentos obtidos da API");

    const empreendimentos: PlanetaEmpreendimento[] = [];
    for (const post of posts) {
      empreendimentos.push(await this.empreendimentoCompleto(post));
      await this.rateLimiter.wait();
    }

    return {
      items: empreendimentos.map((emp) => mapToImovelData(emp, this.area)),
      hasMore: wpPage < totalPages,
    };
  }

  private paginaAlemDoFim(response: Response): boolean {
    return response.status === 400;
  }

  private async empreendimentoCompleto(post: WpEmpreendimento): Promise<PlanetaEmpreendimento> {
    try {
      const pageData = await this.scrapeDetailPage(post.link);
      return this.mapWpToEmpreendimento(post, pageData);
    } catch (error) {
      logger.warn(
        { fonte: this.fonteNome, slug: post.slug, error: String(error) },
        "Erro ao scrape da página de detalhe, usando dados parciais",
      );
      return this.mapWpToEmpreendimento(post, null);
    }
  }

  private async scrapeDetailPage(pageUrl: string): Promise<PageData> {
    const response = await fetch(pageUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_DETALHE_MS),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao buscar ${pageUrl}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const { min: areaMin, max: areaMax } = this.extractAreaRange($, html);
    const { bairro, endereco } = this.extractLocation($);

    return {
      descricao: this.extractDescription($),
      areaMin,
      areaMax,
      vagasMin: this.extractVagas($, html),
      bairro,
      endereco,
      statusTexto: this.extractStatus($),
      galleryImages: this.extractGalleryImages($),
    };
  }

  private extractDescription($: cheerio.CheerioAPI): string | null {
    const candidates = $("p, div").filter(function () {
      const text = $(this).text().trim();
      return text.length > 100 && text.length < 2000;
    });

    let best = "";
    candidates.each(function () {
      const text = $(this).text().trim();
      if (text.length > best.length && text.length < 2000) {
        best = text;
      }
    });

    return best || null;
  }

  private extractAreaRange($: cheerio.CheerioAPI, html: string): { min: number | null; max: number | null } {
    const areaPrivText = $("*:contains('Área privativa')").last().parent().text();
    const fonte = areaPrivText || html;

    const rangeMatch = fonte.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|m2)?\s*a\s*(\d+(?:[.,]\d+)?)\s*(?:m²|m2)/i);
    if (rangeMatch) {
      return {
        min: parseFloat(rangeMatch[1]!.replace(",", ".")),
        max: parseFloat(rangeMatch[2]!.replace(",", ".")),
      };
    }

    const singleMatch = fonte.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);
    if (singleMatch) {
      const val = parseFloat(singleMatch[1]!.replace(",", "."));
      return { min: val, max: val };
    }

    return { min: null, max: null };
  }

  private extractVagas($: cheerio.CheerioAPI, html: string): number | null {
    const vagasText = $("*:contains('Vagas')").first().parent().text();
    const match = (vagasText || html).match(/(\d+)\s*(?:a\s*\d+\s*)?vagas?/i);
    if (match) return parseInt(match[1]!, 10);

    const metaDesc = $('meta[name="description"]').attr("content") ?? "";
    const metaMatch = metaDesc.match(/(\d+)\s*vagas?/i);
    return metaMatch ? parseInt(metaMatch[1]!, 10) : null;
  }

  private extractLocation($: cheerio.CheerioAPI): { bairro: string | null; endereco: string | null } {
    const allText = $("body").text();
    const enderecoMatch = allText.match(/(?:Rua|R\.|Av\.|Avenida|Al\.|Alameda)[^–—\n]+[–—]\s*([^\n,<]{3,40})/i);

    return {
      bairro: enderecoMatch?.[1]?.trim() ?? null,
      endereco: enderecoMatch?.[0]?.trim() ?? null,
    };
  }

  private extractStatus($: cheerio.CheerioAPI): string | null {
    const statusText = $("body").text();
    if (/im[óo]vel\s+pronto/i.test(statusText)) return "Pronto";
    if (/em\s+obras/i.test(statusText)) return "Em obras";
    if (/futuro\s+lan[çc]amento/i.test(statusText)) return "Futuro lançamento";
    if (/lan[çc]amento/i.test(statusText)) return "Lançamento";
    return null;
  }

  private extractGalleryImages($: cheerio.CheerioAPI): string[] {
    const images: string[] = [];
    $("[data-gallery-image]").each(function () {
      const url = $(this).attr("data-gallery-image");
      if (url && !images.includes(url)) images.push(url);
    });
    return images;
  }

  private mapWpToEmpreendimento(post: WpEmpreendimento, pageData: PageData | null): PlanetaEmpreendimento {
    const featuredImageUrl = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;

    const taxonomies = {
      tipos: [] as string[],
      cidade: null as string | null,
      dormitorios: [] as string[],
      categorias: [] as string[],
    };

    for (const termGroup of post._embedded?.["wp:term"] ?? []) {
      if (!Array.isArray(termGroup)) continue;
      for (const term of termGroup) {
        switch (term.taxonomy) {
          case "tipo":
            taxonomies.tipos.push(term.name);
            break;
          case "cidade":
            taxonomies.cidade = term.name;
            break;
          case "dormitorios":
            taxonomies.dormitorios.push(term.name);
            break;
          case "categorias":
            taxonomies.categorias.push(term.name);
            break;
        }
      }
    }

    return {
      id: post.id,
      title: decodeHtmlEntities(post.title?.rendered ?? ""),
      link: post.link ?? "",
      featuredImageUrl,
      galleryImages: pageData?.galleryImages ?? [],
      taxonomies,
      pageData: {
        descricao: pageData?.descricao ?? null,
        areaMin: pageData?.areaMin ?? null,
        areaMax: pageData?.areaMax ?? null,
        vagasMin: pageData?.vagasMin ?? null,
        bairro: pageData?.bairro ?? null,
        endereco: pageData?.endereco ?? null,
        statusTexto: pageData?.statusTexto ?? null,
      },
    };
  }
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

interface PageData {
  descricao: string | null;
  areaMin: number | null;
  areaMax: number | null;
  vagasMin: number | null;
  bairro: string | null;
  endereco: string | null;
  statusTexto: string | null;
  galleryImages: string[];
}

interface WpEmpreendimento {
  id: number;
  slug: string;
  title?: { rendered: string };
  content?: { rendered: string };
  link: string;
  tipo?: number[];
  cidade?: number[];
  dormitorios?: number[];
  categorias?: number[];
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url?: string }>;
    "wp:term"?: Array<
      Array<{
        id: number;
        name: string;
        taxonomy: string;
      }>
    >;
  };
}
