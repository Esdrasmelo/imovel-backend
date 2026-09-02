import type { ImovelData } from "../../../../ports/outbound/ScraperPort.ts";
import type { TipoImovel } from "../../../../domain/imovel/enums/TipoImovel.ts";
import type { AreaDeBusca } from "../../../../domain/busca/value-objects/AreaDeBusca.ts";
import { parsePreco } from "../../../../shared/utils/price-parser.ts";

export interface MendesOrtegaRawItem {
  codigo: string;
  tipoTexto: string;
  bairro: string;
  condominio: string | null;
  detalhes: string[];
  precoTexto: string;
  url: string;
  imagens: string[];
}

export interface DetalhesDoCard {
  areaUtil: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
}

const TIPO_MAP: Record<string, TipoImovel> = {
  apartamento: "APARTAMENTO",
  casa: "CASA",
  terreno: "TERRENO",
  lote: "LOTE",
  studio: "STUDIO",
  sala: "COMERCIAL",
  sobrado: "CASA",
  cobertura: "APARTAMENTO",
  flat: "APARTAMENTO",
  kitnet: "APARTAMENTO",
  loja: "COMERCIAL",
  "ponto comercial": "COMERCIAL",
  galpao: "COMERCIAL",
  "galpão": "COMERCIAL",
  "barracão": "COMERCIAL",
  barracao: "COMERCIAL",
};

const TIPO_IMOVEL_PADRAO: TipoImovel = "CASA";

function mapTipoImovel(texto: string): TipoImovel {
  return TIPO_MAP[texto.trim().toLowerCase()] ?? TIPO_IMOVEL_PADRAO;
}

function extrairNumero(texto: string): number | null {
  const match = texto.match(/([\d.,]+)/);
  if (!match?.[1]) return null;
  const valor = parseFloat(match[1].replace(",", "."));
  return isNaN(valor) ? null : valor;
}

export function parseDetalhes(detalhes: string[]): DetalhesDoCard {
  const resultado: DetalhesDoCard = {
    areaUtil: null,
    quartos: null,
    suites: null,
    banheiros: null,
    vagas: null,
  };

  for (const detalhe of detalhes) {
    const texto = detalhe.toLowerCase();
    if (texto.includes("m²") || texto.includes("m2")) resultado.areaUtil = extrairNumero(detalhe);
    else if (texto.includes("quarto")) resultado.quartos = extrairNumero(detalhe);
    else if (texto.includes("suíte") || texto.includes("suite")) resultado.suites = extrairNumero(detalhe);
    else if (texto.includes("banheiro")) resultado.banheiros = extrairNumero(detalhe);
    else if (texto.includes("vaga")) resultado.vagas = extrairNumero(detalhe);
  }

  return resultado;
}

export function mapToImovelData(raw: MendesOrtegaRawItem, area: AreaDeBusca): ImovelData {
  const detalhes = parseDetalhes(raw.detalhes);

  return {
    externalId: `mendesortega-${raw.codigo}`,
    titulo: montarTitulo(raw, detalhes),
    descricao: null,
    url: raw.url,
    urlImagens: raw.imagens,
    preco: parsePreco(raw.precoTexto),
    valorCondominio: null,
    tipoImovel: mapTipoImovel(raw.tipoTexto),
    tipoNegocio: "VENDA",
    statusConstrucao: null,
    areaUtil: detalhes.areaUtil,
    areaTotal: null,
    quartos: detalhes.quartos,
    suites: detalhes.suites,
    banheiros: detalhes.banheiros,
    vagas: detalhes.vagas,
    cep: null,
    logradouro: null,
    numero: null,
    complemento: null,
    bairro: raw.bairro,
    cidade: area.cidade,
    estado: area.estado,
    latitude: null,
    longitude: null,
    nomeEmpreendimento: raw.condominio,
    construtora: null,
    aceitaFinanciamento: null,
    codigoImovel: raw.codigo,
    dataPublicacao: null,
  };
}

function montarTitulo(raw: MendesOrtegaRawItem, detalhes: DetalhesDoCard): string {
  const partes = [raw.tipoTexto];

  if (detalhes.quartos) {
    partes.push(`${detalhes.quartos} quarto${detalhes.quartos > 1 ? "s" : ""}`);
  }
  if (raw.bairro) {
    partes.push(raw.bairro);
  }

  return partes.join(" - ");
}
