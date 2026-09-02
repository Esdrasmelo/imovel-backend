import type { ImovelData } from "../../../../ports/outbound/ScraperPort.ts";
import type { TipoImovel } from "../../../../domain/imovel/enums/TipoImovel.ts";
import type { TipoNegocio } from "../../../../domain/imovel/enums/TipoNegocio.ts";
import type { StatusConstrucao } from "../../../../domain/imovel/enums/StatusConstrucao.ts";
import type { AreaDeBusca } from "../../../../domain/busca/value-objects/AreaDeBusca.ts";

export interface GlueApiListing {
  listing: {
    id: string;
    title?: string;
    description?: string;
    usableAreas?: number[];
    totalAreas?: number[];
    bedrooms?: number[];
    bathrooms?: number[];
    suites?: number[];
    parkingSpaces?: number[];
    address?: {
      city?: string;
      neighborhood?: string;
      state?: string;
      street?: string;
      streetNumber?: string;
      zipCode?: string;
      complement?: string;
      point?: {
        lat?: number;
        lon?: number;
      };
    };
    pricingInfos?: Array<{
      price?: string;
      monthlyCondoFee?: string;
      businessType?: string;
    }>;
    unitTypes?: string[];
    constructionStatus?: string;
    status?: string;
    images?: string[];
    externalId?: string;
    legacyId?: string;
    createdAt?: string;
    advertiserContact?: {
      advertiserName?: string;
    };
    acceptExchange?: boolean;
    buildings?: Array<{
      name?: string;
    }>;
    stamps?: Array<{
      name?: string;
    }>;
  };
  link?: {
    href?: string;
  };
}

export interface GlueApiResponse {
  search?: {
    result?: {
      listings?: GlueApiListing[];
      totalCount?: number;
    };
  };
}

const UNIT_TYPE_MAP: Record<string, TipoImovel> = {
  APARTMENT: "APARTAMENTO",
  HOME: "CASA",
  ALLOTMENT_LAND: "LOTE",
  LAND: "TERRENO",
  CONDOMINIUM: "CASA",
  FARM: "TERRENO",
  FLAT: "APARTAMENTO",
  KITCHENETTE: "STUDIO",
  PENTHOUSE: "APARTAMENTO",
  LOFT: "STUDIO",
  TWO_STORY_HOUSE: "CASA",
  VILLAGE_HOUSE: "CASA",
  RESIDENTIAL_BUILDING: "APARTAMENTO",
  STUDIO: "STUDIO",
  OFFICE: "COMERCIAL",
  COMMERCIAL_BUILDING: "COMERCIAL",
  SHED_DEPOSIT_WAREHOUSE: "COMERCIAL",
  BUSINESS: "COMERCIAL",
  STORE_SHOPPING: "COMERCIAL",
  COMMERCIAL_ALLOTMENT_LAND: "LOTE",
};

const CONSTRUCTION_STATUS_MAP: Record<string, StatusConstrucao> = {
  READY_TO_MOVE: "PRONTO",
  UNDER_CONSTRUCTION: "EM_CONSTRUCAO",
  LAUNCH: "NA_PLANTA",
  NEW_LAUNCH: "NA_PLANTA",
  PRE_LAUNCH: "NA_PLANTA",
};

const BUSINESS_TYPE_MAP: Record<string, TipoNegocio> = {
  SALE: "VENDA",
  RENTAL: "ALUGUEL",
};

const TIPO_IMOVEL_PADRAO: TipoImovel = "CASA";
const TITULO_AUSENTE = "Sem titulo";
const FINANCIAMENTO_NAO_INFORMADO_PELA_API = null;

function mapTipoImovel(unitTypes?: string[]): TipoImovel {
  const primeiro = unitTypes?.[0];
  if (!primeiro) return TIPO_IMOVEL_PADRAO;
  return UNIT_TYPE_MAP[primeiro] ?? TIPO_IMOVEL_PADRAO;
}

function mapStatusConstrucao(status?: string): StatusConstrucao | null {
  if (!status) return null;
  return CONSTRUCTION_STATUS_MAP[status] ?? null;
}

function mapTipoNegocio(businessType?: string): TipoNegocio {
  if (!businessType) return "VENDA";
  return BUSINESS_TYPE_MAP[businessType] ?? "VENDA";
}

function parsePrice(value?: string): number | null {
  if (!value) return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

function firstOrNull(arr?: number[]): number | null {
  return arr?.[0] ?? null;
}

function urlAbsoluta(href: string | undefined, baseUrl: string): string {
  const caminho = href ?? "";
  return caminho.startsWith("http") ? caminho : `${baseUrl}${caminho}`;
}

export function mapGlueListingToImovelData(
  item: GlueApiListing,
  fonteNome: string,
  baseUrl: string,
  area: AreaDeBusca,
): ImovelData {
  const { listing, link } = item;
  const address = listing.address;
  const pricing = listing.pricingInfos?.[0];

  return {
    externalId: `${fonteNome}-${listing.id}`,
    titulo: listing.title ?? TITULO_AUSENTE,
    descricao: listing.description ?? null,
    url: urlAbsoluta(link?.href, baseUrl),
    urlImagens: listing.images ?? [],
    preco: parsePrice(pricing?.price),
    valorCondominio: parsePrice(pricing?.monthlyCondoFee),
    tipoImovel: mapTipoImovel(listing.unitTypes),
    tipoNegocio: mapTipoNegocio(pricing?.businessType),
    statusConstrucao: mapStatusConstrucao(listing.constructionStatus),
    areaUtil: firstOrNull(listing.usableAreas),
    areaTotal: firstOrNull(listing.totalAreas),
    quartos: firstOrNull(listing.bedrooms),
    suites: firstOrNull(listing.suites),
    banheiros: firstOrNull(listing.bathrooms),
    vagas: firstOrNull(listing.parkingSpaces),
    cep: address?.zipCode ?? null,
    logradouro: address?.street ?? null,
    numero: address?.streetNumber ?? null,
    complemento: address?.complement ?? null,
    bairro: address?.neighborhood ?? null,
    cidade: address?.city ?? area.cidade,
    estado: address?.state ?? area.estado,
    latitude: address?.point?.lat ?? null,
    longitude: address?.point?.lon ?? null,
    nomeEmpreendimento: listing.buildings?.[0]?.name ?? null,
    construtora: null,
    aceitaFinanciamento: FINANCIAMENTO_NAO_INFORMADO_PELA_API,
    codigoImovel: listing.externalId ?? listing.legacyId?.toString() ?? null,
    dataPublicacao: listing.createdAt ? new Date(listing.createdAt) : null,
  };
}
