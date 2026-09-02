import { BaseScraper, type PaginaResult, type PoliticaDeColeta } from "./BaseScraper.ts";
import type { ScraperParams } from "../../../ports/outbound/ScraperPort.ts";
import type { TipoImovel } from "../../../domain/imovel/enums/TipoImovel.ts";
import type { AreaDeBusca } from "../../../domain/busca/value-objects/AreaDeBusca.ts";
import { mapGlueListingToImovelData, type GlueApiResponse } from "./zapimoveis/zapimoveis.mapper.ts";
import { nomeDaUf } from "../../../shared/geo/unidades-federativas.ts";
import { logger } from "../../../shared/utils/logger.ts";

const TIPO_IMOVEL_TO_UNIT_TYPE: Record<string, string> = {
  APARTAMENTO: "APARTMENT",
  CASA: "HOME",
  TERRENO: "LAND",
  LOTE: "ALLOTMENT_LAND",
  STUDIO: "KITCHENETTE",
  COMERCIAL: "OFFICE",
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const TAMANHO_DE_PAGINA_PADRAO = 36;
const TIMEOUT_HEALTH_CHECK_MS = 15_000;
const TIMEOUT_PAGINA_MS = 30_000;

const POLITICA_GLUE_API: PoliticaDeColeta = {
  intervaloEntreRequisicoesMs: 3000,
  tentativasMaximas: 3,
  paginasMaximas: 50,
};

const INCLUDE_FIELDS =
  "search(result(listings(listing(displayAddressType,amenities,usableAreas,constructionStatus,listingType,description,title,stamps,createdAt,floors,unitTypes,nonActivationReason,providerId,propertyType,unitSubTypes,unitsOnTheFloor,legacyId,id,portal,unitFloor,parkingSpaces,updatedAt,address,suites,publicationType,externalId,bathrooms,usageTypes,totalAreas,advertiserId,advertiserContact,whatsappNumber,bedrooms,acceptExchange,pricingInfos,showPrice,resale,buildings,capacityLimit,status,images),link)),totalCount))";

export abstract class GlueApiBaseScraper extends BaseScraper {
  protected readonly apiUrl: string;
  protected abstract readonly portalName: string;

  constructor(
    protected readonly domain: string,
    protected readonly siteDomain: string,
    protected readonly area: AreaDeBusca,
  ) {
    super(POLITICA_GLUE_API);
    this.apiUrl = `https://glue-api.${domain}/v2/listings`;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const url = this.buildApiUrl(
        { cidade: this.area.cidade, estado: this.area.estado, tipoNegocio: "VENDA" },
        1,
        0,
      );
      const response = await fetch(url, {
        headers: this.buildHeaders(),
        signal: AbortSignal.timeout(TIMEOUT_HEALTH_CHECK_MS),
      });

      if (!response.ok) {
        logger.warn({ fonte: this.fonteNome, status: response.status }, "Health check retornou status nao-ok");
        return false;
      }

      const data = (await response.json()) as GlueApiResponse;
      const totalCount = data?.search?.result?.totalCount ?? 0;
      logger.debug({ fonte: this.fonteNome, totalCount }, "Health check concluido");
      return totalCount > 0;
    } catch (error) {
      logger.error({ fonte: this.fonteNome, error: String(error) }, "Erro no health check");
      return false;
    }
  }

  protected async scrapePagina(params: ScraperParams, pagina: number): Promise<PaginaResult> {
    const size = params.tamanhoPagina ?? TAMANHO_DE_PAGINA_PADRAO;
    const from = pagina * size;
    const url = this.buildApiUrl(params, size, from);

    logger.debug({ fonte: this.fonteNome, pagina, from, size, url }, "Buscando pagina da glue-api");

    const response = await fetch(url, {
      headers: this.buildHeaders(),
      signal: AbortSignal.timeout(TIMEOUT_PAGINA_MS),
    });

    if (this.foiBloqueadoPorAntiBot(response)) {
      logger.warn({ fonte: this.fonteNome, pagina, status: response.status }, "Acesso bloqueado pela API. Encerrando paginacao.");
      return { items: [], hasMore: false };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao buscar glue-api ${this.fonteNome} (pagina ${pagina})`);
    }

    const data = (await response.json()) as GlueApiResponse;
    const listings = data?.search?.result?.listings ?? [];
    const totalCount = data?.search?.result?.totalCount ?? 0;

    logger.debug({ fonte: this.fonteNome, pagina, listingsNaPagina: listings.length, totalCount }, "Resposta da glue-api recebida");

    const baseUrl = `https://${this.siteDomain}`;
    const items = listings.map((listing) =>
      mapGlueListingToImovelData(listing, this.fonteNome, baseUrl, this.area),
    );
    const hasMore = listings.length >= size && from + size < totalCount;

    return { items, hasMore };
  }

  private foiBloqueadoPorAntiBot(response: Response): boolean {
    return response.status === 403;
  }

  private buildApiUrl(params: ScraperParams, size: number, from: number): string {
    const estadoNome = nomeDaUf(params.estado);
    const locationId = `BR>${estadoNome}>NULL>${params.cidade}`;

    const queryParams = new URLSearchParams({
      addressCity: params.cidade,
      addressState: estadoNome,
      addressLocationId: locationId,
      business: this.mapTipoNegocio(params.tipoNegocio),
      categoryPage: "RESULT",
      listingType: this.mapListingType(params.statusConstrucao),
      portal: this.portalName,
      size: String(size),
      from: String(from),
      includeFields: INCLUDE_FIELDS,
    });

    if (params.precoMaximo) {
      queryParams.set("priceMax", String(params.precoMaximo));
    }

    if (params.tipoImovel && params.tipoImovel.length > 0) {
      const unitTypes = this.mapUnitTypes(params.tipoImovel);
      if (unitTypes) queryParams.set("unitTypes", unitTypes);
    }

    return `${this.apiUrl}?${queryParams.toString()}`;
  }

  private buildHeaders(): Record<string, string> {
    return {
      "x-domain": this.domain,
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      Referer: `https://${this.siteDomain}/`,
      Origin: `https://${this.siteDomain}`,
    };
  }

  private mapTipoNegocio(tipoNegocio?: string): string {
    return tipoNegocio === "ALUGUEL" ? "RENTAL" : "SALE";
  }

  private mapListingType(statusConstrucao?: string[]): string {
    const incluiNaPlanta = statusConstrucao?.includes("NA_PLANTA") ?? false;
    return incluiNaPlanta ? "DEVELOPMENT" : "USED";
  }

  private mapUnitTypes(tipoImovel: TipoImovel[]): string {
    return tipoImovel
      .map((tipo) => TIPO_IMOVEL_TO_UNIT_TYPE[tipo])
      .filter(Boolean)
      .join(",");
  }
}
