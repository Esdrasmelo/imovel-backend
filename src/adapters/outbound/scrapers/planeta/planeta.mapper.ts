import type { ImovelData } from "../../../../ports/outbound/ScraperPort.ts";
import type { TipoImovel } from "../../../../domain/imovel/enums/TipoImovel.ts";
import type { StatusConstrucao } from "../../../../domain/imovel/enums/StatusConstrucao.ts";
import type { AreaDeBusca } from "../../../../domain/busca/value-objects/AreaDeBusca.ts";

export interface PlanetaEmpreendimento {
  id: number;
  title: string;
  link: string;
  featuredImageUrl: string | null;
  galleryImages: string[];
  taxonomies: {
    tipos: string[];
    cidade: string | null;
    dormitorios: string[];
    categorias: string[];
  };
  pageData: {
    descricao: string | null;
    areaMin: number | null;
    areaMax: number | null;
    vagasMin: number | null;
    bairro: string | null;
    endereco: string | null;
    statusTexto: string | null;
  };
}

const TIPO_IMOVEL_MAP: Record<string, TipoImovel> = {
  apartamento: "APARTAMENTO",
  casa: "CASA",
  terreno: "TERRENO",
  lote: "LOTE",
  studio: "STUDIO",
  comercial: "COMERCIAL",
  residencial: "APARTAMENTO",
};

const TIPO_IMOVEL_PADRAO: TipoImovel = "APARTAMENTO";
const NOME_DA_CONSTRUTORA = "Construtora Planeta";
const PRECO_SOB_CONSULTA = null;
const CONSTRUTORA_OPERA_COM_FINANCIAMENTO = true;

function mapTipoImovel(tipos: string[]): TipoImovel {
  for (const tipo of tipos) {
    const mapped = TIPO_IMOVEL_MAP[tipo.trim().toLowerCase()];
    if (mapped) return mapped;
  }
  return TIPO_IMOVEL_PADRAO;
}

export function mapStatusConstrucao(categorias: string[], statusTexto: string | null): StatusConstrucao | null {
  const pistas = [...categorias.map((c) => c.toLowerCase()), statusTexto?.toLowerCase() ?? ""];

  if (pistas.some((c) => c.includes("pronto"))) return "PRONTO";
  if (pistas.some((c) => c.includes("em obras") || c.includes("em construção") || c.includes("em construcao"))) {
    return "EM_CONSTRUCAO";
  }
  if (pistas.some((c) => c.includes("lançamento") || c.includes("lancamento") || c.includes("futuro"))) {
    return "NA_PLANTA";
  }
  return null;
}

export function extrairMaximo(dormitorios: string[], padrao: RegExp): number | null {
  let maximo = 0;
  for (const texto of dormitorios) {
    const match = texto.match(padrao);
    if (match?.[1]) maximo = Math.max(maximo, parseInt(match[1], 10));
  }
  return maximo > 0 ? maximo : null;
}

const PADRAO_DORMITORIOS = /(\d+)\s*(dormit|dorm)/i;
const PADRAO_SUITES = /(\d+)\s*su[ií]te/i;

export function parseCidade(cidadeRaw: string | null, area: AreaDeBusca): { cidade: string; estado: string } {
  if (!cidadeRaw) return { cidade: area.cidade, estado: area.estado };

  const match = cidadeRaw.match(/^(.+?)\s*-\s*([A-Z]{2})$/);
  if (match) return { cidade: match[1]!.trim(), estado: match[2]! };

  return { cidade: cidadeRaw.trim(), estado: area.estado };
}

export function mapToImovelData(emp: PlanetaEmpreendimento, area: AreaDeBusca): ImovelData {
  const { cidade, estado } = parseCidade(emp.taxonomies.cidade, area);

  const imagens = emp.galleryImages.length > 0
    ? emp.galleryImages
    : emp.featuredImageUrl
      ? [emp.featuredImageUrl]
      : [];

  return {
    externalId: `planeta-${emp.id}`,
    titulo: emp.title,
    descricao: emp.pageData.descricao,
    url: emp.link,
    urlImagens: imagens,
    preco: PRECO_SOB_CONSULTA,
    valorCondominio: null,
    tipoImovel: mapTipoImovel(emp.taxonomies.tipos),
    tipoNegocio: "VENDA",
    statusConstrucao: mapStatusConstrucao(emp.taxonomies.categorias, emp.pageData.statusTexto),
    areaUtil: emp.pageData.areaMin,
    areaTotal: null,
    quartos: extrairMaximo(emp.taxonomies.dormitorios, PADRAO_DORMITORIOS),
    suites: extrairMaximo(emp.taxonomies.dormitorios, PADRAO_SUITES),
    banheiros: null,
    vagas: emp.pageData.vagasMin,
    cep: null,
    logradouro: emp.pageData.endereco,
    numero: null,
    complemento: null,
    bairro: emp.pageData.bairro,
    cidade,
    estado,
    latitude: null,
    longitude: null,
    nomeEmpreendimento: emp.title,
    construtora: NOME_DA_CONSTRUTORA,
    aceitaFinanciamento: CONSTRUTORA_OPERA_COM_FINANCIAMENTO,
    codigoImovel: String(emp.id),
    dataPublicacao: null,
  };
}
