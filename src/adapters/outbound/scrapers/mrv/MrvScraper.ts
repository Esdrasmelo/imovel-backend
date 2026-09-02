import * as cheerio from "cheerio";
import { BaseScraper, type PaginaResult, type PoliticaDeColeta } from "../BaseScraper.ts";
import type { ScraperParams } from "../../../../ports/outbound/ScraperPort.ts";
import { mapToImovelData, type MrvRawEmpreendimento } from "./mrv.mapper.ts";
import { slugify } from "../../../../shared/utils/slug.ts";
import { slugDaUf } from "../../../../shared/geo/unidades-federativas.ts";
import { logger } from "../../../../shared/utils/logger.ts";

const BASE_URL = "https://www.mrv.com.br";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const HEADERS_HTML = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
};

const TIMEOUT_HEALTH_CHECK_MS = 10_000;
const TIMEOUT_PAGINA_MS = 30_000;
const TIMEOUT_SITEMAP_MS = 15_000;
const TIPO_PADRAO = "Apartamentos";
const NOME_PADRAO = "Empreendimento MRV";
const STATUS_PADRAO = "Em Construção";

const POLITICA: PoliticaDeColeta = {
  intervaloEntreRequisicoesMs: 5000,
  tentativasMaximas: 3,
  paginasMaximas: 5,
};

export class MrvScraper extends BaseScraper {
  readonly fonteNome = "mrv";

  constructor() {
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

  protected async scrapePagina(params: ScraperParams, pagina: number): Promise<PaginaResult> {
    if (this.coletaInteiraJaAconteceu(pagina)) {
      return { items: [], hasMore: false };
    }

    const listingUrl = this.urlDaListagem(params);
    logger.debug({ fonte: this.fonteNome, url: listingUrl }, "Buscando listagem de empreendimentos");

    const empreendimentoUrls = await this.fetchEmpreendimentoUrls(listingUrl);
    if (empreendimentoUrls.length === 0) {
      logger.warn({ fonte: this.fonteNome, cidade: params.cidade, estado: params.estado }, "Nenhum empreendimento encontrado na listagem da cidade");
      return { items: [], hasMore: false };
    }

    logger.info({ fonte: this.fonteNome, total: empreendimentoUrls.length }, "Empreendimentos encontrados, buscando detalhes");

    const empreendimentos: MrvRawEmpreendimento[] = [];
    for (const empUrl of empreendimentoUrls) {
      try {
        await this.rateLimiter.wait();
        const emp = await this.fetchEmpreendimentoDetails(empUrl, params);
        if (emp) empreendimentos.push(emp);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.warn({ fonte: this.fonteNome, url: empUrl, error: msg }, "Erro ao buscar detalhes do empreendimento, pulando");
      }
    }

    return { items: empreendimentos.map(mapToImovelData), hasMore: false };
  }

  private coletaInteiraJaAconteceu(pagina: number): boolean {
    return pagina > 0;
  }

  private urlDaListagem(params: ScraperParams): string {
    return `${BASE_URL}/imoveis/${slugDaUf(params.estado)}/${slugify(params.cidade)}`;
  }

  private async fetchEmpreendimentoUrls(listingUrl: string): Promise<string[]> {
    try {
      const response = await fetch(listingUrl, {
        headers: HEADERS_HTML,
        signal: AbortSignal.timeout(TIMEOUT_PAGINA_MS),
      });

      if (!response.ok) {
        logger.warn({ fonte: this.fonteNome, status: response.status, url: listingUrl }, "Página de listagem retornou erro, tentando via sitemap");
        return this.fetchUrlsViaSitemap(listingUrl);
      }

      const $ = cheerio.load(await response.text());

      const urlsDoJsonLd = this.urlsDoJsonLd($, listingUrl);
      if (urlsDoJsonLd.length > 0) return urlsDoJsonLd;

      const urlsDosLinks = this.urlsDosLinks($, listingUrl);
      if (urlsDosLinks.length > 0) return urlsDosLinks;

      return this.fetchUrlsViaSitemap(listingUrl);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn({ fonte: this.fonteNome, error: msg }, "Erro ao buscar listagem, tentando via sitemap");
      return this.fetchUrlsViaSitemap(listingUrl);
    }
  }

  private urlsDoJsonLd($: cheerio.CheerioAPI, listingUrl: string): string[] {
    const urls: string[] = [];
    $('script[type="application/ld+json"]').each((_i, el) => {
      try {
        this.extractUrlsFromJsonLd(JSON.parse($(el).text()), urls, listingUrl);
      } catch {
        return;
      }
    });
    return [...new Set(urls)];
  }

  private urlsDosLinks($: cheerio.CheerioAPI, listingUrl: string): string[] {
    const urls: string[] = [];
    $("a[href]").each((_i, el) => {
      const href = $(el).attr("href") || "";
      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
      if (this.eUmNivelAbaixo(fullUrl, listingUrl) && !urls.includes(fullUrl)) {
        urls.push(fullUrl);
      }
    });
    return urls;
  }

  private eUmNivelAbaixo(url: string, listingUrl: string): boolean {
    return url.startsWith(listingUrl) && url !== listingUrl && url !== `${listingUrl}/`;
  }

  private extractUrlsFromJsonLd(json: unknown, urls: string[], listingUrl: string): void {
    if (Array.isArray(json)) {
      for (const item of json) this.extractUrlsFromJsonLd(item, urls, listingUrl);
      return;
    }
    if (typeof json !== "object" || json === null) return;

    const obj = json as Record<string, unknown>;

    if (obj["@type"] === "RealEstateListing" && typeof obj.url === "string") {
      this.adicionarUrl(urls, obj.url);
    }

    if (Array.isArray(obj.itemListElement)) {
      for (const element of obj.itemListElement) {
        if (typeof element !== "object" || element === null) continue;
        const item = element as Record<string, unknown>;
        if (typeof item.url === "string") this.adicionarUrl(urls, item.url);
        if (item.item && typeof item.item === "object") this.extractUrlsFromJsonLd(item.item, urls, listingUrl);
      }
    }
  }

  private adicionarUrl(urls: string[], url: string): void {
    const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
    if (!urls.includes(fullUrl)) urls.push(fullUrl);
  }

  private async fetchUrlsViaSitemap(listingUrl: string): Promise<string[]> {
    try {
      const sitemapResponse = await fetch(`${BASE_URL}/sitemap.xml`, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_SITEMAP_MS),
      });
      if (!sitemapResponse.ok) return [];

      const $ = cheerio.load(await sitemapResponse.text(), { xmlMode: true });
      const basePath = new URL(listingUrl).pathname.replace(/\/$/, "");
      const urls: string[] = [];

      $("url loc").each((_i, el) => {
        const loc = $(el).text().trim();
        const locPath = new URL(loc).pathname.replace(/\/$/, "");
        if (this.eFilhoDireto(locPath, basePath)) urls.push(loc);
      });

      logger.debug({ fonte: this.fonteNome, urlsEncontradas: urls.length }, "URLs encontradas no sitemap");
      return urls;
    } catch {
      return [];
    }
  }

  private eFilhoDireto(caminho: string, base: string): boolean {
    return (
      caminho.startsWith(base + "/") &&
      caminho !== base &&
      caminho.split("/").length === base.split("/").length + 1
    );
  }

  private async fetchEmpreendimentoDetails(url: string, params: ScraperParams): Promise<MrvRawEmpreendimento | null> {
    logger.debug({ fonte: this.fonteNome, url }, "Buscando detalhes do empreendimento");

    const response = await fetch(url, {
      headers: HEADERS_HTML,
      signal: AbortSignal.timeout(TIMEOUT_PAGINA_MS),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao buscar ${url}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const jsonLdData = this.extractJsonLd($);
    if (!jsonLdData) {
      logger.debug({ fonte: this.fonteNome, url }, "Nenhum JSON-LD RealEstateListing encontrado");
      return null;
    }

    return this.buildRawEmpreendimento(jsonLdData, this.extractJsEmpreendimentoData(html), url, params);
  }

  private extractJsonLd($: cheerio.CheerioAPI): Record<string, unknown> | null {
    let result: Record<string, unknown> | null = null;

    $('script[type="application/ld+json"]').each((_i, el) => {
      if (result) return;
      try {
        const json = JSON.parse($(el).text());
        const candidatos = Array.isArray(json) ? json : [json];
        result = candidatos.find((item) => item?.["@type"] === "RealEstateListing") ?? null;
      } catch {
        return;
      }
    });

    return result;
  }

  private extractJsEmpreendimentoData(html: string): JsEmpreendimentoData | null {
    const cepMatch = html.match(/"cep"\s*:\s*"([^"]+)"/);
    const latMatch = html.match(/"latitude"\s*:\s*"?(-?[\d.]+)"?/);
    const lngMatch = html.match(/"longitude"\s*:\s*"?(-?[\d.]+)"?/);
    const statusMatch = html.match(/"statusImovel"\s*:\s*"([^"]+)"/);
    const totalUnidadesMatch = html.match(/"totalUnidades"\s*:\s*"?(\d+)"?/);
    const totalGaragemMatch = html.match(/"totalGaragem"\s*:\s*"?(\d+)"?/);
    const bairroMatch = html.match(/"bairro"\s*:\s*"([^"]+)"/);
    const enderecoMatch = html.match(/"endereco"\s*:\s*"([^"]+)"/);

    if (!cepMatch && !latMatch && !statusMatch) return null;

    return {
      cep: cepMatch?.[1] ?? null,
      latitude: latMatch?.[1] ? parseFloat(latMatch[1]) : null,
      longitude: lngMatch?.[1] ? parseFloat(lngMatch[1]) : null,
      status: statusMatch?.[1] ?? null,
      totalUnidades: totalUnidadesMatch?.[1] ? parseInt(totalUnidadesMatch[1], 10) : null,
      totalGaragem: totalGaragemMatch?.[1] ? parseInt(totalGaragemMatch[1], 10) : null,
      bairro: bairroMatch?.[1] ?? null,
      endereco: enderecoMatch?.[1] ?? null,
    };
  }

  private buildRawEmpreendimento(
    jsonLd: Record<string, unknown>,
    jsData: JsEmpreendimentoData | null,
    url: string,
    params: ScraperParams,
  ): MrvRawEmpreendimento {
    const nomeCompleto = String(jsonLd.name || "");
    const nome = nomeCompleto.replace(/^(Apartamentos|Casas|Lotes)\s+/i, "");
    const about = (jsonLd.about || {}) as Record<string, unknown>;
    const area = this.areaDoJsonLd(about);

    return {
      nome: nome || NOME_PADRAO,
      url,
      tipo: nomeCompleto.split(/\s+/)[0] || TIPO_PADRAO,
      status: jsData?.status || STATUS_PADRAO,
      endereco: jsData?.endereco ?? (about.address ? String(about.address) : null),
      bairro: jsData?.bairro ?? null,
      cidade: params.cidade,
      estado: params.estado,
      cep: jsData?.cep || null,
      latitude: jsData?.latitude || null,
      longitude: jsData?.longitude || null,
      areaMin: area,
      areaMax: area,
      quartos: this.quartosDoJsonLd(about, nomeCompleto),
      quartosMax: null,
      imagemUrl: this.imagensDoJsonLd(jsonLd)[0] ?? null,
      imagens: this.imagensDoJsonLd(jsonLd),
      totalUnidades: jsData?.totalUnidades || null,
      totalGaragem: jsData?.totalGaragem || null,
    };
  }

  private areaDoJsonLd(about: Record<string, unknown>): number | null {
    if (!about.floorSize) return null;
    const floorSize = about.floorSize as Record<string, unknown>;
    const value = parseFloat(String(floorSize.value || "0"));
    return !isNaN(value) && value > 0 ? value : null;
  }

  private quartosDoJsonLd(about: Record<string, unknown>, nome: string): number | null {
    const roomMatch = String(about.numberOfRooms ?? "").match(/(\d+)/);
    if (roomMatch?.[1]) return parseInt(roomMatch[1], 10);

    const nameRoomMatch = nome.match(/(\d+)\s*(?:quarto|dorm)/i);
    return nameRoomMatch?.[1] ? parseInt(nameRoomMatch[1], 10) : null;
  }

  private imagensDoJsonLd(jsonLd: Record<string, unknown>): string[] {
    if (typeof jsonLd.image === "string" && jsonLd.image) return [jsonLd.image];
    if (Array.isArray(jsonLd.image)) return jsonLd.image.filter((img): img is string => typeof img === "string");
    return [];
  }
}

interface JsEmpreendimentoData {
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string | null;
  totalUnidades: number | null;
  totalGaragem: number | null;
  bairro: string | null;
  endereco: string | null;
}
